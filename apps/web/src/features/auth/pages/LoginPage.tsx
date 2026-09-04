import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Divider,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ParkOutlinedIcon from '@mui/icons-material/ParkOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import HeadsetMicOutlinedIcon from '@mui/icons-material/HeadsetMicOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import logoMark from '../../../assets/logo-mark.png';
import plantationPhoto from '../../../assets/login-plantation.jpg';
import leafDecoration from '../../../assets/leaf-decoration.png';
import { login } from '../api/login.api';
import { setAccessToken } from '../../../api/tokenStorage';
import { ApiError } from '../../../api/client';
import { pageBackground } from '../../../theme/colors';
import { uiTokens } from '../../../theme/tokens';

const schema = z.object({
  identifier: z.string().min(1, 'Nhập tên đăng nhập'),
  password: z.string().min(1, 'Nhập mật khẩu'),
});

type FormValues = z.infer<typeof schema>;

const FEATURES = [
  { icon: ParkOutlinedIcon, label: 'Quản lý sản lượng' },
  { icon: DescriptionOutlinedIcon, label: 'Theo dõi phiếu và đơn hàng' },
  { icon: BarChartOutlinedIcon, label: 'Báo cáo & phân tích' },
  { icon: GroupsOutlinedIcon, label: 'Quản lý nhân sự & ca làm' },
  { icon: ShieldOutlinedIcon, label: 'An toàn – Bảo mật dữ liệu' },
];

/**
 * Màn đăng nhập — chưa nằm trong spec-3-web-ui-home.md (spec chỉ đặc tả Home), nhưng KHÔNG THỂ bỏ
 * qua: mọi endpoint đều yêu cầu JWT, web app trước đây không có cách nào lấy token nên mọi request
 * luôn 403. Layout/màu/font đối chiếu trực tiếp ảnh reference người dùng cung cấp (split 2 cột: panel
 * trái thương hiệu trên nền ảnh vườn cao su, panel phải form).
 *
 * "Ghi nhớ đăng nhập" / "Quên mật khẩu?" / "Liên hệ quản trị hệ thống" là UI theo đúng ảnh reference,
 * nhưng backend CHƯA có tính năng tương ứng (không có refresh token nên không có khái niệm "phiên
 * ngắn/dài" — ADR-0004; không có luồng tự đặt lại mật khẩu). "Ghi nhớ đăng nhập" vì vậy không đổi
 * hành vi thật (token vẫn luôn lưu localStorage như nhau); 2 link còn lại hiện thông báo hướng dẫn
 * liên hệ quản trị viên thay vì trỏ tới 1 trang không tồn tại.
 */
