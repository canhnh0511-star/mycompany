package com.mycompany.api.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.when;

import com.mycompany.api.entity.BatchStatus;
import com.mycompany.api.entity.BatchType;
import com.mycompany.api.entity.ImageStatus;
import com.mycompany.api.entity.OcrTargetType;
import com.mycompany.api.entity.ScanBatch;
import com.mycompany.api.entity.ScanBatchConflict;
import com.mycompany.api.entity.ScanImage;
import com.mycompany.api.repository.ScanBatchRepository;
import com.mycompany.api.repository.ScanImageRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * RULE 16 (Spec 1 mục 5.2) — precedence UPLOADING > PROCESSING > FAILED(toàn batch) >
 * PARTIAL_FAILED > NEED_REVIEW > READY_TO_APPROVE. Mock repository/conflict-service — test thuần
 * logic, không cần DB thật (khác integration test cho Case 17-28, cần Postgres sống).
 */
@ExtendWith(MockitoExtension.class)
class BatchStatusRecomputeServiceTest {

    @Mock
    private ScanBatchRepository scanBatchRepository;
    @Mock
    private ScanImageRepository scanImageRepository;
    @Mock
    private ScanBatchConflictService conflictService;

    private BatchStatusRecomputeService service;
    private UUID batchId;

    @BeforeEach
    void setUp() {
        service = new BatchStatusRecomputeService(scanBatchRepository, scanImageRepository, conflictService);
        batchId = UUID.randomUUID();
    }

    @Test
    void noImages_staysDraft() {
        ScanBatch batch = batchWithStatus(BatchStatus.DRAFT);
        when(scanBatchRepository.findById(batchId)).thenReturn(Optional.of(batch));
        when(scanImageRepository.findByScanBatchId(batchId)).thenReturn(List.of());
        when(scanBatchRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        assertThat(service.recompute(batchId)).isEqualTo(BatchStatus.DRAFT);
    }

    @Test
    void anyImageUploading_takesPrecedenceOverEverythingElse() {
        ScanBatch batch = batchWithStatus(BatchStatus.PROCESSING);
        when(scanBatchRepository.findById(batchId)).thenReturn(Optional.of(batch));
        when(scanImageRepository.findByScanBatchId(batchId)).thenReturn(List.of(
                image(ImageStatus.UPLOADING), image(ImageStatus.FAILED), image(ImageStatus.ACTIVE)));
        when(scanBatchRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        assertThat(service.recompute(batchId)).isEqualTo(BatchStatus.UPLOADING);
    }

    @Test
    void anyImageProcessing_noUploading_returnsProcessing() {
        ScanBatch batch = batchWithStatus(BatchStatus.DRAFT);
        when(scanBatchRepository.findById(batchId)).thenReturn(Optional.of(batch));
        when(scanImageRepository.findByScanBatchId(batchId)).thenReturn(List.of(
                image(ImageStatus.PROCESSING), image(ImageStatus.ACTIVE)));
        when(scanBatchRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        assertThat(service.recompute(batchId)).isEqualTo(BatchStatus.PROCESSING);
    }

    @Test
    void allRelevantImagesFailed_returnsFailed_notPartialFailed() {
        ScanBatch batch = batchWithStatus(BatchStatus.PROCESSING);
        when(scanBatchRepository.findById(batchId)).thenReturn(Optional.of(batch));
        when(scanImageRepository.findByScanBatchId(batchId)).thenReturn(List.of(
                image(ImageStatus.FAILED), image(ImageStatus.FAILED)));
        when(scanBatchRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        assertThat(service.recompute(batchId)).isEqualTo(BatchStatus.FAILED);
    }

    @Test
    void someImagesFailedButNotAll_returnsPartialFailed() {
        // Precedence dừng ở PARTIAL_FAILED — KHÔNG gọi tới conflictService (test never() bên dưới),
        // khác allActive_* nơi conflict mới được xét tới.
        ScanBatch batch = batchWithStatus(BatchStatus.PROCESSING);
        when(scanBatchRepository.findById(batchId)).thenReturn(Optional.of(batch));
        when(scanImageRepository.findByScanBatchId(batchId)).thenReturn(List.of(
                image(ImageStatus.FAILED), image(ImageStatus.ACTIVE)));
        when(scanBatchRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        assertThat(service.recompute(batchId)).isEqualTo(BatchStatus.PARTIAL_FAILED);
        verify(conflictService, never()).openBlocking(any());
    }

    @Test
    void allActive_withOpenBlockingConflict_returnsNeedReview() {
        ScanBatch batch = batchWithStatus(BatchStatus.PROCESSING);
        when(scanBatchRepository.findById(batchId)).thenReturn(Optional.of(batch));
        when(scanImageRepository.findByScanBatchId(batchId)).thenReturn(List.of(image(ImageStatus.ACTIVE)));
        when(conflictService.openBlocking(batchId)).thenReturn(List.of(mock(ScanBatchConflict.class)));
        when(scanBatchRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        assertThat(service.recompute(batchId)).isEqualTo(BatchStatus.NEED_REVIEW);
    }

    @Test
    void allActive_noBlockingConflict_returnsReadyToApprove() {
        ScanBatch batch = batchWithStatus(BatchStatus.PROCESSING);
        when(scanBatchRepository.findById(batchId)).thenReturn(Optional.of(batch));
        when(scanImageRepository.findByScanBatchId(batchId)).thenReturn(List.of(image(ImageStatus.ACTIVE)));
        when(conflictService.openBlocking(batchId)).thenReturn(List.of());
        when(scanBatchRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        assertThat(service.recompute(batchId)).isEqualTo(BatchStatus.READY_TO_APPROVE);
    }

    @Test
    void replacedImages_areIgnored_onlyRelevantImagesCounted() {
        ScanBatch batch = batchWithStatus(BatchStatus.PROCESSING);
        when(scanBatchRepository.findById(batchId)).thenReturn(Optional.of(batch));
        when(scanImageRepository.findByScanBatchId(batchId)).thenReturn(List.of(
                image(ImageStatus.REPLACED), image(ImageStatus.ACTIVE)));
        when(conflictService.openBlocking(batchId)).thenReturn(List.of());
        when(scanBatchRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        assertThat(service.recompute(batchId)).isEqualTo(BatchStatus.READY_TO_APPROVE);
    }

    @Test
    void terminalBatch_neverRecomputed_shortCircuits() {
        ScanBatch batch = batchWithStatus(BatchStatus.APPROVED);
        when(scanBatchRepository.findById(batchId)).thenReturn(Optional.of(batch));

        assertThat(service.recompute(batchId)).isEqualTo(BatchStatus.APPROVED);
        verify(scanImageRepository, never()).findByScanBatchId(any());
        verify(scanBatchRepository, never()).save(any());
    }

    private ScanBatch batchWithStatus(BatchStatus status) {
        return ScanBatch.builder()
                .id(batchId)
                .documentType(OcrTargetType.PRODUCTION_RECORD)
                .workDate(LocalDate.of(2026, 8, 22))
                .batchType(BatchType.PRIMARY)
                .status(status)
                .build();
    }

    private ScanImage image(ImageStatus status) {
        return ScanImage.builder().id(UUID.randomUUID()).status(status).build();
    }
}
