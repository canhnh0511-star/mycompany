package com.mycompany.api.integration;

import static org.assertj.core.api.Assertions.assertThat;

import com.mycompany.api.entity.BatchStatus;
import com.mycompany.api.entity.BatchType;
import com.mycompany.api.entity.OcrTargetType;
import com.mycompany.api.entity.ScanBatch;
import com.mycompany.api.entity.Team;
import com.mycompany.api.entity.User;
import com.mycompany.api.exception.ConflictException;
import com.mycompany.api.repository.ScanBatchRepository;
import com.mycompany.api.repository.TeamRepository;
import com.mycompany.api.service.ScanBatchCreationService;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;

/**
 * Case 19 và 28 (Spec 1 mục 9) — cần 2 transaction THẬT ĐỘC LẬP trên 2 thread để race có ý nghĩa.
 *
 * <p><b>KHÔNG {@code @Transactional} ở class này</b> — cùng lý do đã ghi ở
 * {@link ProductionRecordIntegrationTest} cho {@code RequiresNewTransactionRunner}: nếu bọc
 * {@code @Transactional}, mọi lời gọi (kể cả từ 2 thread khác nhau qua cùng 1 test method) sẽ bị kéo
 * vào chung 1 "transaction ảo" của Spring Test, vô hiệu hóa hoàn toàn advisory
 * lock/unique-constraint-race đang muốn kiểm tra — {@code resolveOrCreateBatchForImage} (Phase 2 fix,
 * xem ADR-0021 addendum "self-invocation") chỉ thực sự mở transaction/giữ lock riêng khi KHÔNG có
 * transaction bao ngoài. Dọn dữ liệu tường minh ở {@code @AfterEach} vì không có rollback tự động.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
class ScanBatchConcurrencyIntegrationTest extends IntegrationTestSupport {

    @Autowired
    private ScanBatchCreationService creationService;
    @Autowired
    private ScanBatchRepository scanBatchRepository;
    @Autowired
    private TeamRepository teamRepository;

    private Team team;
    private User admin;

    @BeforeEach
    void setUp() {
        admin = adminUser();
        team = teamRepository.saveAndFlush(Team.builder().name("Tổ Concurrency Test " + UUID.randomUUID()).build());
    }

    @AfterEach
    void tearDown() {
        scanBatchRepository.findAll().stream()
                .filter(b -> b.getTeam().getId().equals(team.getId()))
                .forEach(scanBatchRepository::delete);
        teamRepository.delete(team);
    }

    // ============================================================= Case 19

    @Test
    void case19_twoConcurrentRequests_bothBlockedByExistingFailedBatch() throws Exception {
        LocalDate workDate = LocalDate.now();
        ScanBatch failed = scanBatchRepository.saveAndFlush(ScanBatch.builder()
                .documentType(OcrTargetType.PRODUCTION_RECORD).workDate(workDate).team(team)
                .batchType(BatchType.PRIMARY).status(BatchStatus.FAILED).createdBy(admin).build());

        CountDownLatch startLine = new CountDownLatch(2);
        CountDownLatch go = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        List<AtomicReference<Throwable>> results = List.of(new AtomicReference<>(), new AtomicReference<>());

        for (AtomicReference<Throwable> resultSlot : results) {
            pool.submit(() -> {
                startLine.countDown();
                await(go);
                try {
                    creationService.resolveOrCreateBatchForImage(OcrTargetType.PRODUCTION_RECORD, workDate, team.getId(), admin);
                } catch (Throwable t) {
                    resultSlot.set(t);
                }
            });
        }
        startLine.await(5, TimeUnit.SECONDS); // cả 2 thread đã sẵn sàng, chờ đúng lúc bấm "go" cùng lúc
        go.countDown();
        pool.shutdown();
        assertThat(pool.awaitTermination(15, TimeUnit.SECONDS)).isTrue();

        // Cả 2 đều bị chặn — không thread nào âm thầm "thắng" tạo được batch mới.
        assertThat(results).allSatisfy(r -> assertThat(r.get()).isInstanceOf(ConflictException.class));

        // Vẫn đúng 1 batch (chính batch FAILED ban đầu) cho key này — không có batch thứ 2 lọt qua.
        List<ScanBatch> allForKey = scanBatchRepository.findAll().stream()
                .filter(b -> b.getTeam().getId().equals(team.getId())
                        && b.getDocumentType() == OcrTargetType.PRODUCTION_RECORD
                        && b.getWorkDate().equals(workDate))
                .toList();
        assertThat(allForKey).hasSize(1);
        assertThat(allForKey.get(0).getId()).isEqualTo(failed.getId());
    }

    // ============================================================= Case 28

    @Test
    void case28_dbConstraint_blocksSecondPrimary_evenWhenServiceLayerCheckIsBypassed() throws Exception {
        LocalDate workDate = LocalDate.now();
        // PRIMARY đã APPROVED — giả lập trạng thái "slot đã dùng vĩnh viễn" (Spec 1 mục 3.1).
        ScanBatch approved = scanBatchRepository.saveAndFlush(ScanBatch.builder()
                .documentType(OcrTargetType.PRODUCTION_RECORD).workDate(workDate).team(team)
                .batchType(BatchType.PRIMARY).status(BatchStatus.APPROVED).createdBy(admin).build());

        // Cố tình KHÔNG qua creationService (giả lập code có lỗi/quên check trước khi insert) — gọi
        // thẳng repository.save() từ 2 thread độc lập để chứng minh UNIQUE INDEX tự nó chặn được,
        // không phụ thuộc advisory lock ở tầng service.
        CountDownLatch startLine = new CountDownLatch(2);
        CountDownLatch go = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        List<AtomicReference<Throwable>> results = List.of(new AtomicReference<>(), new AtomicReference<>());

        for (AtomicReference<Throwable> resultSlot : results) {
            pool.submit(() -> {
                startLine.countDown();
                await(go);
                try {
                    scanBatchRepository.saveAndFlush(ScanBatch.builder()
                            .documentType(OcrTargetType.PRODUCTION_RECORD).workDate(workDate).team(team)
                            .batchType(BatchType.PRIMARY).status(BatchStatus.DRAFT).createdBy(admin).build());
                } catch (Throwable t) {
                    resultSlot.set(t);
                }
            });
        }
        startLine.await(5, TimeUnit.SECONDS);
        go.countDown();
        pool.shutdown();
        assertThat(pool.awaitTermination(15, TimeUnit.SECONDS)).isTrue();

        // Cả 2 insert PRIMARY DRAFT song song đều phải bị DB chặn — KHÔNG được để lọt 1 cái nào,
        // vì slot PRIMARY của key này đã dùng bởi bản APPROVED (status<>'cancelled' vẫn nằm trong
        // index — migration 007 uq_scan_batches_primary_key).
        assertThat(results).allSatisfy(r -> assertThat(r.get()).isInstanceOf(DataIntegrityViolationException.class));

        List<ScanBatch> allForKey = scanBatchRepository.findAll().stream()
                .filter(b -> b.getTeam().getId().equals(team.getId())
                        && b.getDocumentType() == OcrTargetType.PRODUCTION_RECORD
                        && b.getWorkDate().equals(workDate))
                .toList();
        assertThat(allForKey).hasSize(1);
        assertThat(allForKey.get(0).getId()).isEqualTo(approved.getId());
    }

    private static void await(CountDownLatch latch) {
        try {
            latch.await(10, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(e);
        }
    }
}
