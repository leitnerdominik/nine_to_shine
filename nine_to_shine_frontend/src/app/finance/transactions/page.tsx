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
  Alert,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import DeleteIcon from '@mui/icons-material/Delete';
import dayjs from 'dayjs';

import Layout from '@/components/Layout';
import PageTitle from '@/components/PageTitle';
import { apiFinance, apiUsers } from '@/definitions/commands';
import type { FinanceDto, UserDto } from '@/definitions/types';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { isConflictError, toErrorMessage } from '@/definitions/api';

// Helper für Währung
const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(
    amount
  );

// Typ-Definition für die Filter-Logik
type FilterDirection = 'income' | 'expense' | '';

const getDisplayAmount = (transaction: FinanceDto) =>
  transaction.direction === 'income' ? transaction.amount : -transaction.amount;

const getAccountLabel = (transaction: FinanceDto) =>
  transaction.userDisplayName || 'Vereinskasse';

const getChipColor = (
  category: FinanceDto['category']
): 'default' | 'primary' | 'warning' | 'success' => {
  if (category === 'DUES') return 'success';
  if (category === 'EVENT') return 'primary';
  if (category === 'TRIP') return 'warning';
  return 'default';
};

function TransactionCategory({ category }: { category: FinanceDto['category'] }) {
  return (
    <Chip
      label={category}
      size="small"
      variant="outlined"
      color={getChipColor(category)}
      sx={{ borderRadius: 999, fontWeight: 500, px: 0.5 }}
    />
  );
}

function TransactionAmount({ transaction }: { transaction: FinanceDto }) {
  return (
    <Typography
      component="span"
      sx={{
        fontWeight: 700,
        color: transaction.direction === 'income' ? '#138a43' : '#d32f2f',
        fontSize: { xs: '1.05rem', md: '1rem' },
        whiteSpace: 'nowrap',
      }}
    >
      {formatCurrency(getDisplayAmount(transaction))}
    </Typography>
  );
}

