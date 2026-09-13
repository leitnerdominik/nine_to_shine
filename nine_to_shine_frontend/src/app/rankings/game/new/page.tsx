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
  GameDto,
  RankingDto,
  SaveRankedGameRequest,
} from '@/definitions/types';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import {
  RANKING_POINTS_MAX,
  RANKING_POINTS_MIN,
  rankingPointsInputSchema,
} from '@/schema/ranking';

// Zod-Schema
const entrySchema = z.object({
  userId: z.number().int().min(1, 'Ungültiger Spieler.'),
  isPresent: z.boolean(),
  points: rankingPointsInputSchema,
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
      const payload: SaveRankedGameRequest = {
        ...(selectedGameId === null ? {} : { gameId: selectedGameId }),
        seasonId: values.seasonId,
        playedAt: new Date(values.playedAt).toISOString(),
        gameName: values.gameName.trim(),
        organizedByUserId: values.organizedByUserId,
        rankings: values.entries.map((entry) => ({
          userId: entry.userId,
          points: entry.isPresent ? entry.points : 1,
          isPresent: entry.isPresent,
        })),
      };
      await apiRanking.saveGameSnapshot(payload);

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
        sx={{
          width: '100%',
          maxWidth: 1180,
          minHeight: {
            xs: 'calc(100vh - 176px)',
            md: 'calc(100vh - 128px)',
          },
          mx: 'auto',
          pb: 4,
        }}
      >
        <Box component="header" sx={{ mb: { xs: 3, md: 4 } }}>
          <Typography
            component="h1"
            sx={{
              color: 'text.primary',
              fontSize: { xs: '2.5rem', sm: '3.25rem' },
              fontWeight: 800,
              letterSpacing: '-0.04em',
              lineHeight: 1.05,
            }}
          >
            Neues Spiel erstellen
          </Typography>
          <Box
            aria-hidden="true"
            sx={{
              width: 40,
              height: 6,
              mt: 1.25,
              borderRadius: 999,
              bgcolor: 'primary.main',
            }}
          />
        </Box>

        <Paper
          component="section"
          elevation={0}
          aria-labelledby="game-selection-title"
          sx={{ p: { xs: 2, sm: 3 }, mb: 2, borderRadius: { xs: 3, sm: 4 } }}
        >
          <Stack spacing={2}>
            <Typography
              id="game-selection-title"
              component="h2"
              variant="overline"
              color="text.secondary"
            >
              Spiel auswählen
            </Typography>
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

        <Paper
          component="section"
          elevation={0}
          aria-labelledby="game-details-title"
          sx={{ p: { xs: 2, sm: 3 }, mb: 2, borderRadius: { xs: 3, sm: 4 } }}
        >
          <Typography
            id="game-details-title"
            component="h2"
            variant="overline"
            color="text.secondary"
            sx={{ display: 'block', mb: 2 }}
          >
            Spieldaten
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
              gap: 2,
            }}
          >
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
          </Box>
        </Paper>

        <Paper
          component="section"
          elevation={0}
          aria-labelledby="player-points-title"
          sx={{ p: { xs: 2, sm: 3 }, borderRadius: { xs: 3, sm: 4 } }}
        >
          <Typography
            id="player-points-title"
            component="h2"
            variant="h6"
            sx={{ mb: 2.5 }}
          >
            Punkte pro Spieler
          </Typography>

          <Box
            aria-hidden="true"
            sx={{
              display: { xs: 'none', sm: 'grid' },
              gridTemplateColumns: 'minmax(0, 2fr) minmax(150px, 1fr) minmax(120px, 0.7fr)',
              gap: 2,
              px: 1,
              pb: 1.5,
              color: 'text.secondary',
            }}
          >
            {['Name', 'Anwesenheit', 'Punkte'].map((label) => (
              <Typography key={label} variant="overline">
                {label}
              </Typography>
            ))}
          </Box>

          <Stack divider={<Divider />}>
            {entriesWatch?.map((entry, idx) => {
              const name =
                userLabel.get(entry.userId) ?? `Spieler #${entry.userId}`;
              const disabled = entry.isPresent === false;
              return (
                <Stack
                  key={entry.userId}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: 'minmax(0, 1fr)',
                      sm: 'minmax(0, 2fr) minmax(150px, 1fr) minmax(120px, 0.7fr)',
                    },
                    gap: { xs: 1.5, sm: 2 },
                    alignItems: 'center',
                    px: 1,
                    py: 2,
                  }}
                >
                  <Typography fontWeight={600}>{name}</Typography>

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
                    sx={{ m: 0 }}
                  />

                  <TextField
                    label="Punkte"
                    type="number"
                    {...register(`entries.${idx}.points` as const)}
                    error={!!errors.entries?.[idx]?.points}
                    helperText={errors.entries?.[idx]?.points?.message}
                    slotProps={{
                      htmlInput: {
                        min: RANKING_POINTS_MIN,
                        max: RANKING_POINTS_MAX,
                        inputMode: 'numeric',
                        pattern: '[0-9]*',
                      },
                      inputLabel: {
                        shrink: true,
                      },
                    }}
                    fullWidth
                    disabled={disabled}
                  />
                </Stack>
              );
            })}
          </Stack>
        </Paper>

        <Stack
          direction={{ xs: 'column-reverse', sm: 'row' }}
          justifyContent="flex-end"
          spacing={2}
          sx={{ mt: 3 }}
        >
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
            sx={{
              width: { xs: '100%', sm: 'auto' },
              borderRadius: 999,
              px: 3,
              textTransform: 'none',
              fontWeight: 700,
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
            sx={{
              width: { xs: '100%', sm: 'auto' },
              borderRadius: 999,
              px: 3,
              textTransform: 'none',
              fontWeight: 700,
            }}
          >
            {isSubmitting ? 'Speichern…' : 'Speichern'}
          </Button>
        </Stack>
      </Box>
    </Layout>
  );
}
