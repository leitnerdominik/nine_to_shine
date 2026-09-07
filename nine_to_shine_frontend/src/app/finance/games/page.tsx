'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  Typography,
  Stack,
  Chip,
  Paper,
} from '@mui/material';
import Grid2 from '@mui/material/Grid2';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import Link from 'next/link';
import dayjs from 'dayjs';

import Layout from '@/components/Layout';
import CustomTitle from '@/components/CustomTitle';
import { apiGame } from '@/definitions/commands';
import type { GameDto } from '@/definitions/types';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { toErrorMessage } from '@/definitions/api';

export default function GamesListPage() {
  const [loading, setLoading] = useState(true);
  const [games, setGames] = useState<GameDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await apiGame.getGamesWithBookings();
      setGames(data);
    } catch (err) {
      setError(`Spiele konnten nicht geladen werden. ${toErrorMessage(err)}`);
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
          <CustomTitle text="Spiele Übersicht" />
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
      <Box sx={{ maxWidth: 1000, mx: 'auto', p: 3 }}>
        <CustomTitle text="Spiele Übersicht" />
        {games.length === 0 ? (
          <Paper
            variant="outlined"
            sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}
          >
            Keine Spiele mit Buchungen gefunden.
          </Paper>
        ) : (
          <Grid2 container spacing={2}>
            {games.map((game) => (
              <Grid2 key={game.id} size={{ xs: 12, sm: 6 }}>
                <Card elevation={2} sx={{ borderRadius: 2 }}>
                  <CardActionArea
                    LinkComponent={Link}
                    href={`/finance/games/${game.id}`}
                    sx={{ p: 2 }}
                  >
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Box
                        sx={{
                          p: 1.5,
                          borderRadius: '50%',
                          bgcolor: 'primary.light',
                          color: 'primary.contrastText',
                          display: 'flex',
                        }}
                      >
                        <SportsSoccerIcon />
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                          {game.gameName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {game.playedAt
                            ? dayjs(game.playedAt).format('DD.MM.YYYY')
                            : 'Kein Datum'}
                        </Typography>
                      </Box>
                      <Chip
                        label="Details"
                        size="small"
                        variant="outlined"
                        clickable
                      />
                    </Stack>
                  </CardActionArea>
                </Card>
              </Grid2>
            ))}
          </Grid2>
        )}
      </Box>
    </Layout>
  );
}
