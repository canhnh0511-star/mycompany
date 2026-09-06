import { useState } from 'react';
import { Alert, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { ApiError } from '../../../api/client';
import type { EmployeeOption } from '../../../api/lookups.api';
import { LoadingButton } from '../../../components/common/LoadingButton';
import { SectionPanel } from '../../../components/common/SectionPanel';
import { ConfigTable } from '../../../components/common/ConfigTable';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { useCreateEmployee, useEmployees, useTeams, useUpdateEmployee } from '../hooks/useSystemConfig';

type FormState = null | 'create' | EmployeeOption;
const EMPTY_FIELDS = { fullName: '', teamId: '', status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE', spouseEmployeeId: '' };
const NO_SPOUSE = '__none__';

export function EmployeesConfigTab() {
  const { data: employees, isLoading, isError, refetch } = useEmployees();
  const { data: teams } = useTeams();
  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee();

  const [formState, setFormState] = useState<FormState>(null);
  const [fields, setFields] = useState(EMPTY_FIELDS);
  const [formError, setFormError] = useState<string | null>(null);
  const isSaving = createMutation.isPending || updateMutation.isPending;

  function openCreate() {
    setFormState('create');
    setFields(EMPTY_FIELDS);
    setFormError(null);
  }
  function openEdit(employee: EmployeeOption) {
    setFormState(employee);
    setFields({
      fullName: employee.fullName,
      teamId: employee.teamId,
      status: employee.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
      spouseEmployeeId: employee.spouseEmployeeId ?? '',
    });
    setFormError(null);
  }
  function closeForm() {
    setFormState(null);
    setFormError(null);
  }

  async function handleSave() {
    setFormError(null);
    const spouseEmployeeId = fields.spouseEmployeeId || null;
    try {
      if (formState === 'create') {
        await createMutation.mutateAsync({ fullName: fields.fullName.trim(), teamId: fields.teamId, userId: null });
      } else if (formState) {
        await updateMutation.mutateAsync({
          id: formState.id,
          body: { fullName: fields.fullName.trim(), teamId: fields.teamId, status: fields.status, userId: formState.userId ?? null, spouseEmployeeId },
        });
      }
      closeForm();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Lỗi không xác định');
    }
  }

  const spouseOptions = (employees ?? []).filter((e) => formState === 'create' || e.id !== formState?.id);

  return (
    <>
      <SectionPanel
        title="Danh sách Nhân viên"
        description="Công nhân cạo mủ theo từng Tổ. Đổi vợ/chồng ảnh hưởng cách chia sản lượng lúc tính lương."
        action={{ label: 'Thêm Nhân viên', onClick: openCreate }}
        noContentPadding
      >
        <ConfigTable
          rows={employees}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          emptyMessage="Chưa có Nhân viên nào."
          onEdit={openEdit}
          columns={[
            { header: 'Họ tên', render: (row) => row.fullName },
            { header: 'Tổ', render: (row) => row.teamName },
            {
              header: 'Trạng thái',
              render: (row) => (
                <StatusBadge
                  label={row.status === 'ACTIVE' ? 'Đang làm việc' : 'Ngưng'}
                  tone={row.status === 'ACTIVE' ? 'success' : 'neutral'}
                />
              ),
            },
            { header: 'Vợ/chồng', render: (row) => row.spouseEmployeeName || '—' },
          ]}
        />
      </SectionPanel>

      <Dialog open={formState !== null} onClose={closeForm} fullWidth maxWidth="xs">
        <DialogTitle>{formState === 'create' ? 'Thêm Nhân viên' : `Sửa: ${formState?.fullName ?? ''}`}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <TextField
              label="Họ tên"
              size="small"
              fullWidth
              autoFocus
              value={fields.fullName}
              onChange={(event) => setFields((f) => ({ ...f, fullName: event.target.value }))}
            />
            <TextField
              select
              label="Tổ"
              size="small"
              fullWidth
              value={fields.teamId}
              onChange={(event) => setFields((f) => ({ ...f, teamId: event.target.value }))}
            >
              {(teams ?? []).map((team) => (
                <MenuItem key={team.id} value={team.id}>{team.name}</MenuItem>
              ))}
            </TextField>
            {formState !== 'create' && (
              <>
                <TextField
                  select
                  label="Trạng thái"
                  size="small"
                  fullWidth
                  value={fields.status}
                  onChange={(event) => setFields((f) => ({ ...f, status: event.target.value as 'ACTIVE' | 'INACTIVE' }))}
                >
                  <MenuItem value="ACTIVE">Đang làm việc</MenuItem>
                  <MenuItem value="INACTIVE">Ngưng</MenuItem>
                </TextField>
                <TextField
                  select
                  label="Vợ/chồng (nếu cùng cạo mủ)"
                  size="small"
                  fullWidth
                  value={fields.spouseEmployeeId || NO_SPOUSE}
                  onChange={(event) =>
                    setFields((f) => ({ ...f, spouseEmployeeId: event.target.value === NO_SPOUSE ? '' : event.target.value }))
                  }
                >
                  <MenuItem value={NO_SPOUSE}>Không có</MenuItem>
                  {spouseOptions.map((emp) => (
                    <MenuItem key={emp.id} value={emp.id}>{emp.fullName} ({emp.teamName})</MenuItem>
                  ))}
                </TextField>
                {fields.spouseEmployeeId && (
                  <Alert severity="warning" sx={{ fontSize: 12.5 }}>
                    Sản lượng ghi nhận dưới 1 trong 2 người sẽ tự động chia đôi cho cả hai lúc tính
                    lương (không chia lúc nhập OCR/nhập tay).
                  </Alert>
                )}
              </>
            )}
            {formError && (
              <Typography sx={{ fontSize: 13 }} color="error.main">
                {formError}
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <LoadingButton onClick={closeForm} disabled={isSaving}>
            Hủy
          </LoadingButton>
          <LoadingButton
            variant="contained"
            color="success"
            loading={isSaving}
            disabled={!fields.fullName.trim() || !fields.teamId}
            onClick={handleSave}
          >
            Lưu
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </>
  );
}
