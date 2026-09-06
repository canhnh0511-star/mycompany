import { useState } from 'react';
import { Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material';
import { ApiError } from '../../../api/client';
import type { TeamOption } from '../../../api/lookups.api';
import { LoadingButton } from '../../../components/common/LoadingButton';
import { SectionPanel } from '../../../components/common/SectionPanel';
import { ConfigTable } from '../../../components/common/ConfigTable';
import { formatDate } from '../../../utils/format';
import { useCreateTeam, useTeams, useUpdateTeam } from '../hooks/useSystemConfig';

type FormState = null | 'create' | TeamOption;
const EMPTY_FIELDS = { name: '', description: '' };

export function TeamsConfigTab() {
  const { data: teams, isLoading, isError, refetch } = useTeams();
  const createMutation = useCreateTeam();
  const updateMutation = useUpdateTeam();

  const [formState, setFormState] = useState<FormState>(null);
  const [fields, setFields] = useState(EMPTY_FIELDS);
  const [formError, setFormError] = useState<string | null>(null);
  const isSaving = createMutation.isPending || updateMutation.isPending;

  function openCreate() {
    setFormState('create');
    setFields(EMPTY_FIELDS);
    setFormError(null);
  }
  function openEdit(team: TeamOption) {
    setFormState(team);
    setFields({ name: team.name, description: team.description ?? '' });
    setFormError(null);
  }
  function closeForm() {
    setFormState(null);
    setFormError(null);
  }

  async function handleSave() {
    setFormError(null);
    const body = { name: fields.name.trim(), description: fields.description.trim() || null };
    try {
      if (formState === 'create') {
        await createMutation.mutateAsync(body);
      } else if (formState) {
        await updateMutation.mutateAsync({ id: formState.id, body });
      }
      closeForm();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Lỗi không xác định');
    }
  }

  return (
    <>
      <SectionPanel
        title="Danh sách Tổ"
        description="Mỗi Tổ gắn với 1 nhóm công nhân cạo mủ — dùng để phân quyền và lọc dữ liệu theo Tổ."
        action={{ label: 'Thêm Tổ', onClick: openCreate }}
        noContentPadding
      >
        <ConfigTable
          rows={teams}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          emptyMessage="Chưa có Tổ nào."
          onEdit={openEdit}
          columns={[
            { header: 'Tên Tổ', render: (row) => row.name },
            { header: 'Mô tả', render: (row) => row.description || '—' },
            { header: 'Ngày tạo', render: (row) => (row.createdAt ? formatDate(row.createdAt) : '—') },
          ]}
        />
      </SectionPanel>

      <Dialog open={formState !== null} onClose={closeForm} fullWidth maxWidth="xs">
        <DialogTitle>{formState === 'create' ? 'Thêm Tổ' : `Sửa: ${formState?.name ?? ''}`}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <TextField
              label="Tên Tổ"
              size="small"
              fullWidth
              autoFocus
              value={fields.name}
              onChange={(event) => setFields((f) => ({ ...f, name: event.target.value }))}
              placeholder="VD: Tổ 1 - Suối Lớn"
            />
            <TextField
              label="Mô tả"
              size="small"
              fullWidth
              multiline
              minRows={2}
              value={fields.description}
              onChange={(event) => setFields((f) => ({ ...f, description: event.target.value }))}
            />
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
          <LoadingButton variant="contained" color="success" loading={isSaving} disabled={!fields.name.trim()} onClick={handleSave}>
            Lưu
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </>
  );
}
