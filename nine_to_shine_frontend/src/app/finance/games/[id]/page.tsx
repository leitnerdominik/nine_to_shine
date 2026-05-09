'use client';

import { useCallback, useEffect, useState, use } from 'react';
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
  Stack,
  IconButton,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import Grid2 from '@mui/material/Grid2';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import SavingsIcon from '@mui/icons-material/Savings';
import DeleteIcon from '@mui/icons-material/Delete';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';

import Layout from '@/components/Layout';
import CustomTitle from '@/components/CustomTitle';
import { apiFinance, apiUsers, apiGame } from '@/definitions/commands';
import type { UserDto, GameDto, FinanceDto } from '@/definitions/types';
import { routes } from '@/common/routes';
import LoadingSkeleton from '@/components/LoadingSkeleton';

// Helper
const formatCurrency = (val: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(
    val
  );

interface PaymentRow {
  user: UserDto;
  hasPaid: boolean;
  amount: number;
}

export default function GamePaymentDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const gameId = Number(id);

  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const [game, setGame] = useState<GameDto | null>(null);

  // Data States
  const [playerRows, setPlayerRows] = useState<PaymentRow[]>([]);
  const [otherIncomeList, setOtherIncomeList] = useState<FinanceDto[]>([]); // NEU: Einnahmen ohne User
  const [expenseList, setExpenseList] = useState<FinanceDto[]>([]);

  // Stats
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [allUsers, gameFinances, allGames] = await Promise.all([
        apiUsers.getAll(),
        apiFinance.getAll({ gameId: gameId }),
        apiGame.getAll(),
      ]);

      // 1. Spiel finden
      const foundGame = allGames.find((g) => g.id === gameId) || null;
      setGame(foundGame);

      // 2. Transaktionen aufteilen
      const incomeTx = gameFinances.filter((f) => f.direction === 'income');
      const expenseTx = gameFinances.filter((f) => f.direction === 'expense');

      // Einnahmen weiter aufteilen: Mit User vs. Ohne User
      const otherIncomeTx = incomeTx.filter((f) => !f.userId); // userId ist null/undefined

      // 3. Summen berechnen
      const tIncome = incomeTx.reduce((sum, f) => sum + f.amount, 0);
      const tExpense = expenseTx.reduce((sum, f) => sum + f.amount, 0);

      setTotalIncome(tIncome);
      setTotalExpense(tExpense);

      setExpenseList(expenseTx);
      setOtherIncomeList(otherIncomeTx);

      // 4. Spieler Tabelle aufbauen (Wer hat gezahlt?)
      const pRows: PaymentRow[] = allUsers.map((user) => {
        // Nur Einnahmen von DIESEM User
        const userPayments = incomeTx.filter((f) => f.userId === user.id);
        const userSum = userPayments.reduce((sum, f) => sum + f.amount, 0);

        return {
          user: user,
          hasPaid: userSum > 0,
          amount: userSum,
        };
      });

      // Sortieren: Zahler nach oben
      pRows.sort((a, b) => {
        if (a.hasPaid === b.hasPaid)
          return a.user.displayName.localeCompare(b.user.displayName);
        return a.hasPaid ? -1 : 1;
      });

      setPlayerRows(pRows);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleDeleteAllTransactions = () => {
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    setDeleteDialogOpen(false);
    try {
      setLoading(true);
      await apiFinance.deleteByGameId(gameId);
      router.push(routes.financesGames);
    } catch (err) {
      console.error(err);
      setErrorDialogOpen(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <LoadingSkeleton />
      </Layout>
    );
  }

  if (!game) {
    return (
      <Layout>
        <Box sx={{ p: 3 }}>Spiel nicht gefunden.</Box>
      </Layout>
    );
  }

  const netResult = totalIncome - totalExpense;

  return (
    <Layout>
      <Box sx={{ maxWidth: 1000, mx: 'auto', p: 3 }}>
        {/* Header */}
        <Stack
          direction="row"
          alignItems="flex-start"
          justifyContent="space-between"
          spacing={2}
          mb={3}
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            <IconButton onClick={() => router.back()}>
              <ArrowBackIcon />
            </IconButton>
            <Box>
              <CustomTitle text={game.gameName} />
              <Typography variant="body2" color="text.secondary">
                {game.playedAt
                  ? dayjs(game.playedAt).format('DD.MM.YYYY HH:mm')
                  : ''}
              </Typography>
            </Box>
          </Stack>
        </Stack>


        {/* --- STATISTIK KARTEN --- */}
        <Grid2 container spacing={2} sx={{ mb: 4 }}>
          {/* Einnahmen */}
          <Grid2 size={{ xs: 12, sm: 4 }}>
            <Paper
              variant="outlined"
              sx={{ p: 2, borderColor: 'success.light', bgcolor: '#f0fcf4' }}
            >
              <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                <TrendingUpIcon color="success" />
                <Typography variant="subtitle2" color="text.secondary">
                  Einnahmen
                </Typography>
              </Stack>
              <Typography variant="h5" fontWeight="bold" color="success.main">
                {formatCurrency(totalIncome)}
              </Typography>
            </Paper>
          </Grid2>

          {/* Ausgaben */}
          <Grid2 size={{ xs: 12, sm: 4 }}>
            <Paper
              variant="outlined"
              sx={{ p: 2, borderColor: 'error.light', bgcolor: '#fff5f5' }}
            >
              <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                <TrendingDownIcon color="error" />
                <Typography variant="subtitle2" color="text.secondary">
                  Ausgaben
                </Typography>
              </Stack>
              <Typography variant="h5" fontWeight="bold" color="error.main">
                {formatCurrency(totalExpense)}
              </Typography>
            </Paper>
          </Grid2>

          {/* Bilanz */}
          <Grid2 size={{ xs: 12, sm: 4 }}>
            <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f8f9fa' }}>
              <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                <AccountBalanceWalletIcon color="action" />
                <Typography variant="subtitle2" color="text.secondary">
                  Bilanz
                </Typography>
              </Stack>
              <Typography
                variant="h5"
                fontWeight="bold"
                color={netResult >= 0 ? 'success.dark' : 'error.dark'}
              >
                {netResult > 0 ? '+' : ''}
                {formatCurrency(netResult)}
              </Typography>
            </Paper>
          </Grid2>
        </Grid2>

        <Stack spacing={4}>
          {/* --- TABELLE 1: EINNAHMEN (SPIELER) --- */}
          <Box>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <CheckCircleIcon color="success" fontSize="small" /> Einnahmen
              (Mitglieder)
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                  <TableRow>
                    <TableCell>
                      <strong>Mitglied</strong>
                    </TableCell>
                    <TableCell align="center">
                      <strong>Status</strong>
                    </TableCell>
                    <TableCell align="right">
                      <strong>Betrag</strong>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {playerRows.map((row) => (
                    <TableRow key={row.user.id} hover>
                      <TableCell>
                        <Typography
                          variant="body2"
                          fontWeight={row.hasPaid ? 'bold' : 'normal'}
                        >
                          {row.user.displayName}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        {row.hasPaid ? (
                          <Chip
                            label="Bezahlt"
                            color="success"
                            variant="outlined"
                            size="small"
                            sx={{ height: 24 }}
                          />
                        ) : (
                          <Chip
                            label="Offen"
                            color="default"
                            variant="outlined"
                            size="small"
                            sx={{ opacity: 0.5, height: 24 }}
                          />
                        )}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          fontWeight: 'bold',
                          color: row.hasPaid ? 'success.main' : 'text.disabled',
                        }}
                      >
                        {row.hasPaid ? formatCurrency(row.amount) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          {/* --- TABELLE 2: SONSTIGE EINNAHMEN (NEU) --- */}
          {otherIncomeList.length > 0 && (
            <Box>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <SavingsIcon color="success" fontSize="small" /> Sonstige
                Einnahmen
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                    <TableRow>
                      <TableCell>
                        <strong>Beschreibung</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Kategorie</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>Betrag</strong>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {otherIncomeList.map((tx) => (
                      <TableRow key={tx.id} hover>
                        <TableCell>
                          <Typography variant="body2">
                            {tx.description || 'Sonstiges'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={tx.category}
                            size="small"
                            variant="outlined"
                            color="success"
                          />
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ fontWeight: 'bold', color: 'success.main' }}
                        >
                          {formatCurrency(tx.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* --- TABELLE 3: AUSGABEN --- */}
          <Box>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <CancelIcon color="error" fontSize="small" /> Ausgaben (Kosten)
            </Typography>
            {expenseList.length === 0 ? (
              <Paper
                variant="outlined"
                sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}
              >
                Keine Ausgaben für dieses Spiel verbucht.
              </Paper>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                    <TableRow>
                      <TableCell>
                        <strong>Beschreibung</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Kategorie</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>Betrag</strong>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {expenseList.map((tx) => (
                      <TableRow key={tx.id} hover>
                        <TableCell>{tx.description || '-'}</TableCell>
                        <TableCell>
                          <Chip
                            label={tx.category}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ fontWeight: 'bold', color: 'error.main' }}
                        >
                          - {formatCurrency(tx.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </Stack>

        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            color="error"
            size="small"
            startIcon={<DeleteIcon />}
            onClick={handleDeleteAllTransactions}
          >
            Alle Transaktion zum Spiel Löschen
          </Button>
        </Box>

        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
        >
          <DialogTitle>Transaktionen löschen?</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Sollen wirklich ALLE Transaktionen für dieses Spiel gelöscht werden?
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={handleConfirmDelete} color="error" autoFocus>
              Löschen
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={errorDialogOpen}
          onClose={() => setErrorDialogOpen(false)}
        >
          <DialogTitle>Fehler</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Ein Fehler ist aufgetreten. Die Transaktionen konnten nicht gelöscht werden.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setErrorDialogOpen(false)} autoFocus>
              OK
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
}
