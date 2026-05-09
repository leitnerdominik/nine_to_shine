'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box,
  Stack,
  TextField,
  Button,
  MenuItem,
  Typography,
  Paper,
  Divider,
  Switch,
  FormControlLabel,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import Layout from '@/components/Layout';
import CustomTitle from '@/components/CustomTitle';
import { useSnackbar } from 'notistack';
import {
  apiSeason,
  apiUsers,
  apiGame,
  apiRanking,
} from '@/definitions/commands';
import type {
  SeasonDto,
  UserDto,
  CreateGameRequest,
  CreateRankingRequest,
  GameDto,
  RankingDto,
} from '@/definitions/types';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import LoadingSkeleton from '@/components/LoadingSkeleton';

// Zod-Schema
const entrySchema = z.object({
  userId: z.number().int().min(1, 'Ungültiger Spieler.'),
  isPresent: z.boolean(),
  points: z.preprocess(
    (v) => (v === '' || v === null ? undefined : v), // leeres Feld => "fehlt"
    z.coerce.number().int('Nur ganze Zahlen.').min(1, 'Mindestens 1 Punkte.').max(9, 'Maximal 9 Punkte.')
  ),
});

const schema = z.object({
  seasonId: z.number().int().min(1, 'Bitte Saison wählen.'),
  playedAt: z
    .string()
    .min(1, 'Bitte Datum wählen.')
    .refine((s) => !Number.isNaN(Date.parse(s)), {
      message: 'Ungültiges Datum.',
    }),
  gameName: z.string().min(1, 'Bitte Spielname eingeben.').max(200, 'Zu lang.'),
  organizedByUserId: z.number().int().min(1, 'Bitte Organisator wählen.'),
  entries: z.array(entrySchema).min(1, 'Es wurden keine Spieler gefunden.'),
});

type FormInput = z.input<typeof schema>; // Strings im Formular
type FormOutput = z.output<typeof schema>; // Zahlen nach Validation

