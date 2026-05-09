'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Chip,
  Stack,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import DeleteIcon from '@mui/icons-material/Delete';
import dayjs from 'dayjs';

import Layout from '@/components/Layout';
import CustomTitle from '@/components/CustomTitle';
import { apiFinance, apiUsers } from '@/definitions/commands';
import type { FinanceDto, UserDto } from '@/definitions/types';
import AddIcon from '@mui/icons-material/Add';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/common/misc';
import { useSnackbar } from 'notistack';
import LoadingSkeleton from '@/components/LoadingSkeleton';

// Helper Formatierung
// const formatCurrency = (amount: number) =>
//   new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(
//     amount
//   );

// Typ für einen gruppierten Trip
interface TripGroup {
  id: string; // Datum als ID
  date: Date;
  description: string;
  activityName?: string;
  totalAmount: number;
  participants: TripParticipant[];
}

interface TripParticipant {
  user: UserDto;
  isOnTrip: boolean;
  isDoingActivity: boolean;
  amount: number;
}

export default function TripHistoryPage() {
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState<TripGroup[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tripToDelete, setTripToDelete] = useState<TripGroup | null>(null);

  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    (async () => {
      try {
        // 1. Daten laden
        const [users, transactions] = await Promise.all([
          apiUsers.getAll(),
          apiFinance.getAll(), // Holt alle Finanzen
        ]);

        // 2. Filtern auf TRIP Kategorie
        const tripTransactions = transactions.filter(
          (t) => t.category === 'TRIP'
        );

        // 3. Gruppieren nach Datum (OccurredAt)
        // Wir nehmen an, dass ein Trip an einem Datum stattfindet (oder zumindest so gebucht wurde)
        const groups: Record<string, FinanceDto[]> = {};

        tripTransactions.forEach((tx) => {
          // Wir nutzen den Zeitstempel als Schlüssel
          const key = tx.occurredAt;
          if (!groups[key]) groups[key] = [];
          groups[key].push(tx);
        });

        // 4. Trip-Objekte erstellen
        const processedTrips: TripGroup[] = Object.keys(groups).map((key) => {
          const txList = groups[key];
          const firstTx = txList[0];
          const date = new Date(firstTx.occurredAt);

          // Name extrahieren: "Mallorca (Anreise/Unterkunft)" -> "Mallorca"
          // Wir entfernen typische Suffixe, um den Basisnamen zu bekommen
          let cleanName = firstTx.description || 'Unbenannter Trip';
          cleanName = cleanName
            .replace(/\s?\((Anreise\/Unterkunft|Aktivität)\)/g, '')
            .replace(/\s?\(Aktivität.*?\)/g, '')
            .trim();

          // Versuchen, den Namen der Aktivität zu extrahieren
          let activityName: string | undefined = undefined;
          const activityTx = txList.find((t) =>
            t.description?.includes('Aktivität:')
          );
          if (activityTx && activityTx.description) {
            const match = activityTx.description.match(/Aktivität:\s*(.*?)\)/);
            if (match && match[1]) {
              activityName = match[1];
            }
          }

          const totalAmount = txList.reduce((sum, t) => sum + t.amount, 0);

          // Teilnehmer mappen
          const participants: TripParticipant[] = users.map((user) => {
            // Finde Buchungen für diesen User in diesem Trip
            const userTxs = txList.filter((t) => t.userId === user.id);

            // Checken was gebucht wurde anhand der Beschreibungen oder Vorhandensein
            // In unserer Logik von vorher:
            // "Anreise" Buchung vorhanden? -> isOnTrip
            // "Aktivität" Buchung vorhanden? -> isDoingActivity

            const isOnTrip = userTxs.some((t) =>
              t.description?.includes('Anreise')
            );
            const isDoingActivity = userTxs.some((t) =>
              t.description?.includes('Aktivität')
            );
            const userTotal = userTxs.reduce((sum, t) => sum + t.amount, 0);

            // Fallback: Falls Beschreibungen manuell geändert wurden, prüfen wir einfach ob Kosten da sind
            // Wenn Kosten > 0, war er wohl dabei.
            const effectivelyOnTrip = isOnTrip || userTotal > 0;

            return {
              user,
              isOnTrip: effectivelyOnTrip,
              isDoingActivity: isDoingActivity,
              amount: userTotal,
            };
          });

          // Sortieren: Wer dabei war nach oben
          participants.sort((a, b) => {
            if (a.isOnTrip === b.isOnTrip) return 0;
            return a.isOnTrip ? -1 : 1;
          });

          return {
            id: key,
            date,
            description: cleanName,
            activityName,
            totalAmount,
            participants,
          };
        });

        // Sortieren nach Datum (neueste zuerst)
        processedTrips.sort((a, b) => b.date.getTime() - a.date.getTime());

        setTrips(processedTrips);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleDeleteClick = (trip: TripGroup) => {
    setTripToDelete(trip);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!tripToDelete) return;

    try {
      await apiFinance.deleteTripsByDate(tripToDelete.date);
      setTrips((prev) => prev.filter((t) => t.id !== tripToDelete.id));
      enqueueSnackbar('Urlaub erfolgreich gelöscht', { variant: 'success' });
    } catch (error) {
      console.error('Failed to delete trip:', error);
      enqueueSnackbar('Fehler beim Löschen des Urlaubs', { variant: 'error' });
    } finally {
      setDeleteDialogOpen(false);
      setTripToDelete(null);
    }
  };

  if (loading) {
    return (
      <Layout>
        <LoadingSkeleton />
      </Layout>
    );
  }

  return (
    <Layout>
      <Box
        sx={{
          maxWidth: 1000,
          mx: 'auto',
          p: 3,
          position: 'relative',
          minHeight: '80vh',
        }}
      >
        <CustomTitle text="Urlaube" />

        <Stack spacing={2} sx={{ mt: 2, pb: 10 }}>
          {trips.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
              Keine Urlaubsreisen gefunden.
            </Paper>
          ) : (
            trips.map((trip) => (
              <Accordion
                key={trip.id}
                variant="outlined"
                sx={{ bgcolor: '#fff' }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box
                    sx={{
                      display: 'flex',
                      width: '100%',
                      justifyContent: 'space-between',
                      pr: 2,
                      flexDirection: { xs: 'column', sm: 'row' },
                      alignItems: { xs: 'flex-start', sm: 'center' },
                      gap: 1,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <FlightTakeoffIcon color="warning" />
                      <Box>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {trip.description}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {dayjs(trip.date).format('DD.MM.YYYY')}
                        </Typography>
                      </Box>
                    </Box>

                    <Chip
                      label={`Gesamt: ${formatCurrency(trip.totalAmount)}`}
                      variant="outlined"
                      color="default"
                      size="small"
                    />
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0 }}>
                  <TableContainer>
                    <Table size="small">
                      <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                        <TableRow>
                          <TableCell>Mitglied</TableCell>
                          <TableCell align="center">Dabei?</TableCell>
                          <TableCell align="center">
                            {trip.activityName
                              ? trip.activityName
                              : 'Aktivität?'}
                          </TableCell>
                          <TableCell align="right">Kostenanteil</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {trip.participants.map((p) => (
                          <TableRow
                            key={p.user.id}
                            sx={{
                              opacity: p.isOnTrip ? 1 : 0.4,
                              '&:last-child td, &:last-child th': { border: 0 },
                            }}
                          >
                            <TableCell component="th" scope="row">
                              {p.user.displayName}
                            </TableCell>
                            <TableCell align="center">
                              <Checkbox
                                checked={p.isOnTrip}
                                disabled
                                size="small"
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Checkbox
                                checked={p.isDoingActivity}
                                disabled
                                size="small"
                              />
                            </TableCell>
                            <TableCell
                              align="right"
                              sx={{
                                fontWeight: p.amount > 0 ? 'bold' : 'normal',
                              }}
                            >
                              {p.amount > 0 ? formatCurrency(p.amount) : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={() => handleDeleteClick(trip)}
                    >
                      Urlaub löschen
                    </Button>
                  </Box>
                </AccordionDetails>
              </Accordion>
            ))
          )}
        </Stack>
        <Fab
          color="primary"
          aria-label="add"
          onClick={() => router.push('/finance/trips/create-trip')}
          sx={{
            position: 'fixed',
            bottom: 32,
            right: 32,
          }}
        >
          <AddIcon />
        </Fab>

        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
        >
          <DialogTitle>Urlaub löschen</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Willst du den Urlaub &quot;
              {tripToDelete?.description}&quot; wirklich löschen?
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={handleConfirmDelete} color="error" autoFocus>
              Löschen
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
}
