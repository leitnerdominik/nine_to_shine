'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Box,
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
  Typography,
  useTheme,
} from '@mui/material';
import { useSnackbar } from 'notistack';

import Layout from '@/components/Layout';
import CustomTitle from '@/components/CustomTitle';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import {
  apiGame,
  apiRanking,
  apiSeason,
  apiUsers,
} from '@/definitions/commands';
import type {
  GameDto,
  RankingDto,
  SeasonDto,
  UserDto,
} from '@/definitions/types';

type OverviewRow = {
  gameId: number;
  playedAt: string;
  gameName: string;
  pointsByUserId: Map<number, number>;
};

export default function RankingsOverviewPage() {
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
      const [seasonData, userData, gameData, rankingData] = await Promise.all([
        apiSeason.getAll(),
        apiUsers.getAll(),
        apiGame.getAll(),
        apiRanking.getAll(),
      ]);
      setSeasons(seasonData);
      setUsers(userData);
      setGames(gameData);
      setRankings(rankingData);
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

  const seasonNumbers = useMemo<number[]>(() => {
    const nums = seasons.map((season) => season.seasonNumber);
    return [...new Set(nums)].sort((a, b) =>
      String(b).localeCompare(String(a), undefined, {
        numeric: true,
        sensitivity: 'base',
      })
    );
  }, [seasons]);

  const selectedSeasonNumber: number | undefined = useMemo(() => {
    const season = searchParams.get('season');
    const parsed = season !== null ? Number(season) : NaN;
    if (!Number.isNaN(parsed) && seasonNumbers.includes(parsed)) {
      return parsed;
    }
    return seasonNumbers[0];
  }, [searchParams, seasonNumbers]);

  const updateSearchParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(key, value);
      router.replace(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  const gamesOfSelectedSeason = useMemo(() => {
    if (selectedSeasonNumber == null) return [];
    const seasonIds = seasons
      .filter((season) => season.seasonNumber === selectedSeasonNumber)
      .map((season) => season.id);
    return games.filter((game) => seasonIds.includes(game.seasonId));
  }, [games, seasons, selectedSeasonNumber]);

  const rows = useMemo<OverviewRow[]>(() => {
    const rankingsByGameId = new Map<number, RankingDto[]>();
    for (const ranking of rankings) {
      const items = rankingsByGameId.get(ranking.gameId) ?? [];
      items.push(ranking);
      rankingsByGameId.set(ranking.gameId, items);
    }

    return gamesOfSelectedSeason
      .slice()
      .sort((a, b) => dayjs(b.playedAt).valueOf() - dayjs(a.playedAt).valueOf())
      .map((game) => ({
        gameId: game.id,
        playedAt: game.playedAt,
        gameName: game.gameName,
        pointsByUserId: new Map(
          (rankingsByGameId.get(game.id) ?? []).map((ranking) => [
            ranking.userId,
            ranking.points,
          ])
        ),
      }));
  }, [gamesOfSelectedSeason, rankings]);

  const activeUsers = useMemo(
    () =>
      users.filter((user) => rows.some((row) => row.pointsByUserId.has(user.id))),
    [rows, users]
  );

  const totalsByUserId = useMemo(() => {
    const totals = new Map<number, number>();
    for (const row of rows) {
      for (const [userId, points] of row.pointsByUserId.entries()) {
        totals.set(userId, (totals.get(userId) ?? 0) + points);
      }
    }
    return totals;
  }, [rows]);

  return (
    <Layout>
      {loading ? (
        <LoadingSkeleton />
      ) : (
        <>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', md: 'center' }}
            spacing={2}
            sx={{ mb: 4 }}
          >
            <Box>
              <CustomTitle text="Übersichtstabelle" />
              <Typography variant="h6" color="text.secondary">
                Alle Spiele mit Punkten pro Spieler
              </Typography>
            </Box>
          </Stack>

          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            sx={{ mb: 4 }}
          >
            <TextField
              select
              label="Saison"
              value={selectedSeasonNumber ?? ''}
              onChange={(event) =>
                updateSearchParam('season', String(event.target.value))
              }
              sx={{ minWidth: { xs: '100%', md: 200 } }}
            >
              {seasonNumbers.map((seasonNumber) => (
                <MenuItem key={seasonNumber} value={seasonNumber}>
                  Saison {seasonNumber}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <TableContainer
            component={Paper}
            sx={{
              borderRadius: 4,
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              overflow: 'auto',
            }}
          >
            <Table aria-label="Übersichtstabelle aller Spiele">
              <TableHead
                sx={{
                  background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.primary.light} 90%)`,
                }}
              >
                <TableRow>
                  <TableCell sx={{ color: 'inherit', fontWeight: 700 }}>
                    Spiel
                  </TableCell>
                  <TableCell sx={{ color: 'inherit', fontWeight: 700 }}>
                    Datum
                  </TableCell>
                  {activeUsers.map((user) => (
                    <TableCell
                      key={user.id}
                      align="center"
                      sx={{ color: 'inherit', fontWeight: 700 }}
                    >
                      {user.displayName}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={row.gameId}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => router.push(`/rankings/${row.gameId}`)}
                  >
                    <TableCell>{row.gameName}</TableCell>
                    <TableCell>{dayjs(row.playedAt).format('DD.MM.YYYY')}</TableCell>
                    {activeUsers.map((user) => (
                      <TableCell key={user.id} align="center">
                        {row.pointsByUserId.get(user.id) ?? '-'}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

                {rows.length > 0 && (
                  <TableRow sx={{ backgroundColor: theme.palette.action.selected }}>
                    <TableCell colSpan={2} sx={{ fontWeight: 700 }}>
                      Gesamt
                    </TableCell>
                    {activeUsers.map((user) => (
                      <TableCell
                        key={user.id}
                        align="center"
                        sx={{ fontWeight: 700 }}
                      >
                        {totalsByUserId.get(user.id) ?? 0}
                      </TableCell>
                    ))}
                  </TableRow>
                )}

                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={Math.max(activeUsers.length + 2, 3)}>
                      <Typography sx={{ py: 2 }}>
                        Für diese Auswahl sind keine Spiele vorhanden.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Layout>
  );
}
