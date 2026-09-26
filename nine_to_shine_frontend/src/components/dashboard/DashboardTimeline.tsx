import Link from 'next/link';
import FlagRoundedIcon from '@mui/icons-material/FlagRounded';
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import {
  Avatar,
  Box,
  Card,
  CardActionArea,
  CardContent,
  Stack,
  Typography,
} from '@mui/material';
import type { OrganizerDutyDto } from '@/definitions/types';

type DashboardTimelineProps = {
  duties: OrganizerDutyDto[] | null;
  seasonId: number | null;
  year: number;
  href: string;
};

const months = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
] as const;

const shortMonths = [
  'Jan',
  'Feb',
  'Mär',
  'Apr',
  'Mai',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Okt',
  'Nov',
  'Dez',
] as const;

const avatarColors = [
  '#E2EDFF',
  '#DEF5ED',
  '#FFF0DD',
  '#EDE5FF',
  '#FFE5E8',
  '#DFF3F2',
  '#E8E8FF',
  '#FFF3DA',
  '#E5F0FF',
] as const;

function getInitials(name: string) {
  const words = name.trim().split(/\s+/);
  return (words.length > 1
    ? `${words[0][0]}${words[1][0]}`
    : words[0].slice(0, 2)
  ).toLocaleUpperCase('de');
}

