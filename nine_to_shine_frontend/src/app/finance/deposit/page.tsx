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
  Chip,
  MenuItem,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import { useRouter } from 'next/navigation';
import { useSnackbar } from 'notistack';

import Layout from '@/components/Layout';
import CustomTitle from '@/components/CustomTitle';
import {
  apiFinance,
  apiUsers,
  apiSeason,
  apiGame,
} from '@/definitions/commands';
import type {
  CreateFinanceRequest,
  UserDto,
  SeasonDto,
  GameDto,
} from '@/definitions/types';

import {
  schema,
  FormInput,
  STD_MEMBER,
  STD_CLUB,
} from '../../../schema/deposit';
import MemberRow from '../../../components/DepositMemberRow';
import OtherIncomeRow from '../../../components/DepositOtherIncomeRow';
import LoadingSkeleton from '@/components/LoadingSkeleton';

type FormOutput = FormInput;

export default function BulkDepositPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [seasons, setSeasons] = useState<SeasonDto[]>([]);
  const [games, setGames] = useState<GameDto[]>([]);

  const router = useRouter();

  // --- Form Setup ---
  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    getValues,
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: {
      globalDate: new Date().toISOString().slice(0, 10),
      seasonId: undefined as unknown as number,
      gameId: undefined,
      entries: [],
      otherIncomes: [{ amount: '', description: '' }],
    },
    mode: 'onBlur',
  });

  // Array für Mitglieder
  const { fields: memberFields } = useFieldArray({
    control,
    name: 'entries',
  });

  // Array für Sonstige Einnahmen
  const {
    fields: otherIncomeFields,
    append: appendOtherIncome,
    remove: removeOtherIncome,
  } = useFieldArray({
    control,
    name: 'otherIncomes',
  });

  const selectedSeasonId = useWatch({ control, name: 'seasonId' });

  // Games filtern
  const availableGames = useMemo(() => {
    if (!selectedSeasonId) return [];
    return games.filter((g) => g.seasonId === selectedSeasonId);
  }, [games, selectedSeasonId]);

  // --- Initial Data Load ---
  useEffect(() => {
    (async () => {
      try {
        const [users, fetchedSeasons, fetchedGames] = await Promise.all([
          apiUsers.getAll(),
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
          entries: users.map((u: UserDto) => ({
            userId: u.id,
            displayName: u.displayName,
            useStandard: true,
            hasPaid: false,
            description: '',
            memberAmount: STD_MEMBER,
            clubAmount: STD_CLUB,
          })),
          otherIncomes: [{ amount: '', description: '' }],
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
    let countMembers = 0;
    let countOther = 0;

    // 1. Mitglieder buchen
    for (const row of data.entries) {
      if (!row.hasPaid) continue;

      const mAmount = parseFloat(row.memberAmount);
      const cAmount = parseFloat(row.clubAmount);

      const baseDesc = 'Mitgliedsbeitrag';
      const extraDesc = row.description ? ` - ${row.description}` : '';
      const fullDesc = `${baseDesc}${extraDesc}`;

      if (mAmount > 0 || cAmount > 0) {
        countMembers++;
        // User Gutschrift
        if (mAmount > 0) {
          promises.push(
            apiFinance.create({
              occurredAt: new Date(data.globalDate).toISOString(),
              direction: 'income',
              amount: mAmount,
              category: 'DUES',
              description: fullDesc,
              userId: row.userId,
              seasonId: data.seasonId,
              gameId: data.gameId || undefined,
            })
          );
        }

        // Vereinsbeitrag
        if (cAmount > 0) {
          promises.push(
            apiFinance.create({
              occurredAt: new Date(data.globalDate).toISOString(),
              direction: 'income',
              amount: cAmount,
              category: 'DUES',
              description: `${fullDesc} (${row.displayName})`,
              userId: null,
              seasonId: data.seasonId,
              gameId: data.gameId || undefined,
            })
          );
        }
      }
    }

    // 2. Sonstige Einnahmen buchen
    for (const item of data.otherIncomes) {
      const amount = parseFloat(item.amount || '0');
      if (amount > 0) {
        countOther++;
        promises.push(
          apiFinance.create({
            occurredAt: new Date(data.globalDate).toISOString(),
            direction: 'income',
            amount: amount,
            category: 'OTHER',
            description: item.description || 'Sonstige Einnahme',
            userId: null,
            seasonId: data.seasonId,
            gameId: data.gameId || undefined,
          })
        );
      }
    }

    if (countMembers === 0 && countOther === 0) {
      enqueueSnackbar('Keine Buchungen ausgewählt oder Beträge eingegeben.', {
        variant: 'warning',
      });
      return;
    }

    try {
      await Promise.all(promises);

      enqueueSnackbar("Einnahmen erfolgreich gebucht!", {
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
        sx={{ maxWidth: 1000, mx: 'auto', p: 3 }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2,
          }}
        >
          <CustomTitle text="Mitgliedsbeiträge einfügen" />
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2,
          }}
        >
          <Chip
            label={`${STD_MEMBER}€ selbst einzahlung`}
            variant="outlined"
            size="small"
            sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}
          />
          <Chip
            label={`${STD_CLUB}€ Vereinskasse`}
            variant="outlined"
            size="small"
            sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}
          />
        </Box>

        {/* --- OBERER BEREICH --- */}
        <Paper
          variant="outlined"
          sx={{ p: 2, mb: 4, mt: 4, bgcolor: '#f8f9fa' }}
        >
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
                      <em>Kein Spiel</em>
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
          </Stack>
        </Paper>

        {/* --- LISTE DER MITGLIEDER --- */}
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Mitglieder
          </Typography>
          <Stack spacing={2} divider={<Divider />}>
            {memberFields.map((field, index) => (
              <MemberRow
                key={field.id}
                index={index}
                control={control}
                register={register}
                errors={errors}
                setValue={setValue}
                getValues={getValues}
              />
            ))}
          </Stack>
        </Paper>

        {/* --- SONSTIGE EINNAHMEN --- */}
        <Paper variant="outlined" sx={{ p: 2, mt: 4 }}>
          <Stack
            direction="column"
            justifyContent="space-between"
            alignItems="flex-start"
            mb={2}
            gap={3}
          >
            <Box>
              <Typography variant="h6">Sonstige Einnahmen</Typography>
              <Typography variant="caption" color="text.secondary">
                Zusätzliche Beträge (z.B. Strafen, Geld übrig), unabhängig von
                Mitgliedern.
              </Typography>
            </Box>
            <Button
              startIcon={<AddIcon />}
              variant="outlined"
              size="small"
              onClick={() => appendOtherIncome({ amount: '', description: '' })}
              fullWidth
            >
              Hinzufügen
            </Button>
          </Stack>

          <Stack spacing={2}>
            {otherIncomeFields.map((field, index) => (
              <OtherIncomeRow
                key={field.id}
                index={index}
                register={register}
                errors={errors}
                onRemove={() => removeOtherIncome(index)}
                canRemove={otherIncomeFields.length > 1}
              />
            ))}
          </Stack>
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
            {isSubmitting ? 'wird eingetragen...' : 'Speichern'}
          </Button>
        </Stack>
      </Box>
    </Layout>
  );
}
