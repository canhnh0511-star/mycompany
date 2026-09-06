import type { ProductionRecordFull } from '../api/productionRecordsList.api';

/**
 * "Danh sách phiếu" giờ hiện 1 dòng / (Tổ, Ngày) — tổng sản lượng của TẤT CẢ nhân viên trong Tổ đó,
 * ngày đó — thay vì 1 dòng / nhân viên như bản cũ (yêu cầu đổi màn hình). Aggregate ở FE (không có
 * API aggregate riêng ở backend) — an toàn vì trang gọi `listProductionRecords` với size đủ rộng,
 * không phân trang server (xem comment ở `productionRecordsList.api.ts`).
 */
export interface ProductionRecordsAggregateRow {
  /** `${teamId}|${recordDate}` — key nhóm, cũng dùng làm `key` khi render danh sách. */
  key: string;
  teamId: string;
  teamName: string;
  recordDate: string;
  /** Tổng kg theo từng loại mủ, key = latexTypeId (khớp `useLatexTypes()` để map cột động). */
  totalKgByLatexTypeId: Record<string, number>;
  /** Trạng thái tổng hợp của cả nhóm — xem logic chọn ở dưới. */
  status: string;
  /** "Ngày upload" của dòng aggregate = `createdAt` MỚI NHẤT trong nhóm (phản ánh lần ghi
   * nhận/tải ảnh gần nhất của Tổ/ngày đó, dù record nào trong nhóm được sửa sau cùng). */
  latestCreatedAt: string;
  employeeCount: number;
}

/**
 * Trạng thái tổng hợp: ưu tiên DRAFT (còn phiếu chưa duyệt thì cả nhóm vẫn "chưa xong", cần Admin
 * chú ý) > APPROVED (còn ít nhất 1 phiếu hợp lệ đã duyệt) > CANCELLED (chỉ khi TẤT CẢ đã hủy — nhóm
 * coi như không có dữ liệu thật). Quyết định tương tự cho tổng kg: bỏ qua record CANCELLED khi cộng
 * dồn — 1 phiếu đã hủy không nên tính vào sản lượng thật của Tổ/ngày đó.
 */
function pickAggregateStatus(statuses: string[]): string {
  if (statuses.includes('DRAFT')) return 'DRAFT';
  if (statuses.includes('APPROVED')) return 'APPROVED';
  return 'CANCELLED';
}

export function aggregateByTeamDate(records: ProductionRecordFull[]): ProductionRecordsAggregateRow[] {
  const groups = new Map<
    string,
    { teamId: string; teamName: string; recordDate: string; records: ProductionRecordFull[] }
  >();

  for (const record of records) {
    const key = `${record.teamId}|${record.recordDate}`;
    const group = groups.get(key);
    if (group) {
      group.records.push(record);
    } else {
      groups.set(key, { teamId: record.teamId, teamName: record.teamName, recordDate: record.recordDate, records: [record] });
    }
  }

  return Array.from(groups.entries()).map(([key, group]) => {
    const totalKgByLatexTypeId: Record<string, number> = {};
    let latestCreatedAt = group.records[0].createdAt;

    for (const record of group.records) {
      if (record.createdAt > latestCreatedAt) latestCreatedAt = record.createdAt;
      if (record.status === 'CANCELLED') continue; // phiếu đã hủy -> không tính vào tổng sản lượng
      for (const item of record.items) {
        totalKgByLatexTypeId[item.latexTypeId] = (totalKgByLatexTypeId[item.latexTypeId] ?? 0) + item.kg;
      }
    }

    return {
      key,
      teamId: group.teamId,
      teamName: group.teamName,
      recordDate: group.recordDate,
      totalKgByLatexTypeId,
      status: pickAggregateStatus(group.records.map((r) => r.status)),
      latestCreatedAt,
      employeeCount: group.records.length,
    };
  });
}
