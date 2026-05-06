'use client';

import React, { useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import MenuIcon from '@mui/icons-material/Menu';
import CssBaseline from '@mui/material/CssBaseline';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import { Button } from '@mui/material';
import { useRouter } from 'next/navigation';
import ResponsiveDrawer from './ResponsiveDrawer';
import { routes } from '@/common/routes';
import { useAuth } from '@/hooks/useAuth';
import Image from 'next/image';
import Logo from '../assets/logo.png';
import { AuthError, signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { enqueueSnackbar } from 'notistack';
import HomeIcon from '@mui/icons-material/Home';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import EuroIcon from '@mui/icons-material/Euro';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech';
import { NavigationItem } from '@/common/types';
import LogoutIcon from '@mui/icons-material/Logout';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';

type LayoutProps = {
  children: React.ReactNode;
};

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const router = useRouter();
  const { user } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  let navigationItems: NavigationItem[] = [];
  if (user) {
    navigationItems = [
      { text: 'Home', path: routes.home, icon: <HomeIcon /> },
      { text: 'Chronik', path: routes.chronik, icon: <MenuBookIcon /> },
      { text: 'Rangliste', path: routes.rankings, icon: <MilitaryTechIcon /> },
      {
        text: 'Organisieren',
        path: routes.organizeduties,
        icon: <CleaningServicesIcon />,
      },
      // {
      //   text: 'Foto Gallery',
      //   path: routes.imagegallery,
      //   icon: <InsertPhotoIcon />,
      // },
      // { text: 'Strafen', path: routes.punishment, icon: <FlagIcon /> },
      { text: 'Finanzen', path: routes.zahlungen, icon: <EuroIcon /> },
      {
        text: 'AdminCenter',
        path: routes.admincenter,
        icon: <AdminPanelSettingsIcon />,
      },
    ];
  }

  const toggleDrawer =
    (open: boolean) => (event: React.KeyboardEvent | React.MouseEvent) => {
      if (
        event.type === 'keydown' &&
        ((event as React.KeyboardEvent).key === 'Tab' ||
          (event as React.KeyboardEvent).key === 'Shift')
      ) {
        return;
      }

      setDrawerOpen(open);
    };

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  const handleLogout = async () => {
    try {
      signOut(auth);
      router.push(routes.login);
    } catch (error) {
      console.log('error logout: ', error);
      const authError = error as AuthError;
      enqueueSnackbar(authError.message, { variant: 'error' });
    }
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar position="fixed">
        <Toolbar>
          {user && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={toggleDrawer(true)}
              sx={{ mr: 2, display: { lg: 'none' } }} // Hide on larger screens
            >
              <MenuIcon />
            </IconButton>
          )}
          <Box
            sx={{
              display: { xs: 'none', sm: 'flex' },
              mr: 1,
            }}
          >
            <Image src={Logo} alt="logo" height={60} width={60} />
          </Box>
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{
              mr: 2,
              display: 'flex',
              fontFamily: 'monospace',
              fontWeight: 700,
              color: 'inherit',
              letterSpacing: '3px',
              textDecoration: 'none',
              cursor: 'pointer',
            }}
            onClick={() => handleNavigation(routes.home)}
          >
            NINE TO SHINE
          </Typography>
          <Box
            sx={{
              display: { xs: 'none', lg: 'flex' },
              margin: '0 auto',
              justifyContent: 'space-evenly',
            }}
          >
            {navigationItems.map((nav) => (
              <Button
                key={nav.text}
                sx={{ display: 'block' }}
                onClick={() => handleNavigation(nav.path)}
              >
                <Typography fontWeight={700} color="#fff">
                  {nav.text}
                </Typography>
              </Button>
            ))}
          </Box>
          {user && (
            <Box
              sx={{
                display: { xs: 'none', lg: 'flex' },
                justifyContent: 'flex-end',
              }}
            >
              <Button
                color="secondary"
                onClick={handleLogout}
                endIcon={<LogoutIcon />}
              />
            </Box>
          )}
        </Toolbar>
      </AppBar>
      <ResponsiveDrawer
        open={drawerOpen}
        toggleDrawer={toggleDrawer}
        navigationItems={navigationItems}
        handleLogout={handleLogout}
      />
      <Container component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar /> {/* This is to push the content below the AppBar */}
        {children}
      </Container>
    </Box>
  );
};

export default Layout;