export function LoginPage() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [helpMessage, setHelpMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      const result = await login(values.identifier, values.password);
      setAccessToken(result.accessToken);
      navigate('/', { replace: true });
    } catch (err) {
      setServerError(
        err instanceof ApiError ? err.message : 'Không thể đăng nhập, vui lòng thử lại.',
      );
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: pageBackground }}>
      <Box sx={{ flex: 1, display: 'flex' }}>
        {/* Panel trái — thương hiệu, chỉ hiện ở desktop/tablet rộng (spec chung: desktop-first). */}
        <Box
          sx={{
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column',
            width: 500,
            flexShrink: 0,
            position: 'relative',
            overflow: 'hidden',
            color: '#FFFFFF',
            px: 4,
            py: 5,
            backgroundImage: `linear-gradient(90deg, rgba(17,70,42,0.97) 0%, rgba(17,70,42,0.88) 55%, rgba(17,70,42,0.55) 100%), url(${plantationPhoto})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <Box
            component="img"
            src={leafDecoration}
            alt=""
            sx={{
              position: 'absolute',
              right: -80,
              bottom: -40,
              width: 320,
              opacity: 0.12,
              pointerEvents: 'none',
            }}
          />

          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Box component="img" src={logoMark} alt="" sx={{ width: 48, height: 48, flexShrink: 0 }} />
            <Box>
              <Typography sx={{ fontSize: 18, fontWeight: 700, letterSpacing: 0.4 }}>DAVID DŨNG</Typography>
              <Typography sx={{ fontSize: 13, opacity: 0.85 }}>Nông trường cao su</Typography>
            </Box>
          </Stack>

          <Divider sx={{ borderColor: 'rgba(255,255,255,0.16)', my: 3.5 }} />

          <Typography
            sx={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', opacity: 0.7, mb: 2 }}
          >
            Hệ thống quản lý nông trường cao su
          </Typography>
          <Stack spacing={2}>
            {FEATURES.map(({ icon: Icon, label }) => (
              <Stack key={label} direction="row" sx={{ alignItems: 'center', gap: 1.5 }}>
                <Icon sx={{ fontSize: 20, opacity: 0.9 }} />
                <Typography sx={{ fontSize: 14 }}>{label}</Typography>
              </Stack>
            ))}
          </Stack>

          <Box sx={{ flex: 1 }} />

          <Box
            sx={{
              position: 'relative',
              bgcolor: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.14)',
              borderRadius: `${uiTokens.radius.card}px`,
              p: 2,
            }}
          >
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
              <ShieldOutlinedIcon sx={{ fontSize: 20, mt: 0.25 }} />
              <Box>
                <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>Dữ liệu của bạn luôn được bảo vệ</Typography>
                <Typography sx={{ fontSize: 12.5, opacity: 0.8, mt: 0.25 }}>
                  Hệ thống được thiết kế với tiêu chuẩn bảo mật cao, đảm bảo an toàn và ổn định.
                </Typography>
              </Box>
            </Stack>
          </Box>
        </Box>

        {/* Panel phải — form */}
        <Box
          sx={{
            flex: 1,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            px: 2,
            overflow: 'hidden',
          }}
        >
          <Box
            component="img"
            src={leafDecoration}
            alt=""
            sx={{
              position: 'absolute',
              right: -60,
              top: -60,
              width: 260,
              opacity: 0.05,
              pointerEvents: 'none',
              display: { xs: 'none', md: 'block' },
            }}
          />

          <Paper
            variant="outlined"
            sx={{
              width: '100%',
              maxWidth: 460,
              p: { xs: 3, sm: 5 },
              my: 4,
              borderRadius: `${uiTokens.radius.card}px`,
              boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04)',
            }}
          >
            <Typography variant="h1" sx={{ fontSize: 28 }}>
              Đăng nhập
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>
              Đăng nhập để quản lý hoạt động nông trường
            </Typography>

            <Stack component="form" spacing={2.5} onSubmit={handleSubmit(onSubmit)} noValidate>
              {serverError && <Alert severity="error">{serverError}</Alert>}

              <Box>
                <Typography sx={{ fontSize: 13.5, fontWeight: 600, mb: 0.75 }}>Tên đăng nhập</Typography>
                <TextField
                  placeholder="Nhập tên đăng nhập"
                  autoComplete="username"
                  autoFocus
                  fullWidth
                  error={!!errors.identifier}
                  helperText={errors.identifier?.message}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonOutlineOutlinedIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                  {...register('identifier')}
                />
              </Box>

              <Box>
                <Typography sx={{ fontSize: 13.5, fontWeight: 600, mb: 0.75 }}>Mật khẩu</Typography>
                <TextField
                  placeholder="Nhập mật khẩu"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  fullWidth
                  error={!!errors.password}
                  helperText={errors.password?.message}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockOutlinedIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                            onClick={() => setShowPassword((v) => !v)}
                            edge="end"
                          >
                            {showPassword ? (
                              <VisibilityOffOutlinedIcon sx={{ fontSize: 20 }} />
                            ) : (
                              <VisibilityOutlinedIcon sx={{ fontSize: 20 }} />
                            )}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                  {...register('password')}
                />
              </Box>

              <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <FormControlLabel
                  control={<Checkbox size="small" />}
                  label={<Typography sx={{ fontSize: 13.5 }}>Ghi nhớ đăng nhập</Typography>}
                />
                <Typography
                  component="button"
                  type="button"
                  onClick={() => setHelpMessage('Vui lòng liên hệ quản trị viên hệ thống để được cấp lại mật khẩu.')}
                  sx={{
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: 'primary.main',
                    background: 'none',
                    border: 'none',
                    p: 0,
                    cursor: 'pointer',
                    '&:hover': { textDecoration: 'underline' },
                  }}
                >
                  Quên mật khẩu?
                </Typography>
              </Stack>

              <Button type="submit" variant="contained" size="large" disabled={isSubmitting}>
                {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </Button>

              <Divider>
                <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>hoặc</Typography>
              </Divider>

              <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', justifyContent: 'center' }}>
                <HeadsetMicOutlinedIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                <Typography sx={{ fontSize: 13.5, color: 'text.secondary' }}>Cần hỗ trợ?</Typography>
                <Typography
                  component="button"
                  type="button"
                  onClick={() => setHelpMessage('Vui lòng liên hệ quản trị viên hệ thống để được hỗ trợ.')}
                  sx={{
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: 'primary.main',
                    background: 'none',
                    border: 'none',
                    p: 0,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Liên hệ quản trị hệ thống
                </Typography>
              </Stack>
            </Stack>
          </Paper>
        </Box>
      </Box>

      <Stack
        direction="row"
        sx={{ justifyContent: 'space-between', px: 4, py: 2, borderTop: '1px solid', borderColor: 'divider' }}
      >
        <Typography sx={{ fontSize: 11.5 }} color="text.secondary">
          © {new Date().getFullYear()} David Dũng. All rights reserved.
        </Typography>
        <Typography sx={{ fontSize: 11.5 }} color="text.secondary">
          Phiên bản 1.0.0
        </Typography>
      </Stack>

      <Snackbar
        open={!!helpMessage}
        autoHideDuration={4000}
        onClose={() => setHelpMessage(null)}
        message={helpMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
