import { useEffect, useState } from 'react';
import { Box, Stack, TextField, Typography } from '@mui/material';
import { ApiError } from '../../../api/client';
import { LoadingButton } from '../../../components/common/LoadingButton';
import { SectionPanel } from '../../../components/common/SectionPanel';
import { WidgetErrorState } from '../../../components/feedback/WidgetErrorState';
import { LoadingSkeleton } from '../../../components/feedback/LoadingSkeleton';
import { useChangePassword, useMe, useUpdateProfile } from '../hooks/useProfile';

const ROLE_LABEL: Record<string, string> = { ADMIN: 'Quản lý', TEAM_LEAD: 'Tổ trưởng' };

/**
 * Hồ sơ cá nhân — chỉ sửa tên/chức vụ/SĐT (không tự đổi email/role — UserController.updateMe) +
 * đổi mật khẩu riêng. 2 SectionPanel độc lập, mỗi cái tự lưu/tự báo lỗi — không dùng Dialog như
 * salary-components vì đây không phải danh sách nhiều dòng, chỉ 1 form sửa tại chỗ.
 */
export function ProfilePage() {
  const { data: user, isLoading, isError, refetch } = useMe();

  if (isLoading) return <LoadingSkeleton rows={6} rowHeight={40} />;
  if (isError || !user) return <WidgetErrorState message="Không tải được hồ sơ." onRetry={() => refetch()} />;

  return (
    <Stack spacing={2.5} sx={{ maxWidth: 560 }}>
      <ProfileInfoPanel
        key={user.id}
        fullName={user.fullName}
        email={user.email}
        role={user.role}
        position={user.position}
        phone={user.phone}
      />
      <ChangePasswordPanel />
    </Stack>
  );
}

function ProfileInfoPanel({
  fullName,
  email,
  role,
  position,
  phone,
}: {
  fullName: string;
  email: string;
  role: string;
  position: string | null;
  phone: string | null;
}) {
  const updateMutation = useUpdateProfile();
  const [fields, setFields] = useState({ fullName, position: position ?? '', phone: phone ?? '' });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setError(null);
    setSaved(false);
    try {
      await updateMutation.mutateAsync({
        fullName: fields.fullName.trim(),
        avatarUrl: null,
        position: fields.position.trim() || null,
        phone: fields.phone.trim() || null,
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Lỗi không xác định');
    }
  }

  return (
    <SectionPanel title="Thông tin cá nhân" description="Tên, chức vụ và số điện thoại hiển thị trong hệ thống.">
      <Stack spacing={2}>
        <TextField label="Email" size="small" fullWidth value={email} disabled helperText="Không đổi được email." />
        <TextField label="Vai trò" size="small" fullWidth value={ROLE_LABEL[role] ?? role} disabled />
        <TextField
          label="Họ tên"
          size="small"
          fullWidth
          value={fields.fullName}
          onChange={(event) => {
            setSaved(false);
            setFields((f) => ({ ...f, fullName: event.target.value }));
          }}
        />
        <TextField
          label="Chức vụ"
          size="small"
          fullWidth
          placeholder="VD: Giám đốc"
          value={fields.position}
          onChange={(event) => {
            setSaved(false);
            setFields((f) => ({ ...f, position: event.target.value }));
          }}
        />
        <TextField
          label="Số điện thoại"
          size="small"
          fullWidth
          placeholder="09xxxxxxxx"
          value={fields.phone}
          onChange={(event) => {
            setSaved(false);
            setFields((f) => ({ ...f, phone: event.target.value }));
          }}
        />
        {error && <Typography sx={{ fontSize: 13 }} color="error.main">{error}</Typography>}
        {saved && !error && <Typography sx={{ fontSize: 13 }} color="success.main">Đã lưu thông tin.</Typography>}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <LoadingButton
            variant="contained"
            color="success"
            loading={updateMutation.isPending}
            disabled={!fields.fullName.trim()}
            onClick={handleSave}
          >
            Lưu
          </LoadingButton>
        </Box>
      </Stack>
    </SectionPanel>
  );
}

const EMPTY_PASSWORD_FIELDS = { currentPassword: '', newPassword: '', confirmPassword: '' };

function ChangePasswordPanel() {
  const changePasswordMutation = useChangePassword();
  const [fields, setFields] = useState(EMPTY_PASSWORD_FIELDS);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Reset trạng thái "Đã đổi" khi người dùng gõ lại — tránh hiện thông báo cũ gây hiểu lầm.
  useEffect(() => {
    if (saved) setSaved(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields.currentPassword, fields.newPassword, fields.confirmPassword]);

  const mismatch = fields.newPassword.length > 0 && fields.confirmPassword.length > 0 && fields.newPassword !== fields.confirmPassword;
  const tooShort = fields.newPassword.length > 0 && fields.newPassword.length < 8;

  async function handleSave() {
    setError(null);
    if (fields.newPassword !== fields.confirmPassword) {
      setError('Mật khẩu mới nhập lại không khớp.');
      return;
    }
    if (fields.newPassword.length < 8) {
      setError('Mật khẩu mới phải từ 8 ký tự trở lên.');
      return;
    }
    try {
      await changePasswordMutation.mutateAsync({ currentPassword: fields.currentPassword, newPassword: fields.newPassword });
      setFields(EMPTY_PASSWORD_FIELDS);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Lỗi không xác định');
    }
  }

  return (
    <SectionPanel title="Đổi mật khẩu" description="Dùng mật khẩu mới cho lần đăng nhập tiếp theo.">
      <Stack spacing={2}>
        <TextField
          label="Mật khẩu hiện tại"
          type="password"
          size="small"
          fullWidth
          value={fields.currentPassword}
          onChange={(event) => setFields((f) => ({ ...f, currentPassword: event.target.value }))}
        />
        <TextField
          label="Mật khẩu mới"
          type="password"
          size="small"
          fullWidth
          value={fields.newPassword}
          error={tooShort}
          helperText={tooShort ? 'Tối thiểu 8 ký tự.' : ' '}
          onChange={(event) => setFields((f) => ({ ...f, newPassword: event.target.value }))}
        />
        <TextField
          label="Nhập lại mật khẩu mới"
          type="password"
          size="small"
          fullWidth
          value={fields.confirmPassword}
          error={mismatch}
          helperText={mismatch ? 'Không khớp với mật khẩu mới.' : ' '}
          onChange={(event) => setFields((f) => ({ ...f, confirmPassword: event.target.value }))}
        />
        {error && <Typography sx={{ fontSize: 13 }} color="error.main">{error}</Typography>}
        {saved && !error && <Typography sx={{ fontSize: 13 }} color="success.main">Đã đổi mật khẩu.</Typography>}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <LoadingButton
            variant="contained"
            color="success"
            loading={changePasswordMutation.isPending}
            disabled={!fields.currentPassword || !fields.newPassword || !fields.confirmPassword}
            onClick={handleSave}
          >
            Đổi mật khẩu
          </LoadingButton>
        </Box>
      </Stack>
    </SectionPanel>
  );
}
