'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  Stack,
  Paper,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import Link from 'next/link';
import dayjs from 'dayjs';

import Layout from '@/components/Layout';
import PageTitle from '@/components/PageTitle';
import { getGameEmoji } from '@/common/gameEmoji';
import { apiGame, apiSeason } from '@/definitions/commands';
import type { GameDto, SeasonDto } from '@/definitions/types';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { toErrorMessage } from '@/definitions/api';

export default function GamesListPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [games, setGames] = useState<GameDto[]>([]);
  const [seasons, setSeasons] = useState<SeasonDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [seasonData, gameData] = await Promise.all([
        apiSeason.getAll(),
        apiGame.getGamesWithBookings(),
      ]);
      setSeasons(seasonData);
      setGames(gameData);
    } catch (err) {
      setError(`Spiele konnten nicht geladen werden. ${toErrorMessage(err)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const seasonNumbers = useMemo(
    () =>
      [...new Set(seasons.map((season) => season.seasonNumber))].sort(
        (a, b) => b - a
      ),
    [seasons]
  );

  const selectedSeasonNumber = useMemo(() => {
    const queryValue = searchParams.get('season');
    const requestedSeason = queryValue === null ? NaN : Number(queryValue);
    return seasonNumbers.includes(requestedSeason)
      ? requestedSeason
      : seasonNumbers[0];
  }, [searchParams, seasonNumbers]);

  const selectedGames = useMemo(() => {
    const selectedSeasonIds = new Set(
      seasons
        .filter((season) => season.seasonNumber === selectedSeasonNumber)
        .map((season) => season.id)
    );
    return games
      .filter((game) => selectedSeasonIds.has(game.seasonId))
      .sort((a, b) => dayjs(b.playedAt).valueOf() - dayjs(a.playedAt).valueOf());
  }, [games, seasons, selectedSeasonNumber]);

  const newestGameDate = selectedGames[0]?.playedAt;
  const seasonYear = newestGameDate ? dayjs(newestGameDate).year() : undefined;

  const setSeasonNumber = (seasonNumber: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('season', String(seasonNumber));
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <Layout>
      <Box
        sx={{
          width: '100%',
          maxWidth: 1160,
          mx: 'auto',
          px: { xs: 1.5, sm: 3, md: 4 },
          py: { xs: 3, md: 4 },
        }}
      >
        <Stack
          component="header"
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'stretch', sm: 'flex-end' }}
          justifyContent="space-between"
          spacing={2}
          sx={{ mb: { xs: 3, md: 3.5 } }}
        >
          <Box>
            <PageTitle title="Spielbeiträge" />
            {!loading && !error && selectedSeasonNumber !== undefined && (
              <Typography
                component="p"
                sx={{
                  mt: 1.75,
                  color: 'text.secondary',
                  fontSize: { xs: '0.8rem', md: '0.9rem' },
                  fontWeight: 800,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                }}
              >
                Saison {selectedSeasonNumber}
                {seasonYear !== undefined ? ` · ${seasonYear}` : ''}
              </Typography>
            )}
          </Box>
          {!loading && !error && seasonNumbers.length > 0 && (
            <TextField
              select
              size="small"
              label="Saison"
              value={selectedSeasonNumber ?? ''}
              onChange={(event) => setSeasonNumber(Number(event.target.value))}
              sx={{
                width: { xs: '100%', sm: 174 },
                flexShrink: 0,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2.5,
                  bgcolor: 'background.paper',
                },
              }}
            >
              {seasonNumbers.map((seasonNumber) => (
                <MenuItem key={seasonNumber} value={seasonNumber}>
                  Saison {seasonNumber}
                </MenuItem>
              ))}
            </TextField>
          )}
        </Stack>

        {loading ? (
          <LoadingSkeleton />
        ) : error ? (
          <Alert
            severity="error"
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => void fetchData()}
              >
                Erneut versuchen
              </Button>
            }
          >
            {error}
          </Alert>
        ) : seasonNumbers.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
            Keine Saison vorhanden.
          </Paper>
        ) : selectedGames.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
            Keine Spiele mit Buchungen gefunden.
          </Paper>
        ) : (
          <Stack spacing={{ xs: 1.5, md: 1.75 }}>
            {selectedGames.map((game) => (
              <Card
                key={game.id}
                elevation={0}
                sx={{
                  borderRadius: { xs: 2.5, md: 3 },
                  border: 1,
                  borderColor: (theme) => alpha(theme.palette.primary.main, 0.13),
                  bgcolor: 'background.paper',
                  boxShadow: (theme) =>
                    `0 6px 20px ${alpha(theme.palette.primary.dark, 0.05)}`,
                  transition: 'transform 160ms ease, box-shadow 160ms ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: (theme) =>
                      `0 10px 28px ${alpha(theme.palette.primary.dark, 0.1)}`,
                  },
                }}
              >
                <CardActionArea
                  component={Link}
                  href={`/finance/games/${game.id}`}
                  aria-label={`${game.gameName} – Details öffnen`}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '60px minmax(0, 1fr) auto 22px',
                      sm: '76px minmax(0, 1fr) auto 30px',
                    },
                    alignItems: 'center',
                    gap: { xs: 1.25, sm: 2, md: 2.5 },
                    minHeight: { xs: 92, sm: 104 },
                    p: { xs: 1.25, sm: 1.5 },
                    '&.Mui-focusVisible': {
                      outline: '3px solid',
                      outlineColor: 'primary.main',
                      outlineOffset: -3,
                    },
                  }}
                >
                  <Box
                    aria-hidden="true"
                    sx={{
                      display: 'grid',
                      placeItems: 'center',
                      width: { xs: 60, sm: 76 },
                      height: { xs: 60, sm: 76 },
                      borderRadius: 2.5,
                      bgcolor: '#E6F4FF',
                      fontSize: { xs: '2.25rem', sm: '2.75rem' },
                      lineHeight: 1,
                    }}
                  >
                    {getGameEmoji(game.gameName)}
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      component="h2"
                      sx={{
                        color: 'text.primary',
                        fontSize: { xs: '1rem', sm: '1.3rem', md: '1.5rem' },
                        fontWeight: 800,
                        lineHeight: 1.2,
                        overflowWrap: 'anywhere',
                      }}
                    >
                      {game.gameName}
                    </Typography>
                    <Typography
                      sx={{
                        mt: 0.5,
                        color: 'text.secondary',
                        fontSize: { xs: '0.85rem', sm: '1rem' },
                      }}
                    >
                      {game.playedAt
                        ? dayjs(game.playedAt).format('DD.MM.YYYY')
                        : 'Kein Datum'}
                    </Typography>
                  </Box>
                  <Box
                    component="span"
                    sx={{
                      px: { xs: 1.25, sm: 2.25 },
                      py: { xs: 0.75, sm: 1 },
                      borderRadius: 999,
                      bgcolor: '#E5F1FF',
                      color: 'primary.dark',
                      fontSize: { xs: '0.8rem', sm: '0.95rem' },
                      fontWeight: 800,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Details
                  </Box>
                  <ArrowForwardIcon
                    aria-hidden="true"
                    sx={{ color: 'primary.main', fontSize: { xs: 22, sm: 30 } }}
                  />
                </CardActionArea>
              </Card>
            ))}
          </Stack>
        )}
      </Box>
    </Layout>
  );
}
