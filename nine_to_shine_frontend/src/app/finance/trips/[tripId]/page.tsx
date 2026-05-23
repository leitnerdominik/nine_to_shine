'use client';

import { use, useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
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
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';
import { useSnackbar } from 'notistack';

import { formatCurrency } from '@/common/misc';
import CustomTitle from '@/components/CustomTitle';
import Layout from '@/components/Layout';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { apiFinance, apiUsers } from '@/definitions/commands';
import type { UserDto } from '@/definitions/types';

interface TripParticipant {
  user: UserDto;
  isOnTrip: boolean;
  baseTransactionId?: number;
  tripAmount: number;
  additionalAmount: number;
  amount: number;
}

interface TripDetails {
  date: Date;
  description: string;
  totalExpense: number;
  totalIncome: number;
  balance: number;
  baseTotal: number;
  baseDescription: string;
  tripShare: number;
  additionalShare: number;
  seasonId?: number;
  participants: TripParticipant[];
  additionalBookings: {
    id: string;
    transactionIds: number[];
    transactionEntries: { id: number; userId?: number | null }[];
    direction: 'income' | 'expense';
    amount: number;
    participantCount: number;
    shareAmount: number;
    description?: string;
  }[];
}

const getCleanTripDescription = (description?: string) =>
  (description || 'Unbenannter Trip')
    .replace(/\s?\((Anreise\/Unterkunft|Aktivität)\)/g, '')
    .replace(/\s?\(Aktivität.*?\)/g, '')
    .replace(/\s?\((Ausgabe|Einnahme).*?\)/g, '')
    .trim();

const roundMoney = (value: number) => Math.round(value * 100) / 100;

export default function TripDetailsPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = use(params);
  const decodedTripId = decodeURIComponent(tripId);
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();

  const [loading, setLoading] = useState(true);
  const [trip, setTrip] = useState<TripDetails | null>(null);
  const [direction, setDirection] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
  const [editDirection, setEditDirection] = useState<'income' | 'expense'>(
    'expense'
  );
  const [editAmount, setEditAmount] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isEditingTripSetup, setIsEditingTripSetup] = useState(false);
  const [editBaseAmount, setEditBaseAmount] = useState('');
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<
    number[]
  >([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
      const baseTripTransactions = tripTransactions.filter((tx) =>
        tx.description?.includes('Anreise/Unterkunft')
      );
      const additionalTransactions = tripTransactions.filter(
        (tx) => !tx.description?.includes('Anreise/Unterkunft')
      );
      const participantRows = users.map((user) => {
        const userTxs = tripTransactions.filter((tx) => tx.userId === user.id);
        const baseTransaction = userTxs.find((tx) =>
          tx.description?.includes('Anreise/Unterkunft')
        );

        return {
          user,
          isOnTrip: !!baseTransaction,
          baseTransactionId: baseTransaction?.id,
          tripAmount: 0,
          additionalAmount: 0,
          amount: 0,
        };
      });

      const totalExpense = tripTransactions
        .filter((tx) => tx.direction === 'expense')
        .reduce((sum, tx) => sum + tx.amount, 0);
      const totalIncome = tripTransactions
        .filter((tx) => tx.direction === 'income')
        .reduce((sum, tx) => sum + tx.amount, 0);
      const balance = totalExpense - totalIncome;
      const joinedCount = participantRows.filter((p) => p.isOnTrip).length;
      const baseTotal = baseTripTransactions.reduce(
        (sum, tx) =>
          sum + (tx.direction === 'expense' ? tx.amount : -tx.amount),
        0
      );
      const additionalBalance = additionalTransactions.reduce(
        (sum, tx) =>
          sum + (tx.direction === 'expense' ? tx.amount : -tx.amount),
        0
      );
      const tripShare = joinedCount > 0 ? baseTotal / joinedCount : 0;
      const additionalShare =
        joinedCount > 0 ? additionalBalance / joinedCount : 0;
      const participants = participantRows.map((participant) => ({
        ...participant,
        tripAmount: participant.isOnTrip ? tripShare : 0,
        additionalAmount: participant.isOnTrip ? additionalShare : 0,
        amount: participant.isOnTrip ? tripShare + additionalShare : 0,
      }));

      participants.sort((a, b) => {
        if (a.isOnTrip === b.isOnTrip) {
          return a.user.displayName.localeCompare(b.user.displayName);
        }
        return a.isOnTrip ? -1 : 1;
      });

      const groupedAdditionalBookings = new Map<
        string,
        {
          id: string;
          transactionIds: number[];
          transactionEntries: { id: number; userId?: number | null }[];
          direction: 'income' | 'expense';
          amount: number;
          participantIds: Set<number>;
          hasGlobalBooking: boolean;
          description?: string;
        }
      >();

      additionalTransactions.forEach((tx) => {
        const key = `${tx.direction}|${tx.description || ''}`;
        const existing = groupedAdditionalBookings.get(key);

        if (existing) {
          existing.amount += tx.amount;
          existing.transactionIds.push(tx.id);
          existing.transactionEntries.push({ id: tx.id, userId: tx.userId });
          if (tx.userId) existing.participantIds.add(tx.userId);
          if (!tx.userId) existing.hasGlobalBooking = true;
          return;
        }

        groupedAdditionalBookings.set(key, {
          id: key,
          transactionIds: [tx.id],
          transactionEntries: [{ id: tx.id, userId: tx.userId }],
          direction: tx.direction,
          amount: tx.amount,
          participantIds: tx.userId ? new Set([tx.userId]) : new Set(),
          hasGlobalBooking: !tx.userId,
          description: tx.description,
        });
      });

      const additionalBookings = Array.from(
        groupedAdditionalBookings.values()
      ).map((booking) => {
        const participantCount = booking.hasGlobalBooking
          ? joinedCount
          : booking.participantIds.size;

        return {
          id: booking.id,
          transactionIds: booking.transactionIds,
          transactionEntries: booking.transactionEntries,
          direction: booking.direction,
          amount: roundMoney(booking.amount),
          participantCount,
          shareAmount:
            participantCount > 0
              ? roundMoney(booking.amount / participantCount)
              : 0,
          description: booking.description,
        };
      });

      setTrip({
        date: new Date(firstTx.occurredAt),
        description: getCleanTripDescription(firstTx.description),
        totalExpense,
        totalIncome,
        balance,
        baseTotal,
        baseDescription: `${getCleanTripDescription(firstTx.description)} (Anreise/Unterkunft)`,
        tripShare,
        additionalShare,
        seasonId: firstTx.seasonId,
        participants,
        additionalBookings,
      });
      setEditBaseAmount(roundMoney(baseTotal).toFixed(2));
      setSelectedParticipantIds(
        participants
          .filter((participant) => participant.isOnTrip)
          .map((participant) => participant.user.id)
      );
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
    const joinedParticipants = trip.participants.filter((p) => p.isOnTrip);
    if (joinedParticipants.length === 0) return;

    const participantShare = roundMoney(
      parsedAmount / joinedParticipants.length
    );

    try {
      setIsSaving(true);
      await Promise.all(
        joinedParticipants.map((participant) =>
          apiFinance.create({
            occurredAt: decodedTripId,
            direction,
            amount: participantShare,
            category: 'TRIP',
            description: bookingDescription,
            userId: participant.user.id,
            seasonId: trip.seasonId,
          })
        )
      );

      setAmount('');
      setDescription('');
      await fetchTripDetails();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartEditBooking = (
    booking: TripDetails['additionalBookings'][number]
  ) => {
    setEditingBookingId(booking.id);
    setEditDirection(booking.direction);
    setEditAmount(roundMoney(booking.amount).toFixed(2));
    setEditDescription(booking.description || '');
  };

  const handleCancelEditBooking = () => {
    setEditingBookingId(null);
    setEditAmount('');
    setEditDescription('');
    setEditDirection('expense');
  };

  const handleSaveEditBooking = async () => {
    if (!trip || !editingBookingId) return;

    const booking = trip.additionalBookings.find(
      (item) => item.id === editingBookingId
    );
    const parsedAmount = parseFloat(editAmount);

    if (!booking || Number.isNaN(parsedAmount) || parsedAmount <= 0) return;

    const splitAmount = roundMoney(
      parsedAmount / booking.transactionEntries.length
    );

    try {
      setIsSaving(true);
      await Promise.all(
        booking.transactionEntries.map((transaction) =>
          apiFinance.update(transaction.id, {
            occurredAt: decodedTripId,
            direction: editDirection,
            amount: splitAmount,
            category: 'TRIP',
            description: editDescription.trim() || undefined,
            userId: transaction.userId ?? null,
            seasonId: trip.seasonId,
          })
        )
      );

      handleCancelEditBooking();
      await fetchTripDetails();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleParticipant = (userId: number, checked: boolean) => {
    setSelectedParticipantIds((current) => {
      if (checked) {
        return current.includes(userId) ? current : [...current, userId];
      }

      return current.filter((id) => id !== userId);
    });
  };

  const handleStartEditTripSetup = () => {
    if (!trip) return;

    setEditBaseAmount(roundMoney(trip.baseTotal).toFixed(2));
    setSelectedParticipantIds(
      trip.participants
        .filter((participant) => participant.isOnTrip)
        .map((participant) => participant.user.id)
    );
    setIsEditingTripSetup(true);
  };

  const handleCancelEditTripSetup = () => {
    if (!trip) return;

    setEditBaseAmount(roundMoney(trip.baseTotal).toFixed(2));
    setSelectedParticipantIds(
      trip.participants
        .filter((participant) => participant.isOnTrip)
        .map((participant) => participant.user.id)
    );
    setIsEditingTripSetup(false);
  };

  const handleSaveTripSetup = async () => {
    if (!trip) return;

    const parsedBaseAmount = parseFloat(editBaseAmount);
    if (
      Number.isNaN(parsedBaseAmount) ||
      parsedBaseAmount <= 0 ||
      selectedParticipantIds.length === 0
    ) {
      return;
    }

    const selectedParticipants = trip.participants.filter((participant) =>
      selectedParticipantIds.includes(participant.user.id)
    );
    const baseShare = roundMoney(
      parsedBaseAmount / selectedParticipants.length
    );
    const requests: Promise<unknown>[] = [];

    trip.participants.forEach((participant) => {
      const isSelected = selectedParticipantIds.includes(participant.user.id);

      if (isSelected && participant.baseTransactionId) {
        requests.push(
          apiFinance.update(participant.baseTransactionId, {
            occurredAt: decodedTripId,
            direction: 'expense',
            amount: baseShare,
            category: 'TRIP',
            description: trip.baseDescription,
            userId: participant.user.id,
            seasonId: trip.seasonId,
          })
        );
      }

      if (isSelected && !participant.baseTransactionId) {
        requests.push(
          apiFinance.create({
            occurredAt: decodedTripId,
            direction: 'expense',
            amount: baseShare,
            category: 'TRIP',
            description: trip.baseDescription,
            userId: participant.user.id,
            seasonId: trip.seasonId,
          })
        );
      }

      if (!isSelected && participant.baseTransactionId) {
        requests.push(apiFinance.remove(participant.baseTransactionId));
      }
    });

    trip.additionalBookings.forEach((booking) => {
      booking.transactionEntries.forEach((transaction) => {
        requests.push(apiFinance.remove(transaction.id));
      });

      const bookingShare = roundMoney(
        booking.amount / selectedParticipants.length
      );

      selectedParticipants.forEach((participant) => {
        requests.push(
          apiFinance.create({
            occurredAt: decodedTripId,
            direction: booking.direction,
            amount: bookingShare,
            category: 'TRIP',
            description: booking.description,
            userId: participant.user.id,
            seasonId: trip.seasonId,
          })
        );
      });
    });

    try {
      setIsSaving(true);
      await Promise.all(requests);
      setIsEditingTripSetup(false);
      await fetchTripDetails();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTrip = async () => {
    if (!trip) return;

    try {
      setIsDeleting(true);
      await apiFinance.deleteTripsByDate(trip.date);
      enqueueSnackbar('Trip erfolgreich gelöscht.', { variant: 'success' });
      router.push('/finance/trips');
    } catch (err) {
      console.error(err);
      enqueueSnackbar('Fehler beim Löschen des Trips.', { variant: 'error' });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
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
          <Button
            variant="outlined"
            color="error"
            size="small"
            startIcon={<DeleteIcon />}
            onClick={() => setDeleteDialogOpen(true)}
            sx={{
              minWidth: { xs: 44, sm: 120 },
              px: { xs: 1, sm: 2 },
              flexShrink: 0,
              '& .MuiButton-startIcon': {
                mr: { xs: 0, sm: 1 },
              },
            }}
          >
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
              Löschen
            </Box>
          </Button>
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
          <Paper variant="outlined" sx={{ p: 2, flex: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Pro Kopf
            </Typography>
            <Typography variant="h5" fontWeight="bold">
              {formatCurrency(trip.tripShare + trip.additionalShare)}
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

        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Stack spacing={2}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              justifyContent="space-between"
              alignItems={{ xs: 'stretch', sm: 'center' }}
              spacing={2}
            >
              <Box>
                <Typography variant="h6">Grundkosten & Teilnehmer</Typography>
                <Typography variant="caption" color="text.secondary">
                  Grundkosten und Status werden beim Speichern neu aufgeteilt.
                </Typography>
              </Box>

              {isEditingTripSetup ? (
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<SaveIcon />}
                    onClick={handleSaveTripSetup}
                    disabled={
                      isSaving ||
                      parseFloat(editBaseAmount || '0') <= 0 ||
                      selectedParticipantIds.length === 0
                    }
                    sx={{
                      minWidth: { xs: 44, sm: 120 },
                      px: { xs: 1, sm: 2 },
                      '& .MuiButton-startIcon': {
                        mr: { xs: 0, sm: 1 },
                      },
                    }}
                  >
                    <Box
                      component="span"
                      sx={{ display: { xs: 'none', sm: 'inline' } }}
                    >
                      Speichern
                    </Box>
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<CloseIcon />}
                    onClick={handleCancelEditTripSetup}
                    disabled={isSaving}
                    sx={{
                      minWidth: { xs: 44, sm: 120 },
                      px: { xs: 1, sm: 2 },
                      '& .MuiButton-startIcon': {
                        mr: { xs: 0, sm: 1 },
                      },
                    }}
                  >
                    <Box
                      component="span"
                      sx={{ display: { xs: 'none', sm: 'inline' } }}
                    >
                      Abbrechen
                    </Box>
                  </Button>
                </Stack>
              ) : (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<EditIcon />}
                  onClick={handleStartEditTripSetup}
                  sx={{
                    minWidth: { xs: 44, sm: 120 },
                    px: { xs: 1, sm: 2 },
                    alignSelf: { xs: 'flex-end', sm: 'center' },
                    '& .MuiButton-startIcon': {
                      mr: { xs: 0, sm: 1 },
                    },
                  }}
                >
                  <Box
                    component="span"
                    sx={{ display: { xs: 'none', sm: 'inline' } }}
                  >
                    Bearbeiten
                  </Box>
                </Button>
              )}
            </Stack>

            {isEditingTripSetup ? (
              <TextField
                label="Grundkosten gesamt"
                type="number"
                value={editBaseAmount}
                onChange={(event) => setEditBaseAmount(event.target.value)}
                slotProps={{
                  htmlInput: {
                    step: '0.01',
                  },
                }}
                fullWidth
              />
            ) : (
              <Typography variant="body2">
                Grundkosten gesamt: <strong>{formatCurrency(trip.baseTotal)}</strong>
              </Typography>
            )}
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
                  <strong>Grundkosten</strong>
                </TableCell>
                <TableCell align="right">
                  <strong>Weitere Buchungen</strong>
                </TableCell>
                <TableCell align="right">
                  <strong>Gesamt</strong>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {trip.participants.map((participant) => (
                <TableRow
                  key={participant.user.id}
                  hover
                  sx={{
                    opacity: (
                      isEditingTripSetup
                        ? selectedParticipantIds.includes(participant.user.id)
                        : participant.isOnTrip
                    )
                      ? 1
                      : 0.55,
                  }}
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
                    {isEditingTripSetup ? (
                      <Checkbox
                        checked={selectedParticipantIds.includes(
                          participant.user.id
                        )}
                        onChange={(event) =>
                          handleToggleParticipant(
                            participant.user.id,
                            event.target.checked
                          )
                        }
                        size="small"
                      />
                    ) : participant.isOnTrip ? (
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
                      color: participant.isOnTrip
                        ? 'error.main'
                        : 'text.disabled',
                    }}
                  >
                    {participant.isOnTrip
                      ? formatCurrency(participant.tripAmount)
                      : '-'}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      color: !participant.isOnTrip
                        ? 'text.disabled'
                        : participant.additionalAmount > 0
                          ? 'error.main'
                          : participant.additionalAmount < 0
                            ? 'success.main'
                            : 'text.disabled',
                    }}
                  >
                    {participant.isOnTrip
                      ? formatCurrency(participant.additionalAmount)
                      : '-'}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      fontWeight: participant.isOnTrip ? 'bold' : 'normal',
                      color: !participant.isOnTrip
                        ? 'text.disabled'
                        : participant.amount > 0
                          ? 'error.main'
                          : participant.amount < 0
                            ? 'success.main'
                            : 'text.disabled',
                    }}
                  >
                    {participant.isOnTrip
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
                  alignItems={{ xs: 'stretch', sm: 'center' }}
                  spacing={1}
                >
                  {editingBookingId === booking.id ? (
                    <Stack
                      spacing={1.25}
                      sx={{
                        width: '100%',
                        p: { xs: 1, sm: 0 },
                        borderRadius: 1,
                        bgcolor: { xs: 'action.hover', sm: 'transparent' },
                      }}
                    >
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                        <TextField
                          select
                          size="small"
                          label="Typ"
                          value={editDirection}
                          onChange={(event) =>
                            setEditDirection(
                              event.target.value as 'expense' | 'income'
                            )
                          }
                          fullWidth
                          sx={{ flex: { sm: '0 0 140px' } }}
                        >
                          <MenuItem value="expense">Ausgabe</MenuItem>
                          <MenuItem value="income">Einnahme</MenuItem>
                        </TextField>
                        <TextField
                          size="small"
                          label="Betrag"
                          type="number"
                          value={editAmount}
                          onChange={(event) =>
                            setEditAmount(event.target.value)
                          }
                          slotProps={{
                            htmlInput: {
                              step: '0.01',
                            },
                          }}
                          fullWidth
                          sx={{ flex: { sm: '0 0 130px' } }}
                        />
                        <TextField
                          size="small"
                          label="Beschreibung"
                          value={editDescription}
                          onChange={(event) =>
                            setEditDescription(event.target.value)
                          }
                          fullWidth
                        />
                      </Stack>
                      <Stack
                        direction="row"
                        spacing={1}
                        justifyContent="flex-end"
                      >
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<SaveIcon />}
                          onClick={handleSaveEditBooking}
                          disabled={
                            isSaving || parseFloat(editAmount || '0') <= 0
                          }
                          sx={{
                            minWidth: { xs: 44, sm: 120 },
                            px: { xs: 1, sm: 2 },
                            '& .MuiButton-startIcon': {
                              mr: { xs: 0, sm: 1 },
                            },
                          }}
                        >
                          <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                            Speichern
                          </Box>
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<CloseIcon />}
                          onClick={handleCancelEditBooking}
                          disabled={isSaving}
                          sx={{
                            minWidth: { xs: 44, sm: 120 },
                            px: { xs: 1, sm: 2 },
                            '& .MuiButton-startIcon': {
                              mr: { xs: 0, sm: 1 },
                            },
                          }}
                        >
                          <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                            Abbrechen
                          </Box>
                        </Button>
                      </Stack>
                    </Stack>
                  ) : (
                    <>
                      <Box>
                        <Chip
                          label={
                            booking.direction === 'expense'
                              ? 'Ausgabe'
                              : 'Einnahme'
                          }
                          color={
                            booking.direction === 'expense'
                              ? 'error'
                              : 'success'
                          }
                          variant="outlined"
                          size="small"
                          sx={{ mr: 1 }}
                        />
                        <Typography component="span" variant="body2">
                          {booking.description || '-'}
                        </Typography>
                      </Box>
                      <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="flex-end"
                        spacing={1}
                      >
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
                          <Typography
                            component="span"
                            variant="caption"
                            color="text.secondary"
                            sx={{ ml: 1 }}
                          >
                            ({booking.participantCount} Pers. x{' '}
                            {formatCurrency(booking.shareAmount)})
                          </Typography>
                        </Typography>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<EditIcon />}
                          onClick={() => handleStartEditBooking(booking)}
                          sx={{
                            minWidth: { xs: 44, sm: 120 },
                            px: { xs: 1, sm: 2 },
                            flexShrink: 0,
                            '& .MuiButton-startIcon': {
                              mr: { xs: 0, sm: 1 },
                            },
                          }}
                        >
                          <Box
                            component="span"
                            sx={{ display: { xs: 'none', sm: 'inline' } }}
                          >
                            Bearbeiten
                          </Box>
                        </Button>
                      </Stack>
                    </>
                  )}
                </Stack>
              ))}
            </Stack>
          </Paper>
        )}

        <Dialog
          open={deleteDialogOpen}
          onClose={() => !isDeleting && setDeleteDialogOpen(false)}
        >
          <DialogTitle>Trip löschen</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Willst du den Trip &quot;{trip.description}&quot; wirklich löschen?
              Alle Buchungen dieses Trips werden entfernt.
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
              onClick={handleDeleteTrip}
              color="error"
              variant="contained"
              disabled={isDeleting}
              startIcon={
                isDeleting ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <DeleteIcon />
                )
              }
            >
              Löschen
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
}
