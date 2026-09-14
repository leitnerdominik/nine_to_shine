'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, Fab, Paper, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useRouter } from 'next/navigation';

import Layout from '@/components/Layout';
import PageTitle from '@/components/PageTitle';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import TripCard from '@/components/TripCard';
import { apiTrips } from '@/definitions/commands';
import type { TripSummaryDto } from '@/definitions/types';
import { toErrorMessage } from '@/definitions/api';

export default function TripHistoryPage() {
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState<TripSummaryDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setTrips(await apiTrips.getAll());
    } catch (err) {
      setError(
        `Urlaubsreisen konnten nicht geladen werden. ${toErrorMessage(err)}`
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <Layout>
        <LoadingSkeleton />
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <Box sx={{ maxWidth: 1000, mx: 'auto', p: 3 }}>
          <Box component="header" sx={{ mb: { xs: 3, md: 4 } }}>
            <PageTitle title="Urlaube" />
          </Box>
          <Alert
            severity="error"
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
            {error}
          </Alert>
        </Box>
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
        <Box component="header" sx={{ mb: { xs: 3, md: 4 } }}>
          <PageTitle title="Urlaube" />
        </Box>

        <Stack spacing={2} sx={{ pb: 10 }}>
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
