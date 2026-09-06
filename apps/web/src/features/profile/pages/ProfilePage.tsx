import { useEffect, useState } from 'react';
import { Box, InputAdornment, Stack, TextField, Typography, alpha } from '@mui/material';
import MailOutlineOutlinedIcon from '@mui/icons-material/MailOutlineOutlined';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import WorkOutlineOutlinedIcon from '@mui/icons-material/WorkOutlineOutlined';
import LocalPhoneOutlinedIcon from '@mui/icons-material/LocalPhoneOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import { ApiError } from '../../../api/client';
import { LoadingButton } from '../../../components/common/LoadingButton';
import { SectionPanel } from '../../../components/common/SectionPanel';
import { WidgetErrorState } from '../../../components/feedback/WidgetErrorState';
import { LoadingSkeleton } from '../../../components/feedback/LoadingSkeleton';
import { green, sidebar, text } from '../../../theme/colors';
import { useChangePassword, useMe, useUpdateProfile } from '../hooks/useProfile';
import hillsDecoration from '../../../assets/profile-hills-decoration.png';
import leafBadgeIcon from '../../../assets/leaf-badge-icon.png';

const ROLE_LABEL: Record<string, string> = { ADMIN: 'Quản lý', TEAM_LEAD: 'Tổ trưởng' };

/**
 * Hồ sơ cá nhân — chỉ sửa tên/chức vụ/SĐT (không tự đổi email/role — UserController.updateMe) +
 * đổi mật khẩu riêng. Layout theo đúng mockup người dùng cung cấp: banner nhận diện (avatar/tên/
 * vai trò + khẩu hiệu) phía trên, lưới 2 cột bên dưới gồm cả field chỉ xem (Email/Vai trò — vẫn vẽ
 * khung input nhưng `disabled` để phân biệt rõ không bấm sửa được) lẫn field sửa được, mỗi field có
 * icon riêng cho dễ quét mắt.
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

/**
 * Header nhận diện — banner thương hiệu (nền xanh đậm cùng tone `sidebar.background` đã dùng cho
 * Sidebar/LoginPage, không phải màu mới) kèm hoạ tiết đồi núi + khẩu hiệu "Cùng phát triển nông
 * nghiệp bền vững", theo đúng mockup người dùng cung cấp. Trước đây hoàn toàn không có, trang chỉ
 * là 1 chồng ô input vô danh.
 */
function ProfileHeader({ fullName, email, role }: { fullName: string; email: string; role: string }) {
  const initial = fullName.trim().charAt(0).toUpperCase() || '?';
  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '14px',
        bgcolor: sidebar.background,
        px: { xs: 2.5, sm: 3.5 },
        py: 3,
      }}
    >
      {/* Hoạ tiết đồi núi — nền trang trí, không mang thông tin, luôn đặt SAU nội dung
          (aria-hidden, pointerEvents none) để không cản đọc/thao tác. */}
      <Box
        component="img"
        src={hillsDecoration}
        alt=""
        aria-hidden
        sx={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'bottom',
          opacity: 0.5,
          pointerEvents: 'none',
        }}
      />

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2.5}
        sx={{ position: 'relative', alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between' }}
      >
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', minWidth: 0 }}>
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
            <Typography sx={{ fontSize: 20, fontWeight: 700, color: '#FFFFFF' }}>{fullName}</Typography>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mt: 0.25, color: alpha('#FFFFFF', 0.78) }}>
              <Typography sx={{ fontSize: 13 }}>{ROLE_LABEL[role] ?? role}</Typography>
              <Typography sx={{ fontSize: 13 }}>·</Typography>
              <Typography sx={{ fontSize: 13 }}>{email}</Typography>
            </Stack>
          </Box>
        </Stack>

        <Stack
          direction="row"
          spacing={1.25}
          sx={{
            alignItems: 'center',
            flexShrink: 0,
            maxWidth: { xs: '100%', sm: 240 },
            px: 1.75,
            py: 1.25,
            borderRadius: '10px',
            bgcolor: alpha('#FFFFFF', 0.1),
            border: `1px solid ${alpha('#FFFFFF', 0.14)}`,
          }}
        >
          <Box
            component="img"
            src={leafBadgeIcon}
            alt=""
            aria-hidden
            sx={{ width: 28, height: 28, borderRadius: '7px', flexShrink: 0 }}
          />
          <Typography sx={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.35, color: '#FFFFFF' }}>
            Cùng phát triển nông nghiệp bền vững
          </Typography>
        </Stack>
      </Stack>
    </Box>
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
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            columnGap: 2,
            rowGap: 2,
          }}
        >
          <TextField
            label="Email"
            size="small"
            fullWidth
            disabled
            value={email}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <MailOutlineOutlinedIcon sx={{ fontSize: 18, color: text.muted }} />
                  </InputAdornment>
                ),
              },
            }}
          />
          <TextField
            label="Vai trò"
            size="small"
            fullWidth
            disabled
            value={ROLE_LABEL[role] ?? role}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <ShieldOutlinedIcon sx={{ fontSize: 18, color: text.muted }} />
                  </InputAdornment>
                ),
              },
            }}
          />
          <TextField
            label="Họ tên"
            size="small"
            fullWidth
            value={fields.fullName}
            onChange={(event) => updateField({ fullName: event.target.value })}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonOutlineOutlinedIcon sx={{ fontSize: 18, color: text.secondary }} />
                  </InputAdornment>
                ),
              },
            }}
          />
          <TextField
            label="Chức vụ"
            size="small"
            fullWidth
            placeholder="VD: Giám đốc"
            value={fields.position}
            onChange={(event) => updateField({ position: event.target.value })}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <WorkOutlineOutlinedIcon sx={{ fontSize: 18, color: text.secondary }} />
                  </InputAdornment>
                ),
              },
            }}
          />
          <TextField
            label="Số điện thoại"
            size="small"
            fullWidth
            placeholder="09xxxxxxxx"
            value={fields.phone}
            onChange={(event) => updateField({ phone: event.target.value })}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <LocalPhoneOutlinedIcon sx={{ fontSize: 18, color: text.secondary }} />
                  </InputAdornment>
                ),
              },
            }}
          />
        </Box>

        {error && <Typography sx={{ fontSize: 13, mt: 2 }} color="error.main">{error}</Typography>}
        {saved && !error && <Typography sx={{ fontSize: 13, mt: 2 }} color="success.main">Đã lưu thông tin.</Typography>}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <LoadingButton
            variant="contained"
            color="success"
            startIcon={<SaveOutlinedIcon sx={{ fontSize: 18 }} />}
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
