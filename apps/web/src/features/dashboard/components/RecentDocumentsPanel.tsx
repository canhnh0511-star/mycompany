import { Box, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { SectionPanel } from '../../../components/common/SectionPanel';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { LoadingSkeleton } from '../../../components/feedback/LoadingSkeleton';
import { WidgetErrorState } from '../../../components/feedback/WidgetErrorState';
import { WidgetEmptyState } from '../../../components/feedback/WidgetEmptyState';
import { useRecentDocuments } from '../hooks/useDashboard';
import { DOCUMENT_STATUS_LABEL, DOCUMENT_STATUS_TONE, DOCUMENT_TYPE_LABEL } from '../model/dashboard.types';
import { formatDate } from '../../../utils/format';

/** spec §26/§27 — chỉ 4–6 dòng, không biến Home thành trang quản lý phiếu. */
export function RecentDocumentsPanel({ workDate }: { workDate: string }) {
  const { data, isLoading, isError, refetch } = useRecentDocuments(workDate);
  const navigate = useNavigate();

  return (
    <SectionPanel title="Phiếu mới nhất" actionLabel="Xem tất cả" actionHref={`/phieu?date=${workDate}`}>
      {isLoading ? (
        <LoadingSkeleton rows={4} rowHeight={36} />
      ) : isError ? (
        <WidgetErrorState message="Không thể tải danh sách phiếu mới nhất." onRetry={() => refetch()} />
      ) : !data || data.length === 0 ? (
        <WidgetEmptyState title="Chưa có phiếu nào hôm nay" />
      ) : (
        <Box sx={{ overflowX: 'auto', mx: -2.5 }}>
          <Box sx={{ minWidth: 520, px: 2.5 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Mã phiếu</TableCell>
                  <TableCell>Loại phiếu</TableCell>
                  <TableCell>Ngày</TableCell>
                  <TableCell>Tổ</TableCell>
                  <TableCell>Trạng thái</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.slice(0, 6).map((doc) => (
                  <TableRow
                    key={doc.id}
                    hover
                    onClick={() => navigate(`/phieu/${doc.id}`)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{doc.code}</TableCell>
                    <TableCell>{DOCUMENT_TYPE_LABEL[doc.documentType]}</TableCell>
                    <TableCell>{formatDate(doc.recordDate)}</TableCell>
                    <TableCell>{doc.teamName}</TableCell>
                    <TableCell>
                      <StatusBadge label={DOCUMENT_STATUS_LABEL[doc.status]} tone={DOCUMENT_STATUS_TONE[doc.status]} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Box>
      )}
    </SectionPanel>
  );
}
