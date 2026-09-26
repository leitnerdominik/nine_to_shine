'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import Grid2 from '@mui/material/Grid2';
import AddIcon from '@mui/icons-material/Add';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import { useRouter } from 'next/navigation';

import Layout from '@/components/Layout';
import TripCard from '@/components/TripCard';
import { apiTrips } from '@/definitions/commands';
import type { TripSummaryDto } from '@/definitions/types';
import { toErrorMessage } from '@/definitions/api';

const tripsPath = '/finance/trips';

function MountainIllustration() {
  return (
    <Box
      aria-hidden="true"
      sx={{
        position: 'absolute',
        right: { xs: -24, sm: 8, md: 20 },
        bottom: 0,
        width: { xs: '62%', sm: '52%', md: '43%' },
        height: { xs: 150, md: 180 },
        opacity: 0.96,
        pointerEvents: 'none',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: { xs: 13, md: 4 },
          right: { xs: 34, md: 84 },
          width: { xs: 38, md: 46 },
          height: { xs: 38, md: 46 },
          borderRadius: '50%',
          background: 'linear-gradient(145deg, #FFDCA7 0%, #FFC16F 100%)',
          boxShadow: '0 10px 24px rgba(255, 176, 79, 0.2)',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          right: '13%',
          bottom: 15,
          width: '54%',
          height: '72%',
          clipPath: 'polygon(50% 0, 100% 100%, 0 100%)',
          background: 'linear-gradient(145deg, #3DA5FF 0%, #087FF5 100%)',
          filter: 'drop-shadow(0 12px 12px rgba(4, 126, 245, 0.18))',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          bottom: 15,
          width: '42%',
          height: '48%',
          clipPath: 'polygon(50% 0, 100% 100%, 0 100%)',
          background: 'linear-gradient(145deg, #79BFFF 0%, #3A93EE 100%)',
          opacity: 0.82,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          right: -12,
          bottom: 15,
          width: '38%',
          height: '45%',
          clipPath: 'polygon(50% 0, 100% 100%, 0 100%)',
          background: 'linear-gradient(145deg, #72B9FC 0%, #4398EB 100%)',
          opacity: 0.72,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          right: -20,
          bottom: 0,
          left: -36,
          height: 26,
          bgcolor: 'rgba(126, 190, 247, 0.2)',
          borderRadius: '50% 50% 0 0',
          transform: 'skewX(-18deg)',
        }}
      />
    </Box>
  );
}

function TripsHero({ onAdd }: { onAdd: () => void }) {
  return (
    <Box
      component="header"
      sx={{
        position: 'relative',
        minHeight: { xs: 330, sm: 300, md: 280 },
        overflow: 'hidden',
        borderRadius: { xs: '22px', md: '20px' },
        background:
          'linear-gradient(125deg, #E6F3FF 0%, #D7ECFF 52%, #F2F8FF 100%)',
        boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.72)',
      }}
    >
      <Box
        aria-hidden="true"
        sx={{
          position: 'absolute',
          top: '-75%',
          left: '-4%',
          width: { xs: 420, md: 780 },
          height: { xs: 420, md: 620 },
          borderRadius: '50%',
          bgcolor: 'rgba(255, 255, 255, 0.28)',
        }}
      />
      <MountainIllustration />

      <Stack
        direction="row"
        alignItems="center"
        spacing={{ xs: 2, md: 3.5 }}
        sx={{
          position: 'relative',
          zIndex: 1,
          pt: { xs: 4, md: 7.5 },
          px: { xs: 3, sm: 4, md: 5 },
        }}
      >
        <Box
          aria-hidden="true"
          sx={{
            width: { xs: 84, md: 104 },
            height: { xs: 84, md: 104 },
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
            borderRadius: { xs: '20px', md: '24px' },
            color: '#FF7417',
            background: 'linear-gradient(145deg, #FFF8ED 0%, #FFF0E3 100%)',
            boxShadow: '0 12px 28px rgba(255, 140, 48, 0.1)',
          }}
        >
          <FlightTakeoffIcon sx={{ fontSize: { xs: 48, md: 58 } }} />
        </Box>
        <Typography
          component="h1"
          sx={{
            fontSize: { xs: '2.5rem', sm: '3.25rem', md: '3.9rem' },
            fontWeight: 800,
            letterSpacing: '-0.045em',
            lineHeight: 1,
          }}
        >
          Urlaube
        </Typography>
      </Stack>

      <Button
        variant="contained"
        size="large"
        startIcon={<AddIcon />}
        onClick={onAdd}
        sx={{
          position: 'absolute',
          zIndex: 2,
          left: { xs: 28, md: 'auto' },
          right: { xs: 28, md: 36 },
          top: { xs: 'auto', md: 36 },
          bottom: { xs: 28, md: 'auto' },
          minHeight: 58,
          px: { xs: 3, md: 3.5 },
          borderRadius: '14px',
          fontSize: { xs: '1.05rem', md: '1rem' },
          fontWeight: 700,
          textTransform: 'none',
          boxShadow: '0 10px 22px rgba(4, 126, 245, 0.25)',
          background: 'linear-gradient(135deg, #087FF5 0%, #0496FF 100%)',
          '&:hover': {
            boxShadow: '0 13px 28px rgba(4, 126, 245, 0.32)',
          },
        }}
      >
        Urlaub hinzufügen
      </Button>
    </Box>
  );
}

