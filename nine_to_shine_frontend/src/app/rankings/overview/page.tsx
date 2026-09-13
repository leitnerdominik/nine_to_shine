'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import NextLink from 'next/link';
import dayjs from 'dayjs';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Box,
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
} from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useSnackbar } from 'notistack';

import Layout from '@/components/Layout';
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
import { getPlayerInitials } from './rankingOverview';

type OverviewRow = {
  gameId: number;
  playedAt: string;
  gameName: string;
  pointsByUserId: Map<number, number>;
};

const visuallyHidden = {
  position: 'absolute',
  width: 1,
  height: 1,
  p: 0,
  m: -1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
} as const;

export default function RankingsOverviewPage() {
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
    } catch (error) {
      enqueueSnackbar(
        (error as Error)?.message ?? 'Daten konnten nicht geladen werden.',
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

  const seasonYear = rows[0] == null ? undefined : dayjs(rows[0].playedAt).year();
  const tableMinWidth = Math.max(520, 248 + activeUsers.length * 76);

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
            <Stack
              component="header"
              direction={{ xs: 'column', md: 'row' }}
              justifyContent="space-between"
              alignItems={{ xs: 'stretch', md: 'flex-end' }}
              spacing={{ xs: 2.5, md: 4 }}
              sx={{ mb: { xs: 2.5, md: 3 } }}
            >
              <Box>
                <Typography
                  variant="overline"
                  color="text.secondary"
                  sx={{ display: 'block', mb: 0.5 }}
                >
                  Saison {selectedSeasonNumber ?? '–'}
                  {seasonYear == null ? '' : ` • ${seasonYear}`}
                </Typography>
                <Typography
                  component="h1"
                  sx={{
                    color: 'text.primary',
                    fontSize: { xs: '2.5rem', sm: '3.25rem' },
                    fontWeight: 800,
                    letterSpacing: '-0.04em',
                    lineHeight: 1.05,
                  }}
                >
                  Übersichtstabelle
                </Typography>
                <Box
                  aria-hidden="true"
                  sx={{
                    width: 40,
                    height: 6,
                    mt: 1.25,
                    mb: 1.75,
                    borderRadius: 999,
                    bgcolor: 'primary.main',
                  }}
                />
                <Typography
                  color="text.secondary"
                  sx={{ fontSize: { xs: '1rem', sm: '1.15rem' } }}
                >
                  Alle Spiele mit Punkten pro Spieler
                </Typography>
              </Box>

              <TextField
                select
                label="Saison"
                value={selectedSeasonNumber ?? ''}
                onChange={(event) =>
                  updateSearchParam('season', String(event.target.value))
                }
                sx={{
                  width: { xs: '100%', md: 228 },
                  flexShrink: 0,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2.5,
                    bgcolor: (theme) =>
                      alpha(theme.palette.background.paper, 0.92),
                  },
                }}
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
              aria-label="Horizontal scrollbare Übersichtstabelle"
              sx={{
                p: { xs: 0.75, sm: 1.25 },
                borderRadius: { xs: 3, sm: 4 },
                bgcolor: (theme) => alpha(theme.palette.background.paper, 0.76),
                border: 1,
                borderColor: (theme) => alpha(theme.palette.primary.main, 0.06),
                boxShadow: (theme) =>
                  `0 14px 40px ${alpha(theme.palette.primary.dark, 0.08)}`,
                overflowX: 'auto',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              <Table
                aria-label="Übersichtstabelle aller Spiele"
                sx={{
                  minWidth: { xs: tableMinWidth, md: '100%' },
                  borderCollapse: 'separate',
                  borderSpacing: '0 9px',
                }}
              >
                <TableHead sx={visuallyHidden}>
                  <TableRow>
                    <TableCell>Spiel und Datum</TableCell>
                    {activeUsers.map((user) => (
                      <TableCell key={user.id} align="center">
                        {user.displayName}
                      </TableCell>
                    ))}
                    <TableCell>Aktion</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => {
                    const isPlanned = dayjs(row.playedAt).isAfter(dayjs(), 'day');
                    const rowBackground = (theme: Theme) =>
                      isPlanned
                        ? `linear-gradient(100deg, ${alpha(
                            theme.palette.primary.main,
                            0.1
                          )}, ${alpha(theme.palette.primary.light, 0.06)})`
                        : theme.palette.background.paper;

                    return (
                      <TableRow
                        key={row.gameId}
                        onClick={(event) => {
                          if (!(event.target as HTMLElement).closest?.('a')) {
                            router.push(`/rankings/${row.gameId}`);
                          }
                        }}
                        sx={{
                          cursor: 'pointer',
                          '& > .MuiTableCell-root': {
                            py: { xs: 1.25, sm: 1.4 },
                            px: { xs: 1, sm: 1.25 },
                            borderTop: 1,
                            borderBottom: 1,
                            borderColor: (theme) =>
                              alpha(theme.palette.primary.main, 0.07),
                            background: rowBackground,
                            transition: 'box-shadow 160ms ease',
                          },
                          '& > .MuiTableCell-root:first-of-type': {
                            borderLeft: 1,
                            borderRadius: '16px 0 0 16px',
                          },
                          '& > .MuiTableCell-root:last-of-type': {
                            borderRight: 1,
                            borderRadius: '0 16px 16px 0',
                          },
                          '&:hover > .MuiTableCell-root': {
                            boxShadow: (theme) =>
                              `0 8px 24px ${alpha(
                                theme.palette.primary.dark,
                                0.08
                              )}`,
                          },
                        }}
                      >
                        <TableCell
                          sx={{
                            position: { xs: 'sticky', md: 'static' },
                            left: 0,
                            zIndex: { xs: 2, md: 'auto' },
                            width: { xs: 154, md: 260 },
                            minWidth: { xs: 154, md: 260 },
                            boxShadow: {
                              xs: '5px 0 10px rgba(7, 17, 47, 0.03)',
                              md: 'none',
                            },
                          }}
                        >
                          <Link
                            component={NextLink}
                            href={`/rankings/${row.gameId}`}
                            aria-label={`Spiel ${row.gameName} öffnen`}
                            underline="none"
                            sx={{
                              display: 'inline-block',
                              color: 'text.primary',
                              fontWeight: 800,
                              lineHeight: 1.2,
                              overflowWrap: 'anywhere',
                              '&:focus-visible': {
                                outline: '3px solid',
                                outlineColor: 'primary.main',
                                outlineOffset: 3,
                                borderRadius: 1,
                              },
                            }}
                          >
                            {row.gameName}
                            {isPlanned && (
                              <Typography
                                component="span"
                                sx={{ display: 'block', font: 'inherit' }}
                              >
                                (geplant)
                              </Typography>
                            )}
                          </Link>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mt: 0.6, whiteSpace: 'nowrap' }}
                          >
                            {dayjs(row.playedAt).format('DD.MM.YYYY')}
                          </Typography>
                        </TableCell>

                        {activeUsers.map((user) => (
                          <TableCell
                            key={user.id}
                            align="center"
                            sx={{ width: 76, minWidth: 76 }}
                          >
                            <Stack alignItems="center" spacing={0.65}>
                              <Tooltip title={user.displayName} arrow>
                                <Box
                                  component="span"
                                  aria-label={`Spieler ${user.displayName}`}
                                  sx={{
                                    display: 'grid',
                                    placeItems: 'center',
                                    width: { xs: 38, sm: 42 },
                                    height: { xs: 38, sm: 42 },
                                    borderRadius: '50%',
                                    bgcolor: (theme) =>
                                      alpha(theme.palette.primary.main, 0.055),
                                    border: 1,
                                    borderColor: (theme) =>
                                      alpha(theme.palette.primary.main, 0.08),
                                    color: 'text.primary',
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                  }}
                                >
                                  {getPlayerInitials(user.displayName)}
                                </Box>
                              </Tooltip>
                              <Typography
                                component="span"
                                sx={{
                                  minHeight: '1.25rem',
                                  color: 'text.primary',
                                  fontSize: '0.9rem',
                                  fontWeight: 800,
                                  lineHeight: 1.25,
                                }}
                              >
                                {row.pointsByUserId.get(user.id) ?? '–'}
                              </Typography>
                            </Stack>
                          </TableCell>
                        ))}

                        <TableCell
                          align="center"
                          sx={{
                            position: { xs: 'sticky', md: 'static' },
                            right: 0,
                            zIndex: { xs: 2, md: 'auto' },
                            width: 48,
                            minWidth: 48,
                            boxShadow: {
                              xs: '-5px 0 10px rgba(7, 17, 47, 0.03)',
                              md: 'none',
                            },
                          }}
                        >
                          <Link
                            component={NextLink}
                            href={`/rankings/${row.gameId}`}
                            aria-label={`Spiel ${row.gameName} öffnen`}
                            sx={{
                              display: 'inline-flex',
                              color: 'primary.main',
                              borderRadius: '50%',
                              '&:focus-visible': {
                                outline: '3px solid',
                                outlineColor: 'primary.main',
                                outlineOffset: 2,
                              },
                            }}
                          >
                            <ChevronRightIcon aria-hidden="true" />
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {rows.length > 0 && (
                    <TableRow
                      sx={{
                        '& > .MuiTableCell-root': {
                          py: { xs: 1.25, sm: 1.4 },
                          px: { xs: 1, sm: 1.25 },
                          borderTop: 1,
                          borderBottom: 1,
                          borderColor: (theme) =>
                            alpha(theme.palette.primary.main, 0.08),
                          background: (theme) =>
                            `linear-gradient(100deg, ${alpha(
                              theme.palette.primary.main,
                              0.11
                            )}, ${alpha(theme.palette.primary.light, 0.07)})`,
                        },
                        '& > .MuiTableCell-root:first-of-type': {
                          borderLeft: 1,
                          borderRadius: '16px 0 0 16px',
                        },
                        '& > .MuiTableCell-root:last-of-type': {
                          borderRight: 1,
                          borderRadius: '0 16px 16px 0',
                        },
                      }}
                    >
                      <TableCell
                        sx={{
                          position: { xs: 'sticky', md: 'static' },
                          left: 0,
                          zIndex: { xs: 2, md: 'auto' },
                          fontWeight: 800,
                          width: { xs: 154, md: 260 },
                          minWidth: { xs: 154, md: 260 },
                        }}
                      >
                        Gesamt
                      </TableCell>
                      {activeUsers.map((user) => (
                        <TableCell
                          key={user.id}
                          align="center"
                          sx={{ width: 76, minWidth: 76 }}
                        >
                          <Stack alignItems="center" spacing={0.65}>
                            <Tooltip title={user.displayName} arrow>
                              <Box
                                component="span"
                                aria-label={`Spieler ${user.displayName}`}
                                sx={{
                                  display: 'grid',
                                  placeItems: 'center',
                                  width: { xs: 38, sm: 42 },
                                  height: { xs: 38, sm: 42 },
                                  borderRadius: '50%',
                                  bgcolor: (theme) =>
                                    alpha(theme.palette.background.paper, 0.55),
                                  border: 1,
                                  borderColor: (theme) =>
                                    alpha(theme.palette.primary.main, 0.1),
                                  color: 'text.primary',
                                  fontSize: '0.8rem',
                                  fontWeight: 600,
                                }}
                              >
                                {getPlayerInitials(user.displayName)}
                              </Box>
                            </Tooltip>
                            <Typography
                              component="span"
                              sx={{ fontSize: '0.9rem', fontWeight: 800 }}
                            >
                              {totalsByUserId.get(user.id) ?? 0}
                            </Typography>
                          </Stack>
                        </TableCell>
                      ))}
                      <TableCell
                        aria-hidden="true"
                        sx={{
                          position: { xs: 'sticky', md: 'static' },
                          right: 0,
                          zIndex: { xs: 2, md: 'auto' },
                          width: 48,
                          minWidth: 48,
                        }}
                      />
                    </TableRow>
                  )}

                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={Math.max(activeUsers.length + 2, 2)}
                        sx={{ borderBottom: 0 }}
                      >
                        <Typography
                          color="text.secondary"
                          sx={{ py: 5, textAlign: 'center' }}
                        >
                          Für diese Auswahl sind keine Spiele vorhanden.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Box>
    </Layout>
  );
}
