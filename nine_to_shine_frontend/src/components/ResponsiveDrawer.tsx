import React from 'react';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemText from '@mui/material/ListItemText';
import {
  Button,
  IconButton,
  ListItemButton,
  ListItemIcon,
  useTheme,
} from '@mui/material';
import Image from 'next/image';
import CloseIcon from '@mui/icons-material/Close';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from '../assets/logo.png';
import { NavigationItem } from '@/common/types';
import LogoutIcon from '@mui/icons-material/Logout';

interface ResponsiveDrawerProps {
  open: boolean;
  toggleDrawer: (
    open: boolean
  ) => (event: React.KeyboardEvent | React.MouseEvent) => void;
  navigationItems: NavigationItem[];
  handleLogout: () => void;
}

const ResponsiveDrawer: React.FC<ResponsiveDrawerProps> = ({
  open,
  toggleDrawer,
  navigationItems,
  handleLogout,
}) => {
  const pathname = usePathname();
  const theme = useTheme();

  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={toggleDrawer(false)}
      sx={{ display: { lg: 'none' } }} // Hide on larger screens
    >
      <Box
        sx={{
          width: { xs: '80vw', sm: '400px' },
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          position: 'relative',
          background: '#006BA6',
        }}
        role="presentation"
        onClick={toggleDrawer(false)}
        onKeyDown={toggleDrawer(false)}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-start',
            alignItems: 'center',
          }}
        >
          <IconButton
            onClick={toggleDrawer(false)}
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              margin: 1,
              zIndex: 1300, // Ensure it remains on top of other elements
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            px: 2,
            py: 1,
            backgroundColor: 'primary.main',
            height: '200px',
          }}
        >
          <Image
            src={Logo}
            alt="logo"
            height={150}
            width={150}
            style={{ marginRight: 1 }}
          />
        </Box>
        <List sx={{ flexGrow: 1 }}>
          {navigationItems.map((nav) => {
            const isActive = pathname === nav.path;
            return (
              <Link
                style={{ color: 'inherit', textDecoration: 'inherit' }}
                key={nav.text}
                href={nav.path}
                passHref
              >
                <ListItemButton
                  onClick={toggleDrawer(false)}
                  sx={{
                    backgroundColor: isActive
                      ? theme.palette.primary.main
                      : 'inherit',
                  }}
                >
                  <ListItemIcon sx={{ color: '#fff' }}>{nav.icon}</ListItemIcon>
                  <ListItemText primary={nav.text} sx={{ color: '#fff' }} />
                </ListItemButton>
              </Link>
            );
          })}
        </List>
        <Box display="flex" justifyContent="center" mb={2} flexShrink={0}>
          <Button
            fullWidth
            onClick={handleLogout}
            sx={{ margin: '0 1rem', color: '#fff' }}
            endIcon={<LogoutIcon />}
            color="primary"
          >
            Logout
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
};

export default ResponsiveDrawer;
