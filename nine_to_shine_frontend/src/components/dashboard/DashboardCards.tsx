import Link from 'next/link';
import {
  alpha,
  Box,
  Card,
  CardActionArea,
  CardContent,
  Stack,
  Typography,
  type Theme,
} from '@mui/material';

type DashboardLeaderCardProps = {
  label: string;
  name: string | null;
  points: string | null;
  emptyText: string;
  href: string;
};

export type DashboardStatusTone =
  | 'neutral'
  | 'info'
  | 'warning'
  | 'success';

type DashboardStatusCardProps = {
  label: string;
  value: string;
  detail: string;
  href: string;
  tone: DashboardStatusTone;
};

const interactiveCardStyles = {
  height: '100%',
  borderRadius: '18px',
  border: 1,
  overflow: 'hidden',
  boxShadow: '0 10px 28px rgba(7, 17, 47, 0.06)',
  transition: 'transform 180ms ease, box-shadow 180ms ease',
  '@media (hover: hover) and (pointer: fine)': {
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 14px 34px rgba(7, 17, 47, 0.1)',
    },
  },
} as const;

const dashboardSurfaces = {
  leaderStart: '#087FF5',
  leaderEnd: '#006FF2',
  neutral: '#F4F5F7',
  info: '#E4F2FF',
} as const;

function getStatusTone(theme: Theme, tone: DashboardStatusTone) {
  switch (tone) {
    case 'info':
      return {
        surface: dashboardSurfaces.info,
        borderColor: alpha(theme.palette.primary.main, 0.18),
      };
    case 'warning':
      return {
        surface: dashboardSurfaces.neutral,
        borderColor: theme.palette.divider,
      };
    case 'success':
      return {
        surface: dashboardSurfaces.neutral,
        borderColor: theme.palette.divider,
      };
    case 'neutral':
      return {
        surface: dashboardSurfaces.neutral,
        borderColor: theme.palette.divider,
      };
  }
}

export function DashboardLeaderCard({
  label,
  name,
  points,
  emptyText,
  href,
}: DashboardLeaderCardProps) {
  return (
    <Card
      elevation={0}
      sx={(theme) => ({
        ...interactiveCardStyles,
        minHeight: { xs: 300, sm: 340, md: 390 },
        borderColor: alpha(theme.palette.primary.contrastText, 0.16),
        background: `linear-gradient(145deg, ${dashboardSurfaces.leaderStart} 0%, ${dashboardSurfaces.leaderEnd} 100%)`,
        color: 'primary.contrastText',
      })}
    >
      <CardActionArea
        component={Link}
        href={href}
        sx={{
          height: '100%',
          '&.Mui-focusVisible': {
            outline: '3px solid',
            outlineColor: 'primary.contrastText',
            outlineOffset: -5,
          },
        }}
      >
        <CardContent sx={{ height: '100%', p: { xs: 2.5, sm: 3.5 } }}>
          <Stack spacing={{ xs: 2.25, sm: 3 }} sx={{ height: '100%' }}>
            <Typography
              variant="overline"
              sx={{ color: 'inherit', fontWeight: 800, opacity: 0.92 }}
            >
              {label}
            </Typography>

            <Box
              aria-hidden="true"
              sx={(theme) => ({
                width: { xs: 72, sm: 96 },
                height: { xs: 72, sm: 96 },
                borderRadius: '18px',
                display: 'grid',
                placeItems: 'center',
                bgcolor: alpha(theme.palette.primary.contrastText, 0.16),
              })}
            >
              <Box
                component="span"
                sx={{ fontSize: { xs: 42, sm: 54 }, lineHeight: 1 }}
              >
                🏆
              </Box>
            </Box>

            <Box sx={{ mt: 'auto', minWidth: 0 }}>
              {name ? (
                <>
                  <Typography
                    variant="h3"
                    sx={{
                      fontSize: { xs: '2.25rem', sm: '3rem' },
                      fontWeight: 800,
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {name}
                  </Typography>
                  {points && (
                    <Typography
                      variant="h5"
                      sx={{ mt: 0.5, fontWeight: 400, opacity: 0.92 }}
                    >
                      {points}
                    </Typography>
                  )}
                </>
              ) : (
                <Typography variant="h5" sx={{ opacity: 0.78 }}>
                  {emptyText}
                </Typography>
              )}
            </Box>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export function DashboardStatusCard({
  label,
  value,
  detail,
  href,
  tone,
}: DashboardStatusCardProps) {
  return (
    <Card
      elevation={0}
      sx={(theme) => {
        const colors = getStatusTone(theme, tone);

        return {
          ...interactiveCardStyles,
          bgcolor: colors.surface,
          borderColor: colors.borderColor,
        };
      }}
    >
      <CardActionArea
        component={Link}
        href={href}
        sx={{
          height: '100%',
          '&.Mui-focusVisible': {
            outline: '3px solid',
            outlineColor: 'primary.main',
            outlineOffset: -5,
          },
        }}
      >
        <CardContent sx={{ height: '100%', p: { xs: 2, sm: 2.5, md: 3 } }}>
          <Stack justifyContent="center" sx={{ height: '100%', minWidth: 0 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="overline" color="text.primary">
                {label}
              </Typography>
              <Typography
                variant="h4"
                sx={{
                  mt: 1.75,
                  fontSize: { xs: '2rem', sm: '2.5rem', md: '2.75rem' },
                  fontWeight: 800,
                  overflowWrap: 'anywhere',
                }}
              >
                {value}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.75, fontSize: { sm: '1rem' } }}
              >
                {detail}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