export default function SpielNeuPage() {
  const { enqueueSnackbar } = useSnackbar();
  const router = useRouter();

  const [seasons, setSeasons] = useState<SeasonDto[]>([]);
  const [users, setUsers] = useState<UserDto[]>([]);
  const [gamesOhneRankings, setGamesOhneRankings] = useState<GameDto[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

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
      seasonId: undefined as unknown as number,
      playedAt: new Date().toISOString().slice(0, 10),
      gameName: '',
      organizedByUserId: 0,
      entries: [],
    },
    mode: 'onBlur',
  });

  // Einträge beobachten, um dynamisch Punkte/Disable zu steuern
  const entriesWatch = useWatch({ control, name: 'entries' });

  useEffect(() => {
    (async () => {
      try {
        const [s, u, g, r] = await Promise.all([
          apiSeason.getAll(),
          apiUsers.getAll(),
          apiGame.getAll(),
          apiRanking.getAll(),
        ]);

        setSeasons(s);
        setUsers(u);

        // Spiele ohne Rankings ermitteln
        const rankedGameIds = new Set<number>(
          r.map((rk: RankingDto) => rk.gameId)
        );
        const freieGames = (g as GameDto[]).filter(
          (game) => !rankedGameIds.has(game.id)
        );
        setGamesOhneRankings(freieGames);

        // höchste Saison finden (nach seasonNumber)
        const highest = s.reduce<SeasonDto | null>(
          (acc, cur) =>
            acc === null || cur.seasonNumber > acc.seasonNumber ? cur : acc,
          null
        );

        reset((prev) => ({
          ...prev,
          seasonId:
            prev.seasonId ??
            (highest ? highest.id : (undefined as unknown as number)),
          playedAt: prev.playedAt ?? new Date().toISOString().slice(0, 10),
          gameName: prev.gameName ?? '',
          organizedBy: prev.organizedByUserId ?? '',
          entries: u.map((usr) => ({
            userId: usr.id,
            isPresent: true,
            points: '', // anfangs leer
          })),
        }));
      } catch (e) {
        enqueueSnackbar(
          (e as Error)?.message ?? 'Daten konnten nicht geladen werden.',
          { variant: 'error' }
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [enqueueSnackbar, reset]);

  const handlePresenceToggle = (idx: number, present: boolean) => {
    setValue(`entries.${idx}.isPresent`, present, {
      shouldValidate: true,
      shouldDirty: true,
    });
    setValue(`entries.${idx}.points`, present ? '' : '1', {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const onSubmit = async (values: FormOutput) => {
    try {
      let gameId: number;

      if (selectedGameId !== null) {
        // Existierendes Spiel verwenden
        gameId = selectedGameId;
      } else {
        // Neues Spiel anlegen
        const payloadGame: CreateGameRequest = {
          seasonId: values.seasonId,
          playedAt: new Date(values.playedAt).toISOString(),
          gameName: values.gameName.trim(),
          organizedByUserId: values.organizedByUserId,
        };
        const game = await apiGame.create(payloadGame);
        gameId = game.id;
      }

      // Rankings anlegen (abwesende sicherheitshalber mit 1 Punkt)
      const creates: CreateRankingRequest[] = values.entries.map((e) => ({
        gameId,
        userId: e.userId,
        points: e.isPresent ? e.points : 1,
        isPresent: e.isPresent,
      }));
      await Promise.all(creates.map((c) => apiRanking.create(c)));

      enqueueSnackbar('Spiel wurde gespeichert.', {
        variant: 'success',
      });
      router.push('/rankings');
    } catch (e) {
      enqueueSnackbar((e as Error)?.message ?? 'Speichern fehlgeschlagen.', {
        variant: 'error',
      });
    }
  };

  const userLabel = useMemo(() => {
    const map = new Map<number, string>();
    users.forEach((u) => map.set(u.id, u.displayName));
    return map;
  }, [users]);

  const isExistingGame = selectedGameId !== null;

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
        sx={{ maxWidth: 900, mx: 'auto', p: 3 }}
      >
        <CustomTitle text="Neues Spiel erstellen" />

        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Stack spacing={2}>
            {/* Vorhandenes Spiel auswählen */}
            <TextField
              select
              label="Vorhandenes Spiel auswählen"
              value={selectedGameId ?? ''}
              onChange={(e) => {
                const value = e.target.value;
                const newId =
                  value === '' || value === undefined ? null : Number(value);

                setSelectedGameId(newId);

                if (newId === null) {
                  return;
                }

                const g = gamesOhneRankings.find((game) => game.id === newId);
                if (!g) return;

                setValue('seasonId', g.seasonId, {
                  shouldValidate: true,
                  shouldDirty: true,
                });
                setValue('playedAt', dayjs(g.playedAt).format('YYYY-MM-DD'), {
                  shouldValidate: true,
                  shouldDirty: true,
                });
                setValue('gameName', g.gameName, {
                  shouldValidate: true,
                  shouldDirty: true,
                });
                setValue('organizedByUserId', g.organizedByUserId ?? '', {
                  shouldValidate: true,
                  shouldDirty: true,
                });
              }}
              fullWidth
            >
              <MenuItem value="">Neues Spiel anlegen</MenuItem>
              {gamesOhneRankings.map((g) => (
                <MenuItem key={g.id} value={g.id}>
                  {g.gameName}
                  {' – '}
                  {userLabel.get(g.organizedByUserId) ??
                    `#${g.organizedByUserId.toString()}`}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </Paper>
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Stack spacing={2}>
            {/* Saison */}
            <Controller
              name="seasonId"
              control={control}
              render={({ field }) => (
                <TextField
                  select
                  label="Saison"
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  error={!!errors.seasonId}
                  helperText={errors.seasonId?.message}
                  fullWidth
                  disabled={isExistingGame || isSubmitting}
                >
                  {seasons.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      Saison {s.seasonNumber}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />

            {/* Datum */}
            <TextField
              label="Datum"
              type="date"
              {...register('playedAt')}
              error={!!errors.playedAt}
              helperText={errors.playedAt?.message}
              fullWidth
              disabled={isExistingGame || isSubmitting}
            />

            {/* Spielname */}
            <TextField
              label="Spielname"
              {...register('gameName')}
              error={!!errors.gameName}
              helperText={errors.gameName?.message}
              fullWidth
              slotProps={{
                inputLabel: {
                  shrink: true,
                },
              }}
              autoComplete="off"
              disabled={isExistingGame || isSubmitting}
            />

            {/* Organisiert von (User-FK) */}
            <Controller
              name="organizedByUserId"
              control={control}
              render={({ field }) => (
                <TextField
                  select
                  label="Organisiert von"
                  value={field.value && field.value > 0 ? field.value : ''}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  error={!!errors.organizedByUserId}
                  helperText={errors.organizedByUserId?.message}
                  fullWidth
                  disabled={isExistingGame || isSubmitting}
                >
                  {users.map((u) => (
                    <MenuItem key={u.id} value={u.id}>
                      {u.displayName}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          </Stack>
        </Paper>

        <Typography variant="h6" sx={{ mb: 1 }}>
          Punkte pro Spieler
        </Typography>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={2} divider={<Divider />}>
            {entriesWatch?.map((entry, idx) => {
              const name =
                userLabel.get(entry.userId) ?? `Spieler #${entry.userId}`;
              const disabled = entry.isPresent === false;
              return (
                <Stack
                  key={entry.userId}
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={2}
                  alignItems="center"
                >
                  <Typography sx={{ flex: 2 }}>{name}</Typography>

                  <FormControlLabel
                    control={
                      <Controller
                        name={`entries.${idx}.isPresent`}
                        control={control}
                        render={({ field }) => (
                          <Switch
                            checked={!!field.value}
                            onChange={(e) =>
                              handlePresenceToggle(idx, e.target.checked)
                            }
                          />
                        )}
                      />
                    }
                    label="Anwesend"
                    sx={{ m: 0, flex: 1 }}
                  />

                  <TextField
                    label="Punkte"
                    type="number"
                    {...register(`entries.${idx}.points` as const)}
                    error={!!errors.entries?.[idx]?.points}
                    helperText={errors.entries?.[idx]?.points?.message}
                    slotProps={{
                      htmlInput: {
                        min: 0,
                        inputMode: 'numeric',
                        pattern: '[0-9]*',
                      },
                      inputLabel: {
                        shrink: true,
                      },
                    }}
                    sx={{ flex: 1 }}
                    disabled={disabled}
                  />
                </Stack>
              );
            })}
          </Stack>
        </Paper>

        <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
          <Button
            type="button"
            variant="outlined"
            onClick={() => {
              setSelectedGameId(null);
              reset({
                seasonId: undefined as unknown as number,
                playedAt: new Date().toISOString().slice(0, 10),
                gameName: '',
                organizedByUserId: 0,
                entries: users.map((u) => ({
                  userId: u.id,
                  isPresent: true,
                  points: '',
                })),
              });
            }}
          >
            Zurücksetzen
          </Button>

          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting}
            startIcon={
              isSubmitting ? <CircularProgress size={18} /> : <AddIcon />
            }
          >
            {isSubmitting ? 'Speichern…' : 'Speichern'}
          </Button>
        </Stack>
      </Box>
    </Layout>
  );
}
