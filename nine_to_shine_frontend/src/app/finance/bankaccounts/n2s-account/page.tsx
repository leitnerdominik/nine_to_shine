'use client';

import { useEffect, useState, useMemo } from 'react';
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
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import CustomTitle from '@/components/CustomTitle';
import { apiFinance } from '@/definitions/commands';
import type { FinanceDto } from '@/definitions/types';
import dayjs from 'dayjs';
import LoadingSkeleton from '@/components/LoadingSkeleton';

// Helper für Währungsformatierung
const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(
    amount
  );

export default function N2SBankAccountPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<FinanceDto[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const txData = await apiFinance.getAll({ scope: 'global' });

        setTransactions(txData);
      } catch (err) {
        console.error('Fehler beim Laden des Vereinskontos:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const currentBalance = useMemo(() => {
    return transactions.reduce(
      (sum, tx) => sum + (tx.direction === 'income' ? tx.amount : -tx.amount),
      0
    );
  }, [transactions]);

  if (loading) {
    return (
      <Layout>
        <LoadingSkeleton />
      </Layout>
    );
  }

  return (
    <Layout>
      <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
        {/* Header-Bereich */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
          spacing={2}
          sx={{ mb: 4 }}
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            <IconButton onClick={() => router.back()}>
              <ArrowBackIcon />
            </IconButton>
            <Box>
              <CustomTitle text="N2S Vereinskonto" />
              <Typography variant="subtitle1" color="text.secondary">
                Aktueller Kassenbestand:{' '}
                <Box
                  component="span"
                  sx={{
                    fontWeight: 'bold',
                    fontSize: '1.2rem',
                    color: currentBalance >= 0 ? 'success.main' : 'error.main',
                    ml: 1,
                  }}
                >
                  {formatCurrency(currentBalance)}
                </Box>
              </Typography>
            </Box>
          </Stack>
        </Stack>

        {/* Transaktionsliste */}
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead sx={{ bgcolor: '#f8f9fa' }}>
              <TableRow>
                <TableCell width="120">
                  <strong>Datum</strong>
                </TableCell>
                <TableCell width="150">
                  <strong>Kategorie</strong>
                </TableCell>
                <TableCell>
                  <strong>Beschreibung / Spiel</strong>
                </TableCell>
                <TableCell align="right" width="150">
                  <strong>Betrag</strong>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      Noch keine Buchungen auf dem Vereinskonto vorhanden.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((tx) => {
                  // Richtung bestimmen: Income = positiv, Expense = negativ
                  const isIncome = tx.direction === 'income';
                  // Für die Anzeige: Ausgaben als negative Zahl darstellen
                  const displayAmount = isIncome ? tx.amount : -tx.amount;

                  // Farbe für Kategorie-Chip
                  let chipColor:
                    | 'default'
                    | 'primary'
                    | 'secondary'
                    | 'error'
                    | 'success' = 'default';
                  if (tx.category === 'DUES') chipColor = 'success';
                  if (tx.category === 'EVENT') chipColor = 'primary';
                  if (tx.direction === 'expense') chipColor = 'error';

                  return (
                    <TableRow key={tx.id} hover>
                      <TableCell>
                        {dayjs(tx.occurredAt).format('DD.MM.YYYY')}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={tx.category}
                          size="small"
                          variant="outlined"
                          color={chipColor}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {tx.description || '-'}
                        </Typography>
                        {tx.gameName && (
                          <Typography
                            variant="caption"
                            display="block"
                            color="text.secondary"
                            sx={{ mt: 0.5 }}
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
      </Box>
    </Layout>
  );
}
