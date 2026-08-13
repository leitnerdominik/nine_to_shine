import CustomTitle from '@/components/CustomTitle';
import Layout from '@/components/Layout';
import {
  Box,
  Divider,
  Grid2,
  List,
  ListItem,
  Paper,
  Stack,
  Typography,
} from '@mui/material';

interface RoleSectionProps {
  title: string;
  duties?: string[];
}

const roles: RoleSectionProps[] = [
  {
    title: 'Präsident – Martin',
    duties: [
      'Organisierer unterstützen und eventuell erinnern',
      'Sicherstellen, dass die Treffen stattfinden und ordentlich durchgeführt werden',
    ],
  },
  {
    title: 'Kassierer – Bubi',
    duties: [
      'Nach jedem Treffen die Ein- und Ausgaben eintragen',
      'Strafen eintragen',
      'Geld sicher aufbewahren',
    ],
  },
  { title: 'Schriftführer – Simi',
    duties: ['monatliche Chronik führen'],
   },
  {
    title: 'Spielebeauftragter – Flori',
    duties: ['Punkte auf der Webseite eintragen'],
  },
  { title: 'IT – Dommo',
    duties: ['Instandhaltung und Wartung der Webseite']
  },
];

const constitutionRules = [
  'Die Abstimmung über den Termin wird vor Mitte des vorherigen Monats in der WhatsApp-Gruppe gepostet.',
  'Die Abstimmung über den Termin des Treffens läuft bis zum 1. des Monats (der 1. ist ausgeschlossen).',
  'Die Aktivität kann gepostet werden, wann der Organisator das will.',
  'Nichtmitglieder dürfen nicht zum Treffen kommen.',
  'Frauen dürfen nicht zum Treffen kommen.',
  'Mindestens drei verschiedene Aktivitäten werden zur Abstimmung gepostet.',
];

function RoleSection({ title, duties }: RoleSectionProps) {
  return (
    <Paper
      component="section"
      variant="outlined"
      sx={{
        height: '100%',
        p: { xs: 2, sm: 2.5 },
        borderRadius: 3,
        borderColor: 'divider',
        transition: 'border-color 150ms ease, box-shadow 150ms ease',
        '&:hover': {
          borderColor: 'primary.light',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.06)',
        },
      }}
    >
      <Typography
        component="h3"
        variant="h6"
        color="primary.main"
        fontWeight={700}
      >
        {title}
      </Typography>
      {duties && (
        <List component="ul" disablePadding sx={{ mt: 1.25 }}>
          {duties.map((duty) => (
            <ListItem
              component="li"
              disableGutters
              key={duty}
              sx={{ alignItems: 'flex-start', py: 0.4 }}
            >
              <Box
                aria-hidden="true"
                sx={{
                  width: 6,
                  height: 6,
                  mt: 1.1,
                  mr: 1.5,
                  flexShrink: 0,
                  borderRadius: '50%',
                  bgcolor: 'secondary.main',
                }}
              />
              <Typography color="text.primary" lineHeight={1.65}>
                {duty}
              </Typography>
            </ListItem>
          ))}
        </List>
      )}
    </Paper>
  );
}

export default function ConstitutionPage() {
  return (
    <Layout>
      <Box sx={{ width: '100%', maxWidth: 960, mx: 'auto', pb: 4 }}>
        <CustomTitle text="Verfassung" />

        <Box component="section" aria-labelledby="roles-heading" sx={{ mt: 4 }}>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2.5 }}>
            <Typography
              id="roles-heading"
              component="h2"
              variant="h5"
              fontWeight={700}
              sx={{ whiteSpace: 'nowrap' }}
            >
              Rollen – Saison 2
            </Typography>
            <Divider sx={{ flexGrow: 1 }} />
          </Stack>

          <Grid2 container spacing={2}>
            {roles.map((role) => (
              <Grid2 key={role.title} size={{ xs: 12, sm: 6 }}>
                <RoleSection {...role} />
              </Grid2>
            ))}
          </Grid2>
        </Box>

        <Box
          component="section"
          aria-labelledby="constitution-heading"
          sx={{ mt: { xs: 5, sm: 6 } }}
        >
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2.5 }}>
            <Typography
              id="constitution-heading"
              component="h2"
              variant="h5"
              fontWeight={700}
            >
              Verfassung
            </Typography>
            <Divider sx={{ flexGrow: 1 }} />
          </Stack>

          <Paper
            variant="outlined"
            sx={{
              px: { xs: 2, sm: 3 },
              py: 1,
              borderRadius: 3,
              borderColor: 'divider',
              bgcolor: 'rgba(4, 150, 255, 0.025)',
            }}
          >
            <List component="ol" disablePadding>
              {constitutionRules.map((rule, index) => (
                <ListItem
                  component="li"
                  disableGutters
                  key={rule}
                  sx={{
                    alignItems: 'flex-start',
                    py: { xs: 1.5, sm: 2 },
                    borderBottom:
                      index < constitutionRules.length - 1 ? 1 : 0,
                    borderColor: 'divider',
                  }}
                >
                  <Box
                    aria-hidden="true"
                    sx={{
                      width: 30,
                      height: 30,
                      mr: 2,
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%',
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      fontSize: '0.875rem',
                      fontWeight: 700,
                    }}
                  >
                    {index + 1}
                  </Box>
                  <Typography sx={{ pt: 0.35 }} lineHeight={1.65}>
                    {rule}
                  </Typography>
                </ListItem>
              ))}
            </List>
          </Paper>
        </Box>
      </Box>
    </Layout>
  );
}