export default function DashboardTimeline({
  duties,
  seasonId,
  year,
  href,
}: DashboardTimelineProps) {
  return (
    <Card
      component="section"
      aria-label={`Wer organisiert wann? ${year}`}
      elevation={0}
      sx={{
        borderRadius: '18px',
        border: 1,
        borderColor: 'divider',
        boxShadow: '0 10px 28px rgba(7, 17, 47, 0.06)',
        minWidth: 0,
        overflow: 'hidden',
        transition: 'transform 180ms ease, box-shadow 180ms ease',
        '@media (hover: hover) and (pointer: fine)': {
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 14px 34px rgba(7, 17, 47, 0.1)',
          },
        },
      }}
    >
      <CardActionArea
        component={Link}
        href={href}
        aria-label={`Wer organisiert wann? ${year} öffnen`}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;

          const timeline = event.currentTarget.querySelector<HTMLElement>(
            '[data-timeline-scroll]'
          );
          if (!timeline || timeline.scrollWidth <= timeline.clientWidth) return;

          timeline.scrollLeft += event.key === 'ArrowRight' ? 156 : -156;
          event.preventDefault();
        }}
        sx={{
          display: 'block',
          '&.Mui-focusVisible': {
            outline: '3px solid',
            outlineColor: 'primary.main',
            outlineOffset: -5,
          },
        }}
      >
        <CardContent sx={{ p: { xs: 2, sm: 2.5, md: 3 } }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              component="h2"
              variant="overline"
              sx={{ fontWeight: 800, textTransform: 'none' }}
            >
              Wer organisiert wann?
            </Typography>
          </Box>

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: { xs: 'block', md: 'none' }, mt: 1.5 }}
          >
            Für weitere Monate nach links wischen
          </Typography>

          <Box
            sx={{
              position: 'relative',
              mt: { xs: 2, sm: 3 },
              '&::after': {
                content: '""',
                display: { xs: 'block', md: 'none' },
                position: 'absolute',
                top: 0,
                right: 0,
                bottom: 0,
                width: 18,
                background: 'linear-gradient(90deg, transparent, white)',
                pointerEvents: 'none',
              },
            }}
          >
            <Box
              role="region"
              aria-label="Monate der Übersicht"
              data-timeline-scroll=""
              sx={{
                overflowX: { xs: 'auto', md: 'visible' },
                overflowY: 'hidden',
                scrollSnapType: { xs: 'x proximity', md: 'none' },
                scrollbarWidth: 'thin',
                pb: 1,
              }}
            >
              <Box
                component="ol"
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: 'repeat(12, 52px)',
                    md: 'repeat(12, minmax(0, 1fr))',
                  },
                  listStyle: 'none',
                  p: 0,
                  m: 0,
                  minWidth: 0,
                }}
              >
                {months.map((month, index) => {
                  const isBigMeeting = index === 9;
                  const isN2SPlusOne = index === 10;
                  const isFree = index === 11;
                  const monthKey = `${year}-${String(index + 1).padStart(2, '0')}`;
                  const monthDuties = duties?.filter(
                    (duty) =>
                      duty.seasonId === seasonId &&
                      duty.dutyDate.slice(0, 7) === monthKey
                  );
                  const names = [
                    ...new Set(
                      monthDuties
                        ?.filter((duty) => !duty.isSkipped)
                        .map((duty) => duty.userDisplayName?.trim())
                        .filter((name): name is string => Boolean(name)) ?? []
                    ),
                  ];
                  const fallback =
                    duties === null
                      ? 'Nicht verfügbar'
                      : monthDuties?.length &&
                          monthDuties.every((duty) => duty.isSkipped)
                        ? 'Entfällt'
                        : 'Offen';

                  return (
                    <Box
                      component="li"
                      key={month}
                      aria-label={`${month} ${year}`}
                      sx={{
                        position: 'relative',
                        minWidth: 0,
                        px: 0.4,
                        py: 1.5,
                        textAlign: 'center',
                        scrollSnapAlign: 'start',
                        borderRadius: 2,
                        bgcolor: isBigMeeting
                          ? 'primary.main'
                          : isN2SPlusOne
                            ? '#EAF4FF'
                            : 'transparent',
                        color: isBigMeeting ? 'primary.contrastText' : 'text.primary',
                      }}
                    >
                      <Stack
                        alignItems="center"
                        justifyContent="flex-end"
                        spacing={0.75}
                        sx={{ height: 110, minWidth: 0 }}
                      >
                        <Avatar
                          sx={{
                            width: { xs: 32, md: 36 },
                            height: { xs: 32, md: 36 },
                            bgcolor: isBigMeeting
                              ? 'rgba(255, 255, 255, 0.18)'
                              : isN2SPlusOne
                                ? '#D5E9FF'
                                : isFree
                                  ? '#ECEFF2'
                                  : avatarColors[index],
                            color: isBigMeeting
                              ? 'primary.contrastText'
                              : isN2SPlusOne
                                ? 'primary.main'
                                : 'text.primary',
                            fontSize: '0.7rem',
                            fontWeight: 800,
                          }}
                        >
                          {isBigMeeting ? (
                            <StarRoundedIcon fontSize="small" />
                          ) : isN2SPlusOne ? (
                            <FlagRoundedIcon fontSize="small" />
                          ) : isFree ? (
                            <RemoveRoundedIcon fontSize="small" />
                          ) : names.length > 0 ? (
                            getInitials(names[0])
                          ) : (
                            '–'
                          )}
                        </Avatar>
                        <Typography
                          variant="caption"
                          title={names.length > 0 ? names.join(', ') : undefined}
                          sx={{
                            display: 'block',
                            width: '100%',
                            maxHeight: 61,
                            overflowY: 'auto',
                            overflowWrap: 'anywhere',
                            lineHeight: 1.25,
                            fontSize: { xs: '0.65rem', md: '0.72rem' },
                            fontWeight: isBigMeeting || isN2SPlusOne ? 700 : 500,
                          }}
                        >
                          {isBigMeeting
                            ? 'Big Meeting'
                            : isN2SPlusOne
                              ? 'N2S+1'
                              : isFree
                                ? 'Frei'
                                : names.length > 0
                                  ? names.join(', ')
                                  : fallback}
                        </Typography>
                      </Stack>

                      <Box
                        sx={{
                          position: 'relative',
                          display: 'grid',
                          placeItems: 'center',
                          height: 28,
                          mt: 1,
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            left: index === 0 ? '50%' : 0,
                            top: '50%',
                            width:
                              index === 0 || index === 11 ? '50%' : '100%',
                            height: 3,
                            bgcolor: isFree ? '#B8C4D6' : 'primary.main',
                            transform: 'translateY(-50%)',
                          },
                        }}
                      >
                        <Box
                          sx={{
                            position: 'relative',
                            zIndex: 1,
                            width: isBigMeeting ? 20 : 16,
                            height: isBigMeeting ? 20 : 16,
                            borderRadius: '50%',
                            border: '3px solid',
                            borderColor: isBigMeeting
                              ? 'primary.contrastText'
                              : isFree
                                ? '#F4F5F7'
                                : 'background.paper',
                            bgcolor: isFree ? '#A8B2C3' : 'primary.main',
                            boxShadow: isBigMeeting
                              ? '0 0 0 4px rgba(255,255,255,0.28)'
                              : 'none',
                          }}
                        />
                      </Box>

                      <Typography
                        variant="caption"
                        sx={{
                          display: 'block',
                          mt: 0.5,
                          color: isBigMeeting ? 'inherit' : 'text.secondary',
                          fontSize: { xs: '0.65rem', md: '0.72rem' },
                        }}
                      >
                        <Box component="span" sx={{ display: { xs: 'inline', md: 'none' } }}>
                          {shortMonths[index]}
                        </Box>
                        <Box component="span" sx={{ display: { xs: 'none', md: 'inline' } }}>
                          {month}
                        </Box>
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
