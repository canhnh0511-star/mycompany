import type { AttendanceRecordStatus, BatchStatus, DerivedTeamStatus, RecordStatus } from '@/types/api';
import type { StatusTone } from '@/components/StatusBadge';

/**
 * Mapping tập trung RecordStatus/AttendanceRecordStatus (backend enum,
 * `services/api/entity/RecordStatus.java` + `AttendanceRecordStatus.java`) → nhãn tiếng Việt + tone
 * hiển thị — CLAUDE.md §19 "Status phải nhất quán toàn hệ thống", UI_UX_GUIDE_RUBBER_FARM.md §37.8
 * "Tạo mapping status tập trung". Trước đây mỗi màn tự viết `statusLabel()`/`statusBadgeClass()` riêng
 * (vd `LookupScreen.tsx`) — gộp về đây để sửa 1 chỗ, dùng lại ở mọi nơi hiển thị
 * production_records/latex_sales/attendance_records.
 *
 * 2 union type khác nhau (0021-scan-batch-model: RecordStatus đổi CONFIRMED→APPROVED cho
 * production_records/latex_sales; attendance_records tách riêng AttendanceRecordStatus, giữ nguyên
 * CONFIRMED) nhưng cùng ý nghĩa hiển thị — nhận cả 2, gộp APPROVED/CONFIRMED thành 1 nhãn.
 *
 * `DRAFT` dùng tone "warning" (không phải "neutral") vì trong luồng OCR (CLAUDE.md §5) draft nghĩa là
 * "chưa qua xác nhận, cần Admin xem lại" — đúng tinh thần ⚠ Cần kiểm tra của UI_UX_GUIDE §10, không chỉ
 * là 1 trạng thái trung tính.
 */
export function recordStatusLabel(status: RecordStatus | AttendanceRecordStatus): string {
  switch (status) {
    case 'DRAFT':
      return 'Nháp';
    case 'CANCELLED':
      return 'Đã hủy';
    case 'APPROVED':
    case 'CONFIRMED':
      return 'Đã xác nhận';
  }
}

export function recordStatusTone(status: RecordStatus | AttendanceRecordStatus): StatusTone {
  switch (status) {
    case 'DRAFT':
      return 'warning';
    case 'CANCELLED':
      return 'error';
    case 'APPROVED':
    case 'CONFIRMED':
      return 'success';
  }
}

/**
 * Case A-G "Sản lượng v2" (Phase 5, Spec 2 §6/§46-48 docs/specs/spec-2-san-luong-v2.md) — nhãn/tone
 * hiển thị cho `DerivedTeamStatus` (services/api dto/DerivedTeamStatus.java). Case F (APPROVED_WITH_
 * ACTIVE_SUPPLEMENT) dùng tone "warning" dù phần chính đã APPROVED — đúng tinh thần §5/§30: "không
 * được chỉ show Đã xác nhận" khi còn supplement chưa xử lý, phải nổi bật hơn Case E thuần túy.
 */
export function derivedTeamStatusLabel(status: DerivedTeamStatus): string {
  switch (status) {
    case 'NO_DATA':
      return 'Chưa có dữ liệu';
    case 'PROCESSING':
      return 'Đang xử lý';
    case 'NEEDS_REVIEW':
      return 'Cần kiểm tra';
    case 'READY_TO_APPROVE':
      return 'Chờ xác nhận';
    case 'APPROVED':
      return 'Đã xác nhận';
    case 'APPROVED_WITH_ACTIVE_SUPPLEMENT':
      return 'Đã xác nhận';
    case 'FAILED':
      return 'Xử lý thất bại';
  }
}

export function derivedTeamStatusTone(status: DerivedTeamStatus): StatusTone {
  switch (status) {
    case 'NO_DATA':
      return 'neutral';
    case 'PROCESSING':
      return 'info';
    case 'NEEDS_REVIEW':
    case 'READY_TO_APPROVE':
    case 'APPROVED_WITH_ACTIVE_SUPPLEMENT':
      return 'warning';
    case 'APPROVED':
      return 'success';
    case 'FAILED':
      return 'error';
  }
}

/** Case nào cần Admin chủ động xử lý — đối chiếu Spec 2 §46 vs §48 (PROCESSING không tính, xem cùng
 * lý luận ở services/api ProductionSummaryService.NEEDS_ACTION). Dùng để quyết định hiện nút "Xử lý"
 * trên team card + banner "⚠ Còn dữ liệu chưa hoàn tất" ở đầu màn. */
export function derivedTeamStatusNeedsAction(status: DerivedTeamStatus): boolean {
  return (
    status === 'NEEDS_REVIEW' ||
    status === 'READY_TO_APPROVE' ||
    status === 'APPROVED_WITH_ACTIVE_SUPPLEMENT' ||
    status === 'FAILED'
  );
}

/**
 * `BatchStatus` (0021-scan-batch-model, services/api entity/BatchStatus.java) — vòng đời 1 ScanBatch
 * (pipeline OCR: upload→xử lý→kiểm tra→duyệt), KHÁC `RecordStatus`/`DerivedTeamStatus` ở trên. Chuyển
 * từ `BatchReviewScreen.tsx` ra đây (2026-08-25) để dùng chung với màn danh sách "Chờ kiểm tra" mới
 * (Home) — tránh lệch nhãn nếu mỗi màn tự viết switch riêng.
 */
export function batchStatusLabel(status: BatchStatus): string {
  switch (status) {
    case 'DRAFT':
      return 'Mới tạo';
    case 'UPLOADING':
      return 'Đang tải ảnh…';
    case 'PROCESSING':
      return 'Đang đọc ảnh…';
    case 'NEED_REVIEW':
      return 'Cần kiểm tra';
    case 'READY_TO_APPROVE':
      return 'Sẵn sàng xác nhận';
    case 'PARTIAL_FAILED':
      return 'Một số ảnh lỗi';
    case 'FAILED':
      return 'Lỗi toàn bộ';
    case 'APPROVED':
      return 'Đã xác nhận';
    case 'CANCELLED':
      return 'Đã hủy';
  }
}

export function batchStatusTone(status: BatchStatus): StatusTone {
  switch (status) {
    case 'APPROVED':
      return 'success';
    case 'FAILED':
      return 'error';
    case 'PARTIAL_FAILED':
    case 'NEED_REVIEW':
      return 'warning';
    case 'CANCELLED':
      return 'neutral';
    default:
      return 'info';
  }
}
