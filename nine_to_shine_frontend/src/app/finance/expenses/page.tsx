'use client';

import { useEffect, useState, useMemo } from 'react';
import { useForm, useFieldArray, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box,
  Stack,
  TextField,
  Button,
  Typography,
  Paper,
  CircularProgress,
  MenuItem,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import { useRouter } from 'next/navigation';
import { useSnackbar } from 'notistack';

import Layout from '@/components/Layout';
import PageTitle from '@/components/PageTitle';
import { apiFinance, apiSeason, apiGame } from '@/definitions/commands';
import type {
  CreateExpenseBatchRequest,
  SeasonDto,
  GameDto,
} from '@/definitions/types';

import { schema, FormInput } from '../../../schema/expense';
import ExpenseRow from '../../../components/ExpenseRow';
import LoadingSkeleton from '@/components/LoadingSkeleton';

type FormOutput = FormInput;

const sectionSx = {
  p: { xs: 2, sm: 3 },
  border: 1,
  borderColor: 'divider',
  borderRadius: '16px',
  bgcolor: 'background.paper',
  boxShadow: '0 10px 30px rgba(7, 17, 47, 0.05)',
};

export default function ExpensesPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [seasons, setSeasons] = useState<SeasonDto[]>([]);
  const [games, setGames] = useState<GameDto[]>([]);

  const router = useRouter();

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: {
      globalDate: new Date().toISOString().slice(0, 10),
      seasonId: undefined as unknown as number,
      gameId: undefined,
      items: [{ amount: '', description: '' }],
    },
    mode: 'onBlur',
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  // Beobachten für Filter & Summenberechnung
  const selectedSeasonId = useWatch({ control, name: 'seasonId' });
  const watchedItems = useWatch({ control, name: 'items' });

  // Games filtern
  const availableGames = useMemo(() => {
    if (!selectedSeasonId) return [];
    return games.filter((g) => g.seasonId === selectedSeasonId);
  }, [games, selectedSeasonId]);

  // Gesamtsumme berechnen (für UI Feedback)
  const totalAmount = useMemo(() => {
    return watchedItems.reduce((sum, item) => {
      const val = parseFloat(item.amount || '0');
      return sum + (Number.isNaN(val) ? 0 : val);
    }, 0);
  }, [watchedItems]);

  // --- Initial Data Load ---
  useEffect(() => {
    (async () => {
      try {
        const [fetchedSeasons, fetchedGames] = await Promise.all([
          apiSeason.getAll(),
          apiGame.getAll(),
        ]);

        setSeasons(fetchedSeasons);
        setGames(fetchedGames);

        const highestSeason =
          fetchedSeasons.length > 0
            ? fetchedSeasons.reduce((prev, current) =>
                prev.seasonNumber > current.seasonNumber ? prev : current
              )
            : null;

        reset({
          globalDate: new Date().toISOString().slice(0, 10),
          seasonId: highestSeason?.id,
          gameId: undefined,
          items: [{ amount: '', description: '' }],
        });
      } catch {
        enqueueSnackbar('Daten konnten nicht geladen werden.', {
          variant: 'error',
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [reset, enqueueSnackbar]);

  // --- Handlers ---
  const handleGameChange = (
    newGameId: number | undefined,
    fieldOnChange: (value: number | undefined) => void
  ) => {
    fieldOnChange(newGameId);

    if (newGameId) {
      const selectedGame = games.find((g) => g.id === newGameId);
      if (selectedGame && selectedGame.playedAt) {
        const dateStr = new Date(selectedGame.playedAt)
          .toISOString()
          .slice(0, 10);
        setValue('globalDate', dateStr);
      }
    }
  };

  // --- Submit ---
  const onSubmit = async (data: FormOutput) => {
    const body: CreateExpenseBatchRequest = {
      occurredAt: new Date(data.globalDate).toISOString(),
      seasonId: data.seasonId,
      gameId: data.gameId || undefined,
      items: data.items.map((item) => ({
        amount: parseFloat(item.amount),
        description: item.description,
      })),
    };

    try {
      await apiFinance.createExpenseBatch(body);

      enqueueSnackbar(`${body.items.length} Ausgaben erfolgreich gebucht!`, {
        variant: 'success',
      });

      router.push('/finance');
    } catch (err) {
      if (err instanceof Error) {
        enqueueSnackbar(err.message || 'Fehler beim Speichern.', {
          variant: 'error',
        });
      }
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
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        sx={{ maxWidth: 920, mx: 'auto' }}
      >
        <Box sx={{ mb: { xs: 2.5, sm: 3.5 } }}>
          <PageTitle title="Vereinsausgaben erfassen" />
        </Box>

        {/* --- OBERER BEREICH: KONTEXT --- */}
        <Paper elevation={0} sx={{ ...sectionSx, mb: 2.5 }}>
          <Stack spacing={2.5}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5}>
              <TextField
                fullWidth
                label="Datum"
                type="date"
                {...register('globalDate')}
                slotProps={{ inputLabel: { shrink: true } }}
                error={!!errors.globalDate}
                helperText={errors.globalDate?.message}
              />

              <Controller
                name="seasonId"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="Saison"
                    fullWidth
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    error={!!errors.seasonId}
                    helperText={errors.seasonId?.message}
                  >
                    {seasons.map((s) => (
                      <MenuItem key={s.id} value={s.id}>
                        Saison {s.seasonNumber}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Stack>

            <Controller
              name="gameId"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Spiel (Optional)"
                  fullWidth
                  value={field.value ?? ''}
                  onChange={(e) => {
                    const newGameId = Number(e.target.value) || undefined;
                    handleGameChange(newGameId, field.onChange);
                  }}
                  disabled={!selectedSeasonId || availableGames.length === 0}
                >
                  <MenuItem value="">
                    <em>Allgemeine Ausgabe (Kein Spiel)</em>
                  </MenuItem>
                  {availableGames.map((g) => (
                    <MenuItem key={g.id} value={g.id}>
                      {g.gameName}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          </Stack>
        </Paper>

        {/* --- LISTE DER AUSGABEN --- */}
        <Paper elevation={0} sx={sectionSx}>
          <Stack mb={2.25}>
            <Typography variant="h5" fontWeight={800}>
              Ausgaben
            </Typography>
          </Stack>

          <Stack spacing={1.5}>
            {fields.map((field, index) => (
              <ExpenseRow
                key={field.id}
                index={index}
                register={register}
                errors={errors}
                onRemove={() => remove(index)}
                canRemove={fields.length > 1}
              />
            ))}
          </Stack>

          <Box sx={{ mt: 1.5 }}>
            <Button
              startIcon={<AddIcon />}
              variant="outlined"
              onClick={() => append({ amount: '', description: '' })}
              fullWidth
              sx={{
                minHeight: 48,
                borderRadius: '8px',
                fontWeight: 700,
              }}
            >
              Ausgabe hinzufügen
            </Button>
          </Box>
          {/* Summe */}
          <Box
            sx={{
              mt: 3.5,
              display: 'flex',
              justifyContent: 'flex-end',
              borderTop: '1px dashed',
              borderColor: 'divider',
              pt: 2.5,
            }}
          >
            <Typography variant="h6" fontWeight={800}>
              Gesamt:{' '}
              {new Intl.NumberFormat('de-DE', {
                style: 'currency',
                currency: 'EUR',
              }).format(totalAmount)}
            </Typography>
          </Box>
        </Paper>

        {/* --- ACTION BUTTONS --- */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          justifyContent="flex-end"
          sx={{ mt: 3 }}
        >
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={isSubmitting}
            startIcon={
              isSubmitting ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <SaveIcon />
              )
            }
            sx={{
              px: 4,
              minHeight: 52,
              borderRadius: '10px',
              fontWeight: 700,
              boxShadow: '0 8px 20px rgba(4, 150, 255, 0.25)',
            }}
          >
            {isSubmitting ? 'Speichere...' : 'Ausgaben Speichern'}
          </Button>
        </Stack>
      </Box>
    </Layout>
  );
}
