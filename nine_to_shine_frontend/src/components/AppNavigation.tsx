'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  AppBar,
  Avatar,
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Button,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Paper,
  Toolbar,
  Typography,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import EuroIcon from '@mui/icons-material/Euro';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech';
import LogoutIcon from '@mui/icons-material/Logout';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
import { AuthError, signOut, type User } from 'firebase/auth';
import { enqueueSnackbar } from 'notistack';

import { routes } from '@/common/routes';
import logo from '@/assets/logo.png';
import { getFirebaseAuth } from '../../firebase';

export type NavigationUser = Pick<User, 'displayName' | 'email'>;

type AppNavigationProps = {
  user: NavigationUser | null;
};

type PrimaryNavigationItem = {
  label: string;
  path: string;
  icon: React.ReactNode;
};

const primaryNavigationItems: PrimaryNavigationItem[] = [
  { label: 'Übersicht', path: routes.home, icon: <HomeIcon /> },
  { label: 'Rangliste', path: routes.rankings, icon: <MilitaryTechIcon /> },
  {
    label: 'Organisieren',
    path: routes.organizeduties,
    icon: <CleaningServicesIcon />,
  },
  { label: 'Finanzen', path: routes.finances, icon: <EuroIcon /> },
  { label: 'Admin', path: routes.admincenter, icon: <AdminPanelSettingsIcon /> },
];

function isRouteActive(pathname: string, path: string) {
  if (path === routes.home) return pathname === routes.home;
  return pathname === path || pathname.startsWith(`${path}/`);
}

function getInitials(user: NavigationUser) {
  const displayNameParts = user.displayName?.trim().split(/\s+/).filter(Boolean);

  if (displayNameParts?.length) {
    return displayNameParts
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }

  const emailNameParts = user.email
    ?.split('@')[0]
    .split(/[._-]+/)
    .filter(Boolean);

  if (emailNameParts?.length) {
    const initials =
      emailNameParts.length > 1
        ? emailNameParts.slice(0, 2).map((part) => part[0]).join('')
        : emailNameParts[0].slice(0, 2);
    return initials.toUpperCase();
  }

  return '?';
}

