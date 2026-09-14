'use client';

import React from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import { useAuth } from '@/hooks/useAuth';
import AppNavigation from './AppNavigation';

type LayoutProps = {
  children: React.ReactNode;
};

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user } = useAuth();

  return (
    <Box sx={{ minHeight: '100vh' }}>
      <CssBaseline />
      <AppNavigation user={user} />
      <Container
        component="main"
        sx={{
          pt: { xs: '88px', md: '104px' },
          px: 3,
          pb: user
            ? { xs: 'calc(88px + env(safe-area-inset-bottom))', md: 3 }
            : 3,
        }}
      >
        {children}
      </Container>
    </Box>
  );
};

export default Layout;
