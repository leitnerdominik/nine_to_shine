'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  Avatar,
  useTheme,
  Grid2,
  CardActionArea,
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
import SavingsIcon from '@mui/icons-material/Savings';
import Link from 'next/link';
import dayjs from 'dayjs';
import 'dayjs/locale/de';

import Layout from '@/components/Layout';
import CustomTitle from '@/components/CustomTitle';
import {
  apiRanking,
  apiOrganizerDuty,
  apiSeason,
  apiFinance,
} from '@/definitions/commands';
import type {
  GameDuesStatusDto,
  TopRankedDto,
  OrganizerDutyDto,
} from '@/definitions/types';
import { useSnackbar } from 'notistack';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { routes } from '@/common/routes';

dayjs.locale('de');

export default function DashboardPage() {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);

  const [topPlayer, setTopPlayer] = useState<TopRankedDto | null>(null);
  const [nextDuty, setNextDuty] = useState<OrganizerDutyDto | null>(null);
  const [currentSeasonNumber, setCurrentSeasonNumber] = useState<number | null>(
    null
  );
  const [openDuesCount, setOpenDuesCount] = useState<number | null>(null);
  const [openDuesGameCount, setOpenDuesGameCount] = useState<number | null>(
    null
  );

  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    (async () => {
      try {
        const seasons = await apiSeason.getAll();
        const currentSeason = [...seasons].sort(
          (a, b) => b.seasonNumber - a.seasonNumber
        )[0];
        setCurrentSeasonNumber(currentSeason?.seasonNumber || null);

        const [topData, dutyData, duesData] = await Promise.all([
          apiRanking.getTopRanked(currentSeason?.id),
          apiOrganizerDuty.getNextDuty(),
          currentSeason
            ? apiFinance.getDuesStatus(currentSeason.id)
            : Promise.resolve([] as GameDuesStatusDto[]),
        ]);

        setTopPlayer(topData);
        setNextDuty(dutyData);
        setOpenDuesCount(
          duesData.reduce(
            (total, game) => total + game.unpaidMembers.length,
            0
          )
        );
        setOpenDuesGameCount(
          duesData.filter((game) => game.unpaidMembers.length > 0).length
        );
      } catch {
        enqueueSnackbar('Fehler beim Laden des Dashboards', {
              variant: 'error',
            });
      } finally {
        setLoading(false);
      }
    })();
  }, [enqueueSnackbar]);

  if (loading) {
    return (
      <Layout>
        <LoadingSkeleton />
      </Layout>
    );
  }

  const hasOpenDues = openDuesCount !== null && openDuesCount > 0;

  return (
    <Layout>
      <Box sx={{ maxWidth: 1000, mx: 'auto', p: 3 }}>
        <CustomTitle text="Übersicht" />

        <Grid2 container spacing={3} sx={{ mt: 2 }}>
          {/* --- KACHEL 1: TOP PLAYER (RANKING) -> /rankings --- */}
          <Grid2 size={{ xs: 12, md: 6 }}>
            <Card
              elevation={3}
              sx={{
                height: '100%',
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                color: '#fff',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <CardActionArea
                component={Link}
                href="/rankings"
                sx={{ height: '100%' }}
              >
                <CardContent sx={{ position: 'relative', zIndex: 1, p: 3 }}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="flex-start"
                  >
                    <Box>
                      <Typography
                        variant="overline"
                        sx={{ opacity: 0.8, letterSpacing: 1 }}
                      >
                        Platz #1{' '}
                        {currentSeasonNumber
                          ? `(SAISON ${currentSeasonNumber})`
                          : ''}
                      </Typography>

                      {topPlayer ? (
                        <>
                          <Typography
                            variant="h3"
                            fontWeight="bold"
                            sx={{ mt: 1 }}
                          >
                            {topPlayer.userDisplayName}
                          </Typography>
                          <Typography
                            variant="h5"
                            sx={{ opacity: 0.9, mt: 0.5 }}
                          >
                            {topPlayer.totalPoints} Punkte
                          </Typography>
                        </>
                      ) : (
                        <Typography variant="h5" sx={{ mt: 2, opacity: 0.7 }}>
                          Noch keine Punkte
                        </Typography>
                      )}
                    </Box>

                    {/* Großes Icon im Hintergrund/Rechts */}
                    <EmojiEventsIcon
                      sx={{ fontSize: 100, color: 'rgba(255,215,0, 0.7)' }}
                    />
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid2>

          {/* --- KACHEL 2: ORGANISATION -> /organizer-duties --- */}
          <Grid2 size={{ xs: 12, md: 6 }}>
            <Card
              elevation={3}
              sx={{
                height: '100%',
                bgcolor: '#fff',
                borderLeft: `6px solid ${theme.palette.secondary.main}`,
              }}
            >
              <CardActionArea
                component={Link}
                href="/organizer-duties"
                sx={{ height: '100%' }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar
                      sx={{
                        bgcolor: theme.palette.secondary.light,
                        width: 56,
                        height: 56,
                      }}
                    >
                      <CleaningServicesIcon
                        sx={{ color: theme.palette.secondary.dark }}
                      />
                    </Avatar>

                    <Box>
                      <Typography
                        variant="overline"
                        color="text.secondary"
                        fontWeight="bold"
                      >
                        NÄCHSTER ZU ORGANISIEREN
                      </Typography>

                      {nextDuty ? (
                        <>
                          <Typography
                            variant="h4"
                            fontWeight="bold"
                            color="text.primary"
                          >
                            {nextDuty.userDisplayName ?? '-'}
                          </Typography>
                          <Typography
                            variant="subtitle1"
                            color="secondary.main"
                            fontWeight="medium"
                          >
                            für {dayjs(nextDuty.dutyDate).format('MMMM YYYY')}
                          </Typography>
                        </>
                      ) : (
                        <>
                          <Typography variant="h5" sx={{ mt: 0.5 }}>
                            Frei!
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Keiner Eingetragen!
                          </Typography>
                        </>
                      )}
                    </Box>
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid2>

          <Grid2 size={{ xs: 12 }}>
            <Card
              elevation={3}
              sx={{
                height: '100%',
                bgcolor: '#fff',
                borderLeft: `6px solid ${
                  openDuesCount === null
                    ? theme.palette.grey[400]
                    : hasOpenDues
                    ? theme.palette.warning.main
                    : theme.palette.success.main
                }`,
              }}
            >
              <CardActionArea
                component={Link}
                href={routes.duesOverview}
                sx={{ height: '100%' }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar
                      sx={{
                        bgcolor:
                          openDuesCount === null
                            ? theme.palette.grey[300]
                            : hasOpenDues
                            ? theme.palette.warning.light
                            : theme.palette.success.light,
                        width: 56,
                        height: 56,
                      }}
                    >
                      <SavingsIcon
                        sx={{
                          color:
                            openDuesCount === null
                              ? theme.palette.grey[700]
                              : hasOpenDues
                              ? theme.palette.warning.dark
                              : theme.palette.success.dark,
                        }}
                      />
                    </Avatar>

                    <Box>
                      <Typography
                        variant="overline"
                        color="text.secondary"
                        fontWeight="bold"
                      >
                        OFFENE SPIELBEITRÄGE{' '}
                        {currentSeasonNumber
                          ? `(SAISON ${currentSeasonNumber})`
                          : ''}
                      </Typography>
                      <Typography variant="h4" fontWeight="bold">
                        {openDuesCount === null
                          ? 'Nicht verfügbar'
                          : hasOpenDues
                          ? `${openDuesCount} offen`
                          : 'Alles bezahlt'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {openDuesCount === null
                          ? 'Status konnte nicht geladen werden'
                          : hasOpenDues
                          ? `${openDuesGameCount} ${
                              openDuesGameCount === 1 ? 'Spiel' : 'Spiele'
                            } betroffen`
                          : 'Keine offenen Spielbeiträge'}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid2>
        </Grid2>
      </Box>
    </Layout>
  );
}