function TripsSkeleton() {
  return (
    <Layout>
      <Box
        role="status"
        aria-busy="true"
        aria-label="Urlaubsreisen werden geladen"
        sx={{
          width: '100%',
          maxWidth: 1200,
          mx: 'auto',
          pb: { xs: 3, md: 5 },
        }}
      >
        <Skeleton
          variant="rounded"
          sx={{ height: { xs: 330, sm: 300, md: 280 }, borderRadius: '20px' }}
        />
        <Grid2 container spacing={{ xs: 2, md: 2.5 }} sx={{ mt: 0.5 }}>
          {[0, 1, 2].map((item) => (
            <Grid2 key={item} size={{ xs: 12, md: 4 }}>
              <Skeleton
                variant="rounded"
                height={270}
                sx={{ borderRadius: '20px' }}
              />
            </Grid2>
          ))}
        </Grid2>
      </Box>
    </Layout>
  );
}

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

  if (loading) return <TripsSkeleton />;

  return (
    <Layout>
      <Box
        sx={{
          width: '100%',
          maxWidth: 1200,
          mx: 'auto',
          pb: { xs: 3, md: 5 },
        }}
      >
        <Box
          sx={{
            p: { xs: 0, md: 1 },
            border: { md: 1 },
            borderColor: { md: 'divider' },
            borderRadius: { md: '24px' },
            bgcolor: { md: 'rgba(255, 255, 255, 0.5)' },
          }}
        >
          <TripsHero onAdd={() => router.push(`${tripsPath}/create-trip`)} />

          {error ? (
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
              sx={{ mt: { xs: 2.5, md: 2 }, borderRadius: '16px' }}
            >
              {error}
            </Alert>
          ) : trips.length === 0 ? (
            <Paper
              elevation={0}
              sx={{
                mt: { xs: 2.5, md: 2 },
                p: { xs: 4, md: 5 },
                textAlign: 'center',
                color: 'text.secondary',
                border: 1,
                borderColor: 'divider',
                borderRadius: '20px',
              }}
            >
              Keine Urlaubsreisen gefunden.
            </Paper>
          ) : (
            <Grid2
              component="section"
              aria-label="Urlaubsreisen"
              container
              spacing={{ xs: 2, md: 2.5 }}
              sx={{ mt: 1.5 }}
            >
              {trips.map((trip) => (
                <Grid2 key={trip.id} size={{ xs: 12, md: 4 }}>
                  <TripCard
                    date={new Date(trip.occurredAt)}
                    description={trip.name}
                    totalAmount={trip.totalAmount}
                    onClick={() => router.push(`${tripsPath}/${trip.id}`)}
                  />
                </Grid2>
              ))}
            </Grid2>
          )}
        </Box>
      </Box>
    </Layout>
  );
}
