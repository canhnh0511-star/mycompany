package com.mycompany.api.service;

import com.mycompany.api.dto.ActiveSupplementInfo;
import com.mycompany.api.dto.DerivedTeamStatus;
import com.mycompany.api.dto.EmployeeProductionRow;
import com.mycompany.api.dto.EmployeeSearchResult;
import com.mycompany.api.dto.LatexTypeKg;
import com.mycompany.api.dto.MonthlyProductionResponse;
import com.mycompany.api.dto.PendingMoveInfo;
import com.mycompany.api.dto.ProductionSummaryDailyResponse;
import com.mycompany.api.dto.TeamBreakdownResponse;
import com.mycompany.api.dto.TeamProductionSummary;
import com.mycompany.api.entity.BatchStatus;
import com.mycompany.api.entity.BatchType;
import com.mycompany.api.entity.ImageStatus;
import com.mycompany.api.entity.LatexType;
import com.mycompany.api.entity.OcrTargetType;
import com.mycompany.api.entity.ProductionRecord;
import com.mycompany.api.entity.ProductionRecordItem;
import com.mycompany.api.entity.RecordSource;
import com.mycompany.api.entity.RecordStatus;
import com.mycompany.api.entity.ScanBatch;
import com.mycompany.api.entity.ScanImage;
import com.mycompany.api.entity.Team;
import com.mycompany.api.repository.EmployeeRepository;
import com.mycompany.api.repository.LatexTypeRepository;
import com.mycompany.api.repository.OfficialProductionRow;
import com.mycompany.api.repository.ProductionAggregateRow;
import com.mycompany.api.repository.ProductionRecordItemRepository;
import com.mycompany.api.repository.ProductionRecordRepository;
import com.mycompany.api.repository.ScanBatchRepository;
import com.mycompany.api.repository.ScanImageRepository;
import com.mycompany.api.repository.TeamRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * "Sản lượng v2" (Phase 4, Spec 2 docs/specs/spec-2-san-luong-v2.md) — projection/aggregation THUẦN
 * từ dữ liệu nghiệp vụ nguồn đã có (Spec 2 §0/§2), KHÔNG tạo nguồn dữ liệu mới, KHÔNG lưu aggregate
 * độc lập (§43). Audit trước khi code (docs/plans/0021...) xác nhận: filter đơn giản
 * {@code ProductionRecord.status = APPROVED} đã đủ AN TOÀN chống double-count (RecordStatus chỉ đạt
 * APPROVED qua đúng 1 đường hợp lệ — xem javadoc {@link ScanBatchService#approve}), nên KHÔNG cần
 * join scan_batches cho phần tính tổng kg — chỉ cần join cho phần derived team status (Case A-G).
 *
 * Phạm vi: CHỈ production_records (sản lượng cá nhân) — latex_sales (bán mủ theo Tổ) là luồng nghiệp
 * vụ khác (CLAUDE.md §1), không thuộc "Sản lượng" theo cách dùng của Spec 2 (ví dụ mục 9/13/17 đều
 * breakdown theo NHÂN VIÊN, latex_sales không có employee_id).
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProductionSummaryService {

    private final TeamRepository teamRepository;
    private final LatexTypeRepository latexTypeRepository;
    private final ProductionRecordItemRepository productionRecordItemRepository;
    private final ProductionRecordRepository productionRecordRepository;
    private final ScanBatchRepository scanBatchRepository;
    private final ScanBatchCreationService scanBatchCreationService;
    private final ScanImageRepository scanImageRepository;
    private final EmployeeRepository employeeRepository;
    private final SupabaseStorageService storageService;

    private static final int PHOTO_READ_URL_TTL_SECONDS = 3600;

    // Case nào coi là "còn việc Admin cần xử lý" — quyết định hasPendingIssues/banner cảnh báo.
    // Suy ra từ đối chiếu 2 ví dụ Spec 2 §46 vs §48: §46 có 1 Tổ "Đang xử lý OCR" (Case B, tự động,
    // KHÔNG cần user act) nhưng KHÔNG hiện banner; §48 có 1 Tổ NEED_REVIEW (Case C, cần user act) VÀ
    // hiện banner "⚠ Còn dữ liệu chưa hoàn tất". Case B/A không tính vào đây.
    private static final Set<DerivedTeamStatus> NEEDS_ACTION = Set.of(
            DerivedTeamStatus.NEEDS_REVIEW, DerivedTeamStatus.READY_TO_APPROVE,
            DerivedTeamStatus.APPROVED_WITH_ACTIVE_SUPPLEMENT, DerivedTeamStatus.FAILED);

    public ProductionSummaryDailyResponse getDaily(LocalDate workDate, UUID teamId, String latexTypeCode) {
        List<Team> teams = resolveTeams(teamId);
        List<OfficialProductionRow> rows =
                productionRecordItemRepository.aggregateOfficialProduction(workDate, teamId, latexTypeCode);

        Map<String, BigDecimal> kgByType = new LinkedHashMap<>();
        Map<UUID, BigDecimal> kgByTeam = new LinkedHashMap<>();
        Map<UUID, Set<UUID>> employeesByTeam = new LinkedHashMap<>();
        BigDecimal totalKg = BigDecimal.ZERO;
        for (OfficialProductionRow r : rows) {
            kgByType.merge(r.latexTypeCode(), r.kg(), BigDecimal::add);
            kgByTeam.merge(r.teamId(), r.kg(), BigDecimal::add);
            employeesByTeam.computeIfAbsent(r.teamId(), k -> new HashSet<>()).add(r.employeeId());
            totalKg = totalKg.add(r.kg());
        }

        List<TeamProductionSummary> teamSummaries = teams.stream()
                .map(team -> buildTeamSummary(team, workDate,
                        kgByTeam.getOrDefault(team.getId(), BigDecimal.ZERO),
                        employeesByTeam.getOrDefault(team.getId(), Set.of()).size()))
                .toList();

        boolean hasPendingIssues = teamSummaries.stream().anyMatch(t -> NEEDS_ACTION.contains(t.derivedStatus()));

        return new ProductionSummaryDailyResponse(
                workDate, totalKg, toLatexTypeKgList(kgByType), hasPendingIssues, teamSummaries);
    }

    public TeamBreakdownResponse getTeamBreakdown(UUID teamId, LocalDate workDate, String latexTypeCode) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy Tổ với id=" + teamId));
        List<ProductionRecord> records = productionRecordRepository.findAll(
                ProductionRecordSpecifications.withFilters(teamId, null, workDate, workDate, RecordStatus.APPROVED));

        Map<String, BigDecimal> teamKgByType = new LinkedHashMap<>();
        BigDecimal teamTotalKg = BigDecimal.ZERO;
        List<EmployeeProductionRow> employeeRows = new ArrayList<>();
        for (ProductionRecord record : records) {
            List<ProductionRecordItem> items = record.getItems().stream()
                    .filter(i -> latexTypeCode == null || latexTypeCode.equals(i.getLatexType().getCode()))
                    .toList();
            // Filter loại mủ (Spec 2 §21) — nhân viên không có dòng mủ đó thì không hiển thị luôn,
            // tránh hiện hàng "0 kg" gây hiểu nhầm.
            if (latexTypeCode != null && items.isEmpty()) {
                continue;
            }
            Map<String, BigDecimal> kgByType = new LinkedHashMap<>();
            BigDecimal recordTotalKg = BigDecimal.ZERO;
            BigDecimal drcPercent = null;
            for (ProductionRecordItem item : items) {
                kgByType.merge(item.getLatexType().getCode(), item.getKg(), BigDecimal::add);
                recordTotalKg = recordTotalKg.add(item.getKg());
                if ("water".equals(item.getLatexType().getCode())) {
                    drcPercent = item.getDrcPercent();
                }
                teamKgByType.merge(item.getLatexType().getCode(), item.getKg(), BigDecimal::add);
            }
            teamTotalKg = teamTotalKg.add(recordTotalKg);

            ScanBatch scanBatch = record.getScanBatch();
            employeeRows.add(new EmployeeProductionRow(
                    record.getEmployee().getId(), record.getEmployee().getFullName(), record.getId(),
                    toLatexTypeKgList(kgByType), drcPercent, recordTotalKg,
                    record.getSource() == RecordSource.OCR_IMPORT ? "OCR" : "MANUAL",
                    scanBatch == null ? null : scanBatch.getBatchType().name(),
                    storageService.createSignedReadUrl(record.getPhotoUrl(), PHOTO_READ_URL_TTL_SECONDS),
                    record.getScanImage() == null ? null : record.getScanImage().getId()));
        }
        employeeRows.sort(Comparator.comparing(EmployeeProductionRow::employeeName));

        return new TeamBreakdownResponse(
                team.getId(), team.getName(), workDate, teamTotalKg, toLatexTypeKgList(teamKgByType), employeeRows);
    }

    // ============================================================= monthly (Spec 2 §35, SHOULD)

    // Tái dùng ProductionRecordItemRepository.aggregateForReport (đã có sẵn cho ReportService, cùng
    // filter status=APPROVED) — Spec 2 §42 "Không tạo API mới nếu source đã có API phù hợp" áp dụng ở
    // tầng query, tránh viết lại 1 query gần như y hệt. Không breakdown theo Tổ trong response (khớp
    // ví dụ Spec 2 §35 — "Theo loại mủ" phẳng); lọc 1 Tổ cụ thể dùng tham số teamId.
    public MonthlyProductionResponse getMonthly(YearMonth yearMonth, UUID teamId) {
        LocalDate from = yearMonth.atDay(1);
        LocalDate to = yearMonth.atEndOfMonth();
        List<ProductionAggregateRow> rows = productionRecordItemRepository.aggregateForReport(from, to, teamId, null);

        Map<String, BigDecimal> kgByType = new LinkedHashMap<>();
        BigDecimal totalKg = BigDecimal.ZERO;
        for (ProductionAggregateRow r : rows) {
            kgByType.merge(r.latexTypeCode(), r.totalKg(), BigDecimal::add);
            totalKg = totalKg.add(r.totalKg());
        }
        return new MonthlyProductionResponse(yearMonth.toString(), totalKg, toLatexTypeKgList(kgByType));
    }

    // ============================================================= employee-search (Spec 2 §38, SHOULD)

    public List<EmployeeSearchResult> searchEmployees(String query, UUID teamId) {
        return employeeRepository.searchActiveByFullName(query, teamId).stream()
                .map(e -> new EmployeeSearchResult(e.getId(), e.getFullName(), e.getTeam().getId(), e.getTeam().getName()))
                .toList();
    }

    // ============================================================= derived team status (Spec 2 §6)

    private TeamProductionSummary buildTeamSummary(
            Team team, LocalDate workDate, BigDecimal officialKg, int employeesWithProduction) {
        Optional<ScanBatch> primary =
                scanBatchCreationService.findLatestPrimary(OcrTargetType.PRODUCTION_RECORD, workDate, team.getId());

        if (primary.isEmpty()) {
            // Không có PRIMARY non-CANCELLED cho team/ngày này. KHÔNG thể kết luận ngay Case A — dữ
            // liệu "Nhập tay" (RecordSource.MANUAL, ADR-0007) hoàn toàn không đi qua Scan Session nên
            // KHÔNG BAO GIỜ có ScanBatch để tìm thấy ở đây, dù đã có sản lượng thật (APPROVED ngay lúc
            // lưu, không qua NEED_REVIEW/READY_TO_APPROVE) — bug phát hiện khi test thật (2026-08-24):
            // Tổ chỉ nhập tay bị báo "Chưa có dữ liệu" dù officialKg > 0. Coi officialKg > 0 (tương
            // đương employeesWithProduction > 0, 2 giá trị cùng nguồn) là tín hiệu đáng tin: nếu có,
            // đây thực chất là Case E — dữ liệu đã chính thức, không có pipeline batch nào để theo dõi.
            // Không thể có Supplement active mồ côi khi primary rỗng: mọi Supplement trỏ originalBatch
            // về 1 PRIMARY đã APPROVED, mà APPROVED là terminal/immutable (RULE 10, Spec 1) nên không
            // bao giờ bị CANCELLED sau đó.
            DerivedTeamStatus status = employeesWithProduction > 0 ? DerivedTeamStatus.APPROVED : DerivedTeamStatus.NO_DATA;
            return new TeamProductionSummary(
                    team.getId(), team.getName(), status, null, officialKg, employeesWithProduction, List.of(), null);
        }

        ScanBatch batch = primary.get();
        DerivedTeamStatus status;
        ActiveSupplementInfo supplementInfo = null;
        switch (batch.getStatus()) {
            case DRAFT, UPLOADING, PROCESSING -> status = DerivedTeamStatus.PROCESSING; // Case B
            case NEED_REVIEW, PARTIAL_FAILED -> status = DerivedTeamStatus.NEEDS_REVIEW; // Case C
            case READY_TO_APPROVE -> status = DerivedTeamStatus.READY_TO_APPROVE; // Case D
            case FAILED -> status = DerivedTeamStatus.FAILED; // Case G
            case APPROVED -> {
                Optional<ScanBatch> activeSupplement = scanBatchRepository.findByOriginalBatchIdAndBatchTypeAndStatusIn(
                        batch.getId(), BatchType.SUPPLEMENT,
                        Arrays.stream(BatchStatus.values()).filter(BatchStatus::isActiveSupplement).toList());
                if (activeSupplement.isPresent()) {
                    status = DerivedTeamStatus.APPROVED_WITH_ACTIVE_SUPPLEMENT; // Case F
                    supplementInfo = new ActiveSupplementInfo(
                            activeSupplement.get().getId(), activeSupplement.get().getStatus().name());
                } else {
                    status = DerivedTeamStatus.APPROVED; // Case E
                }
            }
            case CANCELLED -> throw new IllegalStateException(
                    "findLatestPrimary không bao giờ trả CANCELLED (statusNot filter) — batch_id=" + batch.getId());
            default -> throw new IllegalStateException("Unreachable — status=" + batch.getStatus());
        }

        return new TeamProductionSummary(
                team.getId(), team.getName(), status, batch.getId(), officialKg, employeesWithProduction,
                pendingMoveInfoFor(batch), supplementInfo);
    }

    // Spec 2 §25 — ảnh PENDING_MOVE thuộc PRIMARY batch này (đang chờ Supplement đích được approve),
    // KHÔNG tính vào officialKg (đã tự loại vì record dưới ảnh này còn DRAFT, chưa APPROVED — xem
    // javadoc class). Chỉ để UI giải thích tại sao "thiếu" số so với kỳ vọng, không phải bug.
    private List<PendingMoveInfo> pendingMoveInfoFor(ScanBatch primaryBatch) {
        List<ScanImage> pending = scanImageRepository.findByScanBatchIdAndStatus(primaryBatch.getId(), ImageStatus.PENDING_MOVE);
        if (pending.isEmpty()) {
            return List.of();
        }
        Map<LocalDate, Integer> countByTargetDate = new LinkedHashMap<>();
        for (ScanImage img : pending) {
            LocalDate targetDate = scanBatchRepository.findById(img.getPendingMoveTargetBatchId())
                    .map(ScanBatch::getWorkDate)
                    .orElse(null);
            if (targetDate != null) {
                countByTargetDate.merge(targetDate, 1, Integer::sum);
            }
        }
        return countByTargetDate.entrySet().stream()
                .map(e -> new PendingMoveInfo(e.getKey(), e.getValue()))
                .toList();
    }

    // ============================================================= helpers

    private List<Team> resolveTeams(UUID teamId) {
        if (teamId == null) {
            return teamRepository.findAll();
        }
        return List.of(teamRepository.findById(teamId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy Tổ với id=" + teamId)));
    }

    private List<LatexTypeKg> toLatexTypeKgList(Map<String, BigDecimal> kgByType) {
        List<LatexType> latexTypes = latexTypeRepository.findAll().stream()
                .sorted(Comparator.comparing(LatexType::getCode))
                .toList();
        return latexTypes.stream()
                .filter(lt -> kgByType.containsKey(lt.getCode()))
                .map(lt -> new LatexTypeKg(lt.getCode(), lt.getLabel(), kgByType.get(lt.getCode())))
                .collect(Collectors.toList());
    }
}
