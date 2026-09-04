import { useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { LoadingSkeleton } from '../../../components/feedback/LoadingSkeleton';
import { WidgetErrorState } from '../../../components/feedback/WidgetErrorState';
import { formatCurrency, formatNumber } from '../../../utils/format';
import { green, neutral, red } from '../../../theme/colors';
import { uiTokens } from '../../../theme/tokens';
import {
  PAYROLL_ROW_STATUS_LABEL,
  TECHNICAL_GRADE_LABEL,
  type PayrollDetail,
  type TechnicalGrade,
} from '../model/payroll.types';
import {
  usePayrollDetail,
  useUpdateDeductionMutation,
  useUpdateTechnicalGradeMutation,
} from '../hooks/usePayroll';

const STATUS_TONE = {
  CONFIRMED: 'success',
  NEEDS_REVIEW: 'warning',
  MISSING_DATA: 'error',
} as const;

const INCOME_LABELS = ['Mủ nước', 'Mủ tạp'];

function lineRow(label: string, quantity: number, unit: string, unitPrice: number, amount: number) {
  return (
    <Stack key={label} direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
      <Typography sx={{ fontSize: 13.5 }}>{label}</Typography>
      <Typography sx={{ fontSize: 13, color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
        {formatNumber(quantity)} {unit} × {formatCurrency(unitPrice)} ={' '}
        <Typography component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>
          {formatCurrency(amount)}
        </Typography>
      </Typography>
    </Stack>
  );
}

export function PayrollDetailPanel({
  employeeId,
  yearMonth,
  locked,
  onClose,
}: {
  employeeId: string;
  yearMonth: string;
  locked: boolean;
  onClose: () => void;
}) {
  const { data: detail, isLoading, isError, refetch } = usePayrollDetail(employeeId, yearMonth);
  const updateDeduction = useUpdateDeductionMutation(yearMonth);
  const updateGrade = useUpdateTechnicalGradeMutation(yearMonth);

  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: `${uiTokens.radius.panel}px`,
        width: 380,
        flexShrink: 0,
        alignSelf: 'flex-start',
        boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04)',
      }}
    >
      {isLoading && (
        <Box sx={{ p: 2.5 }}>
          <LoadingSkeleton rows={8} />
        </Box>
      )}
      {isError && (
        <Box sx={{ p: 2.5 }}>
          <WidgetErrorState message="Không tải được chi tiết lương." onRetry={() => refetch()} />
        </Box>
      )}
      {detail && (
        <PanelContent
          key={detail.employeeId}
          detail={detail}
          locked={locked}
          onClose={onClose}
          onSaveDeduction={(amount) => updateDeduction.mutate({ employeeId, amount })}
          savingDeduction={updateDeduction.isPending}
          onChangeGrade={(grade) => updateGrade.mutate({ employeeId, grade })}
          savingGrade={updateGrade.isPending}
        />
      )}
    </Paper>
  );
}

