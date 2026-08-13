import type { RecordStatus } from '@/types/api';
import type { StatusTone } from '@/components/StatusBadge';

/**
 * Mapping tập trung RecordStatus (backend enum, `services/api/entity/RecordStatus.java`) → nhãn tiếng
 * Việt + tone hiển thị — CLAUDE.md §19 "Status phải nhất quán toàn hệ thống", UI_UX_GUIDE_RUBBER_FARM.md
 * §37.8 "Tạo mapping status tập trung". Trước đây mỗi màn tự viết `statusLabel()`/`statusBadgeClass()`
 * riêng (vd `LookupScreen.tsx`) — gộp về đây để sửa 1 chỗ, dùng lại ở mọi nơi hiển thị
 * production_records/latex_sales/attendance_records.
 *
 * `DRAFT` dùng tone "warning" (không phải "neutral") vì trong luồng OCR (CLAUDE.md §5) draft nghĩa là
 * "chưa qua xác nhận, cần Admin xem lại" — đúng tinh thần ⚠ Cần kiểm tra của UI_UX_GUIDE §10, không chỉ
 * là 1 trạng thái trung tính.
 */
export function recordStatusLabel(status: RecordStatus): string {
  switch (status) {
    case 'DRAFT':
      return 'Nháp';
    case 'CANCELLED':
      return 'Đã hủy';
    case 'CONFIRMED':
      return 'Đã xác nhận';
  }
}

export function recordStatusTone(status: RecordStatus): StatusTone {
  switch (status) {
    case 'DRAFT':
      return 'warning';
    case 'CANCELLED':
      return 'error';
    case 'CONFIRMED':
      return 'success';
  }
}
