'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
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
  Alert,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import { useRouter, useSearchParams } from 'next/navigation';
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
  FinanceVersionReference,
  ReplaceGameDepositsRequest,
} from '@/definitions/types';
import { isConflictError } from '@/definitions/api';

import {
  schema,
  FormInput,
  STD_MEMBER,
  STD_CLUB,
} from '../../../schema/deposit';
import MemberRow from '../../../components/DepositMemberRow';
import OtherIncomeRow from '../../../components/DepositOtherIncomeRow';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { routes } from '@/common/routes';
import { buildDepositEditData } from './edit-data';

type FormOutput = FormInput;
const toMoneyAmount = (value: string) => Math.round(Number(value) * 100) / 100;

export default function BulkDepositPage() {
  return (
    <Suspense
      fallback={
        <Layout>
          <LoadingSkeleton />
        </Layout>
      }
    >
      <BulkDepositForm />
    </Suspense>
  );
}

function BulkDepositForm() {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [seasons, setSeasons] = useState<SeasonDto[]>([]);
  const [games, setGames] = useState<GameDto[]>([]);
  const [editTransactions, setEditTransactions] = useState<
    FinanceVersionReference[]
  >([]);
  const [unmatchedDuesCount, setUnmatchedDuesCount] = useState(0);
  const [blockingError, setBlockingError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const router = useRouter();
  const searchParams = useSearchParams();
  const editGameIdParam = searchParams.get('editGameId');
  const parsedEditGameId = editGameIdParam ? Number(editGameIdParam) : null;
  const editGameId =
    parsedEditGameId !== null &&
    Number.isInteger(parsedEditGameId) &&
    parsedEditGameId > 0
      ? parsedEditGameId
      : null;
  const isEditMode = editGameIdParam !== null;

  // --- Form Setup ---
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
        setLoading(true);
        setLoadError(null);
        setEditTransactions([]);
        setUnmatchedDuesCount(0);
        setBlockingError(null);
        setConflictError(null);

        if (isEditMode && editGameId === null) {
          throw new Error('Ungültige Spiel-ID für die Bearbeitung.');
        }

        const [users, fetchedSeasons, fetchedGames, gameFinances] =
          await Promise.all([
            apiUsers.getAll(),
            apiSeason.getAll(),
            apiGame.getAll(),
            editGameId === null
              ? Promise.resolve([])
              : apiFinance.getAll({ gameId: editGameId }),
          ]);

        setSeasons(fetchedSeasons);
        setGames(fetchedGames);

        if (editGameId !== null) {
          const selectedGame = fetchedGames.find(
            (game) => game.id === editGameId
          );
          if (!selectedGame) {
            throw new Error('Spiel für die Bearbeitung nicht gefunden.');
          }

          const editData = buildDepositEditData(
            users,
            selectedGame,
            gameFinances
          );
          setEditTransactions(editData.transactions);
          setUnmatchedDuesCount(editData.unmatchedDuesCount);
          setBlockingError(editData.blockingError ?? null);
          reset(editData.defaultValues);
          return;
        }

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
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Daten konnten nicht geladen werden.';
        setLoadError(message);
        enqueueSnackbar(message, {
          variant: 'error',
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [editGameId, enqueueSnackbar, isEditMode, reloadKey, reset]);

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
    if (isEditMode && editGameId !== null) {
      const body: ReplaceGameDepositsRequest = {
        transactions: editTransactions,
        occurredAt: new Date(data.globalDate).toISOString(),
        members: data.entries
          .filter((entry) => entry.hasPaid)
          .map((entry) => ({
            userId: entry.userId,
            memberAmount: toMoneyAmount(entry.memberAmount),
            clubAmount: toMoneyAmount(entry.clubAmount),
            description: entry.description?.trim() || undefined,
          })),
        otherIncomes: data.otherIncomes
          .map((income) => ({
            amount: parseFloat(income.amount || '0'),
            description: income.description?.trim() || undefined,
          }))
          .filter((income) => income.amount !== 0),
      };

      if (
        body.transactions.length === 0 &&
        body.members.length === 0 &&
        body.otherIncomes.length === 0
      ) {
        enqueueSnackbar('Keine Änderungen zum Speichern vorhanden.', {
          variant: 'warning',
        });
        return;
      }

      try {
        await apiFinance.replaceGameDeposits(editGameId, body);
        enqueueSnackbar('Spielbeiträge erfolgreich aktualisiert!', {
          variant: 'success',
        });
        router.push(`${routes.financesGames}/${editGameId}`);
      } catch (error) {
        if (isConflictError(error)) {
          setConflictError(
            'Die Finanzdaten wurden inzwischen geändert. Deine Eingaben bleiben erhalten. Lade die aktuellen Daten neu.'
          );
          return;
        }

        enqueueSnackbar(
          error instanceof Error
            ? error.message
            : 'Fehler beim Aktualisieren der Spielbeiträge.',
          { variant: 'error' }
        );
      }
      return;
    }

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

  if (loadError) {
    return (
      <Layout>
        <Box sx={{ maxWidth: 1000, mx: 'auto', p: 3 }}>
          <Alert
            severity="error"
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() =>
                  router.push(
                    editGameId === null
                      ? routes.financesGames
                      : `${routes.financesGames}/${editGameId}`
                  )
                }
              >
                Zurück
              </Button>
            }
          >
            {loadError}
          </Alert>
        </Box>
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
          <CustomTitle
            text={
              isEditMode
                ? 'Mitgliedsbeiträge bearbeiten'
                : 'Mitgliedsbeiträge einfügen'
            }
          />
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

        {blockingError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {blockingError}
          </Alert>
        )}

        {conflictError && (
          <Alert
            severity="warning"
            sx={{ mb: 3 }}
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => setReloadKey((current) => current + 1)}
              >
                Neu laden
              </Button>
            }
          >
            {conflictError}
          </Alert>
        )}

        {unmatchedDuesCount > 0 && (
          <Alert severity="info" sx={{ mb: 3 }}>
            {unmatchedDuesCount}{' '}
            {unmatchedDuesCount === 1
              ? 'älterer Vereinsbeitrag konnte'
              : 'ältere Vereinsbeiträge konnten'}{' '}
            keinem Mitglied eindeutig zugeordnet werden und{' '}
            {unmatchedDuesCount === 1 ? 'bleibt' : 'bleiben'} unverändert.
          </Alert>
        )}

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
                    disabled={isEditMode}
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
                    disabled={
                      isEditMode ||
                      !selectedSeasonId ||
                      availableGames.length === 0
                    }
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
          {isEditMode && editGameId !== null && (
            <Button
              type="button"
              variant="outlined"
              size="large"
              disabled={isSubmitting}
              onClick={() =>
                router.push(`${routes.financesGames}/${editGameId}`)
              }
            >
              Abbrechen
            </Button>
          )}
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={isSubmitting || !!blockingError}
            startIcon={
              isSubmitting ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <SaveIcon />
              )
            }
            sx={{ px: 4 }}
          >
            {isSubmitting
              ? isEditMode
                ? 'wird aktualisiert...'
                : 'wird eingetragen...'
              : isEditMode
              ? 'Änderungen speichern'
              : 'Speichern'}
          </Button>
        </Stack>
      </Box>
    </Layout>
  );
}
