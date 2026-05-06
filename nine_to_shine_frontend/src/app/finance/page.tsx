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
} from '@mui/material';
import Grid2 from '@mui/material/Grid2';
import SavingsIcon from '@mui/icons-material/Savings'; // Mitgliedsbeiträge (Sparschwein)
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'; // Konten (Bank)
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'; // Ausgaben (Quittung)
import HistoryIcon from '@mui/icons-material/History'; // Transaktions-Historie
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff'; // Urlaubs-Historie
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';

import Layout from '@/components/Layout';
import CustomTitle from '@/components/CustomTitle';

type Tile = {
  href: string;
  title: string;
  subtitle?: string;
  Icon: React.ElementType;
  color?: string;
};

export default function FinancePage() {
  const theme = useTheme();

  const tiles: Tile[] = [
    {
      href: '/finance/deposit',
      title: 'Mitgliedsbeiträge',
      subtitle: 'Einzahlungen erfassen',
      Icon: SavingsIcon,
      color: theme.palette.success.main,
    },
    {
      href: '/finance/expenses',
      title: 'Vereinsausgaben',
      subtitle: 'Ausgaben einsehen',
      Icon: ReceiptLongIcon,
      color: theme.palette.error.main,
    },
    {
      href: '/finance/bankaccounts',
      title: 'Konten',
      subtitle: 'Übersicht aller Stände',
      Icon: AccountBalanceIcon,
      color: theme.palette.primary.main,
    },
    {
      href: '/finance/transactions',
      title: 'Transaktionen',
      subtitle: 'Alle Transaktionen anzeigen',
      Icon: HistoryIcon,
      color: theme.palette.info.main,
    },
    {
      href: '/finance/trips',
      title: 'Urlaube',
      subtitle: 'Reisen anzeigen und anlegen',
      Icon: FlightTakeoffIcon,
      color: theme.palette.secondary.main,
    },
    {
      href: '/finance/games',
      title: 'Spielbeiträge',
      subtitle: 'Wer hat gezahlt?',
      Icon: SportsSoccerIcon,
      color: theme.palette.primary.dark,
    },
  ];

  return (
    <Layout>
      <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
        <CustomTitle text="Finanzen" />

        <Grid2 container spacing={2}>
          {tiles.map(({ href, title, subtitle, Icon, color }) => (
            <Grid2 key={href} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card elevation={2} sx={{ borderRadius: 2, height: '100%' }}>
                <CardActionArea
                  LinkComponent={Link}
                  href={href}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: 4,
                    height: '100%',
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
                      <Typography
                        variant="h5"
                        sx={{ lineHeight: 1.2, fontWeight: 'bold' }}
                      >
                        {title}
                      </Typography>
                      {subtitle && (
                        <Typography
                          variant="body1"
                          sx={{ mt: 0.75, color: 'text.secondary' }}
                        >
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
