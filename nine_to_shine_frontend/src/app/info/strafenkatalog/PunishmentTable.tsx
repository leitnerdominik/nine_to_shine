import { punishmentRules } from './punishment-data';
import { Box, Paper, Typography } from '@mui/material';

export default function PunishmentTable() {
  return (
    <Box
      component="ul"
      role="list"
      aria-label="Strafenkatalog"
      sx={{ display: 'grid', gap: 1.25, m: 0, p: 0, listStyle: 'none', minWidth: 0 }}
    >
      {punishmentRules.map((punishment) => (
        <Paper
          component="li"
          key={punishment.id}
          elevation={0}
          sx={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) auto',
            alignItems: 'center',
            gap: { xs: 1, sm: 2.5 },
            px: { xs: 1.75, sm: 3 },
            py: 2,
            minHeight: 76,
            border: '1px solid',
            borderColor: '#E6EEF8',
            borderRadius: '16px',
            bgcolor: 'background.paper',
            minWidth: 0,
          }}
        >
          <Box sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
            <Typography
              sx={{
                color: 'text.primary',
                fontSize: { xs: '1rem', sm: '1.25rem' },
                fontWeight: 800,
                lineHeight: 1.35,
                letterSpacing: '-0.015em',
              }}
            >
              {punishment.vergehen}
            </Typography>
            {punishment.bemerkung && (
              <Typography
                color="text.secondary"
                sx={{ mt: 0.25, fontSize: { xs: '0.875rem', sm: '1rem' }, lineHeight: 1.4 }}
              >
                {punishment.bemerkung}
              </Typography>
            )}
          </Box>
          <Typography
            component="span"
            sx={{
              minWidth: { xs: 56, sm: 64 },
              textAlign: 'center',
              px: 1.25,
              py: 0.75,
              borderRadius: '10px',
              bgcolor: '#E2EFFF',
              color: '#0064D9',
              fontSize: { xs: '1.125rem', sm: '1.25rem' },
              fontWeight: 800,
              lineHeight: 1.4,
              whiteSpace: 'nowrap',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {punishment.betrag} €
          </Typography>
        </Paper>
      ))}
    </Box>
  );
}
