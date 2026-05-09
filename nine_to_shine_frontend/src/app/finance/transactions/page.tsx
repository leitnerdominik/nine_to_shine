'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  TextField,
  MenuItem,
  IconButton,
  Tooltip,
  Checkbox,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import DeleteIcon from '@mui/icons-material/Delete';
import dayjs from 'dayjs';

import Layout from '@/components/Layout';
import CustomTitle from '@/components/CustomTitle';
import { apiFinance, apiUsers } from '@/definitions/commands';
import type { FinanceDto, UserDto } from '@/definitions/types';
import LoadingSkeleton from '@/components/LoadingSkeleton';

// Helper für Währung
const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(
    amount
  );

// Typ-Definition für die Filter-Logik
type FilterDirection = 'income' | 'expense' | '';

export default function TransactionsPage() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<FinanceDto[]>([]);
  const [users, setUsers] = useState<UserDto[]>([]);

  // --- Filter States ---
  const [filterUserId, setFilterUserId] = useState<number | ''>('');
  const [filterDirection, setFilterDirection] = useState<FilterDirection>('');

  // --- Selection & Delete States ---
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Daten laden
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // API Params bauen - Typsicher
      const params: {
        userId?: number;
        direction?: 'income' | 'expense';
      } = {};

      if (filterUserId !== '') {
        params.userId = filterUserId;
      }

      if (filterDirection !== '') {
        params.direction = filterDirection;
      }

      const data = await apiFinance.getAll(params);
      setTransactions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filterUserId, filterDirection]);

  // Initial: User laden, dann Daten
  useEffect(() => {
    apiUsers.getAll().then(setUsers).catch(console.error);
  }, []);

  // Reload bei Filter-Änderung
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset Funktion
  const handleResetFilters = () => {
    setFilterUserId('');
    setFilterDirection('');
  };

  // Selection Handlers
  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelecteds = transactions.map((n) => n.id);
      setSelectedIds(newSelecteds);
      return;
    }
    setSelectedIds([]);
  };

  const handleClick = (event: React.MouseEvent<unknown>, id: number) => {
    const selectedIndex = selectedIds.indexOf(id);
    let newSelected: number[] = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selectedIds, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selectedIds.slice(1));
    } else if (selectedIndex === selectedIds.length - 1) {
      newSelected = newSelected.concat(selectedIds.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selectedIds.slice(0, selectedIndex),
        selectedIds.slice(selectedIndex + 1)
      );
    }
    setSelectedIds(newSelected);
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      // Alle ausgewählten IDs löschen
      await Promise.all(selectedIds.map((id) => apiFinance.remove(id)));
      // Daten neu laden
      await fetchData();
      // Auswahl zurücksetzen
      setSelectedIds([]);
      setDeleteDialogOpen(false);
    } catch (err) {
      console.error('Fehler beim Löschen:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Layout>
      <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
        <CustomTitle text="Alle Buchungen" />

        {/* --- FILTER BAR --- */}
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            mb: 3,
            bgcolor: '#f8f9fa',
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: 2,
            alignItems: 'center',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              color: 'text.secondary',
            }}
          >
            <FilterListIcon />
            <Typography variant="body2" fontWeight="bold">
              Filter:
            </Typography>
          </Box>

          {/* Filter: Mitglied */}
          <TextField
            select
            label="Mitglied"
            size="small"
            value={filterUserId}
            onChange={(e) =>
              setFilterUserId(
                e.target.value === '' ? '' : Number(e.target.value)
              )
            }
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">
              <em>Alle anzeigen</em>
            </MenuItem>
            {users.map((u) => (
              <MenuItem key={u.id} value={u.id}>
                {u.displayName}
              </MenuItem>
            ))}
          </TextField>

          {/* Filter: Art (Eingang/Ausgang) */}
          <TextField
            select
            label="Art der Buchung"
            size="small"
            value={filterDirection}
            onChange={(e) =>
              setFilterDirection(e.target.value as FilterDirection)
            }
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">
              <em>Alle</em>
            </MenuItem>
            <MenuItem value="income">Nur Einnahmen (+)</MenuItem>
            <MenuItem value="expense">Nur Ausgaben (-)</MenuItem>
          </TextField>

          {/* Reset Button */}
          {(filterUserId !== '' || filterDirection !== '') && (
            <Tooltip title="Filter zurücksetzen">
              <IconButton onClick={handleResetFilters} size="small">
                <ClearIcon />
              </IconButton>
            </Tooltip>
          )}

          {/* Delete Button (nur sichtbar wenn Auswahl vorhanden) */}
          {selectedIds.length > 0 && (
            <Button
              variant="contained"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleDeleteClick}
              sx={{ ml: { md: 'auto' } }}
            >
              Löschen ({selectedIds.length})
            </Button>
          )}
        </Paper>

        {/* --- TABELLE --- */}
        {loading ? (
          <LoadingSkeleton />
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead sx={{ bgcolor: '#eee' }}>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      color="primary"
                      indeterminate={
                        selectedIds.length > 0 &&
                        selectedIds.length < transactions.length
                      }
                      checked={
                        transactions.length > 0 &&
                        selectedIds.length === transactions.length
                      }
                      onChange={handleSelectAllClick}
                    />
                  </TableCell>
                  <TableCell>
                    <strong>Datum</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Wer / Konto</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Kategorie</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Beschreibung</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>Betrag</strong>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                      Keine Transaktionen gefunden.
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((tx) => {
                    const isSelected = selectedIds.indexOf(tx.id) !== -1;
                    const isIncome = tx.direction === 'income';
                    // Bei Ausgaben ein Minus davor anzeigen
                    const displayAmount = isIncome ? tx.amount : -tx.amount;

                    // Konto-Anzeige: User Name oder "Vereinskasse"
                    const accountLabel = tx.userDisplayName || 'Vereinskasse';
                    const isGlobal = !tx.userId;

                    // Chip Farbe Logik
                    let chipColor:
                      | 'default'
                      | 'primary'
                      | 'secondary'
                      | 'error'
                      | 'info'
                      | 'success'
                      | 'warning' = 'default';

                    if (tx.category === 'DUES') chipColor = 'success';
                    else if (tx.category === 'EVENT') chipColor = 'primary';
                    else if (tx.category === 'TRIP') chipColor = 'warning';

                    return (
                      <TableRow
                        key={tx.id}
                        hover
                        role="checkbox"
                        aria-checked={isSelected}
                        selected={isSelected}
                      >
                        <TableCell padding="checkbox">
                          <Checkbox
                            color="primary"
                            checked={isSelected}
                            onClick={(event) => handleClick(event, tx.id)}
                          />
                        </TableCell>
                        <TableCell>
                          {dayjs(tx.occurredAt).format('DD.MM.YYYY')}
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: isGlobal ? 'bold' : 'normal' }}
                          >
                            {accountLabel}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={tx.category}
                            size="small"
                            variant="outlined"
                            color={chipColor}
                          />
                        </TableCell>
                        <TableCell sx={{ maxWidth: 300 }}>
                          {tx.description || '-'}
                          {tx.gameName && (
                            <Typography
                              variant="caption"
                              display="block"
                              color="text.secondary"
                            >
                              Spiel: {tx.gameName}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            fontWeight: 'bold',
                            color: isIncome ? 'success.main' : 'error.main',
                            fontSize: '1rem',
                          }}
                        >
                          {formatCurrency(displayAmount)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !isDeleting && setDeleteDialogOpen(false)}
      >
        <DialogTitle>Buchungen löschen</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Bist du sicher, dass du {selectedIds.length} Buchung(en) löschen
            möchtest? Das kann nicht rückgängig gemacht werden.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            disabled={isDeleting}
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            autoFocus
            disabled={isDeleting}
          >
            {isDeleting ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'Löschen'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
}
