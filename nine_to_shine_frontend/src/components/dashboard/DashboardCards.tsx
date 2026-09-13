import type { ReactNode } from 'react';
import Link from 'next/link';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
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
  icon: ReactNode;
  tone: DashboardStatusTone;
};

const interactiveCardStyles = {
  height: '100%',
  borderRadius: 2.5,
  border: 1,
  overflow: 'hidden',
  transition: 'transform 180ms ease, box-shadow 180ms ease',
  '@media (hover: hover) and (pointer: fine)': {
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: 4,
    },
  },
} as const;

function getStatusTone(theme: Theme, tone: DashboardStatusTone) {
  switch (tone) {
    case 'info':
      return {
        surface: alpha(theme.palette.primary.main, 0.08),
        iconSurface: alpha(theme.palette.primary.main, 0.14),
        iconColor: theme.palette.primary.dark,
        borderColor: alpha(theme.palette.primary.main, 0.18),
      };
    case 'warning':
      return {
        surface: alpha(theme.palette.warning.main, 0.08),
        iconSurface: alpha(theme.palette.warning.main, 0.18),
        iconColor: theme.palette.warning.dark,
        borderColor: alpha(theme.palette.warning.main, 0.24),
      };
    case 'success':
      return {
        surface: alpha(theme.palette.success.main, 0.08),
        iconSurface: alpha(theme.palette.success.main, 0.16),
        iconColor: theme.palette.success.dark,
        borderColor: alpha(theme.palette.success.main, 0.22),
      };
    case 'neutral':
      return {
        surface: theme.palette.background.paper,
        iconSurface: theme.palette.grey[200],
        iconColor: theme.palette.grey[700],
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
      elevation={1}
      sx={(theme) => ({
        ...interactiveCardStyles,
        borderColor: alpha(theme.palette.primary.contrastText, 0.16),
        background: `linear-gradient(145deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
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
        <CardContent sx={{ height: '100%', p: { xs: 2.5, sm: 3 } }}>
          <Stack spacing={{ xs: 2.5, sm: 3 }} sx={{ height: '100%' }}>
            <Typography variant="overline" sx={{ opacity: 0.86 }}>
              {label}
            </Typography>

            <Box
              aria-hidden="true"
              sx={(theme) => ({
                width: { xs: 72, sm: 88 },
                height: { xs: 72, sm: 88 },
                borderRadius: 2.5,
                display: 'grid',
                placeItems: 'center',
                bgcolor: alpha(theme.palette.primary.contrastText, 0.14),
              })}
            >
              <EmojiEventsIcon
                sx={{
                  color: 'warning.light',
                  fontSize: { xs: 42, sm: 52 },
                }}
              />
            </Box>

            <Box sx={{ mt: 'auto', minWidth: 0 }}>
              {name ? (
                <>
                  <Typography
                    variant="h3"
                    sx={{
                      fontSize: { xs: '2rem', sm: '2.75rem' },
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {name}
                  </Typography>
                  {points && (
                    <Typography variant="h5" sx={{ mt: 0.5, opacity: 0.9 }}>
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
  icon,
  tone,
}: DashboardStatusCardProps) {
  return (
    <Card
      elevation={1}
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
          <Stack
            direction="row"
            spacing={{ xs: 0, sm: 2 }}
            alignItems="center"
            sx={{ height: '100%' }}
          >
            <Box
              aria-hidden="true"
              sx={(theme) => {
                const colors = getStatusTone(theme, tone);

                return {
                  width: 56,
                  height: 56,
                  flexShrink: 0,
                  display: { xs: 'none', sm: 'grid' },
                  borderRadius: 2,
                  placeItems: 'center',
                  bgcolor: colors.iconSurface,
                  color: colors.iconColor,
                  '& svg': { fontSize: 30 },
                };
              }}
            >
              {icon}
            </Box>

            <Box sx={{ minWidth: 0 }}>
              <Typography variant="overline" color="text.secondary">
                {label}
              </Typography>
              <Typography
                variant="h4"
                sx={{
                  mt: 0.25,
                  fontSize: { xs: '1.65rem', sm: '2rem', md: '2.125rem' },
                  overflowWrap: 'anywhere',
                }}
              >
                {value}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
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
