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
 * luôn 403.
 *
 * Layout/spacing/màu/font đối chiếu TRỰC TIẾP file HTML/CSS reference người dùng cung cấp (không
 * phải đo pixel gián tiếp qua ảnh JPEG như bản trước — file HTML là nguồn chính xác tuyệt đối, mọi
 * con số dưới đây copy thẳng từ CSS gốc, quy đổi sang đơn vị spacing MUI (÷8) khi có thể):
 * - Grid trái/phải 40%/60% (không phải panel trái rộng cố định px).
 * - Panel trái CHỈ có gradient trong file gốc (asset ảnh thật là placeholder theo comment CSS gốc
 *   "Replace this with the real rubber plantation asset") — ở đây dùng ảnh thật `plantationPhoto`
 *   đã có sẵn, giữ đúng gradient overlay (stop/opacity) như CSS.
 * - Hoạ tiết lá (leafDecoration) thuộc panel PHẢI làm watermark rất mờ (CSS gốc opacity .035, dùng
 *   shape giả lập) — ở đây dùng ảnh thật, cùng vị trí/kích thước, opacity tăng nhẹ so với .035 vì
 *   ảnh thật đã tự có alpha thấp sẵn (0 thì mất hẳn, xem README trong PR).
 * - "Ghi nhớ đăng nhập" / "Quên mật khẩu?" / "Liên hệ quản trị hệ thống" là UI theo đúng ảnh
 *   reference, nhưng backend CHƯA có tính năng tương ứng (không có refresh token nên không có khái
 *   niệm "phiên ngắn/dài" — ADR-0004; không có luồng tự đặt lại mật khẩu). "Ghi nhớ đăng nhập" vì
 *   vậy không đổi hành vi thật; 2 link còn lại hiện thông báo hướng dẫn liên hệ quản trị viên thay
 *   vì trỏ tới 1 trang không tồn tại.
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
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '36% 64%', lg: '40% 60%' },
        background:
          'radial-gradient(circle at 90% 32%, rgba(15,104,70,.035), transparent 26%), #fbfcfb',
      }}
    >
      {/* Panel trái — thương hiệu, chỉ hiện ở desktop/tablet rộng (CSS gốc: .page{display:block},
          .visual{display:none} dưới 820px). */}
      <Box
        sx={{
          display: { xs: 'none', md: 'block' },
          position: 'relative',
          minHeight: '100vh',
          overflow: 'hidden',
          borderRadius: '0 0 18px 0',
          backgroundImage: `linear-gradient(90deg, rgba(5,76,53,.93) 0%, rgba(5,76,53,.84) 52%, rgba(5,76,53,.50) 100%), url(${plantationPhoto})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <Box
          sx={{
            position: 'relative',
            zIndex: 1,
            height: '100%',
            maxWidth: 470,
            mx: 'auto',
            pt: 16.5,
            px: { md: 4, lg: 5.5 },
            pb: 9.75,
            color: '#FFFFFF',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Stack direction="row" spacing={2.5} sx={{ alignItems: 'center', mb: 5.25 }}>
            <Box
              component="img"
              src={logoMark}
              alt=""
              sx={{ width: 78, height: 78, borderRadius: '50%', flexShrink: 0 }}
            />
            <Box>
              <Typography sx={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                DAVID DŨNG
              </Typography>
              <Typography sx={{ fontSize: 17, fontWeight: 400, color: 'rgba(255,255,255,.92)', mt: 0.875 }}>
                Nông trường cao su
              </Typography>
            </Box>
          </Stack>

          <Box sx={{ height: '1px', bgcolor: 'rgba(255,255,255,.20)', mb: 5 }} />

          <Typography
            sx={{
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: '0.025em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,.96)',
              mb: 2.75,
            }}
          >
            Hệ thống quản lý nông trường cao su
          </Typography>
          <Stack spacing={2.875}>
            {FEATURES.map(({ icon: Icon, label }) => (
              <Stack key={label} direction="row" spacing={1.875} sx={{ alignItems: 'center' }}>
                <Icon sx={{ fontSize: 22, opacity: 0.96 }} />
                <Typography sx={{ fontSize: 16, lineHeight: 1.35, color: 'rgba(255,255,255,.95)' }}>
                  {label}
                </Typography>
              </Stack>
            ))}
          </Stack>

          <Box
            sx={{
              mt: 'auto',
              width: '100%',
              maxWidth: 405,
              pt: 2.75,
              pb: 2.75,
              pl: 3,
              pr: 3,
              borderRadius: '12px',
              bgcolor: 'rgba(255,255,255,.105)',
              border: '1px solid rgba(255,255,255,.04)',
            }}
          >
            <Stack direction="row" spacing={2.25} sx={{ alignItems: 'flex-start' }}>
              <ShieldOutlinedIcon sx={{ fontSize: 28, mt: 0.25, flexShrink: 0 }} />
              <Box>
                <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 0.75 }}>
                  Dữ liệu của bạn luôn được bảo vệ
                </Typography>
                <Typography sx={{ fontSize: 12.5, lineHeight: 1.55, color: 'rgba(255,255,255,.84)' }}>
                  Hệ thống được thiết kế với tiêu chuẩn bảo mật cao, đảm bảo an toàn và ổn định.
                </Typography>
              </Box>
            </Stack>
          </Box>
        </Box>
      </Box>

      {/* Panel phải — form. CSS gốc: .content{padding:0 44px} áp cho CẢ khối form lẫn footer bên
          trong nó (không phải padding/margin riêng lẻ từng phần tử) — đây là lý do đường kẻ +
          footer luôn khớp lề với card ở trên mà không cần chỉnh tay 2 nơi. */}
      <Box
        sx={{
          minHeight: '100vh',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          px: { xs: 2.5, md: 4, lg: 5.5 },
          overflow: 'hidden',
        }}
      >
        {/* Hoạ tiết lá — watermark rất mờ riêng cho panel phải (CSS gốc dùng shape giả lập opacity
            .035; ảnh thật ở đây đã tự mờ sẵn nên đặt cao hơn 1 chút để còn nhìn thấy, vẫn rất "ẩn"). */}
        <Box
          component="img"
          src={leafDecoration}
          alt=""
          sx={{
            position: 'absolute',
            right: -16,
            top: 150,
            width: 285,
            height: 560,
            opacity: 0.16,
            transform: 'rotate(-5deg)',
            objectFit: 'contain',
            pointerEvents: 'none',
            display: { xs: 'none', md: 'block' },
          }}
        />

        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pt: 2.75,
            pb: 10.25,
          }}
        >
          <Paper
            variant="outlined"
            sx={{
              width: { xs: '100%', md: 'min(600px, 80%)' },
              minWidth: { xs: 0, md: 520 },
              maxWidth: { xs: 560, md: 'none' },
              pt: 6.25,
              px: 6.25,
              pb: 5.375,
              borderRadius: '14px',
              borderColor: '#dde2e0',
              boxShadow: '0 8px 28px rgba(16, 24, 40, 0.08)',
            }}
          >
            <Typography sx={{ fontSize: 31, fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.15 }}>
              Đăng nhập
            </Typography>
            <Typography sx={{ fontSize: 16, lineHeight: 1.5, color: '#717784', mt: 1.25, mb: 4.375 }}>
              Đăng nhập để quản lý hoạt động nông trường
            </Typography>

            <Stack component="form" spacing={3.375} onSubmit={handleSubmit(onSubmit)} noValidate>
              {serverError && <Alert severity="error">{serverError}</Alert>}

              <Box>
                <Typography sx={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3, color: '#111827', mb: 1.25 }}>
                  Tên đăng nhập
                </Typography>
                <TextField
                  placeholder="Nhập tên đăng nhập"
                  autoComplete="username"
                  autoFocus
                  fullWidth
                  error={!!errors.identifier}
                  helperText={errors.identifier?.message}
                  sx={{
                    '& .MuiOutlinedInput-root': { height: 56, borderRadius: '8px' },
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#d8dde3' },
                    '& input': { fontSize: 15, color: '#111827' },
                    '& input::placeholder': { color: '#9aa1ad', opacity: 1 },
                  }}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonOutlineOutlinedIcon sx={{ color: '#6b7280', fontSize: 20 }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                  {...register('identifier')}
                />
              </Box>

              <Box>
                <Typography sx={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3, color: '#111827', mb: 1.25 }}>
                  Mật khẩu
                </Typography>
                <TextField
                  placeholder="Nhập mật khẩu"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  fullWidth
                  error={!!errors.password}
                  helperText={errors.password?.message}
                  sx={{
                    '& .MuiOutlinedInput-root': { height: 56, borderRadius: '8px' },
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#d8dde3' },
                    '& input': { fontSize: 15, color: '#111827' },
                    '& input::placeholder': { color: '#9aa1ad', opacity: 1 },
                  }}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockOutlinedIcon sx={{ color: '#6b7280', fontSize: 20 }} />
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
                              <VisibilityOffOutlinedIcon sx={{ fontSize: 20, color: '#717784' }} />
                            ) : (
                              <VisibilityOutlinedIcon sx={{ fontSize: 20, color: '#717784' }} />
                            )}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                  {...register('password')}
                />
              </Box>

              <Stack
                direction="row"
                sx={{ alignItems: 'center', justifyContent: 'space-between', mt: -0.25, mb: 0 }}
              >
                <FormControlLabel
                  sx={{ ml: 0 }}
                  control={<Checkbox size="small" sx={{ color: '#7b818b', p: 0 }} />}
                  label={
                    <Typography sx={{ fontSize: 14, color: '#252a31', ml: 1.25 }}>
                      Ghi nhớ đăng nhập
                    </Typography>
                  }
                />
                <Typography
                  component="button"
                  type="button"
                  onClick={() => setHelpMessage('Vui lòng liên hệ quản trị viên hệ thống để được cấp lại mật khẩu.')}
                  sx={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: '#0f6b49',
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

              <Button
                type="submit"
                variant="contained"
                disabled={isSubmitting}
                sx={{
                  height: 54,
                  borderRadius: '7px',
                  bgcolor: '#0b6f47',
                  fontSize: 15,
                  fontWeight: 700,
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,.12)',
                  '&:hover': { bgcolor: '#0a5f3d' },
                }}
              >
                {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </Button>

              <Divider sx={{ '&::before, &::after': { borderColor: '#e1e4e8' }, mt: 0.5, mb: 0 }}>
                <Typography sx={{ fontSize: 14, lineHeight: 1.15, color: '#8a909b' }}>hoặc</Typography>
              </Divider>

              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'center' }}>
                <HeadsetMicOutlinedIcon sx={{ fontSize: 16, color: '#0f6b49' }} />
                <Typography sx={{ fontSize: 14, lineHeight: 1.15, color: '#767d86' }}>Cần hỗ trợ?</Typography>
                <Typography
                  component="button"
                  type="button"
                  onClick={() => setHelpMessage('Vui lòng liên hệ quản trị viên hệ thống để được hỗ trợ.')}
                  sx={{
                    fontSize: 14,
                    lineHeight: 1.15,
                    fontWeight: 500,
                    color: '#0f6b49',
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

        {/* Footer — height cố định 118px (không phải padding co giãn theo nội dung) để khớp đúng
            CSS gốc `.footer{height:118px}`; lề trái/phải kế thừa từ padding của Box cha (panel
            phải) nên luôn khớp lề với card ở trên, không cần chỉnh riêng. */}
        <Stack
          direction="row"
          sx={{
            height: 118,
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid #e2e6e4',
          }}
        >
          <Typography sx={{ fontSize: 12.5, color: '#7c838e' }}>
            © {new Date().getFullYear()} David Dũng. All rights reserved.
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: '#7c838e' }}>Phiên bản 1.0.0</Typography>
        </Stack>
      </Box>

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
