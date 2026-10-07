import { routes } from '@/common/routes';
import Layout from '@/components/Layout';
import PageTitle from '@/components/PageTitle';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import GavelIcon from '@mui/icons-material/Gavel';
import HistoryEduIcon from '@mui/icons-material/HistoryEdu';
import PolicyIcon from '@mui/icons-material/Policy';
import {
  Box,
  Card,
  CardActionArea,
  Stack,
  Typography,
} from '@mui/material';
import Link from 'next/link';

const infoCards = [
  {
    title: 'Strafenkatalog',
    description: 'Alle Vergehen, Beträge und Bemerkungen im Überblick.',
    href: routes.punishment,
    icon: <GavelIcon />,
  },
  {
    title: 'Chronik',
    description: 'Protokolle und Erinnerungen vergangener Treffen.',
    href: routes.chronikEntries,
    icon: <HistoryEduIcon />,
  },
  {
    title: 'Verfassung',
    description: 'Rollen, Aufgaben und Regeln des Vereins.',
    href: routes.constitution,
    icon: <PolicyIcon />,
  },
];

export default function ChronikPage() {
  return (
    <Layout>
      <Box
        sx={{
          width: '100%',
          maxWidth: 800,
          mx: 'auto',
          pt: { xs: 2, md: 4 },
          pb: 4,
        }}
      >
        <PageTitle title="Informationen" />
        <Stack spacing={2} sx={{ mt: { xs: 2.5, md: 3.5 } }}>
          {infoCards.map((card) => (
            <Card
              key={card.title}
              elevation={0}
              sx={{
                borderRadius: '20px',
                background: 'linear-gradient(110deg, #E8F3FF 0%, #EDF5FF 100%)',
                color: 'text.primary',
                transition: 'transform 150ms ease, box-shadow 150ms ease',
                '@media (hover: hover) and (pointer: fine)': {
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 24px rgba(7, 17, 47, 0.08)',
                  },
                },
                '@media (prefers-reduced-motion: reduce)': {
                  transition: 'none',
                  '&:hover': { transform: 'none' },
                },
              }}
            >
              <CardActionArea
                component={Link}
                href={card.href}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: 'minmax(0, 1fr) 32px',
                    md: '100px minmax(0, 1fr) 40px',
                  },
                  alignItems: 'center',
                  columnGap: { xs: 1.5, md: 3.5 },
                  rowGap: 1.5,
                  minHeight: { md: 160 },
                  p: { xs: 2.5, md: 3.75 },
                  '&.Mui-focusVisible, &:focus-visible': {
                    outline: '3px solid',
                    outlineColor: 'text.primary',
                    outlineOffset: -5,
                  },
                }}
              >
                <Box
                  aria-hidden="true"
                  sx={{
                    gridColumn: 1,
                    gridRow: 1,
                    width: { xs: 64, md: 100 },
                    height: { xs: 64, md: 100 },
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    background: 'linear-gradient(145deg, #2498FF 0%, #0075FF 100%)',
                    color: 'primary.contrastText',
                    '& .MuiSvgIcon-root': {
                      fontSize: { xs: 32, md: 48 },
                    },
                  }}
                >
                  {card.icon}
                </Box>
                <Box
                  sx={{
                    gridColumn: { xs: 1, md: 2 },
                    gridRow: { xs: 2, md: 1 },
                    minWidth: 0,
                  }}
                >
                  <Typography
                    component="h2"
                    sx={{
                      fontSize: { xs: '1.5rem', md: '1.75rem' },
                      fontWeight: 800,
                      letterSpacing: '-0.025em',
                      lineHeight: 1.2,
                    }}
                  >
                    {card.title}
                  </Typography>
                  <Typography
                    sx={{
                      mt: 0.75,
                      maxWidth: 380,
                      color: 'text.secondary',
                      fontSize: { xs: '1rem', md: '1.25rem' },
                      lineHeight: 1.4,
                    }}
                  >
                    {card.description}
                  </Typography>
                </Box>
                <ArrowForwardIcon
                  aria-hidden="true"
                  sx={{
                    gridColumn: { xs: 2, md: 3 },
                    gridRow: { xs: 2, md: 1 },
                    fontSize: { xs: 32, md: 40 },
                    color: '#0075FF',
                  }}
                />
              </CardActionArea>
            </Card>
          ))}
        </Stack>
      </Box>
    </Layout>
  );
}
