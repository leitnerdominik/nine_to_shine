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
  Divider,
  CircularProgress,
  MenuItem,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import { useRouter } from 'next/navigation';
import { useSnackbar } from 'notistack';

import Layout from '@/components/Layout';
import CustomTitle from '@/components/CustomTitle';
import { apiFinance, apiSeason, apiGame } from '@/definitions/commands';
import type {
  CreateFinanceRequest,
  SeasonDto,
  GameDto,
} from '@/definitions/types';

import { schema, FormInput } from '../../../schema/expense';
import ExpenseRow from '../../../components/ExpenseRow';
import LoadingSkeleton from '@/components/LoadingSkeleton';

type FormOutput = FormInput;

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
    const promises: Promise<CreateFinanceRequest>[] = [];

    const category = data.gameId ? 'EVENT' : 'OTHER';

    for (const item of data.items) {
      const amount = parseFloat(item.amount);

      promises.push(
        apiFinance.create({
          occurredAt: new Date(data.globalDate).toISOString(),
          direction: 'expense',
          amount: amount,
          category: category,
          description: item.description,
          userId: null,
          seasonId: data.seasonId,
          gameId: data.gameId || undefined,
        })
      );
    }

    try {
      await Promise.all(promises);

      enqueueSnackbar(`${promises.length} Ausgaben erfolgreich gebucht!`, {
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
        sx={{ maxWidth: 800, mx: 'auto', p: 3 }}
      >
        <CustomTitle text="Vereinsausgaben erfassen" />

        {/* --- OBERER BEREICH: KONTEXT --- */}
        <Paper variant="outlined" sx={{ p: 2, mb: 4, mt: 2 }}>
          <Stack spacing={3}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
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
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack mb={2}>
            <Typography variant="h6">Ausgaben</Typography>
          </Stack>

          <Stack spacing={2} divider={<Divider />}>
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

          <Stack mb={2} mt={2}>
            <Divider />
            <Button
              startIcon={<AddIcon />}
              variant="outlined"
              onClick={() => append({ amount: '', description: '' })}
              size="small"
            >
              Ausgabe hinzufügen
            </Button>
          </Stack>
          {/* Summe */}
          <Box
            sx={{
              mt: 3,
              display: 'flex',
              justifyContent: 'flex-end',
              borderTop: '1px dashed #ccc',
              pt: 2,
            }}
          >
            <Typography variant="h6">
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
          direction="row"
          spacing={2}
          justifyContent="flex-end"
          sx={{ mt: 3 }}
        >
          <Button
            type="submit"
            variant="contained"
            color="error" // Rot für Ausgaben
            size="large"
            disabled={isSubmitting}
            startIcon={
              isSubmitting ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <SaveIcon />
              )
            }
            sx={{ px: 4 }}
          >
            {isSubmitting ? 'Speichere...' : 'Ausgaben Speichern'}
          </Button>
        </Stack>
      </Box>
    </Layout>
  );
}
