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

          <Box
            component="ol"
            aria-label="Monate der Übersicht"
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'minmax(0, 1fr)',
                md: 'repeat(12, minmax(0, 1fr))',
              },
              listStyle: 'none',
              m: 0,
              mt: { xs: 1.5, md: 3 },
              p: 0,
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
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '24px minmax(0, 1fr)',
                      md: 'minmax(0, 1fr)',
                    },
                    gridTemplateRows: {
                      xs: 'auto auto',
                      md: '110px 28px auto',
                    },
                    gridTemplateAreas: {
                      xs: '"track month" "track info"',
                      md: '"info" "track" "month"',
                    },
                    columnGap: { xs: 1, md: 0 },
                    minWidth: 0,
                    minHeight: { xs: 72, md: 0 },
                    px: { xs: 1, md: 0.4 },
                    py: { xs: 0, md: 1.5 },
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
                    direction={{ xs: 'row', md: 'column' }}
                    alignItems="center"
                    justifyContent={{ xs: 'flex-start', md: 'flex-end' }}
                    spacing={{ xs: 1, md: 0.75 }}
                    sx={{
                      gridArea: 'info',
                      height: { xs: 'auto', md: 110 },
                      minWidth: 0,
                      mb: { xs: 1.25, md: 0 },
                    }}
                  >
                    <Avatar
                      aria-hidden="true"
                      sx={{
                        width: { xs: 32, md: 36 },
                        height: { xs: 32, md: 36 },
                        flexShrink: 0,
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
                        minWidth: 0,
                        maxHeight: { md: 61 },
                        overflowY: { xs: 'visible', md: 'auto' },
                        overflowWrap: 'anywhere',
                        lineHeight: { xs: 1.35, md: 1.25 },
                        fontSize: { xs: '0.85rem', md: '0.72rem' },
                        fontWeight: isBigMeeting || isN2SPlusOne ? 700 : 500,
                        textAlign: { xs: 'left', md: 'center' },
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
                    aria-hidden="true"
                    sx={{
                      gridArea: 'track',
                      position: 'relative',
                      display: 'grid',
                      placeItems: 'center',
                      width: { xs: 24, md: '100%' },
                      height: { xs: '100%', md: 28 },
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        left: { xs: '50%', md: index === 0 ? '50%' : 0 },
                        top: { xs: index === 0 ? '50%' : 0, md: '50%' },
                        width: {
                          xs: 3,
                          md: index === 0 || index === 11 ? '50%' : '100%',
                        },
                        height: {
                          xs: index === 0 || index === 11 ? '50%' : '100%',
                          md: 3,
                        },
                        bgcolor: isBigMeeting
                          ? { xs: 'rgba(255,255,255,0.7)', md: 'primary.main' }
                          : isFree
                            ? '#B8C4D6'
                            : 'primary.main',
                        transform: {
                          xs: 'translateX(-50%)',
                          md: 'translateY(-50%)',
                        },
                      },
                    }}
                  >
                    <Box
                      sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
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
                      gridArea: 'month',
                      display: 'block',
                      alignSelf: { xs: 'end', md: 'start' },
                      mt: { xs: 1.25, md: 0.5 },
                      color: isBigMeeting ? 'inherit' : 'text.secondary',
                      fontSize: { xs: '0.75rem', md: '0.72rem' },
                      fontWeight: { xs: 700, md: 400 },
                      textAlign: { xs: 'left', md: 'center' },
                    }}
                  >
                    {month}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
