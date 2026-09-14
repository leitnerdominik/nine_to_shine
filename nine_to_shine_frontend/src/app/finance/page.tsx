'use client';

import Link from 'next/link';
import {
  Box,
  Card,
  CardActionArea,
  Stack,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import SavingsIcon from '@mui/icons-material/Savings';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import HistoryIcon from '@mui/icons-material/History';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

import Layout from '@/components/Layout';

type Tile = {
  href: string;
  title: string;
  subtitle: string;
  Icon: React.ElementType;
  color: string;
  colorEnd: string;
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
      colorEnd: theme.palette.success.dark,
    },
    {
      href: '/finance/expenses',
      title: 'Vereinsausgaben',
      subtitle: 'Ausgaben einsehen',
      Icon: ReceiptLongIcon,
      color: theme.palette.error.main,
      colorEnd: theme.palette.error.dark,
    },
    {
      href: '/finance/bankaccounts',
      title: 'Konten',
      subtitle: 'Übersicht aller Stände',
      Icon: AccountBalanceIcon,
      color: theme.palette.primary.main,
      colorEnd: theme.palette.primary.dark,
    },
    {
      href: '/finance/transactions',
      title: 'Transaktionen',
      subtitle: 'Alle Transaktionen anzeigen',
      Icon: HistoryIcon,
      color: theme.palette.info.main,
      colorEnd: theme.palette.info.dark,
    },
    {
      href: '/finance/trips',
      title: 'Urlaube',
      subtitle: 'Reisen anzeigen und anlegen',
      Icon: FlightTakeoffIcon,
      color: theme.palette.secondary.main,
      colorEnd: theme.palette.secondary.dark,
    },
    {
      href: '/finance/games',
      title: 'Spielbeiträge',
      subtitle: 'Wer hat gezahlt?',
      Icon: SportsSoccerIcon,
      color: theme.palette.secondary.light,
      colorEnd: theme.palette.secondary.main,
    },
  ];

  return (
    <Layout>
      <Box sx={{ width: '100%', maxWidth: 1120, mx: 'auto' }}>
        <Box sx={{ mb: { xs: 2, sm: 3 } }}>
          <Typography
            component="h1"
            variant="h3"
            sx={{
              fontSize: { xs: '2rem', sm: '2.5rem' },
              color: 'text.primary',
            }}
          >
            Finanzen
          </Typography>
          <Typography
            color="text.secondary"
            sx={{ mt: 0.5, fontSize: { xs: '0.95rem', sm: '1.1rem' } }}
          >
            Behalte deine Finanzen im Überblick.
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'minmax(0, 1fr)',
              sm: 'repeat(2, minmax(0, 1fr))',
              md: 'repeat(3, minmax(0, 1fr))',
            },
            gap: { xs: 1, sm: 2, md: 2.25 },
          }}
        >
          {tiles.map(({ href, title, subtitle, Icon, color, colorEnd }) => (
            <Card
              key={href}
              elevation={0}
              sx={{
                minWidth: 0,
                minHeight: { xs: 80, sm: 184 },
                border: 1,
                borderColor: 'divider',
                borderRadius: { xs: '14px', sm: '16px' },
                bgcolor: 'background.paper',
                boxShadow: '0 8px 24px rgba(7, 17, 47, 0.05)',
                overflow: 'hidden',
                transition: 'transform 180ms ease, box-shadow 180ms ease',
                '@media (hover: hover) and (pointer: fine)': {
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 14px 30px rgba(7, 17, 47, 0.1)',
                  },
                },
              }}
            >
              <CardActionArea
                component={Link}
                href={href}
                sx={{
                  height: '100%',
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '56px minmax(0, 1fr) auto',
                    sm: '1fr auto',
                  },
                  gridTemplateRows: { sm: 'auto 1fr' },
                  alignItems: { xs: 'center', sm: 'start' },
                  columnGap: { xs: 1.5, sm: 2 },
                  rowGap: { sm: 1.25 },
                  p: { xs: 1.25, sm: 2.5, md: 2.75 },
                  '&.Mui-focusVisible': {
                    outline: '3px solid',
                    outlineColor: 'primary.main',
                    outlineOffset: -4,
                  },
                }}
              >
                <Box
                  aria-hidden="true"
                  sx={{
                    width: { xs: 56, sm: 72, md: 80 },
                    height: { xs: 56, sm: 72, md: 80 },
                    borderRadius: { xs: '12px', sm: '14px' },
                    background: `linear-gradient(145deg, ${color} 0%, ${colorEnd} 100%)`,
                    color: theme.palette.getContrastText(color),
                    display: 'grid',
                    placeItems: 'center',
                    boxShadow: `0 6px 14px ${alpha(color, 0.24)}`,
                  }}
                >
                  <Icon sx={{ fontSize: { xs: 30, sm: 40, md: 44 } }} />
                </Box>

                <Box
                  aria-hidden="true"
                  sx={{
                    color: 'primary.main',
                    gridColumn: { xs: 3, sm: 2 },
                    gridRow: 1,
                    alignSelf: { sm: 'center' },
                    justifySelf: 'end',
                  }}
                >
                  <ChevronRightIcon
                    sx={{ display: { xs: 'block', sm: 'none' } }}
                  />
                  <ArrowForwardIcon
                    sx={{ display: { xs: 'none', sm: 'block' }, fontSize: 32 }}
                  />
                </Box>

                <Stack
                  spacing={0.25}
                  sx={{
                    minWidth: 0,
                    gridColumn: { xs: 2, sm: '1 / -1' },
                    gridRow: { xs: 1, sm: 2 },
                    alignSelf: { sm: 'end' },
                  }}
                >
                  <Typography
                    variant="h5"
                    sx={{
                      fontSize: { xs: '0.95rem', sm: '1.2rem', md: '1.3rem' },
                      fontWeight: 800,
                      color: 'text.primary',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {title}
                  </Typography>
                  <Typography
                    color="text.secondary"
                    sx={{
                      fontSize: { xs: '0.78rem', sm: '0.95rem' },
                      lineHeight: 1.35,
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {subtitle}
                  </Typography>
                </Stack>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      </Box>
    </Layout>
  );
}
