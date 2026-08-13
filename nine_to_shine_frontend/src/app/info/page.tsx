import { routes } from '@/common/routes';
import CustomTitle from '@/components/CustomTitle';
import Layout from '@/components/Layout';
import GavelIcon from '@mui/icons-material/Gavel';
import HistoryEduIcon from '@mui/icons-material/HistoryEdu';
import PolicyIcon from '@mui/icons-material/Policy';
import {
  Avatar,
  Box,
  Card,
  CardActionArea,
  CardContent,
  Grid2,
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
      <Box sx={{ width: '100%', maxWidth: 1000, mx: 'auto', pb: 4 }}>
        <CustomTitle text="Informationen" />
        <Grid2 container spacing={3} sx={{ mt: 2 }}>
          {infoCards.map((card) => (
            <Grid2 key={card.title} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card
                variant="outlined"
                sx={{
                  height: '100%',
                  borderRadius: 3,
                  borderColor: 'divider',
                  transition: 'transform 150ms ease, box-shadow 150ms ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
                  },
                }}
              >
                <CardActionArea
                  component={Link}
                  href={card.href}
                  sx={{ height: '100%', p: 1 }}
                >
                  <CardContent>
                    <Avatar
                      sx={{
                        width: 52,
                        height: 52,
                        mb: 2,
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                      }}
                    >
                      {card.icon}
                    </Avatar>
                    <Typography
                      component="h2"
                      variant="h5"
                      color="primary.main"
                      fontWeight={700}
                      gutterBottom
                    >
                      {card.title}
                    </Typography>
                    <Typography color="text.secondary" lineHeight={1.6}>
                      {card.description}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid2>
          ))}
        </Grid2>
      </Box>
    </Layout>
  );
}
