'use client';

import { useEffect, useState } from 'react';
import { Box, Fab, Paper, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useRouter } from 'next/navigation';

import Layout from '@/components/Layout';
import CustomTitle from '@/components/CustomTitle';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import TripCard from '@/components/TripCard';
import { apiTrips } from '@/definitions/commands';
import type { TripSummaryDto } from '@/definitions/types';

export default function TripHistoryPage() {
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState<TripSummaryDto[]>([]);

  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        setTrips(await apiTrips.getAll());
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
                date={new Date(trip.occurredAt)}
                description={trip.name}
                totalAmount={trip.totalAmount}
                onClick={() => router.push(`/finance/trips/${trip.id}`)}
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
