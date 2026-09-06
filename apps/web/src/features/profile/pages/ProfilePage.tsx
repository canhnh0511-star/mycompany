import { useEffect, useState } from 'react';
import { Box, Stack, TextField, Typography } from '@mui/material';
import { ApiError } from '../../../api/client';
import { LoadingButton } from '../../../components/common/LoadingButton';
import { SectionPanel } from '../../../components/common/SectionPanel';
import { WidgetErrorState } from '../../../components/feedback/WidgetErrorState';
import { LoadingSkeleton } from '../../../components/feedback/LoadingSkeleton';
import { green, neutral, text } from '../../../theme/colors';
import { useChangePassword, useMe, useUpdateProfile } from '../hooks/useProfile';

const ROLE_LABEL: Record<string, string> = { ADMIN: 'Quản lý', TEAM_LEAD: 'Tổ trưởng' };

/**
 * Hồ sơ cá nhân — chỉ sửa tên/chức vụ/SĐT (không tự đổi email/role — UserController.updateMe) +
 * đổi mật khẩu riêng. Thiết kế lại theo phản hồi trực tiếp ("giống y chang app, không hợp web") —
 * trước đây 6 field xếp dọc 1 cột hẹp, field không sửa được vẫn vẽ khung input y hệt field sửa được
 * (không trung thực — nguyên tắc Rams). Giờ: header nhận diện (avatar/tên/vai trò), field CHỈ XEM
 * hiện dạng nhãn-giá trị thuần (không khung), field SỬA ĐƯỢC xếp 2 cột dùng đúng không gian ngang.
 */
export function ProfilePage() {
  const { data: user, isLoading, isError, refetch } = useMe();

  if (isLoading) return <LoadingSkeleton rows={6} rowHeight={40} />;
  if (isError || !user) return <WidgetErrorState message="Không tải được hồ sơ." onRetry={() => refetch()} />;

  return (
    <Stack spacing={2.5} sx={{ maxWidth: 680 }}>
      <ProfileHeader fullName={user.fullName} email={user.email} role={user.role} />
      <ProfileInfoPanel
        key={user.id}
        email={user.email}
        role={user.role}
        fullName={user.fullName}
        position={user.position}
        phone={user.phone}
      />
      <ChangePasswordPanel />
    </Stack>
  );
}

/** Header nhận diện — trước đây hoàn toàn không có, trang chỉ là 1 chồng ô input vô danh. */
function ProfileHeader({ fullName, email, role }: { fullName: string; email: string; role: string }) {
  const initial = fullName.trim().charAt(0).toUpperCase() || '?';
  return (
    <Stack direction="row" spacing={2} sx={{ alignItems: 'center', px: 0.5 }}>
      <Box
        sx={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          bgcolor: green[600],
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 26,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {initial}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h2" sx={{ fontSize: 20 }}>{fullName}</Typography>
        <Typography sx={{ fontSize: 13, color: text.secondary, mt: 0.25 }}>
          {ROLE_LABEL[role] ?? role} · {email}
        </Typography>
      </Box>
    </Stack>
  );
}

/** 1 dòng "chỉ xem" — nhãn trái/giá trị phải, KHÔNG vẽ khung input (field này không sửa được, vẽ
 * thành ô input giả là không trung thực với người dùng — dù đã tô xám, vẫn trông như 1 ô có thể bấm
 * vào sửa). Thay bằng đúng những gì nó là: 1 dòng thông tin tĩnh. */
function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', py: 1.25 }}>
      <Typography sx={{ fontSize: 13, color: text.secondary }}>{label}</Typography>
      <Typography sx={{ fontSize: 13.5, fontWeight: 500 }}>{value}</Typography>
    </Stack>
  );
}

function ProfileInfoPanel({
  email,
  role,
  fullName,
  position,
  phone,
}: {
  email: string;
  role: string;
  fullName: string;
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

  function updateField(patch: Partial<typeof fields>) {
    setSaved(false);
    setFields((f) => ({ ...f, ...patch }));
  }

  return (
    <SectionPanel title="Thông tin cá nhân" description="Tên, chức vụ và số điện thoại hiển thị trong hệ thống.">
      <Stack>
        <Stack divider={<Box sx={{ borderTop: `1px solid ${neutral[200]}` }} />}>
          <ReadOnlyRow label="Email" value={email} />
          <ReadOnlyRow label="Vai trò" value={ROLE_LABEL[role] ?? role} />
        </Stack>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            columnGap: 2,
            rowGap: 2,
            mt: 2.5,
          }}
        >
          <TextField
            label="Họ tên"
            size="small"
            fullWidth
            value={fields.fullName}
            onChange={(event) => updateField({ fullName: event.target.value })}
          />
          <TextField
            label="Chức vụ"
            size="small"
            fullWidth
            placeholder="VD: Giám đốc"
            value={fields.position}
            onChange={(event) => updateField({ position: event.target.value })}
          />
          <TextField
            label="Số điện thoại"
            size="small"
            fullWidth
            placeholder="09xxxxxxxx"
            value={fields.phone}
            onChange={(event) => updateField({ phone: event.target.value })}
          />
        </Box>

        {error && <Typography sx={{ fontSize: 13, mt: 2 }} color="error.main">{error}</Typography>}
        {saved && !error && <Typography sx={{ fontSize: 13, mt: 2 }} color="success.main">Đã lưu thông tin.</Typography>}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
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
      <Stack spacing={2} sx={{ maxWidth: 360 }}>
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
