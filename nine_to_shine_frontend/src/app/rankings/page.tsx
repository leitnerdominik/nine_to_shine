'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import NextLink from 'next/link';
import {
  Box,
  Button,
  Divider,
  Fab,
  Link,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import dayjs from 'dayjs';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSnackbar } from 'notistack';

import Layout from '@/components/Layout';
import CustomTitle from '@/components/CustomTitle';
import EntryTile from '@/components/EntryTile';
import LoadingSkeleton from '@/components/LoadingSkeleton';

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
    const totals = new Map<string, number>(); // key: displayName
    const gameIdInSeason = new Set<number>(
      gamesOfSelectedSeason.map((g) => g.id)
    );
    for (const r of rankings) {
      if (!gameIdInSeason.has(r.gameId)) continue;
      const name = userNameById.get(r.userId) ?? `#${r.userId}`;
      totals.set(name, (totals.get(name) ?? 0) + r.points);
    }
    // sortiert (desc)
    return Array.from(totals.entries()).sort((a, b) => b[1] - a[1]);
  }, [rankings, gamesOfSelectedSeason, userNameById]);

  // Für die Spiele-Kacheln (wie früher EntryTile): Datum + Titel
  const gameEntriesForTiles = useMemo(() => {
    const gameIdsWithPoints = new Set(rankings.map((r) => r.gameId));
    return gamesOfSelectedSeason
      .filter((g) => gameIdsWithPoints.has(g.id))
      .slice()
      .sort((a, b) => dayjs(b.playedAt).valueOf() - dayjs(a.playedAt).valueOf())
      .map((g) => ({
        id: String(g.id),
        date: dayjs(g.playedAt).format('DD.MM.YYYY'),
        title: g.gameName,
      }));
  }, [gamesOfSelectedSeason, rankings]);

  return (
    <Layout>
      {loading ? (
        <LoadingSkeleton />
      ) : (
        <>
          {/* Header */}
          <Stack
            direction="column"
            alignItems="flex-start"
            justifyContent="space-between"
            spacing={2}
            sx={{ mb: 4 }}
          >
            <CustomTitle text="Rangliste" />
            <Typography variant="h5" component="h3" color="text.secondary">
              {selectedSeasonNumber != null
                ? `Saison ${selectedSeasonNumber}`
                : 'Saison –'}
            </Typography>
            {/* overview button moved below the table */}
            <Button
              component={NextLink}
              href={
                selectedSeasonNumber != null
                  ? `/rankings/overview?season=${selectedSeasonNumber}`
                  : '/rankings/overview'
              }
              variant="outlined"
              sx={{ display: 'none' }}
            >
              Übersichtstabelle aller Spiele
            </Button>
          </Stack>

          {/* Saison-Auswahl */}
          {seasonNumbers.length > 1 && selectedSeasonNumber != null && (
            <Stack
              direction="row"
              flexWrap="wrap"
              gap={1}
              sx={{ mb: 3 }}
            >
              {seasonNumbers.map((num) => {
                const isSelected = num === selectedSeasonNumber;
                return (
                  <Button
                    key={num}
                    variant={isSelected ? 'contained' : 'outlined'}
                    onClick={() => setSeasonNumber(num)}
                    sx={{
                      borderRadius: 20,
                      px: 3,
                      boxShadow: isSelected
                        ? '0 4px 10px rgba(0,0,0,0.2)'
                        : 'none',
                      textTransform: 'none',
                      fontWeight: isSelected ? 'bold' : 'normal',
                    }}
                  >
                    Saison {num}
                  </Button>
                );
              })}
            </Stack>
          )}

          {/* Tabelle: Totals der ausgewählten Saison */}
          <Box sx={{ mb: 6 }}>
            <TableContainer
              component={Paper}
              sx={{
                borderRadius: 4,
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                overflow: 'hidden',
              }}
            >
              <Table aria-label="Saison-Gesamtpunkte">
                <TableHead
                  sx={{
                    background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.primary.light} 90%)`,
                    color: theme.palette.primary.contrastText,
                  }}
                >
                  <TableRow>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        color: 'inherit',
                        fontSize: '1rem',
                      }}
                    >
                      Platz
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        color: 'inherit',
                        fontSize: '1rem',
                      }}
                    >
                      Name
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        color: 'inherit',
                        fontSize: '1rem',
                      }}
                    >
                      Punkte
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {totalsForSeason.map(([name, sum], idx) => {
                    const { iconColor, bgColor } = getRankStyle(idx);
                    return (
                      <TableRow
                        key={name}
                        sx={{
                          backgroundColor: bgColor,
                          '&:hover': {
                            backgroundColor: 'rgba(0,0,0,0.04)',
                          },
                        }}
                      >
                        <TableCell>
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={1}
                          >
                            <Typography fontWeight={idx < 3 ? 'bold' : 'normal'}>
                              #{idx + 1}
                            </Typography>
                            {idx < 3 && (
                              <EmojiEventsIcon sx={{ color: iconColor }} />
                            )}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography fontWeight={idx < 3 ? 'bold' : 'normal'}>
                            {name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography fontWeight={idx < 3 ? 'bold' : 'normal'}>
                            {sum}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {totalsForSeason.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3}>
                        <Typography variant="body2" sx={{ p: 2 }}>
                          Keine Daten für diese Saison.
                        </Typography>
                      </TableCell>
                    </TableRow>
                )}
                </TableBody>
              </Table>
            </TableContainer>
            <Button
              component={NextLink}
              href={
                selectedSeasonNumber != null
                  ? `/rankings/overview?season=${selectedSeasonNumber}`
                  : '/rankings/overview'
              }
              variant="contained"
              fullWidth
              sx={{
                mt: 2,
                py: 1.5,
                px: 2,
                borderRadius: 3,
                textTransform: 'none',
                fontSize: '1rem',
                fontWeight: 700,
                boxShadow: '0 10px 24px rgba(0,0,0,0.14)',
                background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
              }}
            >
              Übersichtstabelle aller Spiele öffnen
            </Button>
          </Box>

          <Divider sx={{ my: 4 }} />

          {/* Spiele dieser Saison */}
          <Typography variant="h5" component="h4" gutterBottom sx={{ mb: 3 }}>
            Spiele
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              flexWrap: 'wrap',
              gap: 3,
              justifyContent: 'center',
            }}
          >
            {gameEntriesForTiles.map((g) => (
              <EntryTile
                key={g.id}
                id={g.id}
                date={g.date}
                title={g.title}
                baseRoute="/rankings"
              />
            ))}
            {gameEntriesForTiles.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                Keine Spiele in dieser Saison vorhanden.
              </Typography>
            )}
          </Box>
        </>
      )}

      <Tooltip title="Neues Spiel hinzufügen" placement="left">
        <Fab
          component={Link}
          href="/rankings/game/new"
          color="primary"
          aria-label="Neu"
          sx={{
            position: 'fixed',
            right: { xs: 16, md: 24 },
            bottom: { xs: 16, md: 24 },
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
