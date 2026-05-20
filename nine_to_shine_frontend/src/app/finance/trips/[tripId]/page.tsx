'use client';

import { use, useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';

import { formatCurrency } from '@/common/misc';
import CustomTitle from '@/components/CustomTitle';
import Layout from '@/components/Layout';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { apiFinance, apiUsers } from '@/definitions/commands';
import type { UserDto } from '@/definitions/types';

interface TripParticipant {
  user: UserDto;
  isOnTrip: boolean;
  amount: number;
}

interface TripDetails {
  date: Date;
  description: string;
  totalExpense: number;
  totalIncome: number;
  balance: number;
  seasonId?: number;
  participants: TripParticipant[];
  additionalBookings: {
    id: number;
    direction: 'income' | 'expense';
    amount: number;
    description?: string;
  }[];
}

const getCleanTripDescription = (description?: string) =>
  (description || 'Unbenannter Trip')
    .replace(/\s?\((Anreise\/Unterkunft|Aktivität)\)/g, '')
    .replace(/\s?\(Aktivität.*?\)/g, '')
    .trim();

export default function TripDetailsPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = use(params);
  const decodedTripId = decodeURIComponent(tripId);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [trip, setTrip] = useState<TripDetails | null>(null);
  const [direction, setDirection] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchTripDetails = useCallback(async () => {
    try {
      setLoading(true);
      const [users, transactions] = await Promise.all([
        apiUsers.getAll(),
        apiFinance.getAll(),
      ]);

      const tripTransactions = transactions.filter(
        (tx) => tx.category === 'TRIP' && tx.occurredAt === decodedTripId
      );

      if (tripTransactions.length === 0) {
        setTrip(null);
        return;
      }

      const firstTx = tripTransactions[0];
      const participants = users.map((user) => {
        const userTxs = tripTransactions.filter((tx) => tx.userId === user.id);
        const amount = userTxs.reduce(
          (sum, tx) =>
            sum + (tx.direction === 'expense' ? tx.amount : -tx.amount),
          0
        );
        const hasTripBooking = userTxs.some((tx) =>
          tx.description?.includes('Anreise')
        );

        return {
          user,
          isOnTrip: hasTripBooking || amount > 0,
          amount,
        };
      });

      participants.sort((a, b) => {
        if (a.isOnTrip === b.isOnTrip) {
          return a.user.displayName.localeCompare(b.user.displayName);
        }
        return a.isOnTrip ? -1 : 1;
      });

      const totalExpense = tripTransactions
        .filter((tx) => tx.direction === 'expense')
        .reduce((sum, tx) => sum + tx.amount, 0);
      const totalIncome = tripTransactions
        .filter((tx) => tx.direction === 'income')
        .reduce((sum, tx) => sum + tx.amount, 0);
      const additionalBookings = tripTransactions
        .filter((tx) => !tx.userId)
        .map((tx) => ({
          id: tx.id,
          direction: tx.direction,
          amount: tx.amount,
          description: tx.description,
        }));

      setTrip({
        date: new Date(firstTx.occurredAt),
        description: getCleanTripDescription(firstTx.description),
        totalExpense,
        totalIncome,
        balance: totalExpense - totalIncome,
        seasonId: firstTx.seasonId,
        participants,
        additionalBookings,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [decodedTripId]);

  useEffect(() => {
    void fetchTripDetails();
  }, [fetchTripDetails]);

  const handleAddBooking = async () => {
    if (!trip) return;

    const parsedAmount = parseFloat(amount);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) return;

    const bookingLabel = direction === 'expense' ? 'Ausgabe' : 'Einnahme';
    const bookingDescription = description.trim()
      ? `${trip.description} (${bookingLabel}: ${description.trim()})`
      : `${trip.description} (${bookingLabel})`;

    try {
      setIsSaving(true);
      await apiFinance.create({
        occurredAt: decodedTripId,
        direction,
        amount: parsedAmount,
        category: 'TRIP',
        description: bookingDescription,
        userId: null,
        seasonId: trip.seasonId,
      });

      setAmount('');
      setDescription('');
      await fetchTripDetails();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <LoadingSkeleton />
      </Layout>
    );
  }

  if (!trip) {
    return (
      <Layout>
        <Box sx={{ maxWidth: 1000, mx: 'auto', p: 3 }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <IconButton onClick={() => router.back()}>
              <ArrowBackIcon />
            </IconButton>
            <Typography>Urlaub nicht gefunden.</Typography>
          </Stack>
        </Box>
      </Layout>
    );
  }

  const joinedCount = trip.participants.filter((p) => p.isOnTrip).length;

  return (
    <Layout>
      <Box sx={{ maxWidth: 1000, mx: 'auto', p: 3 }}>
        <Stack
          direction="row"
          alignItems="flex-start"
          justifyContent="space-between"
          spacing={2}
          sx={{ mb: 3 }}
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            <IconButton onClick={() => router.back()}>
              <ArrowBackIcon />
            </IconButton>
            <Box>
              <CustomTitle text={trip.description} />
              <Typography variant="body2" color="text.secondary">
                {dayjs(trip.date).format('DD.MM.YYYY')}
              </Typography>
            </Box>
          </Stack>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
          <Paper variant="outlined" sx={{ p: 2, flex: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Gesamt
            </Typography>
            <Typography variant="h5" fontWeight="bold" color="error.main">
              {formatCurrency(trip.totalExpense)}
            </Typography>
          </Paper>
          <Paper variant="outlined" sx={{ p: 2, flex: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Einnahmen
            </Typography>
            <Typography variant="h5" fontWeight="bold" color="success.main">
              {formatCurrency(trip.totalIncome)}
            </Typography>
          </Paper>
          <Paper variant="outlined" sx={{ p: 2, flex: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Saldo
            </Typography>
            <Typography variant="h5" fontWeight="bold">
              {formatCurrency(trip.balance)}
            </Typography>
          </Paper>
          <Paper variant="outlined" sx={{ p: 2, flex: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Dabei
            </Typography>
            <Typography variant="h5" fontWeight="bold">
              {joinedCount} / {trip.participants.length}
            </Typography>
          </Paper>
        </Stack>

        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Stack spacing={2}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <AddIcon color="primary" fontSize="small" />
              <Typography variant="h6">Buchung hinzufügen</Typography>
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                select
                label="Typ"
                value={direction}
                onChange={(event) =>
                  setDirection(event.target.value as 'expense' | 'income')
                }
                sx={{ minWidth: { md: 160 } }}
              >
                <MenuItem value="expense">Ausgabe</MenuItem>
                <MenuItem value="income">Einnahme</MenuItem>
              </TextField>
              <TextField
                label="Betrag"
                type="number"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                fullWidth
              />
              <TextField
                label="Beschreibung"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                fullWidth
              />
              <Button
                variant="contained"
                onClick={handleAddBooking}
                disabled={isSaving || parseFloat(amount || '0') <= 0}
                startIcon={
                  isSaving ? <CircularProgress size={18} color="inherit" /> : <AddIcon />
                }
                sx={{ minWidth: 150 }}
              >
                Hinzufügen
              </Button>
            </Stack>
          </Stack>
        </Paper>

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
                  <strong>Kostenanteil</strong>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {trip.participants.map((participant) => (
                <TableRow
                  key={participant.user.id}
                  hover
                  sx={{ opacity: participant.isOnTrip ? 1 : 0.55 }}
                >
                  <TableCell>
                    <Typography
                      variant="body2"
                      fontWeight={participant.isOnTrip ? 700 : 400}
                    >
                      {participant.user.displayName}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    {participant.isOnTrip ? (
                      <Chip
                        icon={<CheckCircleIcon />}
                        label="Dabei"
                        color="success"
                        variant="outlined"
                        size="small"
                      />
                    ) : (
                      <Chip
                        icon={<CancelIcon />}
                        label="Nicht dabei"
                        variant="outlined"
                        size="small"
                        sx={{ opacity: 0.75 }}
                      />
                    )}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      fontWeight: participant.amount > 0 ? 'bold' : 'normal',
                      color:
                        participant.amount > 0 ? 'error.main' : 'text.disabled',
                    }}
                  >
                    {participant.amount > 0
                      ? formatCurrency(participant.amount)
                      : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {trip.additionalBookings.length > 0 && (
          <Paper variant="outlined" sx={{ mt: 3, p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Weitere Buchungen
            </Typography>
            <Stack divider={<Divider />} spacing={1}>
              {trip.additionalBookings.map((booking) => (
                <Stack
                  key={booking.id}
                  direction={{ xs: 'column', sm: 'row' }}
                  justifyContent="space-between"
                  spacing={1}
                >
                  <Box>
                    <Chip
                      label={
                        booking.direction === 'expense' ? 'Ausgabe' : 'Einnahme'
                      }
                      color={
                        booking.direction === 'expense' ? 'error' : 'success'
                      }
                      variant="outlined"
                      size="small"
                      sx={{ mr: 1 }}
                    />
                    <Typography component="span" variant="body2">
                      {booking.description || '-'}
                    </Typography>
                  </Box>
                  <Typography
                    variant="body2"
                    fontWeight="bold"
                    color={
                      booking.direction === 'expense'
                        ? 'error.main'
                        : 'success.main'
                    }
                  >
                    {booking.direction === 'expense' ? '-' : '+'}{' '}
                    {formatCurrency(booking.amount)}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Paper>
        )}
      </Box>
    </Layout>
  );
}
