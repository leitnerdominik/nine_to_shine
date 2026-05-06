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
  InputAdornment,
  MenuItem,
} from '@mui/material';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import { useSnackbar } from 'notistack';
import { useRouter } from 'next/navigation';

import Layout from '@/components/Layout';
import CustomTitle from '@/components/CustomTitle';
import { apiFinance, apiUsers, apiSeason } from '@/definitions/commands';
import type {
  CreateFinanceRequest,
  UserDto,
  SeasonDto,
} from '@/definitions/types';

// Importieren der ausgelagerten Teile
import {
  schema,
  FormInput,
  FormOutput,
  formatCurrency,
} from '../../../../schema/trip';
import ParticipantRow from '../../../../components/ParticipantRow';
import LoadingSkeleton from '@/components/LoadingSkeleton';

export default function TripExpensesPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [seasons, setSeasons] = useState<SeasonDto[]>([]);

  const router = useRouter();

  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: {
      globalDate: new Date().toISOString().slice(0, 10),
      seasonId: undefined as unknown as number,
      description: '',
      activityName: '',
      baseCostTotal: '0',
      activityCostTotal: '0',
      participants: [],
    },
    mode: 'onBlur',
  });

  const { fields } = useFieldArray({
    control,
    name: 'participants',
  });

  // --- Live Calculation Logic ---
  const watchedBaseCost = useWatch({ control, name: 'baseCostTotal' });
  const watchedActivityCost = useWatch({ control, name: 'activityCostTotal' });
  const watchedParticipants = useWatch({ control, name: 'participants' });

  // Berechnete Werte (Memoized für Performance)
  const calculation = useMemo(() => {
    const baseTotal = parseFloat(watchedBaseCost || '0');
    const activityTotal = parseFloat(watchedActivityCost || '0');

    const tripCount =
      watchedParticipants?.filter((p) => p.isOnTrip).length || 0;
    const activityCount =
      watchedParticipants?.filter((p) => p.isDoingActivity).length || 0;

    const baseShare = tripCount > 0 ? baseTotal / tripCount : 0;
    const activityShare = activityCount > 0 ? activityTotal / activityCount : 0;

    return {
      baseTotal,
      activityTotal,
      tripCount,
      activityCount,
      baseShare,
      activityShare,
    };
  }, [watchedBaseCost, watchedActivityCost, watchedParticipants]);

  // --- Initial Load ---
  useEffect(() => {
    (async () => {
      try {
        const [users, fetchedSeasons] = await Promise.all([
          apiUsers.getAll(),
          apiSeason.getAll(),
        ]);
        setSeasons(fetchedSeasons);

        const highestSeason =
          fetchedSeasons.length > 0
            ? fetchedSeasons.reduce((prev, current) =>
                prev.seasonNumber > current.seasonNumber ? prev : current
              )
            : null;

        reset({
          globalDate: new Date().toISOString().slice(0, 10),
          seasonId: highestSeason?.id,
          description: '',
          activityName: '',
          baseCostTotal: '0',
          activityCostTotal: '0',
          participants: users.map((u: UserDto) => ({
            userId: u.id,
            displayName: u.displayName,
            isOnTrip: true, // Default: Alle fahren mit
            isDoingActivity: true, // Default: Alle machen mit
          })),
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

  // --- Sync Logic: Wenn "Fährt nicht mit", dann auch "Keine Aktivität" ---
  useEffect(() => {
    if (!watchedParticipants) return;
    watchedParticipants.forEach((p, index) => {
      if (!p.isOnTrip && p.isDoingActivity) {
        // Wenn Trip deaktiviert wird, muss Aktivität auch aus sein
        setValue(`participants.${index}.isDoingActivity`, false);
      }
    });
  }, [watchedParticipants, setValue]);

  // --- Submit ---
  const onSubmit = async (data: FormOutput) => {
    const promises: Promise<CreateFinanceRequest>[] = [];
    const { baseShare, activityShare } = calculation;

    // Nur buchen, wenn Kosten > 0 sind
    if (calculation.baseTotal <= 0 && calculation.activityTotal <= 0) {
      enqueueSnackbar('Gesamtkosten müssen größer 0 sein.', {
        variant: 'warning',
      });
      return;
    }

    let bookingCount = 0;

    const baseDescText = data.description || 'Vereinsurlaub';

    // Aktivitätsbeschreibung bauen
    const activityDetail = data.activityName ? `: ${data.activityName}` : '';
    const fullActivityDesc = `${baseDescText} (Aktivität${activityDetail})`;
    const fullBaseDesc = `${baseDescText} (Anreise/Unterkunft)`;

    for (const p of data.participants) {
      if (!p.isOnTrip) continue;

      // 1. Basis Kosten buchen
      if (calculation.baseTotal > 0) {
        bookingCount++;
        promises.push(
          apiFinance.create({
            occurredAt: new Date(data.globalDate).toISOString(),
            direction: 'expense',
            amount: baseShare,
            category: 'TRIP',
            description: fullBaseDesc,
            userId: p.userId,
            seasonId: data.seasonId,
          })
        );
      }

      // 2. Aktivität Kosten buchen
      if (p.isDoingActivity && calculation.activityTotal > 0) {
        bookingCount++;
        promises.push(
          apiFinance.create({
            occurredAt: new Date(data.globalDate).toISOString(),
            direction: 'expense',
            amount: activityShare,
            category: 'TRIP',
            description: fullActivityDesc,
            userId: p.userId,
            seasonId: data.seasonId,
          })
        );
      }
    }

    if (bookingCount === 0) {
      enqueueSnackbar('Keine Teilnehmer ausgewählt.', { variant: 'warning' });
      return;
    }

    try {
      await Promise.all(promises);
      enqueueSnackbar(`${bookingCount} Buchungen erfolgreich erstellt!`, {
        variant: 'success',
      });

      router.push('/finance/trips');
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
        sx={{ maxWidth: 1000, mx: 'auto', p: 3 }}
      >
        <CustomTitle text="Urlaubskosten aufteilen" />

        <Paper variant="outlined" sx={{ p: 2, mb: 4, mt: 2 }}>
          <Typography variant="h6" gutterBottom color="primary.main">
            Gesamtkosten
          </Typography>
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

            <Divider />

            <TextField
              fullWidth
              label="Reiseziel"
              {...register('description')}
              error={!!errors.description}
              helperText={errors.description?.message}
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={4}>
              <Box flex={1}>
                <TextField
                  fullWidth
                  label="Kosten: Anreise & Unterkunft (Gesamt)"
                  type="number"
                  {...register('baseCostTotal')}
                  error={!!errors.baseCostTotal}
                  helperText={errors.baseCostTotal?.message}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">€</InputAdornment>
                      ),
                    },
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{ mt: 1, display: 'block', fontWeight: 'bold' }}
                >
                  Pro Kopf: {formatCurrency(calculation.baseShare)}
                  <span style={{ fontWeight: 'normal', color: '#666' }}>
                    {' '}
                    ({calculation.tripCount} Pers.)
                  </span>
                </Typography>
              </Box>

              <Divider />

              <Box flex={1}>
                <Stack spacing={2}>
                  <TextField
                    fullWidth
                    label=" Aktivität"
                    {...register('activityName')}
                  />

                  <TextField
                    fullWidth
                    label="Kosten: Aktivität (Gesamt)"
                    type="number"
                    {...register('activityCostTotal')}
                    error={!!errors.activityCostTotal}
                    helperText={errors.activityCostTotal?.message}
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position="end">€</InputAdornment>
                        ),
                      },
                    }}
                  />
                </Stack>
                <Typography
                  variant="caption"
                  sx={{ mt: 1, display: 'block', fontWeight: 'bold' }}
                >
                  Pro Kopf: {formatCurrency(calculation.activityShare)}
                  <span style={{ fontWeight: 'normal', color: '#666' }}>
                    {' '}
                    ({calculation.activityCount} Pers.)
                  </span>
                </Typography>
              </Box>
            </Stack>
          </Stack>
        </Paper>

        {/* --- TEILNEHMER LISTE --- */}
        <Typography variant="h6" sx={{ mb: 2, mt: 4 }}>
          Teilnehmer & Aufteilung
        </Typography>

        <Stack spacing={2}>
          {fields.map((field, index) => (
            <ParticipantRow
              key={field.id}
              index={index}
              control={control}
              register={register}
              baseShare={calculation.baseShare}
              activityShare={calculation.activityShare}
            />
          ))}
        </Stack>

        <Stack direction="row" justifyContent="flex-end" sx={{ mt: 3 }}>
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={isSubmitting}
            startIcon={
              isSubmitting ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <FlightTakeoffIcon />
              )
            }
            sx={{ px: 4 }}
          >
            {isSubmitting ? 'Buche...' : 'Kosten aufteilen & buchen'}
          </Button>
        </Stack>
      </Box>
    </Layout>
  );
}
