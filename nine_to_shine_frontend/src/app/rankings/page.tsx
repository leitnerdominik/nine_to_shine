'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import NextLink from 'next/link';
import {
  Box,
  Button,
  Divider,
  Fab,
  Link,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import dayjs from 'dayjs';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSnackbar } from 'notistack';

import Layout from '@/components/Layout';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import PageTitle from '@/components/PageTitle';
import RankingGameRow from './RankingGameRow';

import {
  apiSeason,
  apiUsers,
  apiGame,
  apiRanking,
} from '@/definitions/commands';
import type {
  SeasonDto,
  UserDto,
  GameDto,
  RankingDto,
} from '@/definitions/types';
import { getRankStyle } from '@/common/misc';

const RankingsPage = () => {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [seasons, setSeasons] = useState<SeasonDto[]>([]);
  const [users, setUsers] = useState<UserDto[]>([]);
  const [games, setGames] = useState<GameDto[]>([]);
  const [rankings, setRankings] = useState<RankingDto[]>([]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [s, u, g, r] = await Promise.all([
        apiSeason.getAll(),
        apiUsers.getAll(),
        apiGame.getAll(),
        apiRanking.getAll(),
      ]);
      setSeasons(s);
      setUsers(u);
      setGames(g);
      setRankings(r);
    } catch (e) {
      enqueueSnackbar(
        (e as Error)?.message ?? 'Daten konnten nicht geladen werden.',
        { variant: 'error' }
      );
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const userNameById = useMemo(() => {
    const m = new Map<number, string>();
    users.forEach((u) => m.set(u.id, u.displayName));
    return m;
  }, [users]);

  const seasonNumbers = useMemo<number[]>(() => {
    const nums = seasons.map((s) => s.seasonNumber);
    return [...new Set(nums)].sort((a, b) =>
      String(b).localeCompare(String(a), undefined, {
        numeric: true,
        sensitivity: 'base',
      })
    );
  }, [seasons]);

  const selectedSeasonNumber: number | undefined = useMemo(() => {
    const s = searchParams.get('season');
    const parsed = s !== null ? Number(s) : NaN;
    if (!Number.isNaN(parsed) && seasonNumbers.includes(parsed)) return parsed;
    return seasonNumbers[0];
  }, [searchParams, seasonNumbers]);

  const setSeasonNumber = useCallback(
    (seasonNum: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('season', String(seasonNum));
      router.replace(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  // Alle Games für die ausgewählte Saison (über seasonId → seasonNumber)
  const gamesOfSelectedSeason = useMemo(() => {
    if (selectedSeasonNumber == null) return [];
    // finde alle Season-Ids mit dieser Nummer (normalerweise 1:1)
    const seasonIds = seasons
      .filter((s) => s.seasonNumber === selectedSeasonNumber)
      .map((s) => s.id);
    return games.filter((g) => seasonIds.includes(g.seasonId));
  }, [games, seasons, selectedSeasonNumber]);

  // Totals pro Spieler für die ausgewählte Saison:
  // Summe aller Ranking.points der Games, die zu dieser Saison gehören.
  const totalsForSeason = useMemo(() => {
    const totals = new Map<
      number,
      { userId: number; displayName: string; points: number }
    >();
    const gameIdInSeason = new Set<number>(
      gamesOfSelectedSeason.map((g) => g.id)
    );
    for (const r of rankings) {
      if (!gameIdInSeason.has(r.gameId)) continue;
      const existing = totals.get(r.userId);
      if (existing) {
        existing.points += r.points;
      } else {
        totals.set(r.userId, {
          userId: r.userId,
          displayName: userNameById.get(r.userId) ?? `#${r.userId}`,
          points: r.points,
        });
      }
    }
    // sortiert (desc)
    return Array.from(totals.values()).sort((a, b) => b.points - a.points);
  }, [rankings, gamesOfSelectedSeason, userNameById]);

  const gameEntries = useMemo(() => {
    const gameIdsWithPoints = new Set(rankings.map((r) => r.gameId));
    const rankingsByGameId = new Map<number, RankingDto[]>();
    rankings.forEach((ranking) => {
      const gameRankings = rankingsByGameId.get(ranking.gameId) ?? [];
      gameRankings.push(ranking);
      rankingsByGameId.set(ranking.gameId, gameRankings);
    });

    return gamesOfSelectedSeason
      .filter((g) => gameIdsWithPoints.has(g.id))
      .slice()
      .sort((a, b) => dayjs(b.playedAt).valueOf() - dayjs(a.playedAt).valueOf())
      .map((g) => {
        const presentRankings = (rankingsByGameId.get(g.id) ?? [])
          .filter((ranking) => ranking.isPresent)
          .sort((a, b) => a.id - b.id);
        const winner = presentRankings.reduce<RankingDto | undefined>(
          (currentWinner, ranking) =>
            currentWinner == null || ranking.points > currentWinner.points
              ? ranking
              : currentWinner,
          undefined
        );

        return {
          id: g.id,
          date: dayjs(g.playedAt).format('DD.MM.YYYY'),
          title: g.gameName,
          participantCount: presentRankings.length,
          winnerName:
            winner == null
              ? '–'
              : (userNameById.get(winner.userId) ?? `#${winner.userId}`),
        };
      });
  }, [gamesOfSelectedSeason, rankings, userNameById]);

  return (
    <Layout>
      <Box
        sx={{
          minHeight: { xs: 'calc(100vh - 176px)', md: 'calc(100vh - 128px)' },
          mx: { xs: -1.5, sm: 0 },
          px: { xs: 1.5, sm: 0 },
          pb: 4,
        }}
      >
        {loading ? (
          <LoadingSkeleton />
        ) : (
          <Box sx={{ width: '100%', maxWidth: 1180, mx: 'auto' }}>
            <Box component="header" sx={{ mb: { xs: 3, md: 4 } }}>
              <PageTitle title="Rangliste" />

              <TextField
                select
                label="Saison"
                value={selectedSeasonNumber ?? ''}
                onChange={(event) => setSeasonNumber(Number(event.target.value))}
                sx={{
                  mt: 1.75,
                  width: { xs: '100%', md: 228 },
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2.5,
                    bgcolor: alpha(theme.palette.background.paper, 0.92),
                  },
                }}
              >
                {seasonNumbers.map((seasonNumber) => (
                  <MenuItem key={seasonNumber} value={seasonNumber}>
                    Saison {seasonNumber}
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            <TableContainer
              component={Paper}
              sx={{
                mb: 2,
                p: { xs: 1.25, sm: 2 },
                borderRadius: { xs: 3, sm: 4 },
                boxShadow: 'none',
                overflowX: 'auto',
              }}
            >
              <Table
                aria-label="Saison-Gesamtpunkte"
                sx={{ borderCollapse: 'separate', borderSpacing: '0 5px' }}
              >
                <TableHead
                  sx={{
                    '& .MuiTableCell-root': {
                      borderBottom: 0,
                      color: 'text.secondary',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                    },
                  }}
                >
                  <TableRow>
                    <TableCell sx={{ width: { xs: 110, sm: 190 } }}>
                      Platz
                    </TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell align="right" sx={{ width: { xs: 80, sm: 120 } }}>
                      Punkte
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {totalsForSeason.map((total, idx) => {
                    const { iconColor } = getRankStyle(idx);
                    const rowBackground =
                      idx === 0
                        ? alpha(theme.palette.primary.main, 0.09)
                        : idx === 1
                          ? alpha('#C0C0C0', 0.08)
                          : idx === 2
                            ? alpha('#CD7F32', 0.07)
                            : 'transparent';
                    const isPodium = idx < 3;

                    return (
                      <TableRow
                        key={total.userId}
                        sx={{
                          '& > .MuiTableCell-root': {
                            bgcolor: rowBackground,
                            borderBottom: isPodium ? 0 : 1,
                            borderColor: 'divider',
                            transition: 'background-color 160ms ease',
                          },
                          '& > .MuiTableCell-root:first-of-type': {
                            borderRadius: isPodium ? '12px 0 0 12px' : 0,
                          },
                          '& > .MuiTableCell-root:last-of-type': {
                            borderRadius: isPodium ? '0 12px 12px 0' : 0,
                          },
                          '&:hover > .MuiTableCell-root': {
                            bgcolor: alpha(theme.palette.primary.main, 0.075),
                          },
                        }}
                      >
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={1.5}>
                            <Typography fontWeight={isPodium ? 800 : 600}>
                              #{idx + 1}
                            </Typography>
                            {isPodium && (
                              <EmojiEventsIcon
                                aria-label={`Pokal für Platz ${idx + 1}`}
                                sx={{ color: iconColor, fontSize: '1.65rem' }}
                              />
                            )}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography fontWeight={isPodium ? 800 : 500}>
                            {total.displayName}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography fontWeight={isPodium ? 800 : 500}>
                            {total.points}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {totalsForSeason.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} sx={{ borderBottom: 0 }}>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ py: 4, textAlign: 'center' }}
                        >
                          Keine Daten für diese Saison.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 5 }}>
              <Button
                component={NextLink}
                href={
                  selectedSeasonNumber != null
                    ? `/rankings/overview?season=${selectedSeasonNumber}`
                    : '/rankings/overview'
                }
                variant="outlined"
                sx={{
                  borderRadius: 999,
                  px: 2.5,
                  textTransform: 'none',
                  fontWeight: 700,
                  bgcolor: alpha(theme.palette.background.paper, 0.84),
                }}
              >
                Übersichtstabelle aller Spiele öffnen
              </Button>
            </Box>

            <Divider sx={{ mb: 4 }} />

            <Typography variant="h5" component="h2" sx={{ mb: 3 }}>
              Spiele
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gap: { xs: 1.5, sm: 2 },
              }}
            >
              {gameEntries.map((g) => (
                <RankingGameRow
                  key={g.id}
                  gameId={g.id}
                  date={g.date}
                  title={g.title}
                  participantCount={g.participantCount}
                  winnerName={g.winnerName}
                />
              ))}
              {gameEntries.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  Keine Spiele in dieser Saison vorhanden.
                </Typography>
              )}
            </Box>
          </Box>
        )}
      </Box>

      <Tooltip title="Neues Spiel hinzufügen" placement="left">
        <Fab
          component={Link}
          href="/rankings/game/new"
          color="primary"
          aria-label="Neu"
          sx={{
            position: 'fixed',
            right: { xs: 16, md: 24 },
            bottom: {
              xs: 'calc(88px + env(safe-area-inset-bottom))',
              md: 24,
            },
            zIndex: (t) => t.zIndex.tooltip + 1,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}
        >
          <AddIcon />
        </Fab>
      </Tooltip>
    </Layout>
  );
};

export default RankingsPage;
