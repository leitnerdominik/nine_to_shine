'use client';

import Link from 'next/link';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Typography,
  useTheme,
  Stack,
  Alert,
} from '@mui/material';
import Grid2 from '@mui/material/Grid2';
import PeopleIcon from '@mui/icons-material/People';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
// import LeaderboardIcon from '@mui/icons-material/Leaderboard';
// import PaymentsIcon from '@mui/icons-material/Payments';
// import GavelIcon from '@mui/icons-material/Gavel';
import Layout from '@/components/Layout';
import CustomTitle from '@/components/CustomTitle';
import TextSnippetIcon from '@mui/icons-material/TextSnippet';

type Tile = {
  href: string;
  title: string;
  subtitle?: string;
  Icon: typeof PeopleIcon;
  color?: string;
};

export default function AdminCenterPage() {
  const theme = useTheme();

  const tiles: Tile[] = [
    {
      href: '/admincenter/users',
      title: 'Benutzer',
      subtitle: 'Verwalten & löschen',
      Icon: PeopleIcon,
      color: theme.palette.primary.main,
    },
    {
      href: '/admincenter/seasons',
      title: 'Saisons',
      subtitle: 'Anlegen & Übersicht',
      Icon: CalendarMonthIcon,
      color: theme.palette.secondary.main,
    },
    {
      href: '/admincenter/game',
      title: 'Spiele',
      subtitle: 'Erfassen & bearbeiten',
      Icon: SportsEsportsIcon,
      color: theme.palette.info.main,
    },
    {
      href: '/admincenter/organizer',
      title: 'Organisieren',
      subtitle: 'Anlegen & Übersicht',
      Icon: TextSnippetIcon,
      color: theme.palette.success.main,
    },
    // {
    //   href: '/under_construction',
    //   title: 'Ranglisten',
    //   subtitle: 'Punkte & Platzierungen',
    //   Icon: LeaderboardIcon,
    //   color: theme.palette.success.main,
    // },
    // {
    //   href: '/admincenter/finanzen',
    //   title: 'Finanzen',
    //   subtitle: 'Ein-/Ausgaben & Strafen',
    //   Icon: PaymentsIcon,
    //   color: theme.palette.warning.main,
    // },
    // {
    //   href: '/admincenter/strafen',
    //   title: 'Strafen',
    //   subtitle: 'Verhängen & Zahlungen',
    //   Icon: GavelIcon,
    //   color: theme.palette.error.main,
    // },
  ];

  return (
    <Layout>
      <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
        <CustomTitle text="AdminCenter" />
        <Alert
          severity="warning"
          variant="outlined"
          sx={{
            mb: 4,
            fontSize: '1.2rem',
            fontWeight: 'bold',
            justifyContent: 'center',
            alignItems: 'center',
            boxShadow: 3,
            py: 1,
            '& .MuiAlert-icon': {
              fontSize: '2rem',
            },
          }}
        >
          Bitte hier nichts ändern.
        </Alert>
        <Grid2 container spacing={2}>
          {tiles.map(({ href, title, subtitle, Icon, color }) => (
            <Grid2 key={href} size={{ xs: 12, sm: 6 }}>
              <Card elevation={2} sx={{ borderRadius: 2, height: '100%' }}>
                <CardActionArea
                  LinkComponent={Link}
                  href={href}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: 4,
                  }}
                >
                  <Stack
                    spacing={1.5}
                    alignItems="center"
                    sx={{ textAlign: 'center' }}
                  >
                    <Box
                      sx={{
                        width: { xs: 84, md: 96, lg: 108 },
                        height: { xs: 84, md: 96, lg: 108 },
                        borderRadius: 3,
                        bgcolor: color ?? theme.palette.grey[200],
                        color: theme.palette.getContrastText(
                          color ?? theme.palette.grey[200]
                        ),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: 1,
                      }}
                    >
                      <Icon sx={{ fontSize: { xs: 44, md: 52, lg: 60 } }} />
                    </Box>

                    <CardContent sx={{ p: 0 }}>
                      <Typography variant="h5" sx={{ lineHeight: 1.2 }}>
                        {title}
                      </Typography>
                      {subtitle && (
                        <Typography variant="body1" sx={{ mt: 0.75 }}>
                          {subtitle}
                        </Typography>
                      )}
                    </CardContent>
                  </Stack>
                </CardActionArea>
              </Card>
            </Grid2>
          ))}
        </Grid2>
      </Box>
    </Layout>
  );
}