export default function AppNavigation({ user }: AppNavigationProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [accountMenuAnchor, setAccountMenuAnchor] =
    useState<HTMLElement | null>(null);
  const accountMenuOpen = Boolean(accountMenuAnchor);

  const activePrimaryPath =
    primaryNavigationItems.find((item) =>
      isRouteActive(pathname, item.path)
    )?.path ?? false;

  const closeAccountMenu = () => setAccountMenuAnchor(null);

  const handleLogout = async () => {
    closeAccountMenu();

    try {
      await signOut(getFirebaseAuth());
      router.push(routes.login);
    } catch (error) {
      const authError = error as AuthError;
      enqueueSnackbar(authError.message, { variant: 'error' });
    }
  };

  return (
    <>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
          color: 'text.primary',
        }}
      >
        <Toolbar
          sx={{
            minHeight: { xs: '64px', md: '80px' },
            width: '100%',
            maxWidth: 1280,
            mx: 'auto',
            px: { xs: 2, sm: 3 },
            display: { xs: 'flex', md: 'grid' },
            gridTemplateColumns: { md: 'minmax(150px, 1fr) auto minmax(150px, 1fr)' },
            justifyContent: 'space-between',
          }}
        >
          <Box
            component={Link}
            href={routes.home}
            aria-label="Zur Übersicht"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              width: 'fit-content',
              color: 'text.primary',
              textDecoration: 'none',
              '&:focus-visible': {
                outline: '3px solid',
                outlineColor: 'primary.main',
                outlineOffset: 4,
                borderRadius: 1,
              },
            }}
          >
            <Typography
              component="span"
              sx={{
                fontSize: { xs: '1.05rem', sm: '1.2rem' },
                fontWeight: 800,
                letterSpacing: '-0.04em',
                lineHeight: 1,
              }}
            >
              nine to shine
            </Typography>
            <Box
              sx={{
                position: 'relative',
                width: { xs: 30, md: 34 },
                height: { xs: 30, md: 34 },
                flexShrink: 0,
              }}
            >
              <Image
                src={logo}
                alt=""
                fill
                sizes="(min-width: 900px) 34px, 30px"
              />
            </Box>
          </Box>

          {user && (
            <Box
              component="nav"
              aria-label="Hauptnavigation"
              sx={{ display: { xs: 'none', md: 'flex' }, gap: 0.5 }}
            >
              {primaryNavigationItems.map((item) => {
                const active = isRouteActive(pathname, item.path);
                return (
                  <Button
                    key={item.path}
                    component={Link}
                    href={item.path}
                    aria-current={active ? 'page' : undefined}
                    sx={{
                      minWidth: 0,
                      px: { md: 1.5, lg: 2 },
                      py: 1.25,
                      borderRadius: 2,
                      color: active ? 'primary.contrastText' : 'text.primary',
                      bgcolor: active ? 'primary.main' : 'transparent',
                      fontWeight: 700,
                      textTransform: 'none',
                      whiteSpace: 'nowrap',
                      boxShadow: active ? 1 : 'none',
                      '&:hover': {
                        bgcolor: active ? 'primary.dark' : 'action.hover',
                      },
                      '&.Mui-focusVisible': {
                        outline: '3px solid',
                        outlineColor: 'primary.light',
                        outlineOffset: 2,
                      },
                    }}
                  >
                    {item.label}
                  </Button>
                );
              })}
            </Box>
          )}

          {user && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <IconButton
                aria-label="Benutzermenü öffnen"
                aria-controls={accountMenuOpen ? 'account-menu' : undefined}
                aria-haspopup="menu"
                aria-expanded={accountMenuOpen ? 'true' : undefined}
                onClick={(event) => setAccountMenuAnchor(event.currentTarget)}
                sx={{ p: 0.5 }}
              >
                <Avatar
                  sx={{
                    width: { xs: 40, md: 44 },
                    height: { xs: 40, md: 44 },
                    bgcolor: 'grey.100',
                    color: 'text.primary',
                    fontSize: '0.95rem',
                    fontWeight: 800,
                  }}
                >
                  {getInitials(user)}
                </Avatar>
              </IconButton>
              <Menu
                id="account-menu"
                anchorEl={accountMenuAnchor}
                open={accountMenuOpen}
                onClose={closeAccountMenu}
                MenuListProps={{ 'aria-label': 'Benutzeraktionen' }}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              >
                <MenuItem
                  component={Link}
                  href={routes.info}
                  onClick={closeAccountMenu}
                >
                  <ListItemIcon>
                    <InfoOutlinedIcon fontSize="small" />
                  </ListItemIcon>
                  Informationen
                </MenuItem>
                <MenuItem onClick={() => void handleLogout()}>
                  <ListItemIcon>
                    <LogoutIcon fontSize="small" />
                  </ListItemIcon>
                  Logout
                </MenuItem>
              </Menu>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      {user && (
        <Paper
          component="nav"
          aria-label="Mobile Hauptnavigation"
          square
          elevation={8}
          sx={{
            display: { xs: 'block', md: 'none' },
            position: 'fixed',
            right: 0,
            bottom: 0,
            left: 0,
            zIndex: (theme) => theme.zIndex.appBar,
            pb: 'env(safe-area-inset-bottom)',
            borderTop: 1,
            borderColor: 'divider',
          }}
        >
          <BottomNavigation
            showLabels
            value={activePrimaryPath}
            sx={{ height: 72, px: 0.5, bgcolor: 'background.paper' }}
          >
            {primaryNavigationItems.map((item) => {
              const active = isRouteActive(pathname, item.path);
              return (
                <BottomNavigationAction
                  key={item.path}
                  component={Link}
                  href={item.path}
                  value={item.path}
                  label={item.label}
                  icon={item.icon}
                  aria-current={active ? 'page' : undefined}
                  sx={{
                    minWidth: 0,
                    mx: 0.25,
                    my: 0.75,
                    px: 0.25,
                    py: 0.5,
                    borderRadius: 2,
                    color: 'text.secondary',
                    '& .MuiBottomNavigationAction-label': {
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    },
                    '&.Mui-selected': {
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                    },
                    '&.Mui-selected .MuiBottomNavigationAction-label': {
                      fontSize: '0.65rem',
                      fontWeight: 700,
                    },
                    '&.Mui-focusVisible': {
                      outline: '3px solid',
                      outlineColor: 'primary.light',
                      outlineOffset: -2,
                    },
                  }}
                />
              );
            })}
          </BottomNavigation>
        </Paper>
      )}
    </>
  );
}
