package com.mycompany.api.repository;

import com.mycompany.api.entity.ProductionRecordItem;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProductionRecordItemRepository extends JpaRepository<ProductionRecordItem, UUID> {

    // Dùng để chặn xóa 1 LatexType đang bị tham chiếu (docs/TASKS.md Phase 1).
    boolean existsByLatexTypeId(UUID latexTypeId);

    // Report sản lượng cá nhân (docs/TASKS.md Phase 4) — CHỈ tính bản ghi APPROVED (dữ liệu chưa duyệt
    // không được lọt vào báo cáo/bảng lương). ReportService pivot kết quả phẳng này thành ma trận.
    @Query("""
            SELECT new com.mycompany.api.repository.ProductionAggregateRow(
                pr.employee.id, pr.employee.fullName, pr.team.id, pr.team.name, pri.latexType.code, SUM(pri.kg))
            FROM ProductionRecordItem pri
              JOIN pri.productionRecord pr
            WHERE pr.status = com.mycompany.api.entity.RecordStatus.APPROVED
              AND pr.recordDate BETWEEN :fromDate AND :toDate
              AND (:teamId IS NULL OR pr.team.id = :teamId)
              AND (:employeeId IS NULL OR pr.employee.id = :employeeId)
            GROUP BY pr.employee.id, pr.employee.fullName, pr.team.id, pr.team.name, pri.latexType.code
            """)
    List<ProductionAggregateRow> aggregateForReport(
            @Param("fromDate") LocalDate fromDate, @Param("toDate") LocalDate toDate,
            @Param("teamId") UUID teamId, @Param("employeeId") UUID employeeId);

    // Tổng kg / ngày trong 1 khoảng ngày (docs/module-1-1-frontend-redesign-progress.md — Home "Sản
    // lượng 7 ngày" + trend "so với TB 7 ngày"). CHỈ APPROVED, cùng quy ước aggregateForReport. Chỉ trả
    // về NGÀY CÓ dữ liệu — ReportService tự điền 0 cho ngày trống khi ghép thành dải liên tục.
    // latexTypeCode optional (Đợt 4 Home redesign, 2026-08-25) — lọc chart "Sản lượng 7 ngày" theo 1
    // loại mủ cụ thể (vd "water"/"cup"); NULL = tổng tất cả loại (hành vi cũ, không đổi khi không truyền).
    // "Khác" (mủ dây + mủ đông) KHÔNG special-case ở query này — frontend tự gọi 2 lần (strip/coagulated)
    // rồi cộng dồn client-side, tránh phải thêm cú pháp IN(...) cho 1 trường hợp lọc gộp duy nhất.
    @Query("""
            SELECT new com.mycompany.api.repository.DailyTotalRow(pr.recordDate, SUM(pri.kg))
            FROM ProductionRecordItem pri
              JOIN pri.productionRecord pr
            WHERE pr.status = com.mycompany.api.entity.RecordStatus.APPROVED
              AND pr.recordDate BETWEEN :fromDate AND :toDate
              AND (:teamId IS NULL OR pr.team.id = :teamId)
              AND (:latexTypeCode IS NULL OR pri.latexType.code = :latexTypeCode)
            GROUP BY pr.recordDate
            """)
    List<DailyTotalRow> aggregateDailyTotals(
            @Param("fromDate") LocalDate fromDate, @Param("toDate") LocalDate toDate, @Param("teamId") UUID teamId,
            @Param("latexTypeCode") String latexTypeCode);

    // Official Production cho Sản lượng v2 (Phase 4, Spec 2 §3/§8) — CHỈ tính record status=APPROVED,
    // giống hệt quy ước aggregateForReport (audit Phase 4 xác nhận filter đơn giản này ĐÃ đủ tránh
    // double-count: record dưới ảnh PENDING_MOVE/batch CANCELLED/retry FAILED không bao giờ đạt
    // APPROVED — xem docs/plans/0021-scan-batch-and-production-summary-plan.md phần audit). Group theo
    // cả 3 chiều (team, employee, latexType) trong 1 query — ProductionSummaryService tự pivot tiếp cho
    // summary/team-breakdown/employee-count, tránh 3 round-trip DB riêng cho 1 lần xem "Sản lượng".
    @Query("""
            SELECT new com.mycompany.api.repository.OfficialProductionRow(
                pr.team.id, pr.team.name, pr.employee.id, pri.latexType.code, SUM(pri.kg))
            FROM ProductionRecordItem pri
              JOIN pri.productionRecord pr
            WHERE pr.status = com.mycompany.api.entity.RecordStatus.APPROVED
              AND pr.recordDate = :workDate
              AND (:teamId IS NULL OR pr.team.id = :teamId)
              AND (:latexTypeCode IS NULL OR pri.latexType.code = :latexTypeCode)
            GROUP BY pr.team.id, pr.team.name, pr.employee.id, pri.latexType.code
            """)
    List<OfficialProductionRow> aggregateOfficialProduction(
            @Param("workDate") LocalDate workDate, @Param("teamId") UUID teamId,
            @Param("latexTypeCode") String latexTypeCode);

    // Đối chiếu tổng cột OCR đọc từ dòng "Tổng cộng" trên phiếu giấy với tổng thực tế đã tạo record
    // cho ĐÚNG 1 ảnh (0021-scan-batch-model, phát hiện khi test thật 2026-08-23 — OCR đọc nhầm cột Mủ
    // dây thành Mủ đông dù cả 2 cột đều rõ ràng, không bị che khuất). KHÔNG lọc status CANCELLED —
    // gọi ngay sau khi tạo xong record cho ảnh, record vừa tạo luôn ở draft/confirmed, chưa thể bị
    // cancel giữa chừng trong cùng request.
    @Query("""
            SELECT new com.mycompany.api.repository.ImageLatexTotalRow(pri.latexType.code, SUM(pri.kg))
            FROM ProductionRecordItem pri
              JOIN pri.productionRecord pr
            WHERE pr.scanImage.id = :scanImageId
            GROUP BY pri.latexType.code
            """)
    List<ImageLatexTotalRow> sumKgByScanImage(@Param("scanImageId") UUID scanImageId);

    // Home dashboard (Module 1.1) — sản lượng "hôm nay" tổng quan: tính CẢ draft lẫn approved (khác
    // aggregateOfficialProduction chỉ APPROVED) vì đây là cái nhìn nhanh trong ngày cho Admin, không
    // phải báo cáo chính thức chốt sổ (yêu cầu nghiệp vụ dashboard, không phải Official Production).
    // status <> CANCELLED để loại bản ghi đã hủy. Group theo cả team/employee/latexType trong 1 query,
    // service layer tự pivot cho KPI tổng quan / breakdown theo Tổ / đếm workforce present — cùng tinh
    // thần aggregateOfficialProduction, tránh nhiều round-trip DB cho 1 lần load Home.
    @Query("""
            SELECT new com.mycompany.api.repository.OfficialProductionRow(
                pr.team.id, pr.team.name, pr.employee.id, pri.latexType.code, SUM(pri.kg))
            FROM ProductionRecordItem pri
              JOIN pri.productionRecord pr
            WHERE pr.status <> com.mycompany.api.entity.RecordStatus.CANCELLED
              AND pr.recordDate = :date
            GROUP BY pr.team.id, pr.team.name, pr.employee.id, pri.latexType.code
            """)
    List<OfficialProductionRow> aggregateActiveProductionByDate(@Param("date") LocalDate date);
}
