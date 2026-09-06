import { useMemo, useState } from 'react';
import { Stack } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SectionPanel } from '../../../components/common/SectionPanel';
import { toIsoDate } from '../../../utils/format';
import { ProductionRecordsFilterBar } from '../components/ProductionRecordsFilterBar';
import { ProductionRecordsTable } from '../components/ProductionRecordsTable';
import { useLatexTypes, useProductionRecordsList, useTeams } from '../hooks/useProductionRecordsList';
import { aggregateByTeamDate } from '../utils/aggregateByTeamDate';

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return toIsoDate(d);
}

/**
 * Danh sách phiếu (/san-luong) — tra cứu/lọc Production Records, aggregate 1 dòng / (Tổ, Ngày)
 * (yêu cầu đổi màn hình — trước đây 1 dòng / nhân viên / ngày). Path giữ nguyên từ nav cũ
 * (`TeamStatusPanel` ở Home deep-link `/san-luong?date=...`) — đọc `date` từ query string để mặc
 * định khoảng ngày = đúng ngày đó khi đi từ Home vào.
 *
 * Bấm vào 1 dòng -> điều hướng sang `/phieu?date=...&teamId=...` (Nhập phiếu hàng ngày), tái dùng
 * đúng UI lúc nhập liệu thay vì xây thêm 1 panel chi tiết kiểu khác (yêu cầu đổi màn hình). Vì vậy
 * bỏ hẳn `ProductionRecordDetailPanel` cũ cùng 2 action "Duyệt phiếu"/"Hủy" theo TỪNG record — hành
 * động đó không còn khớp 1 dòng aggregate cả Tổ, và trong thực tế đã có đường khác để xử lý DRAFT:
 * record nhập tay tự động confirmed (`CreateProductionRecordRequest`), record từ OCR được duyệt qua
 * "Duyệt phiếu" cấp BATCH ngay tại `/phieu` (`ScanBatchPhotoPanel`) — không mất khả năng duyệt/hủy
 * nào đang thực sự được dùng.
 */
export function ProductionRecordsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get('date');

  const [teamId, setTeamId] = useState(searchParams.get('teamId') ?? '');
  const [fromDate, setFromDate] = useState(dateParam ?? daysAgoIso(6));
  const [toDate, setToDate] = useState(dateParam ?? toIsoDate(new Date()));
  const [status, setStatus] = useState('');

  const filters = useMemo(
    () => ({
      teamId: teamId || undefined,
      fromDate,
      toDate,
      status: status || undefined,
    }),
    [teamId, fromDate, toDate, status],
  );

  const { data, isLoading, isError, refetch } = useProductionRecordsList(filters);
  const { data: teams } = useTeams();
  const { data: latexTypes } = useLatexTypes();

  const rows = useMemo(() => (data ? aggregateByTeamDate(data.content) : undefined), [data]);

  return (
    <Stack spacing={2.5}>
      <ProductionRecordsFilterBar
        teamId={teamId}
        onTeamIdChange={setTeamId}
        fromDate={fromDate}
        onFromDateChange={setFromDate}
        toDate={toDate}
        onToDateChange={setToDate}
        status={status}
        onStatusChange={setStatus}
        teams={teams ?? []}
      />

      <SectionPanel title="Danh sách phiếu" noContentPadding>
        <ProductionRecordsTable
          rows={rows}
          latexTypes={latexTypes ?? []}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          onSelect={(row) => navigate(`/phieu?date=${row.recordDate}&teamId=${row.teamId}`)}
        />
      </SectionPanel>
    </Stack>
  );
}
