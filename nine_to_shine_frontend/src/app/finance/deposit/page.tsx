'use client';

import { ReactNode, Suspense, useEffect, useState, useMemo } from 'react';
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
  Alert,
  InputAdornment,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import SportsSoccerOutlinedIcon from '@mui/icons-material/SportsSoccerOutlined';
import PaidOutlinedIcon from '@mui/icons-material/PaidOutlined';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSnackbar } from 'notistack';

import Layout from '@/components/Layout';
import PageTitle from '@/components/PageTitle';
import {
  apiFinance,
  apiUsers,
  apiSeason,
  apiGame,
} from '@/definitions/commands';
import type {
  CreateDepositBatchRequest,
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

const desktopMemberColumns =
  'minmax(160px, 1.35fr) minmax(105px, 0.75fr) minmax(115px, 0.9fr) minmax(115px, 0.9fr) minmax(160px, 1.35fr)';

const sectionSx = {
  p: { xs: 2, sm: 2.5 },
  border: 1,
  borderColor: 'divider',
  borderRadius: '16px',
  bgcolor: 'background.paper',
  boxShadow: '0 10px 30px rgba(7, 17, 47, 0.05)',
};

function StandardAmountBadge({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Stack
      direction="row"
      spacing={1.25}
      alignItems="center"
      sx={{
        px: 1.5,
        py: 1,
        border: 1,
        borderColor: 'divider',
        borderRadius: 999,
        bgcolor: 'rgba(255, 255, 255, 0.82)',
        boxShadow: '0 6px 18px rgba(7, 17, 47, 0.04)',
      }}
    >
      <Box
        aria-hidden="true"
        sx={{
          width: 34,
          height: 34,
          display: 'grid',
          placeItems: 'center',
          borderRadius: '50%',
          bgcolor: '#EAF5FF',
          color: 'primary.main',
        }}
      >
        {icon}
      </Box>
      <Typography fontWeight={700} whiteSpace="nowrap">
        {children}
      </Typography>
    </Stack>
  );
}

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

    const body: CreateDepositBatchRequest = {
      occurredAt: new Date(data.globalDate).toISOString(),
      seasonId: data.seasonId,
      gameId: data.gameId || undefined,
      members: data.entries
        .filter((entry) => entry.hasPaid)
        .map((entry) => ({
          userId: entry.userId,
          memberAmount: toMoneyAmount(entry.memberAmount),
          clubAmount: toMoneyAmount(entry.clubAmount),
          description: entry.description?.trim() || undefined,
        }))
        .filter((entry) => entry.memberAmount > 0 || entry.clubAmount > 0),
      otherIncomes: data.otherIncomes
        .map((income) => ({
          amount: toMoneyAmount(income.amount || '0'),
          description: income.description?.trim() || undefined,
        }))
        .filter((income) => income.amount > 0),
    };

    if (body.members.length === 0 && body.otherIncomes.length === 0) {
      enqueueSnackbar('Keine Buchungen ausgewählt oder Beträge eingegeben.', {
        variant: 'warning',
      });
      return;
    }

    try {
      await apiFinance.createDepositBatch(body);

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
        sx={{ width: '100%', maxWidth: 1200, mx: 'auto', pb: 2 }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', lg: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'stretch', lg: 'flex-end' },
            gap: 3,
            mb: 3,
          }}
        >
          <Box>
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ fontSize: '0.78rem' }}
            >
              Finanzen
            </Typography>
            <Box sx={{ mt: 0.25 }}>
              <PageTitle
                title={
                  isEditMode
                    ? 'Mitgliedsbeiträge bearbeiten'
                    : 'Mitgliedsbeiträge einfügen'
                }
              />
            </Box>
          </Box>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.25}
            sx={{ alignSelf: { lg: 'center' } }}
          >
            <StandardAmountBadge
              icon={<AccountBalanceWalletOutlinedIcon fontSize="small" />}
            >
              {STD_MEMBER}€ Selbsteinzahlung
            </StandardAmountBadge>
            <StandardAmountBadge
              icon={<AccountBalanceOutlinedIcon fontSize="small" />}
            >
              {STD_CLUB}€ Vereinskasse
            </StandardAmountBadge>
          </Stack>
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

        <Paper
          elevation={0}
          sx={{ ...sectionSx, mb: 2.25 }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'minmax(0, 1fr)',
                md: 'repeat(3, minmax(0, 1fr))',
              },
              gap: 2,
            }}
          >
            <TextField
              fullWidth
              label="Datum"
              type="date"
              {...register('globalDate')}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <CalendarTodayOutlinedIcon color="primary" />
                    </InputAdornment>
                  ),
                },
                inputLabel: { shrink: true },
              }}
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
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <LayersOutlinedIcon color="primary" />
                        </InputAdornment>
                      ),
                    },
                  }}
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
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SportsSoccerOutlinedIcon color="primary" />
                        </InputAdornment>
                      ),
                    },
                  }}
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
          </Box>
        </Paper>

        <Paper elevation={0} sx={{ ...sectionSx, mb: 2.25 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            spacing={2}
            sx={{ mb: 2 }}
          >
            <Typography variant="h5" fontWeight={800}>
              Mitglieder
            </Typography>
            <Box
              sx={{
                px: 1.5,
                py: 0.6,
                borderRadius: 999,
                bgcolor: '#F0F5FB',
                color: 'text.secondary',
                fontSize: '0.82rem',
                whiteSpace: 'nowrap',
              }}
            >
              {memberFields.length}{' '}
              {memberFields.length === 1 ? 'Mitglied' : 'Mitglieder'}
            </Box>
          </Stack>

          <Box
            aria-hidden="true"
            sx={{
              display: { xs: 'none', md: 'grid' },
              gridTemplateColumns: desktopMemberColumns,
              gap: 1.5,
              px: 1.5,
              mb: 1,
              color: 'text.secondary',
            }}
          >
            {['Mitglied', 'Bezahlt', 'Gutschrift', 'Kasse', 'Bemerkung'].map(
              (label) => (
                <Typography key={label} variant="overline" fontSize="0.68rem">
                  {label}
                </Typography>
              )
            )}
          </Box>

          <Stack spacing={1}>
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

        <Paper elevation={0} sx={{ ...sectionSx }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'stretch', sm: 'center' }}
            spacing={2}
            sx={{ mb: 2.5 }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                aria-hidden="true"
                sx={{
                  width: 46,
                  height: 46,
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                  borderRadius: '50%',
                  bgcolor: '#EAF5FF',
                  color: 'primary.main',
                }}
              >
                <PaidOutlinedIcon />
              </Box>
              <Box>
                <Typography variant="h5" fontWeight={800}>
                  Sonstige Einnahmen
                </Typography>
                <Typography color="text.secondary" fontSize="0.9rem">
                  Zusätzliche Beträge (z. B. Strafen oder Restgeld), unabhängig
                  von Mitgliedern.
                </Typography>
              </Box>
            </Stack>
            <Button
              startIcon={<AddIcon />}
              variant="outlined"
              size="small"
              onClick={() => appendOtherIncome({ amount: '', description: '' })}
              sx={{
                minWidth: 160,
                alignSelf: { xs: 'stretch', sm: 'center' },
                borderRadius: '10px',
                py: 1,
              }}
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

        <Stack
          direction={{ xs: 'column-reverse', sm: 'row' }}
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
              sx={{ minWidth: 150, borderRadius: '10px' }}
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
            sx={{
              minWidth: { sm: 210 },
              px: 4,
              borderRadius: '10px',
              boxShadow: '0 8px 20px rgba(4, 150, 255, 0.24)',
            }}
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
