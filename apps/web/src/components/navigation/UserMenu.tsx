import { useState, type MouseEvent } from 'react';
import { Box, Menu, MenuItem, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import { useCurrentUser } from '../../features/auth/hooks/useCurrentUser';
import { clearAccessToken } from '../../api/tokenStorage';

export function UserMenu() {
  const { data: user } = useCurrentUser();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  const handleOpen = (event: MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  return (
    <>
      <Stack
        direction="row"
        spacing={0.5}
        onClick={handleOpen}
        sx={{
          cursor: 'pointer',
          alignItems: 'center',
          px: 0.5,
          py: 0.5,
          borderRadius: 1.5,
          '&:hover': { bgcolor: 'action.hover' },
        }}
      >
        <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{user?.fullName ?? 'David Dũng'}</Typography>
        <ExpandMoreRoundedIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
      </Stack>
      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        <MenuItem
          onClick={() => {
            handleClose();
            navigate('/ho-so');
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonRoundedIcon fontSize="small" /> Hồ sơ
          </Box>
        </MenuItem>
        <MenuItem
          onClick={() => {
            clearAccessToken();
            handleClose();
            window.location.reload();
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LogoutRoundedIcon fontSize="small" /> Đăng xuất
          </Box>
        </MenuItem>
      </Menu>
    </>
  );
}
