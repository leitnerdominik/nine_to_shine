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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Stack,
  useTheme,
  TextField,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
import EventIcon from '@mui/icons-material/Event';
import dayjs from 'dayjs';
import 'dayjs/locale/de';
import { useSnackbar } from 'notistack';
import { useRouter } from 'next/navigation';

import Layout from '@/components/Layout';
import CustomTitle from '@/components/CustomTitle';
import { apiOrganizerDuty, apiSeason, apiUsers } from '@/definitions/commands';
import type {
  OrganizerDutyDto,
  SeasonDto,
  UserDto,
} from '@/definitions/types';
import LoadingSkeleton from '@/components/LoadingSkeleton';

dayjs.locale('de');

type DialogMode = 'delete' | 'edit';

type EditValues = {
  seasonId: number;
  dutyDate: string;
  userId: number;
};

export default function OrganizerDutyPage() {
  const [rows, setRows] = useState<OrganizerDutyDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [users, setUsers] = useState<UserDto[]>([]);
  const [seasons, setSeasons] = useState<SeasonDto[]>([]);
  const [loadingEditData, setLoadingEditData] = useState<boolean>(false);
  const [savingEdit, setSavingEdit] = useState<boolean>(false);

  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const router = useRouter();

  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);
  const [selected, setSelected] = useState<OrganizerDutyDto | null>(null);
  const [dialogMode, setDialogMode] = useState<DialogMode>('delete');
  const [editValues, setEditValues] = useState<EditValues>({
    seasonId: 0,
    dutyDate: '',
    userId: 0,
  });

  const fetchDuties = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiOrganizerDuty.getAll();
      setRows(data);
    } catch (e) {
      enqueueSnackbar(
        (e as Error)?.message ?? 'Einträge laden fehlgeschlagen',
        { variant: 'error' }
      );
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    void fetchDuties();
  }, [fetchDuties]);

  const fetchEditData = useCallback(async () => {
    if (users.length > 0 && seasons.length > 0) return;

    setLoadingEditData(true);
    try {
      const [usersData, seasonsData] = await Promise.all([
        apiUsers.getAll(),
        apiSeason.getAll(),
      ]);

      setUsers(usersData);
      setSeasons(seasonsData);
    } catch (e) {
      enqueueSnackbar(
        (e as Error)?.message ?? 'Daten konnten nicht geladen werden.',
        { variant: 'error' }
      );
    } finally {
      setLoadingEditData(false);
    }
  }, [enqueueSnackbar, seasons.length, users.length]);

  const setEditFormValues = (row: OrganizerDutyDto) => {
    setEditValues({
      seasonId: row.seasonId,
      dutyDate: dayjs(row.dutyDate).format('YYYY-MM-DD'),
      userId: row.userId,
    });
  };

  const onDeleteClick = (row: OrganizerDutyDto) => {
    setSelected(row);
    setDialogMode('delete');
    setConfirmOpen(true);
  };

  const onEditClick = (row: OrganizerDutyDto) => {
    setSelected(row);
    setEditFormValues(row);
    setDialogMode('edit');
    setConfirmOpen(true);
    void fetchEditData();
  };

  const switchToEdit = () => {
    if (!selected) return;

    setEditFormValues(selected);
    setDialogMode('edit');
    void fetchEditData();
  };

  const saveEdit = async () => {
    if (!selected) return;

    if (!editValues.seasonId || !editValues.userId || !editValues.dutyDate) {
      enqueueSnackbar('Bitte alle Felder ausfuellen.', { variant: 'warning' });
      return;
    }

    setSavingEdit(true);
    try {
      const updated = await apiOrganizerDuty.update(selected.id, {
        seasonId: editValues.seasonId,
        dutyDate: new Date(editValues.dutyDate).toISOString(),
        userId: editValues.userId,
      });

      setRows((current) =>
        current.map((row) => (row.id === updated.id ? updated : row))
      );
      enqueueSnackbar(`Eintrag #${updated.id} wurde aktualisiert!`, {
        variant: 'success',
      });
      setConfirmOpen(false);
      setSelected(null);
    } catch (e) {
      enqueueSnackbar(
        (e as Error)?.message ?? 'Eintrag aktualisieren fehlgeschlagen',
        { variant: 'error' }
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const confirmDelete = async () => {
    if (!selected) return;
    const id = selected.id;
    setConfirmOpen(false);

    const prev = rows;
    setRows((r) => r.filter((x) => x.id !== id));

    try {
      await apiOrganizerDuty.remove(id);
      enqueueSnackbar(`Eintrag #${id} wurde gelöscht!`, {
        variant: 'success',
      });
    } catch (e) {
      setRows(prev);
      enqueueSnackbar(
        (e as Error)?.message ?? 'Eintrag löschen fehlgeschlagen',
        { variant: 'error' }
      );
    } finally {
      setSelected(null);
    }
  };

  const cancelDelete = () => {
    setConfirmOpen(false);
    setSelected(null);
    setSavingEdit(false);
  };

  return (
    <Layout>
      <Box sx={{ maxWidth: 900, mx: 'auto', p: 3 }}>
        <Toolbar disableGutters sx={{ mb: 2, justifyContent: 'space-between' }}>
          <CustomTitle text="Organisation Termine" />
          <Stack direction="row" spacing={1}>
            <IconButton
              onClick={() => void fetchDuties()}
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
            <Table size="medium" aria-label="Organisatoren-Tabelle">
              <TableHead
                sx={{
                  background: theme.palette.primary.main,
                  color: theme.palette.primary.contrastText,
                  fontSize: '1.05rem',
                }}
              >
                <TableRow>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      fontSize: 'inherit',
                      color: 'inherit',
                    }}
                    width={160}
                  >
                    Datum
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      fontSize: 'inherit',
                      color: 'inherit',
                    }}
                    width={160}
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
                    Organisator
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      fontSize: 'inherit',
                      color: 'inherit',
                    }}
                    width={120}
                    align="right"
                  >
                    Aktionen
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell>
                      {dayjs(r.dutyDate).format('DD.MM.YYYY')}
                    </TableCell>
                    <TableCell>{r.seasonDisplayNumber}</TableCell>
                    <TableCell>{r.userDisplayName}</TableCell>
                    <TableCell align="right">
                      <Stack
                        direction="row"
                        spacing={0.5}
                        justifyContent="flex-end"
                        sx={{ whiteSpace: 'nowrap' }}
                      >
                        <IconButton
                          color="primary"
                          aria-label="Eintrag bearbeiten"
                          title="Bearbeiten"
                          onClick={() => onEditClick(r)}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          color="error"
                          aria-label="Eintrag löschen"
                          title="Löschen"
                          onClick={() => onDeleteClick(r)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      align="center"
                      sx={{ py: 6, color: 'text.secondary' }}
                    >
                      Keine Einträge gefunden.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <Dialog open={confirmOpen} onClose={cancelDelete}>
          <DialogTitle>
            {dialogMode === 'edit' ? 'Eintrag bearbeiten' : 'Eintrag löschen'}
          </DialogTitle>
          <DialogContent>
            {dialogMode === 'edit' ? (
              <Stack spacing={2} sx={{ minWidth: { xs: 280, sm: 420 }, pt: 1 }}>
                <TextField
                  select
                  label="Saison"
                  value={editValues.seasonId || ''}
                  onChange={(e) =>
                    setEditValues((current) => ({
                      ...current,
                      seasonId: Number(e.target.value),
                    }))
                  }
                  disabled={loadingEditData || savingEdit}
                  fullWidth
                >
                  {seasons.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      Saison {s.seasonNumber}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Datum"
                  type="date"
                  value={editValues.dutyDate}
                  onChange={(e) =>
                    setEditValues((current) => ({
                      ...current,
                      dutyDate: e.target.value,
                    }))
                  }
                  disabled={savingEdit}
                  fullWidth
                  slotProps={{
                    inputLabel: { shrink: true },
                  }}
                />
                <TextField
                  select
                  label="Organisator"
                  value={editValues.userId || ''}
                  onChange={(e) =>
                    setEditValues((current) => ({
                      ...current,
                      userId: Number(e.target.value),
                    }))
                  }
                  disabled={loadingEditData || savingEdit}
                  fullWidth
                >
                  {users.map((u) => (
                    <MenuItem key={u.id} value={u.id}>
                      {u.displayName}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
            ) : (
              <DialogContentText>
                {selected
                  ? `Möchtest du den Eintrag am ${dayjs(
                      selected.dutyDate
                    ).format(
                      'DD.MM.YYYY'
                    )} für „${selected.userDisplayName}“ wirklich löschen?`
                  : 'Möchtest du den Eintrag wirklich löschen?'}
              </DialogContentText>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={cancelDelete}>Abbrechen</Button>
            {dialogMode === 'edit' ? (
              <Button
                variant="contained"
                onClick={() => void saveEdit()}
                disabled={savingEdit || loadingEditData}
                startIcon={
                  savingEdit ? <CircularProgress size={18} /> : <EditIcon />
                }
              >
                {savingEdit ? 'wird gespeichert...' : 'Speichern'}
              </Button>
            ) : (
              <>
                <Button
                  color="primary"
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={switchToEdit}
                >
                  Bearbeiten
                </Button>
                <Button
                  color="error"
                  variant="contained"
                  onClick={() => void confirmDelete()}
                >
                  löschen
                </Button>
              </>
            )}
          </DialogActions>
        </Dialog>

        <Box sx={{ mt: 3 }}>
          <Button
            variant="contained"
            onClick={() => router.push('organizer/create')}
            startIcon={<EventIcon />}
          >
            neuen Termin anlegen
          </Button>
        </Box>
      </Box>
    </Layout>
  );
}
