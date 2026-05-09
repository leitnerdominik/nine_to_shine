'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
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
import { useSnackbar } from 'notistack';

import Layout from '@/components/Layout';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import CustomTitle from '@/components/CustomTitle';
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
        <Container>
          <Box mb="2rem">
            <CustomTitle text={game.gameName} />
            <Stack direction="column" spacing={1} alignItems="flex-start">
              <Typography variant="body2">
                {dayjs(game.playedAt).format('DD.MM.YYYY')}
              </Typography>
              <Stack direction="row" spacing={1}>
                <Chip
                  label={seasonNumber ? `Saison ${seasonNumber}` : 'Saison –'}
                  size="medium"
                  sx={{ bgcolor: theme.palette.action.selected }}
                />
                {game.organizedByDisplayName && (
                  <Chip
                    label={`Organisiert von: ${game.organizedByDisplayName}`}
                    size="medium"
                    variant="outlined"
                  />
                )}
              </Stack>
            </Stack>
            <Divider sx={{ mt: 1 }} />
            <Divider />
          </Box>

          <TableContainer
            component={Paper}
            sx={{
              borderRadius: 4,
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              overflow: 'hidden',
            }}
          >
            <Table aria-label="Ranking-Tabelle">
              <TableHead
                sx={{
                  background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.primary.light} 90%)`,
                  color: theme.palette.primary.contrastText,
                  fontSize: '1.1rem',
                }}
              >
                <TableRow>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      fontSize: 'inherit',
                      color: 'inherit',
                    }}
                  >
                    Platz
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      fontSize: 'inherit',
                      color: 'inherit',
                    }}
                  >
                    Name
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      fontSize: 'inherit',
                      color: 'inherit',
                    }}
                  >
                    Punkte
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row, idx) => {
                  const { iconColor, bgColor } = getRankStyle(idx);
                  return (
                    <TableRow
                      key={row.userId}
                      sx={{
                        backgroundColor: bgColor,
                        '&:hover': {
                          backgroundColor: 'rgba(0,0,0,0.04)',
                        },
                      }}
                    >
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography fontWeight={idx < 3 ? 'bold' : 'normal'}>
                            # {idx + 1}
                          </Typography>
                          {idx < 3 && (
                            <EmojiEventsIcon sx={{ color: iconColor }} />
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight={idx < 3 ? 'bold' : 'normal'}>
                          {row.name}
                        </Typography>
                        {row.isPresent === false && (
                          <Typography
                            variant="caption"
                            color="text.primary"
                            component="span"
                            sx={{ ml: 1 }}
                          >
                            (abwesend)
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight={idx < 3 ? 'bold' : 'normal'}>
                          {row.points}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3}>
                      <Typography variant="body2">
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
            direction="row"
            alignItems={{ xs: 'flex-start', sm: 'center' }}
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
                >
                  Löschen
                </Button>
              </span>
            </Tooltip>
          </Stack>
        </Container>
      )}
    </Layout>
  );
};

export default RankingEntryPage;