export default function TransactionsPage() {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'), { noSsr: true });
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<FinanceDto[]>([]);
  const [users, setUsers] = useState<UserDto[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [usersError, setUsersError] = useState<string | null>(null);

  // --- Filter States ---
  const [filterUserId, setFilterUserId] = useState<number | ''>('');
  const [filterDirection, setFilterDirection] = useState<FilterDirection>('');

  // --- Selection & Delete States ---
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);

  // Daten laden
  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
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
      setSelectedIds((current) =>
        current.filter((id) => data.some((transaction) => transaction.id === id))
      );
      setConflictError(null);
    } catch (err) {
      setLoadError(
        `Buchungen konnten nicht geladen werden. ${toErrorMessage(err)}`
      );
    } finally {
      setLoading(false);
    }
  }, [filterUserId, filterDirection]);

  const fetchUsers = useCallback(async () => {
    setUsersError(null);

    try {
      setUsers(await apiUsers.getAll());
    } catch (err) {
      setUsersError(
        `Mitglieder konnten nicht geladen werden. ${toErrorMessage(err)}`
      );
    }
  }, []);

  // Initial: User laden
  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

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

  const handleClick = (id: number) => {
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
    setDeleteDialogOpen(false);
    try {
      const selectedTransactions = transactions
        .filter((transaction) => selectedIds.includes(transaction.id))
        .map(({ id, updatedAt }) => ({ id, updatedAt }));
      await apiFinance.bulkDelete({ transactions: selectedTransactions });
      // Daten neu laden
      await fetchData();
      // Auswahl zurücksetzen
      setSelectedIds([]);
      setDeleteDialogOpen(false);
    } catch (err) {
      console.error('Fehler beim Löschen:', err);
      if (isConflictError(err)) {
        setConflictError(
          'Mindestens eine Buchung wurde inzwischen geändert. Deine Auswahl bleibt erhalten. Lade die aktuellen Daten neu.'
        );
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Layout>
      <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
        <Box component="header" sx={{ mb: { xs: 3, md: 4 } }}>
          <PageTitle title="Alle Buchungen" />
        </Box>

        {conflictError && (
          <Alert
            severity="warning"
            sx={{ mb: 3 }}
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => void fetchData()}
              >
                Neu laden
              </Button>
            }
          >
            {conflictError}
          </Alert>
        )}

        {loadError && (
          <Alert
            severity="error"
            sx={{ mb: 3 }}
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => void fetchData()}
              >
                Erneut versuchen
              </Button>
            }
          >
            {loadError}
          </Alert>
        )}

        {usersError && (
          <Alert
            severity="error"
            sx={{ mb: 3 }}
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => void fetchUsers()}
              >
                Mitglieder erneut laden
              </Button>
            }
          >
            {usersError}
          </Alert>
        )}

        {/* --- FILTER BAR --- */}
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 1.5, md: 2 },
            mb: { xs: 2, md: 3 },
            bgcolor: '#fff',
            borderColor: '#dbe8f6',
            borderRadius: 3,
            boxShadow: '0 6px 20px rgba(31, 90, 150, 0.06)',
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: 2,
            alignItems: { xs: 'stretch', md: 'center' },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              color: 'text.secondary',
              minWidth: { md: 90 },
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
            sx={{ minWidth: { md: 200 } }}
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
            sx={{ minWidth: { md: 230 } }}
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
              <IconButton
                onClick={handleResetFilters}
                size="small"
                aria-label="Filter zurücksetzen"
              >
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

        {/* --- TRANSAKTIONEN --- */}
        {loading ? (
          <LoadingSkeleton />
        ) : !loadError ? (
          <>
            {transactions.length === 0 ? (
              <Paper
                variant="outlined"
                sx={{
                  p: 3,
                  textAlign: 'center',
                  borderRadius: 3,
                  borderColor: '#dbe8f6',
                }}
              >
                Keine Transaktionen gefunden.
              </Paper>
            ) : isDesktop ? (
              <TableContainer
                component={Paper}
                variant="outlined"
                sx={{
                  borderColor: '#dbe8f6',
                  borderRadius: 3,
                  overflow: 'hidden',
                  boxShadow: '0 8px 24px rgba(31, 90, 150, 0.07)',
                }}
              >
                <Table sx={{ minWidth: 760 }}>
                  <TableHead sx={{ bgcolor: '#f4f8fc' }}>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <Checkbox
                          color="primary"
                          inputProps={{
                            'aria-label': 'Alle Buchungen auswählen',
                          }}
                          indeterminate={
                            selectedIds.length > 0 &&
                            selectedIds.length < transactions.length
                          }
                          checked={selectedIds.length === transactions.length}
                          onChange={handleSelectAllClick}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Datum</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>
                        Wer / Konto
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>
                        Kategorie
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>
                        Beschreibung
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        Betrag
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {transactions.map((tx) => {
                      const isSelected = selectedIds.indexOf(tx.id) !== -1;
                      const isGlobal = !tx.userId;

                      return (
                        <TableRow
                          key={tx.id}
                          hover
                          selected={isSelected}
                        >
                          <TableCell padding="checkbox">
                            <Checkbox
                              color="primary"
                              checked={isSelected}
                              inputProps={{
                                'aria-label': `Buchung vom ${dayjs(
                                  tx.occurredAt
                                ).format(
                                  'DD.MM.YYYY'
                                )} für ${getAccountLabel(tx)} auswählen`,
                              }}
                              onChange={() => handleClick(tx.id)}
                            />
                          </TableCell>
                          <TableCell>
                            {dayjs(tx.occurredAt).format('DD.MM.YYYY')}
                          </TableCell>
                          <TableCell>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: isGlobal ? 'bold' : 'normal',
                              }}
                            >
                              {getAccountLabel(tx)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <TransactionCategory category={tx.category} />
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
                          <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                            <TransactionAmount transaction={tx} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    mb: 1,
                    px: 0.5,
                  }}
                >
                  <Checkbox
                    size="small"
                    color="primary"
                    inputProps={{ 'aria-label': 'Alle auswählen' }}
                    indeterminate={
                      selectedIds.length > 0 &&
                      selectedIds.length < transactions.length
                    }
                    checked={selectedIds.length === transactions.length}
                    onChange={handleSelectAllClick}
                  />
                  <Typography variant="body2" color="text.secondary">
                    Alle auswählen
                  </Typography>
                </Box>
                {transactions.map((tx) => {
                  const isSelected = selectedIds.includes(tx.id);
                  return (
                    <Paper
                      key={tx.id}
                      component="article"
                      variant="outlined"
                      sx={{
                        p: 1.5,
                        mb: 1.25,
                        borderRadius: 3,
                        borderColor: isSelected ? '#90caf9' : '#dbe8f6',
                        bgcolor: isSelected ? '#eef8ff' : '#fff',
                        boxShadow: '0 4px 14px rgba(31, 90, 150, 0.05)',
                      }}
                    >
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: '32px minmax(0, 1fr) auto',
                          gap: 1,
                          alignItems: 'start',
                        }}
                      >
                        <Checkbox
                          color="primary"
                          checked={isSelected}
                          inputProps={{
                            'aria-label': `Buchung vom ${dayjs(
                              tx.occurredAt
                            ).format(
                              'DD.MM.YYYY'
                            )} für ${getAccountLabel(tx)} auswählen`,
                          }}
                          onChange={() => handleClick(tx.id)}
                          sx={{ p: 0.25, mt: 0.25 }}
                        />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" color="text.secondary">
                            {dayjs(tx.occurredAt).format('DD.MM.YYYY')}
                          </Typography>
                          <Typography
                            sx={{
                              fontWeight: !tx.userId ? 700 : 500,
                              overflowWrap: 'anywhere',
                            }}
                          >
                            {getAccountLabel(tx)}
                          </Typography>
                        </Box>
                        <TransactionAmount transaction={tx} />
                      </Box>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          ml: 5,
                          mt: 0.75,
                          flexWrap: 'wrap',
                        }}
                      >
                        <TransactionCategory category={tx.category} />
                        <Typography
                          sx={{
                            color: 'text.secondary',
                            overflowWrap: 'anywhere',
                          }}
                        >
                          {tx.description || '-'}
                        </Typography>
                        {tx.gameName && (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              flexBasis: '100%',
                              overflowWrap: 'anywhere',
                            }}
                          >
                            Spiel: {tx.gameName}
                          </Typography>
                        )}
                      </Box>
                    </Paper>
                  );
                })}
              </Box>
            )}
          </>
        ) : null}
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
