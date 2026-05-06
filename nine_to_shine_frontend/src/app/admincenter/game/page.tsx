'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Toolbar,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Stack,
  useTheme,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import { useSnackbar } from 'notistack';
import { useRouter } from 'next/navigation';

import Layout from '@/components/Layout';
import { apiGame, apiSeason, apiUsers } from '@/definitions/commands';
import type { GameDto, SeasonDto, UserDto } from '@/definitions/types';
import dayjs from 'dayjs';
import LoadingSkeleton from '@/components/LoadingSkeleton';

type GameRow = GameDto & {
  seasonNumber?: number;
  organizedByName?: string;
};

export default function GamesPage() {
  const [rows, setRows] = useState<GameRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const router = useRouter();

  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);
  const [selected, setSelected] = useState<GameRow | null>(null);

  const fetchGames = useCallback(async () => {
    setLoading(true);
    try {
      const [games, seasons, users] = await Promise.all([
        apiGame.getAll(),
        apiSeason.getAll(),
        apiUsers.getAll(),
      ]);

      const seasonById = new Map<number, number>();
      seasons.forEach((s: SeasonDto) => {
        seasonById.set(s.id, s.seasonNumber);
      });

      const userNameById = new Map<number, string>();
      users.forEach((u: UserDto) => {
        userNameById.set(u.id, u.displayName);
      });

      const withExtras: GameRow[] = games.map((g: GameDto) => ({
        ...g,
        seasonNumber: seasonById.get(g.seasonId),
        organizedByName:
          userNameById.get(g.organizedByUserId) ??
          `#${g.organizedByUserId.toString()}`,
      }));

      setRows(withExtras);
    } catch (e) {
      enqueueSnackbar((e as Error)?.message ?? 'Spiele laden fehlgeschlagen', {
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    void fetchGames();
  }, [fetchGames]);

  const onDeleteClick = (game: GameRow) => {
    setSelected(game);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!selected) return;
    const id = selected.id;
    setConfirmOpen(false);

    const prev = rows;
    setRows((r) => r.filter((g) => g.id !== id));

    try {
      await apiGame.remove(id);
      enqueueSnackbar(`Spiel #${id} wurde gelöscht!`, {
        variant: 'success',
      });
    } catch (e) {
      setRows(prev);
      enqueueSnackbar((e as Error)?.message ?? 'Spiel löschen fehlgeschlagen', {
        variant: 'error',
      });
    } finally {
      setSelected(null);
    }
  };

  const cancelDelete = () => {
    setConfirmOpen(false);
    setSelected(null);
  };

  return (
    <Layout>
      <Box sx={{ maxWidth: 1000, mx: 'auto', p: 3 }}>
        <Toolbar disableGutters sx={{ mb: 2, justifyContent: 'space-between' }}>
          <Typography variant="h5" component="h1">
            Spiele
          </Typography>
          <Stack direction="row" spacing={1}>
            <IconButton
              onClick={() => void fetchGames()}
              aria-label="Aktualisieren"
              title="Aktualisieren"
            >
              <RefreshIcon />
            </IconButton>
          </Stack>
        </Toolbar>

        {loading ? (
          <LoadingSkeleton />
        ) : (
          <TableContainer component={Paper} elevation={1}>
            <Table size="medium" aria-label="Spieletabelle">
              <TableHead
                sx={{
                  background: theme.palette.primary.main,
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
                    width={110}
                  >
                    Datum
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      fontSize: 'inherit',
                      color: 'inherit',
                    }}
                    width={110}
                  >
                    Saison
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      fontSize: 'inherit',
                      color: 'inherit',
                    }}
                  >
                    Spielname
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      fontSize: 'inherit',
                      color: 'inherit',
                    }}
                  >
                    Organisiert von
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      fontSize: 'inherit',
                      color: 'inherit',
                    }}
                    width={80}
                    align="right"
                  >
                    Aktionen
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((g) => (
                  <TableRow key={g.id} hover>
                    <TableCell>
                      {dayjs(g.playedAt).format('DD.MM.YYYY')}
                    </TableCell>
                    <TableCell>
                      {g.seasonNumber != null
                        ? `Saison ${g.seasonNumber}`
                        : '–'}
                    </TableCell>
                    <TableCell>{g.gameName}</TableCell>
                    <TableCell>{g.organizedByName ?? '-'}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        color="error"
                        aria-label={`Spiel ${g.gameName} löschen`}
                        title="Löschen"
                        onClick={() => onDeleteClick(g)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      align="center"
                      sx={{ py: 6, color: 'text.secondary' }}
                    >
                      Keine Spiele gefunden.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <Dialog open={confirmOpen} onClose={cancelDelete}>
          <DialogTitle>Spiel löschen</DialogTitle>
          <DialogContent>
            <DialogContentText>
              {selected
                ? `Möchtest du das Spiel „${selected.gameName}“ (#${selected.id}) wirklich löschen?`
                : 'Möchtest du das Spiel wirklich löschen?'}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={cancelDelete}>Abbrechen</Button>
            <Button
              color="error"
              variant="contained"
              onClick={() => void confirmDelete()}
            >
              löschen
            </Button>
          </DialogActions>
        </Dialog>

        <Box sx={{ mt: 3 }}>
          <Button
            variant="contained"
            onClick={() => router.push('game/creategame')}
            startIcon={<SportsEsportsIcon />}
          >
            Spiel erstellen
          </Button>
        </Box>
      </Box>
    </Layout>
  );
}
