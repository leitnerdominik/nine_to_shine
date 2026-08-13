'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import Grid2 from '@mui/material/Grid2';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import GroupsIcon from '@mui/icons-material/Groups';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import dayjs from 'dayjs';
import { useSnackbar } from 'notistack';

import Layout from '@/components/Layout';
import CustomTitle from '@/components/CustomTitle';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { routes } from '@/common/routes';
import { apiFinance, apiSeason } from '@/definitions/commands';
import type { GameDuesStatusDto, SeasonDto } from '@/definitions/types';
import { STD_CLUB, STD_MEMBER } from '@/schema/deposit';

export default function DuesOverviewPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [seasons, setSeasons] = useState<SeasonDto[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);
  const [games, setGames] = useState<GameDuesStatusDto[]>([]);
  const [loadingSeasons, setLoadingSeasons] = useState(true);
  const [loadingDues, setLoadingDues] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSeasons = useCallback(async () => {
    setLoadingSeasons(true);
    setError(null);

    try {
      const data = await apiSeason.getAll();
      const sortedSeasons = [...data].sort(
        (a, b) => b.seasonNumber - a.seasonNumber
      );

      setSeasons(sortedSeasons);
      setSelectedSeasonId((current) => current ?? sortedSeasons[0]?.id ?? null);

      if (sortedSeasons.length === 0) {
        setGames([]);
        setLoadingDues(false);
      }
    } catch {
      const message = 'Saisonen konnten nicht geladen werden.';
      setError(message);
      setLoadingDues(false);
      enqueueSnackbar(message, { variant: 'error' });
    } finally {
      setLoadingSeasons(false);
    }
  }, [enqueueSnackbar]);

  const loadDues = useCallback(
    async (seasonId: number) => {
      setLoadingDues(true);
      setError(null);

      try {
        setGames(await apiFinance.getDuesStatus(seasonId));
      } catch {
        const message = 'Spielbeiträge konnten nicht geladen werden.';
        setError(message);
        enqueueSnackbar(message, { variant: 'error' });
      } finally {
        setLoadingDues(false);
      }
    },
    [enqueueSnackbar]
  );

  useEffect(() => {
    void loadSeasons();
  }, [loadSeasons]);

  useEffect(() => {
    if (selectedSeasonId !== null) {
      void loadDues(selectedSeasonId);
    }
  }, [loadDues, selectedSeasonId]);

  const openPaymentCount = useMemo(
    () => games.reduce((total, game) => total + game.unpaidMembers.length, 0),
    [games]
  );
  const affectedGameCount = useMemo(
    () => games.filter((game) => game.unpaidMembers.length > 0).length,
    [games]
  );

  if (loadingSeasons || loadingDues) {
    return (
      <Layout>
        <LoadingSkeleton />
      </Layout>
    );
  }

  return (
    <Layout>
      <Box sx={{ maxWidth: 1000, mx: 'auto', p: 3 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', sm: 'center' }}
          spacing={2}
          mb={3}
        >
          <Box>
            <CustomTitle text="Offene Spielbeiträge" />
          </Box>

          {seasons.length > 0 && (
            <TextField
              select
              size="small"
              label="Saison"
              value={selectedSeasonId ?? ''}
              onChange={(event) => setSelectedSeasonId(Number(event.target.value))}
              sx={{ minWidth: 150 }}
            >
              {seasons.map((season) => (
                <MenuItem key={season.id} value={season.id}>
                  Saison {season.seasonNumber}
                </MenuItem>
              ))}
            </TextField>
          )}
        </Stack>

        {error && (
          <Alert
            severity="error"
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() =>
                  selectedSeasonId === null
                    ? void loadSeasons()
                    : void loadDues(selectedSeasonId)
                }
              >
                Erneut versuchen
              </Button>
            }
            sx={{ mb: 3 }}
          >
            {error}
          </Alert>
        )}

        {!error && seasons.length === 0 && (
          <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">
              Keine Saison vorhanden.
            </Typography>
          </Paper>
        )}

        {!error && seasons.length > 0 && (
          <>
            <Grid2 container spacing={2} sx={{ mb: 4 }}>
              <Grid2 size={{ xs: 12, sm: 6 }}>
                <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <GroupsIcon color={openPaymentCount > 0 ? 'warning' : 'success'} />
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Offene Beiträge
                      </Typography>
                      <Typography
                        variant="h4"
                        fontWeight="bold"
                        aria-label={`${openPaymentCount} offene Beiträge`}
                      >
                        {openPaymentCount}
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              </Grid2>
              <Grid2 size={{ xs: 12, sm: 6 }}>
                <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <SportsSoccerIcon
                      color={affectedGameCount > 0 ? 'warning' : 'success'}
                    />
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Spiele mit offenen Beiträgen
                      </Typography>
                      <Typography
                        variant="h4"
                        fontWeight="bold"
                        aria-label={`${affectedGameCount} betroffene Spiele`}
                      >
                        {affectedGameCount}
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              </Grid2>
            </Grid2>

            {games.length === 0 ? (
              <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">
                  In dieser Saison wurden noch keine Spiele gespielt.
                </Typography>
              </Paper>
            ) : (
              <Stack spacing={2}>
                {games.map((game) => {
                  const isSettled = game.unpaidMembers.length === 0;

                  return (
                    <Card key={game.gameId} variant="outlined">
                      <CardActionArea
                        component={Link}
                        href={`${routes.financesGames}/${game.gameId}`}
                      >
                        <CardContent>
                          <Stack spacing={2}>
                            <Stack
                              direction={{ xs: 'column', sm: 'row' }}
                              justifyContent="space-between"
                              alignItems={{ xs: 'flex-start', sm: 'center' }}
                              spacing={1}
                            >
                              <Box>
                                <Typography variant="h6" fontWeight="bold">
                                  {game.gameName}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {dayjs(game.playedAt).format('DD.MM.YYYY')}
                                  {' · '}
                                  {game.paidMemberCount}/{game.activeMemberCount}{' '}
                                  bezahlt
                                </Typography>
                              </Box>

                              <Chip
                                icon={
                                  isSettled ? (
                                    <CheckCircleIcon />
                                  ) : (
                                    <ErrorOutlineIcon />
                                  )
                                }
                                label={
                                  isSettled
                                    ? 'Alles bezahlt'
                                    : `${game.unpaidMembers.length} offen`
                                }
                                color={isSettled ? 'success' : 'warning'}
                                variant="outlined"
                              />
                            </Stack>

                            {!isSettled && (
                              <Box>
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                  gutterBottom
                                >
                                  Noch offen:
                                </Typography>
                                <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1}>
                                  {game.unpaidMembers.map((member) => (
                                    <Chip
                                      key={member.userId}
                                      label={member.displayName}
                                      size="small"
                                    />
                                  ))}
                                </Stack>
                              </Box>
                            )}
                          </Stack>
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  );
                })}
              </Stack>
            )}
          </>
        )}
      </Box>
    </Layout>
  );
}
