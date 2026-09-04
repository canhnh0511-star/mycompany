import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import logoMark from '../../../assets/logo-mark.png';
import { login } from '../api/login.api';
import { setAccessToken } from '../../../api/tokenStorage';
import { ApiError } from '../../../api/client';
import { pageBackground, sidebar } from '../../../theme/colors';
import { uiTokens } from '../../../theme/tokens';

const schema = z.object({
  identifier: z.string().min(1, 'Nhập email hoặc số điện thoại'),
  password: z.string().min(1, 'Nhập mật khẩu'),
});

type FormValues = z.infer<typeof schema>;

/**
 * Màn đăng nhập — chưa nằm trong spec-3-web-ui-home.md (spec chỉ đặc tả Home), nhưng KHÔNG THỂ bỏ
 * qua: mọi endpoint đều yêu cầu JWT (SecurityConfig `.anyRequest().authenticated()`), web app trước
 * đây không có cách nào lấy token nên mọi request luôn 403 dù backend/CORS đã đúng. Thiết kế tối
 * giản, đúng brand token hiện có (spec §41 không tự invent UI cho màn chưa duyệt — ở đây là hạ tầng
 * bắt buộc để Home hoạt động được, không phải 1 màn nghiệp vụ mới).
 */
export function LoginPage() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
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
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: pageBackground,
        px: 2,
      }}
    >
      <Paper
        variant="outlined"
        sx={{ width: '100%', maxWidth: 380, p: 4, borderRadius: `${uiTokens.radius.card}px` }}
      >
        <Stack spacing={0.5} sx={{ alignItems: 'center', mb: 3 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              bgcolor: sidebar.background,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 1.5,
            }}
          >
            <Box component="img" src={logoMark} alt="" sx={{ width: 36, height: 36 }} />
          </Box>
          <Typography variant="h1" sx={{ fontSize: 22 }}>
            Nông trường cao su
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Đăng nhập để tiếp tục
          </Typography>
        </Stack>

        <Stack component="form" spacing={2} onSubmit={handleSubmit(onSubmit)} noValidate>
          {serverError && <Alert severity="error">{serverError}</Alert>}

          <TextField
            label="Email hoặc số điện thoại"
            autoComplete="username"
            autoFocus
            fullWidth
            error={!!errors.identifier}
            helperText={errors.identifier?.message}
            {...register('identifier')}
          />
          <TextField
            label="Mật khẩu"
            type="password"
            autoComplete="current-password"
            fullWidth
            error={!!errors.password}
            helperText={errors.password?.message}
            {...register('password')}
          />
          <Button type="submit" variant="contained" size="large" disabled={isSubmitting}>
            {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
