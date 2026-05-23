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
  Chip,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import RestoreIcon from '@mui/icons-material/Restore';
import SettingsIcon from '@mui/icons-material/Settings';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import AddIcon from '@mui/icons-material/Add';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
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
  isSkipped: boolean;
};

export default function OrganizerDutyPage() {
  const [rows, setRows] = useState<OrganizerDutyDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [users, setUsers] = useState<UserDto[]>([]);
  const [seasons, setSeasons] = useState<SeasonDto[]>([]);
  const [loadingEditData, setLoadingEditData] = useState<boolean>(false);
  const [savingEdit, setSavingEdit] = useState<boolean>(false);
  const [savingSkipId, setSavingSkipId] = useState<number | null>(null);
  const [rotationOpen, setRotationOpen] = useState<boolean>(false);
  const [rotationSeasonId, setRotationSeasonId] = useState<number>(0);
  const [rotationUserIds, setRotationUserIds] = useState<number[]>([]);
  const [loadingRotation, setLoadingRotation] = useState<boolean>(false);
  const [savingRotation, setSavingRotation] = useState<boolean>(false);

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
    isSkipped: false,
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
    if (users.length > 0 && seasons.length > 0) {
      return { usersData: users, seasonsData: seasons };
    }

    setLoadingEditData(true);
    try {
      const [usersData, seasonsData] = await Promise.all([
        apiUsers.getAll(),
        apiSeason.getAll(),
      ]);

      setUsers(usersData);
      setSeasons(seasonsData);
      return { usersData, seasonsData };
    } catch (e) {
      enqueueSnackbar(
        (e as Error)?.message ?? 'Daten konnten nicht geladen werden.',
        { variant: 'error' }
      );
      return { usersData: users, seasonsData: seasons };
    } finally {
      setLoadingEditData(false);
    }
  }, [enqueueSnackbar, seasons, users]);

  const setEditFormValues = (row: OrganizerDutyDto) => {
    setEditValues({
      seasonId: row.seasonId,
      dutyDate: dayjs(row.dutyDate).format('YYYY-MM-DD'),
      userId: row.userId ?? 0,
      isSkipped: row.isSkipped,
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

    if (
      !editValues.seasonId ||
      !editValues.dutyDate ||
      (!editValues.isSkipped && !editValues.userId)
    ) {
      enqueueSnackbar('Bitte alle Felder ausfuellen.', { variant: 'warning' });
      return;
    }

    setSavingEdit(true);
    try {
      const updated = await apiOrganizerDuty.update(selected.id, {
        seasonId: editValues.seasonId,
        dutyDate: new Date(editValues.dutyDate).toISOString(),
        userId: editValues.userId || undefined,
        isSkipped: editValues.isSkipped,
      });

      await fetchDuties();
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

  const toggleSkipped = async (row: OrganizerDutyDto) => {
    setSavingSkipId(row.id);
    try {
      await apiOrganizerDuty.setSkipped(row.id, !row.isSkipped);
      await fetchDuties();
      enqueueSnackbar(
        row.isSkipped
          ? 'Monat wurde wieder in die Rotation aufgenommen.'
          : 'Monat wurde uebersprungen. Die Folgezuweisungen wurden neu berechnet.',
        { variant: 'success' }
      );
    } catch (e) {
      enqueueSnackbar(
        (e as Error)?.message ?? 'Rotation aktualisieren fehlgeschlagen',
        { variant: 'error' }
      );
    } finally {
      setSavingSkipId(null);
    }
  };

  const loadRotation = useCallback(
    async (seasonId: number) => {
      if (!seasonId) return;

      setLoadingRotation(true);
      try {
        const members = await apiOrganizerDuty.getRotation(seasonId);
        const userIds =
          members.length > 0
            ? members.map((member) => member.userId)
            : rows
                .filter(
                  (row) =>
                    row.seasonId === seasonId && !row.isSkipped && row.userId
                )
                .map((row) => row.userId as number)
                .filter((userId, index, all) => all.indexOf(userId) === index);

        setRotationUserIds(userIds);
      } catch (e) {
        enqueueSnackbar(
          (e as Error)?.message ?? 'Rotation konnte nicht geladen werden.',
          { variant: 'error' }
        );
      } finally {
        setLoadingRotation(false);
      }
    },
    [enqueueSnackbar, rows]
  );

  const openRotationDialog = async () => {
    setRotationOpen(true);
    const { seasonsData } = await fetchEditData();
    const sortedSeasons = [...seasonsData].sort(
      (a, b) => b.seasonNumber - a.seasonNumber
    );
    const initialSeasonId = rotationSeasonId || sortedSeasons[0]?.id || 0;
    setRotationSeasonId(initialSeasonId);
    if (initialSeasonId) {
      void loadRotation(initialSeasonId);
    }
  };

  const closeRotationDialog = () => {
    setRotationOpen(false);
    setSavingRotation(false);
  };

  const onRotationSeasonChange = (seasonId: number) => {
    setRotationSeasonId(seasonId);
    void loadRotation(seasonId);
  };

  const setRotationUserAt = (index: number, userId: number) => {
    setRotationUserIds((current) =>
      current.map((value, currentIndex) =>
        currentIndex === index ? userId : value
      )
    );
  };

  const moveRotationUser = (index: number, direction: -1 | 1) => {
    setRotationUserIds((current) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= current.length) return current;

      const next = [...current];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };

  const removeRotationUser = (index: number) => {
    setRotationUserIds((current) =>
      current.filter((_, currentIndex) => currentIndex !== index)
    );
  };

  const addRotationUser = () => {
    const nextUser = users.find(
      (user) => user.isActive && !rotationUserIds.includes(user.id)
    );
    if (!nextUser) return;

    setRotationUserIds((current) => [...current, nextUser.id]);
  };

  const saveRotation = async () => {
    const userIds = rotationUserIds.filter((userId) => userId > 0);
    const uniqueUserIds = new Set(userIds);

    if (!rotationSeasonId || userIds.length === 0) {
      enqueueSnackbar('Bitte Saison und mindestens einen Benutzer waehlen.', {
        variant: 'warning',
      });
      return;
    }

    if (uniqueUserIds.size !== userIds.length) {
      enqueueSnackbar('Jeder Benutzer darf nur einmal in der Rotation stehen.', {
        variant: 'warning',
      });
      return;
    }

    setSavingRotation(true);
    try {
      const members = await apiOrganizerDuty.updateRotation(rotationSeasonId, {
        userIds,
      });
      setRotationUserIds(members.map((member) => member.userId));
      await fetchDuties();
      enqueueSnackbar('Rotation wurde gespeichert.', { variant: 'success' });
      setRotationOpen(false);
    } catch (e) {
      enqueueSnackbar(
        (e as Error)?.message ?? 'Rotation speichern fehlgeschlagen',
        { variant: 'error' }
      );
    } finally {
      setSavingRotation(false);
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
            <Button
              variant="outlined"
              startIcon={<SettingsIcon />}
              onClick={() => void openRotationDialog()}
            >
              Rotation
            </Button>
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
                    <TableCell>
                      {r.isSkipped ? (
                        <Chip label="Entfällt" size="small" />
                      ) : (
                        r.userDisplayName ?? '-'
                      )}
                    </TableCell>
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
                          color={r.isSkipped ? 'success' : 'warning'}
                          aria-label={
                            r.isSkipped
                              ? 'Monat wieder aufnehmen'
                              : 'Monat ueberspringen'
                          }
                          title={
                            r.isSkipped
                              ? 'Monat wieder aufnehmen'
                              : 'Monat ueberspringen'
                          }
                          onClick={() => void toggleSkipped(r)}
                          disabled={savingSkipId === r.id}
                        >
                          {r.isSkipped ? <RestoreIcon /> : <EventBusyIcon />}
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
                  helperText={
                    editValues.isSkipped
                      ? 'Bei uebersprungenen Monaten wird kein Organisator angezeigt.'
                      : 'Bei aktiver Rotation wird der Organisator aus der Reihenfolge berechnet.'
                  }
                >
                  {users.map((u) => (
                    <MenuItem key={u.id} value={u.id}>
                      {u.displayName}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Status"
                  value={editValues.isSkipped ? 'skipped' : 'active'}
                  onChange={(e) =>
                    setEditValues((current) => ({
                      ...current,
                      isSkipped: e.target.value === 'skipped',
                    }))
                  }
                  disabled={savingEdit}
                  fullWidth
                >
                  <MenuItem value="active">In Rotation</MenuItem>
                  <MenuItem value="skipped">Entfällt</MenuItem>
                </TextField>
              </Stack>
            ) : (
              <DialogContentText>
                {selected
                  ? `Möchtest du den Eintrag am ${dayjs(
                      selected.dutyDate
                    ).format(
                      'DD.MM.YYYY'
                    )} für „${selected.userDisplayName ?? 'Entfällt'}“ wirklich löschen?`
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

        <Dialog
          open={rotationOpen}
          onClose={closeRotationDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Rotation bearbeiten</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField
                select
                label="Saison"
                value={rotationSeasonId || ''}
                onChange={(e) => onRotationSeasonChange(Number(e.target.value))}
                disabled={loadingEditData || loadingRotation || savingRotation}
                fullWidth
              >
                {[...seasons]
                  .sort((a, b) => b.seasonNumber - a.seasonNumber)
                  .map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      Saison {s.seasonNumber}
                    </MenuItem>
                  ))}
              </TextField>

              <Typography variant="body2" color="text.secondary">
                Die Reihenfolge wird auf alle nicht uebersprungenen Monate der
                Saison angewendet.
              </Typography>

              {loadingRotation ? (
                <Stack alignItems="center" sx={{ py: 3 }}>
                  <CircularProgress size={24} />
                </Stack>
              ) : (
                <Stack spacing={1}>
                  {rotationUserIds.map((userId, index) => (
                    <Stack
                      key={`${userId}-${index}`}
                      direction="row"
                      spacing={1}
                      alignItems="center"
                    >
                      <TextField
                        select
                        label={`Position ${index + 1}`}
                        value={userId || ''}
                        onChange={(e) =>
                          setRotationUserAt(index, Number(e.target.value))
                        }
                        disabled={savingRotation}
                        fullWidth
                      >
                        {users
                          .filter((user) => user.isActive)
                          .map((user) => (
                            <MenuItem key={user.id} value={user.id}>
                              {user.displayName}
                            </MenuItem>
                          ))}
                      </TextField>
                      <IconButton
                        aria-label="Nach oben"
                        title="Nach oben"
                        onClick={() => moveRotationUser(index, -1)}
                        disabled={savingRotation || index === 0}
                      >
                        <KeyboardArrowUpIcon />
                      </IconButton>
                      <IconButton
                        aria-label="Nach unten"
                        title="Nach unten"
                        onClick={() => moveRotationUser(index, 1)}
                        disabled={
                          savingRotation || index === rotationUserIds.length - 1
                        }
                      >
                        <KeyboardArrowDownIcon />
                      </IconButton>
                      <IconButton
                        color="error"
                        aria-label="Entfernen"
                        title="Entfernen"
                        onClick={() => removeRotationUser(index)}
                        disabled={savingRotation || rotationUserIds.length <= 1}
                      >
                        <RemoveCircleOutlineIcon />
                      </IconButton>
                    </Stack>
                  ))}

                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={addRotationUser}
                    disabled={
                      savingRotation ||
                      users.filter((user) => user.isActive).length ===
                        rotationUserIds.length
                    }
                  >
                    Benutzer hinzufuegen
                  </Button>
                </Stack>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeRotationDialog}>Abbrechen</Button>
            <Button
              variant="contained"
              onClick={() => void saveRotation()}
              disabled={savingRotation || loadingRotation || loadingEditData}
              startIcon={
                savingRotation ? <CircularProgress size={18} /> : <SettingsIcon />
              }
            >
              {savingRotation ? 'wird gespeichert...' : 'Speichern'}
            </Button>
          </DialogActions>
        </Dialog>

        <Box sx={{ mt: 3 }}>
          <Button
            variant="contained"
            onClick={() => router.push('organizer/create')}
            startIcon={<EventRepeatIcon />}
          >
            Saison-Termine generieren
          </Button>
        </Box>
      </Box>
    </Layout>
  );
}
