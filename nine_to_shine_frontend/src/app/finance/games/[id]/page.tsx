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
  Alert,
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
import { alpha } from '@mui/material/styles';

import Layout from '@/components/Layout';
import { apiFinance, apiUsers, apiGame } from '@/definitions/commands';
import type { UserDto, GameDto, FinanceDto } from '@/definitions/types';
import { routes } from '@/common/routes';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import EditGameDepositsButton from '@/components/EditGameDepositsButton';
import { isConflictError } from '@/definitions/api';

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

const sectionSx = {
  p: { xs: 1.5, sm: 2 },
  borderRadius: 3,
  bgcolor: 'background.paper',
  boxShadow: '0 8px 28px rgba(31, 74, 135, 0.07)',
  minWidth: 0,
};

const summaryStackSx = {
  height: '100%',
  '@media (max-width: 360px)': {
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 0.25,
    '& > :not(style) ~ :not(style)': { ml: 0 },
  },
};

const tableSx = {
  '& .MuiTableCell-root': {
    px: { xs: 1.25, sm: 1.75 },
    py: 0.75,
    borderColor: '#E2EBF7',
    fontSize: { xs: '0.8rem', sm: '0.9rem' },
    whiteSpace: 'nowrap',
  },
  '& .MuiTableHead-root .MuiTableCell-root': {
    bgcolor: '#F3F6FB',
    color: 'text.primary',
    fontWeight: 700,
  },
  '& .MuiTableRow-root:last-child .MuiTableCell-root': { borderBottom: 0 },
};

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
  const [financeTransactions, setFinanceTransactions] = useState<FinanceDto[]>(
    []
  );

  // Stats
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);

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
      const memberDuesIncomeTx = incomeTx.filter(
        (f) =>
          f.category === 'DUES' &&
          f.amount > 0 &&
          typeof f.userId === 'number'
      );

      // Einnahmen weiter aufteilen: Mit User vs. Ohne User
      const otherIncomeTx = incomeTx.filter((f) => !f.userId); // userId ist null/undefined

      // 3. Summen berechnen
      const tIncome = incomeTx.reduce((sum, f) => sum + f.amount, 0);
      const tExpense = expenseTx.reduce((sum, f) => sum + f.amount, 0);

      setTotalIncome(tIncome);
      setTotalExpense(tExpense);

      setExpenseList(expenseTx);
      setOtherIncomeList(otherIncomeTx);
      setFinanceTransactions(gameFinances);
      setConflictError(null);

      // 4. Spieler Tabelle aufbauen (Wer hat gezahlt?)
      const pRows: PaymentRow[] = allUsers.map((user) => {
        const userPayments = memberDuesIncomeTx.filter(
          (f) => f.userId === user.id
        );
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
      await apiFinance.deleteByGameId(
        gameId,
        financeTransactions.map(({ id, updatedAt }) => ({ id, updatedAt }))
      );
      router.push(routes.financesGames);
    } catch (err) {
      console.error(err);
      if (isConflictError(err)) {
        setConflictError(
          'Die Finanzdaten wurden inzwischen geändert. Lade die aktuellen Daten neu.'
        );
      } else {
        setErrorDialogOpen(true);
      }
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
      <Box sx={{ width: '100%', maxWidth: 1280, mx: 'auto', px: { xs: 0, sm: 1, md: 2 }, py: { xs: 1.5, md: 3 } }}>
        <Stack
          component="header"
          direction="row"
          alignItems="flex-start"
          justifyContent="space-between"
          spacing={{ xs: 1, sm: 2 }}
          sx={{ mb: { xs: 2, md: 3 } }}
        >
          <Stack direction="row" alignItems="flex-start" spacing={{ xs: 0.5, sm: 1.5 }} sx={{ minWidth: 0 }}>
            <IconButton aria-label="Zurück" onClick={() => router.back()} sx={{ mt: { xs: 0, sm: 0.5 }, flexShrink: 0 }}>
              <ArrowBackIcon />
            </IconButton>
            <Box sx={{ minWidth: 0 }}>
              <Typography component="h1" sx={{ color: 'text.primary', fontSize: { xs: '1.35rem', sm: '2rem', md: '2.4rem' }, fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.15, overflowWrap: 'anywhere' }}>
                {game.gameName}
              </Typography>
              <Typography sx={{ mt: 0.5, color: 'text.secondary', fontSize: { xs: '0.8rem', sm: '1rem' } }}>
                {game.playedAt ? dayjs(game.playedAt).format('DD.MM.YYYY HH:mm') : ''}
              </Typography>
            </Box>
          </Stack>
          <Box sx={{ flexShrink: 0, '& .MuiButton-root': { minWidth: { xs: 0, sm: 140 }, px: { xs: 1, sm: 2 }, fontSize: { xs: '0.75rem', sm: '0.9rem' }, whiteSpace: 'nowrap', bgcolor: 'background.paper' } }}>
            <EditGameDepositsButton gameId={gameId} />
          </Box>
        </Stack>

        {conflictError && (
          <Alert
            severity="warning"
            sx={{ mb: 2 }}
            action={<Button color="inherit" size="small" onClick={() => void fetchData()}>Neu laden</Button>}
          >
            {conflictError}
          </Alert>
        )}

        <Grid2 container spacing={{ xs: 1, sm: 2 }} sx={{ mb: { xs: 2, md: 3 } }}>
          <Grid2 size={4}>
            <Paper variant="outlined" sx={{ height: '100%', minHeight: { xs: 94, sm: 112 }, p: { xs: 1, sm: 2 }, borderRadius: 2, borderColor: (theme) => alpha(theme.palette.success.main, 0.3), bgcolor: '#F4FFF8' }}>
              <Stack direction="row" alignItems="center" spacing={{ xs: 0.5, sm: 1.5 }} sx={summaryStackSx}>
                <TrendingUpIcon sx={{ color: '#087C3B', fontSize: { xs: 20, sm: 34 }, flexShrink: 0 }} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ color: 'text.secondary', fontSize: { xs: '0.68rem', sm: '0.9rem' }, lineHeight: 1.2 }}>Einnahmen</Typography>
                  <Typography sx={{ mt: 0.35, color: '#08703A', fontSize: { xs: '0.82rem', sm: '1.45rem', md: '1.9rem' }, fontWeight: 800, whiteSpace: 'nowrap' }}>{formatCurrency(totalIncome)}</Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid2>
          <Grid2 size={4}>
            <Paper variant="outlined" sx={{ height: '100%', minHeight: { xs: 94, sm: 112 }, p: { xs: 1, sm: 2 }, borderRadius: 2, borderColor: (theme) => alpha(theme.palette.error.main, 0.3), bgcolor: '#FFF8F8' }}>
              <Stack direction="row" alignItems="center" spacing={{ xs: 0.5, sm: 1.5 }} sx={summaryStackSx}>
                <TrendingDownIcon sx={{ color: '#E71928', fontSize: { xs: 20, sm: 34 }, flexShrink: 0 }} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ color: 'text.secondary', fontSize: { xs: '0.68rem', sm: '0.9rem' }, lineHeight: 1.2 }}>Ausgaben</Typography>
                  <Typography sx={{ mt: 0.35, color: '#D70F20', fontSize: { xs: '0.82rem', sm: '1.45rem', md: '1.9rem' }, fontWeight: 800, whiteSpace: 'nowrap' }}>{formatCurrency(totalExpense)}</Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid2>
          <Grid2 size={4}>
            <Paper variant="outlined" sx={{ height: '100%', minHeight: { xs: 94, sm: 112 }, p: { xs: 1, sm: 2 }, borderRadius: 2, borderColor: (theme) => alpha(theme.palette.primary.main, 0.3), bgcolor: '#F4F9FF' }}>
              <Stack direction="row" alignItems="center" spacing={{ xs: 0.5, sm: 1.5 }} sx={summaryStackSx}>
                <AccountBalanceWalletIcon sx={{ color: '#0872E8', fontSize: { xs: 20, sm: 34 }, flexShrink: 0 }} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ color: 'text.secondary', fontSize: { xs: '0.68rem', sm: '0.9rem' }, lineHeight: 1.2 }}>Bilanz</Typography>
                  <Typography sx={{ mt: 0.35, color: netResult >= 0 ? '#174384' : 'error.dark', fontSize: { xs: '0.82rem', sm: '1.45rem', md: '1.9rem' }, fontWeight: 800, whiteSpace: 'nowrap' }}>
                    {netResult > 0 ? '+' : ''}{formatCurrency(netResult)}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid2>
        </Grid2>

        <Grid2 container spacing={{ xs: 2, md: 2.5 }} alignItems="flex-start">
          <Grid2 size={{ xs: 12, md: 7 }}>
            <Paper component="section" elevation={0} sx={sectionSx}>
              <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 1.75 }}>
                <CheckCircleIcon sx={{ color: '#229349', fontSize: { xs: 27, sm: 31 } }} />
                <Typography component="h2" sx={{ fontSize: { xs: '1.1rem', sm: '1.35rem' }, fontWeight: 800 }}>Einnahmen (Mitglieder)</Typography>
              </Stack>
              <TableContainer sx={{ border: 1, borderColor: '#DCE8F8', borderRadius: 1.5, overflowX: 'auto' }}>
                <Table size="small" aria-label="Einnahmen der Mitglieder" sx={{ ...tableSx, minWidth: 330 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Mitglied</TableCell>
                      <TableCell align="center">Status</TableCell>
                      <TableCell align="right">Betrag</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {playerRows.map((row) => (
                      <TableRow key={row.user.id}>
                        <TableCell>{row.user.displayName}</TableCell>
                        <TableCell align="center">
                          <Chip
                            label={row.hasPaid ? 'Bezahlt' : 'Offen'}
                            variant="outlined"
                            size="small"
                            sx={{ height: 26, borderColor: row.hasPaid ? '#60C67B' : '#CDD8E8', color: row.hasPaid ? '#08703A' : 'text.secondary', bgcolor: 'background.paper' }}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: row.hasPaid ? 700 : 400, color: row.hasPaid ? '#08703A' : 'text.secondary' }}>
                          {row.hasPaid ? formatCurrency(row.amount) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid2>

          <Grid2 size={{ xs: 12, md: 5 }}>
            <Stack spacing={{ xs: 2, md: 2.5 }}>
              {otherIncomeList.length > 0 && (
                <Paper component="section" elevation={0} sx={sectionSx}>
                  <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 1.75 }}>
                    <SavingsIcon sx={{ color: '#229349', fontSize: { xs: 27, sm: 31 } }} />
                    <Typography component="h2" sx={{ fontSize: { xs: '1.1rem', sm: '1.35rem' }, fontWeight: 800 }}>Sonstige Einnahmen</Typography>
                  </Stack>
                  <TableContainer sx={{ border: 1, borderColor: '#DCE8F8', borderRadius: 1.5, overflowX: 'auto' }}>
                    <Table size="small" aria-label="Sonstige Einnahmen" sx={{ ...tableSx, minWidth: 330 }}>
                      <TableHead>
                        <TableRow>
                          <TableCell>Beschreibung</TableCell>
                          <TableCell>Kategorie</TableCell>
                          <TableCell align="right">Betrag</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {otherIncomeList.map((tx) => (
                          <TableRow key={tx.id}>
                            <TableCell>{tx.description || 'Sonstiges'}</TableCell>
                            <TableCell><Chip label={tx.category} size="small" variant="outlined" sx={{ height: 26, borderColor: '#60C67B', color: '#08703A' }} /></TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, color: '#08703A' }}>{formatCurrency(tx.amount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              )}

              <Paper component="section" elevation={0} sx={sectionSx}>
                <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 1.75 }}>
                  <CancelIcon sx={{ color: '#E71928', fontSize: { xs: 27, sm: 31 } }} />
                  <Typography component="h2" sx={{ fontSize: { xs: '1.1rem', sm: '1.35rem' }, fontWeight: 800 }}>Ausgaben (Kosten)</Typography>
                </Stack>
                {expenseList.length === 0 ? (
                  <Box sx={{ p: 2, border: 1, borderColor: '#DCE8F8', borderRadius: 1.5, color: 'text.secondary' }}>
                    Keine Ausgaben für dieses Spiel verbucht.
                  </Box>
                ) : (
                  <TableContainer sx={{ border: 1, borderColor: '#DCE8F8', borderRadius: 1.5, overflowX: 'auto' }}>
                    <Table size="small" aria-label="Ausgaben des Spiels" sx={{ ...tableSx, minWidth: 330 }}>
                      <TableHead>
                        <TableRow>
                          <TableCell>Beschreibung</TableCell>
                          <TableCell>Kategorie</TableCell>
                          <TableCell align="right">Betrag</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {expenseList.map((tx) => (
                          <TableRow key={tx.id}>
                            <TableCell>{tx.description || '-'}</TableCell>
                            <TableCell><Chip label={tx.category} size="small" variant="outlined" sx={{ height: 26, borderColor: '#CDD8E8', color: 'text.primary' }} /></TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, color: '#D70F20' }}>- {formatCurrency(tx.amount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Paper>

              <Button
                variant="contained"
                color="error"
                size="large"
                fullWidth
                startIcon={<DeleteIcon />}
                onClick={handleDeleteAllTransactions}
                sx={{ py: 1.25, fontWeight: 700, textTransform: 'none', borderRadius: 1.5 }}
              >
                Alle Transaktionen zum Spiel löschen
              </Button>
            </Stack>
          </Grid2>
        </Grid2>

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
