'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  CircularProgress,
  Switch,
  FormControlLabel,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
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
  GameDto,
  RankingDto,
  CreateRankingRequest,
  CreateGameRequest,
} from '@/definitions/types';
import dayjs from 'dayjs';
import LoadingSkeleton from '@/components/LoadingSkeleton';

// --- Zod-Schema ---
const entrySchema = z.object({
  userId: z.number().int().min(1, 'Ungültiger Spieler.'),
  isPresent: z.boolean(),
  points: z.preprocess(
    (v) => (v === '' || v === null ? undefined : v),
    z.coerce.number().int('Nur ganze Zahlen.').min(0, 'Mindestens 0 Punkte.')
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

type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

// ---------- Typsichere Helpers für optionale API-Methoden ----------
function hasDeleteByGame(
  x: unknown
): x is { deleteByGame: (gameId: number) => Promise<void> } {
  return typeof (x as Record<string, unknown>)?.['deleteByGame'] === 'function';
}
function hasRemove(x: unknown): x is { remove: (id: number) => Promise<void> } {
  return typeof (x as Record<string, unknown>)?.['remove'] === 'function';
}

export default function SpielBearbeitenPage() {
  const { enqueueSnackbar } = useSnackbar();
  const router = useRouter();
  const params = useParams();
  const gameId = Number(params?.id);

  const [seasons, setSeasons] = useState<SeasonDto[]>([]);
  const [users, setUsers] = useState<UserDto[]>([]);
  const [game, setGame] = useState<GameDto | null>(null);
  const [rankings, setRankings] = useState<RankingDto[]>([]);
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
      playedAt: '',
      gameName: '',
      organizedByUserId: 0,
      entries: [],
    },
    mode: 'onBlur',
  });

  const entriesWatch = useWatch({ control, name: 'entries' });

  useEffect(() => {
    (async () => {
      if (!Number.isFinite(gameId)) {
        enqueueSnackbar('Ungültige Spiel-ID.', { variant: 'error' });
        router.push('/admincenter/spiele');
        return;
      }
      try {
        setLoading(true);
        const [s, u, g, rAll] = await Promise.all([
          apiSeason.getAll(),
          apiUsers.getAll(),
          apiGame.getById(gameId),
          apiRanking.getAll(),
        ]);
        setSeasons(s);
        setUsers(u);
        setGame(g);

        const rs = rAll.filter((x) => x.gameId === gameId);
        setRankings(rs);

        const rByUser = new Map<number, RankingDto>();
        rs.forEach((r) => rByUser.set(r.userId, r));

        const entries = u.map((usr) => {
          const r = rByUser.get(usr.id);
          const isPresent = r?.isPresent ?? true;
          const pointsStr = isPresent ? (r ? String(r.points) : '') : '1';
          return { userId: usr.id, isPresent, points: pointsStr };
        });

        reset({
          seasonId: g.seasonId,
          playedAt: dayjs(g.playedAt).format('YYYY-MM-DD'),
          gameName: g.gameName,
          organizedByUserId: g.organizedByUserId,
          entries,
        });
      } catch (e) {
        enqueueSnackbar(
          (e as Error)?.message ?? 'Daten konnten nicht geladen werden.',
          {
            variant: 'error',
          }
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [enqueueSnackbar, reset, router, gameId]);

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
      if (!Number.isFinite(gameId)) throw new Error('Ungültige Spiel-ID.');

      // 1) Spiel aktualisieren
      const payloadGame: CreateGameRequest = {
        seasonId: values.seasonId,
        playedAt: new Date(values.playedAt).toISOString(),
        gameName: values.gameName.trim(),
        organizedByUserId: values.organizedByUserId,
      };
      await apiGame.update(gameId, payloadGame);

      // 2) Rankings ersetzen (wenn API vorhanden)
      const rankingApiAsUnknown: unknown = apiRanking;

      if (hasDeleteByGame(rankingApiAsUnknown)) {
        await rankingApiAsUnknown.deleteByGame(gameId);
      } else if (hasRemove(rankingApiAsUnknown)) {
        // Fallback: vorhandene Rankings einzeln löschen
        await Promise.all(
          rankings.map((r) => rankingApiAsUnknown.remove(r.id))
        );
      }
      // Neu anlegen
      const creates: CreateRankingRequest[] = values.entries.map((e) => ({
        gameId,
        userId: e.userId,
        points: e.isPresent ? e.points : 1,
        isPresent: e.isPresent,
      }));
      await Promise.all(creates.map((c) => apiRanking.create(c)));

      enqueueSnackbar('Spiel wurde aktualisiert.', { variant: 'success' });
      router.push(`/rankings/${gameId}`);
    } catch (e) {
      enqueueSnackbar(
        (e as Error)?.message ?? 'Aktualisierung fehlgeschlagen.',
        {
          variant: 'error',
        }
      );
    }
  };

  const userLabel = useMemo(() => {
    const map = new Map<number, string>();
    users.forEach((u) => map.set(u.id, u.displayName));
    return map;
  }, [users]);

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
        <CustomTitle
          text={
            game
              ? `Spiel bearbeiten: ${game.gameName}`
              : `Spiel #${gameId} bearbeiten`
          }
        />

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
            />

            {/* Spielname */}
            <TextField
              label="Spielname"
              {...register('gameName')}
              error={!!errors.gameName}
              helperText={errors.gameName?.message}
              fullWidth
              autoComplete="off"
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
              const valueStr = entry.points ?? '';
              const shrink = disabled || valueStr !== '';
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
                    helperText={
                      disabled
                        ? 'Abwesend: automatisch 1 Punkt'
                        : errors.entries?.[idx]?.points?.message
                    }
                    slotProps={{
                      htmlInput: {
                        min: 0,
                        inputMode: 'numeric',
                        pattern: '[0-9]*',
                      },
                      inputLabel: { shrink },
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
            onClick={() => router.push(`/rankings/${gameId}`)}
          >
            Abbrechen
          </Button>

          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting}
            startIcon={
              isSubmitting ? <CircularProgress size={18} /> : <SaveIcon />
            }
          >
            {isSubmitting ? 'Speichert…' : 'Speichern'}
          </Button>
        </Stack>
      </Box>
    </Layout>
  );
}
