'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
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
import { alpha } from '@mui/material/styles';
import { useSnackbar } from 'notistack';

import Layout from '@/components/Layout';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

import {
  apiGame,
  apiRanking,
  apiUsers,
  apiSeason,
} from '@/definitions/commands';
import type {
  GameDto,
  RankingDto,
  UserDto,
  SeasonDto,
} from '@/definitions/types';
import { getRankStyle } from '@/common/misc';

type Row = {
  userId: number;
  name: string;
  points: number;
  isPresent?: boolean;
};

const RankingEntryPage: React.FC = () => {
  const params = useParams();
  const gameIdParam = params?.id as string;
  const gameId = Number(gameIdParam);

  const theme = useTheme();
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();

  const [loading, setLoading] = useState(true);
  const [game, setGame] = useState<GameDto | null>(null);
  const [rankings, setRankings] = useState<RankingDto[]>([]);
  const [users, setUsers] = useState<UserDto[]>([]);
  const [seasons, setSeasons] = useState<SeasonDto[]>([]);

  // Dialog-Status fürs Löschen
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!Number.isFinite(gameId)) {
      enqueueSnackbar('Ungültige Spiel-ID.', { variant: 'error' });
      return;
    }
    setLoading(true);
    try {
      const [g, rAll, u, s] = await Promise.all([
        apiGame.getById(gameId),
        apiRanking.getAll(),
        apiUsers.getAll(),
        apiSeason.getAll(),
      ]);

      setGame(g);
      setUsers(u);
      setSeasons(s);
      setRankings(rAll.filter((x) => x.gameId === gameId));
    } catch (e) {
      enqueueSnackbar(
        (e as Error)?.message ?? 'Daten konnten nicht geladen werden.',
        { variant: 'error' }
      );
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar, gameId]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const seasonNumber = useMemo(() => {
    if (!game) return undefined;
    return seasons.find((s) => s.id === game.seasonId)?.seasonNumber;
  }, [game, seasons]);

  const rows: Row[] = useMemo(() => {
    if (!rankings.length || !users.length) return [];
    const nameById = new Map<number, string>();
    users.forEach((u) => nameById.set(u.id, u.displayName));

    return rankings
      .map<Row>((r) => ({
        userId: r.userId,
        name: nameById.get(r.userId) ?? `#${r.userId}`,
        points: r.points,
        isPresent: r.isPresent,
      }))
      .sort((a, b) => b.points - a.points);
  }, [rankings, users]);

  // Aktionen
  const onEdit = () => {
    if (!game) return;
    router.push(`/rankings/game/${game.id}`);
  };

  const onDelete = () => setConfirmOpen(true);

  const confirmDelete = async () => {
    if (!game) return;
    setDeleting(true);
    try {
      await apiGame.remove(game.id);
      enqueueSnackbar(`Spiel #${game.id} wurde gelöscht.`, {
        variant: 'success',
      });
      router.push('/rankings');
    } catch (e) {
      enqueueSnackbar((e as Error)?.message ?? 'Löschen fehlgeschlagen.', {
        variant: 'error',
      });
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
    }
  };

  const cancelDelete = () => setConfirmOpen(false);

  return (
    <Layout>
      {loading || !game ? (
        <LoadingSkeleton />
      ) : (
        <Box
          sx={{
            width: '100%',
            maxWidth: 1180,
            minHeight: {
              xs: 'calc(100vh - 176px)',
              md: 'calc(100vh - 128px)',
            },
            mx: 'auto',
            pb: 4,
          }}
        >
          <Box component="header" sx={{ mb: { xs: 3, md: 4 } }}>
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
              {game.gameName}
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
            <Stack direction="row" flexWrap="wrap" gap={1}>
              <Chip
                label={dayjs(game.playedAt).format('DD.MM.YYYY')}
                size="medium"
                sx={{
                  borderRadius: 999,
                  bgcolor: 'action.selected',
                  fontWeight: 600,
                }}
              />
              <Chip
                label={seasonNumber ? `Saison ${seasonNumber}` : 'Saison –'}
                size="medium"
                color="primary"
                sx={{ borderRadius: 999, fontWeight: 700 }}
              />
              {game.organizedByDisplayName && (
                <Chip
                  label={`Organisiert von: ${game.organizedByDisplayName}`}
                  size="medium"
                  variant="outlined"
                  sx={{ borderRadius: 999, fontWeight: 600 }}
                />
              )}
            </Stack>
          </Box>

          <TableContainer
            component={Paper}
            sx={{
              p: { xs: 1.25, sm: 2 },
              borderRadius: { xs: 3, sm: 4 },
              boxShadow: 'none',
              overflowX: 'auto',
            }}
          >
            <Table
              aria-label="Ranking-Tabelle"
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
                {rows.map((row, idx) => {
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
                      key={row.userId}
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
                        <Stack
                          direction="row"
                          alignItems="baseline"
                          flexWrap="wrap"
                          columnGap={1}
                        >
                          <Typography fontWeight={isPodium ? 800 : 500}>
                            {row.name}
                          </Typography>
                          {row.isPresent === false && (
                            <Typography variant="caption" color="text.secondary">
                              (abwesend)
                            </Typography>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        <Typography fontWeight={isPodium ? 800 : 500}>
                          {row.points}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} sx={{ borderBottom: 0 }}>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ py: 4, textAlign: 'center' }}
                      >
                        Keine Daten vorhanden.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          {/* Lösch-Bestätigung */}
          <Dialog open={confirmOpen} onClose={cancelDelete}>
            <DialogTitle>Spiel löschen</DialogTitle>
            <DialogContent>
              <DialogContentText>
                {game
                  ? `Möchtest du das Spiel „${game.gameName}“ (#${game.id}) wirklich löschen?`
                  : 'Möchtest du dieses Spiel wirklich löschen?'}
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={cancelDelete} disabled={deleting}>
                Abbrechen
              </Button>
              <Button
                onClick={confirmDelete}
                color="error"
                variant="contained"
                startIcon={
                  deleting ? <CircularProgress size={16} /> : <DeleteIcon />
                }
                disabled={deleting}
              >
                Löschen
              </Button>
            </DialogActions>
          </Dialog>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ xs: 'stretch', sm: 'center' }}
            justifyContent="space-between"
            spacing={2}
            sx={{ mt: 3 }}
          >
            <Tooltip title="Spiel bearbeiten">
              <span>
                <Button
                  onClick={onEdit}
                  variant="outlined"
                  startIcon={<EditIcon />}
                  sx={{
                    width: { xs: '100%', sm: 'auto' },
                    borderRadius: 999,
                    px: 2.5,
                    textTransform: 'none',
                    fontWeight: 700,
                  }}
                >
                  Bearbeiten
                </Button>
              </span>
            </Tooltip>
            <Tooltip title="Spiel löschen">
              <span>
                <Button
                  onClick={onDelete}
                  color="error"
                  variant="contained"
                  startIcon={<DeleteIcon />}
                  sx={{
                    width: { xs: '100%', sm: 'auto' },
                    borderRadius: 999,
                    px: 2.5,
                    textTransform: 'none',
                    fontWeight: 700,
                  }}
                >
                  Löschen
                </Button>
              </span>
            </Tooltip>
          </Stack>
        </Box>
      )}
    </Layout>
  );
};

export default RankingEntryPage;
