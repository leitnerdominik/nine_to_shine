'use client';

import { useEffect, useState, use } from 'react';
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
import { apiFinance, apiUsers } from '@/definitions/commands';
import type { FinanceDto, UserDto } from '@/definitions/types';
import dayjs from 'dayjs';
import LoadingSkeleton from '@/components/LoadingSkeleton';

// Helper für Währung
const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(
    amount
  );

export default function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // params ist in neueren Next.js Versionen ein Promise, daher 'use' oder await
  const { id } = use(params);
  const userId = Number(id);

  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<FinanceDto[]>([]);
  const [user, setUser] = useState<UserDto | null>(null);
  const [balance, setBalance] = useState<number>(0);

  useEffect(() => {
    (async () => {
      try {
        // Parallel laden: User-Infos, Transaktionen, Saldo
        const [userData, txData, userBalance] = await Promise.all([
          apiUsers.getById(userId),
          apiFinance.getAll({ userId }),
          apiFinance.getUserBalance(userId),
        ]);

        setUser(userData);
        setTransactions(txData);
        setBalance(userBalance);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  if (loading) {
    return (
      <Layout>
        <LoadingSkeleton />
      </Layout>
    );
  }

  if (!user)
    return (
      <Layout>
        <Typography>User nicht gefunden.</Typography>
      </Layout>
    );

  return (
    <Layout>
      <Box sx={{ maxWidth: 1000, mx: 'auto', p: 3 }}>
        {/* Header mit Zurück-Button */}
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
          <IconButton onClick={() => router.back()}>
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              Konto: {user.displayName}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Aktueller Kontostand:{' '}
              <Box
                component="span"
                sx={{
                  fontWeight: 'bold',
                  color: balance >= 0 ? 'success.main' : 'error.main',
                }}
              >
                {formatCurrency(balance)}
              </Box>
            </Typography>
          </Box>
        </Stack>

        {/* Transaktionsliste */}
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead sx={{ bgcolor: '#f5f5f5' }}>
              <TableRow>
                <TableCell>
                  <strong>Datum</strong>
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
                  <TableCell colSpan={4} align="center">
                    Keine Transaktionen gefunden.
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((tx) => {
                  // Richtung bestimmen: Income = positiv, Expense = negativ
                  const isIncome = tx.direction === 'income';
                  const displayAmount = isIncome ? tx.amount : -tx.amount;

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
                          color={tx.category === 'DUES' ? 'primary' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        {tx.description}
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