function PanelContent({
  detail,
  locked,
  onClose,
  onSaveDeduction,
  savingDeduction,
  onChangeGrade,
  savingGrade,
}: {
  detail: PayrollDetail;
  locked: boolean;
  onClose: () => void;
  onSaveDeduction: (amount: number) => void;
  savingDeduction: boolean;
  onChangeGrade: (grade: TechnicalGrade | null) => void;
  savingGrade: boolean;
}) {
  // Không dùng useEffect để đồng bộ lại khi đổi nhân viên/deduction — PayrollDetailPanel remount
  // PanelContent qua `key={employeeId}` (state tự reset), còn sau khi lưu thành công thì đọc thẳng
  // detail.deduction (đã invalidate + refetch) vì editingDeduction đã tắt ngay trong handleSaveDeduction.
  const [editingDeduction, setEditingDeduction] = useState(false);
  const [deductionInput, setDeductionInput] = useState(String(detail.deduction));

  const gradeLine = detail.lines.find((line) => line.label.startsWith('Hạng kỹ thuật'));
  const incomeLines = detail.lines.filter((line) => INCOME_LABELS.includes(line.label));
  const workLines = detail.lines.filter(
    (line) => !INCOME_LABELS.includes(line.label) && !line.label.startsWith('Hạng kỹ thuật'),
  );

  function handleSaveDeduction() {
    const amount = Number(deductionInput);
    if (Number.isNaN(amount) || amount < 0) return;
    onSaveDeduction(amount);
    setEditingDeduction(false);
  }

  return (
    <Stack>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', p: 2.5, pb: 1.5 }}>
        <Box>
          <Typography variant="h3">{detail.employeeName}</Typography>
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>{detail.teamName}</Typography>
        </Box>
        <IconButton size="small" onClick={onClose} aria-label="Đóng">
          <CloseRoundedIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </Stack>

      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', px: 2.5, pb: 2 }}>
        <StatusBadge label={PAYROLL_ROW_STATUS_LABEL[detail.rowStatus]} tone={STATUS_TONE[detail.rowStatus]} />
        <Box sx={{ textAlign: 'right' }}>
          <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>Thực lãnh</Typography>
          <Typography sx={{ fontSize: 20, fontWeight: 700, color: green[700] }}>
            {formatCurrency(detail.netPay)}
          </Typography>
        </Box>
      </Stack>

      <Box sx={{ px: 2.5, pb: 2 }}>
        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: 'text.secondary', mb: 1 }}>
          THU NHẬP THEO SẢN LƯỢNG
        </Typography>
        <Stack spacing={1}>
          {incomeLines.length > 0 ? (
            incomeLines.map((line) => lineRow(line.label, line.quantity, line.unit, line.unitPrice, line.amount))
          ) : (
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Chưa có sản lượng tháng này.</Typography>
          )}
        </Stack>
      </Box>

      <Box sx={{ px: 2.5, pb: 2 }}>
        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: 'text.secondary', mb: 1 }}>
          CÔNG VIỆC &amp; PHỤ CẤP
        </Typography>
        <Stack spacing={1}>
          {workLines.map((line) => lineRow(line.label, line.quantity, line.unit, line.unitPrice, line.amount))}

          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography sx={{ fontSize: 13.5 }}>Hạng kỹ thuật</Typography>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <TextField
                select
                size="small"
                disabled={locked || savingGrade}
                value={detail.technicalGrade ?? ''}
                onChange={(event) => onChangeGrade((event.target.value || null) as TechnicalGrade | null)}
                sx={{ minWidth: 100, '& .MuiInputBase-input': { fontSize: 13, py: 0.5 } }}
              >
                <MenuItem value="">Chưa xếp</MenuItem>
                {(Object.keys(TECHNICAL_GRADE_LABEL) as TechnicalGrade[]).map((grade) => (
                  <MenuItem key={grade} value={grade}>
                    {TECHNICAL_GRADE_LABEL[grade]}
                  </MenuItem>
                ))}
              </TextField>
              <Typography sx={{ fontSize: 13, fontWeight: 600, minWidth: 76, textAlign: 'right' }}>
                {formatCurrency(gradeLine?.amount ?? 0)}
              </Typography>
            </Stack>
          </Stack>
        </Stack>
      </Box>

      <Box sx={{ px: 2.5, pb: 2 }}>
        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: 'text.secondary', mb: 1 }}>
          KHẤU TRỪ
        </Typography>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            <Typography sx={{ fontSize: 13.5 }}>Tạm ứng</Typography>
            {!detail.deductionIsOverride && (
              <Tooltip title="Đang dùng mức mặc định — chưa được sửa riêng cho tháng này">
                <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>(mặc định)</Typography>
              </Tooltip>
            )}
          </Stack>
          {editingDeduction ? (
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
              <TextField
                size="small"
                type="number"
                autoFocus
                value={deductionInput}
                onChange={(event) => setDeductionInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleSaveDeduction();
                  if (event.key === 'Escape') setEditingDeduction(false);
                }}
                sx={{ width: 120, '& .MuiInputBase-input': { fontSize: 13, py: 0.5, textAlign: 'right' } }}
              />
              <Button size="small" variant="contained" disabled={savingDeduction} onClick={handleSaveDeduction}>
                Lưu
              </Button>
            </Stack>
          ) : (
            <Typography
              sx={{ fontSize: 13.5, fontWeight: 600, color: red[600], cursor: locked ? 'default' : 'pointer' }}
              onClick={() => !locked && setEditingDeduction(true)}
            >
              {formatCurrency(detail.deduction)}
            </Typography>
          )}
        </Stack>
      </Box>

      <Box sx={{ px: 2.5, pb: 2.5 }}>
        <Stack spacing={0.75} sx={{ pt: 1.5, borderTop: `1px solid ${neutral[200]}` }}>
          <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
            <Typography sx={{ fontSize: 13 }} color="text.secondary">
              Tổng lương
            </Typography>
            <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>{formatCurrency(detail.totalPay)}</Typography>
          </Stack>
          <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
            <Typography sx={{ fontSize: 13 }} color="text.secondary">
              Khấu trừ
            </Typography>
            <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: red[600] }}>
              {formatCurrency(detail.deduction)}
            </Typography>
          </Stack>
          <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700 }}>Thực lãnh</Typography>
            <Typography sx={{ fontSize: 15, fontWeight: 700, color: green[700] }}>
              {formatCurrency(detail.netPay)}
            </Typography>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
          <Tooltip title="Chưa hỗ trợ — dữ liệu tổng hợp theo tháng, không gắn với 1 phiếu chụp cụ thể">
            <span style={{ flex: 1 }}>
              <Button fullWidth variant="outlined" startIcon={<VisibilityOutlinedIcon />} disabled>
                Xem phiếu nguồn
              </Button>
            </span>
          </Tooltip>
          <Button fullWidth variant="outlined" startIcon={<PrintOutlinedIcon />} onClick={() => window.print()}>
            In phiếu lương
          </Button>
        </Stack>
        <Button fullWidth variant="text" sx={{ mt: 1 }} onClick={onClose}>
          Đóng
        </Button>
      </Box>
    </Stack>
  );
}
