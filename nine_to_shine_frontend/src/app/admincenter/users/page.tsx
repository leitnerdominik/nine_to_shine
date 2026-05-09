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
import { apiUsers } from '@/definitions/commands';
import { type UserDto } from '@/definitions/types';
import Layout from '@/components/Layout';
import { useSnackbar } from 'notistack';
import { useRouter } from 'next/navigation';
import PeopleIcon from '@mui/icons-material/People';
import LoadingSkeleton from '@/components/LoadingSkeleton';

export default function UsersPage() {
  const [rows, setRows] = useState<UserDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const theme = useTheme();

  const { enqueueSnackbar } = useSnackbar();
  const router = useRouter();

  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);
  const [selected, setSelected] = useState<UserDto | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiUsers.getAll();
      setRows(data);
    } catch (e) {
      enqueueSnackbar(
        (e as Error)?.message ?? 'Benutzer laden fehlgeschlagen',
        { variant: 'error' }
      );
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const onDeleteClick = (user: UserDto) => {
    setSelected(user);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!selected) return;
    const id = selected.id;
    setConfirmOpen(false);

    // optimistic UI: remove immediately
    const prev = rows;
    setRows((r) => r.filter((u) => u.id !== id));

    try {
      await apiUsers.remove(id);
      enqueueSnackbar(`Benutzer #${id} wurde gelöscht!`, {
        variant: 'success',
      });
    } catch (e) {
      // rollback on error
      setRows(prev);
      enqueueSnackbar(
        (e as Error)?.message ?? 'Benutzer löschen fehlgeschlagen'
      );
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
            Benutzer
          </Typography>
          <Stack direction="row" spacing={1}>
            <IconButton
              onClick={() => void fetchUsers()}
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
            <Table size="medium" aria-label="Benutzertabelle">
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
                    width={90}
                  >
                    ID
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
                    width={120}
                  >
                    Aktiv
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
                    Aktion
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((u) => (
                  <TableRow key={u.id} hover>
                    <TableCell>{u.id}</TableCell>
                    <TableCell>{u.displayName}</TableCell>
                    <TableCell>{u.isActive ? 'Ja' : 'Nein'}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        color="error"
                        aria-label={`Benutzer ${u.displayName} löschen`}
                        title="Löschen"
                        onClick={() => onDeleteClick(u)}
                      >
                        <DeleteIcon />
                      </IconButton>
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
                      Keine Benutzer gefunden.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <Dialog open={confirmOpen} onClose={cancelDelete}>
          <DialogTitle>Benutzer löschen</DialogTitle>
          <DialogContent>
            <DialogContentText>
              {selected
                ? `Möchtest du den Benutzer „${selected.displayName}“ (#${selected.id}) wirklich löschen?`
                : 'Möchtest du den Benutzer wirklich löschen?'}
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
            onClick={() => router.push('users/createuser')}
            startIcon={<PeopleIcon />}
          >
            Benutzer erstellen
          </Button>
        </Box>
      </Box>
    </Layout>
  );
}
