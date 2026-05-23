'use client';

import { useEffect, useState } from 'react';
import { Box, Fab, Paper, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useRouter } from 'next/navigation';

import Layout from '@/components/Layout';
import CustomTitle from '@/components/CustomTitle';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import TripCard from '@/components/TripCard';
import { apiFinance } from '@/definitions/commands';
import type { FinanceDto } from '@/definitions/types';

interface TripGroup {
  id: string;
  date: Date;
  description: string;
  totalAmount: number;
}

export default function TripHistoryPage() {
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState<TripGroup[]>([]);

  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const transactions = await apiFinance.getAll();

        const tripTransactions = transactions.filter(
          (t) => t.category === 'TRIP'
        );

        const groups: Record<string, FinanceDto[]> = {};

        tripTransactions.forEach((tx) => {
          const key = tx.occurredAt;
          if (!groups[key]) groups[key] = [];
          groups[key].push(tx);
        });

        const processedTrips: TripGroup[] = Object.keys(groups).map((key) => {
          const txList = groups[key];
          const firstTx = txList[0];
          const date = new Date(firstTx.occurredAt);

          const description = (firstTx.description || 'Unbenannter Trip')
            .replace(/\s?\((Anreise\/Unterkunft|Aktivität)\)/g, '')
            .replace(/\s?\(Aktivität.*?\)/g, '')
            .replace(/\s?\((Ausgabe|Einnahme).*?\)/g, '')
            .trim();

          return {
            id: key,
            date,
            description,
            totalAmount: txList.reduce(
              (sum, t) =>
                sum + (t.direction === 'expense' ? t.amount : -t.amount),
              0
            ),
          };
        });

        processedTrips.sort((a, b) => b.date.getTime() - a.date.getTime());
        setTrips(processedTrips);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
              <TripCard
                key={trip.id}
                date={trip.date}
                description={trip.description}
                totalAmount={trip.totalAmount}
                onClick={() =>
                  router.push(`/finance/trips/${encodeURIComponent(trip.id)}`)
                }
              />
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
      </Box>
    </Layout>
  );
}
