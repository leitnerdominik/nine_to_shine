'use client';

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box,
  Stack,
  TextField,
  Button,
  CircularProgress,
  MenuItem,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useSnackbar } from 'notistack';
import { useRouter } from 'next/navigation';

import Layout from '@/components/Layout';
import CustomTitle from '@/components/CustomTitle';
import { apiGame, apiSeason, apiUsers } from '@/definitions/commands';
import type {
  CreateGameRequest,
  SeasonDto,
  UserDto,
} from '@/definitions/types';

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
});

type FormValues = z.infer<typeof schema>;

export default function GameCreateForm() {
  const { enqueueSnackbar } = useSnackbar();
  const router = useRouter();

  const [seasons, setSeasons] = useState<SeasonDto[]>([]);
  const [users, setUsers] = useState<UserDto[]>([]);
  const [loadingOptions, setLoadingOptions] = useState<boolean>(true);

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      seasonId: 0,
      playedAt: new Date().toISOString().slice(0, 10),
      gameName: '',
      organizedByUserId: 0,
    },
    mode: 'onBlur',
  });

  useEffect(() => {
    (async () => {
      try {
        const [s, u] = await Promise.all([
          apiSeason.getAll(),
          apiUsers.getAll(),
        ]);
        setSeasons(s);
        setUsers(u);

        // automatisch höchste Saison vorauswählen
        if (s.length > 0) {
          const highest = s.reduce<SeasonDto | null>(
            (acc, cur) =>
              acc === null || cur.seasonNumber > acc.seasonNumber ? cur : acc,
            null
          );
          if (highest) {
            setValue('seasonId', highest.id);
          }
        }
      } catch (e) {
        enqueueSnackbar(
          (e as Error)?.message ??
            'Saisons oder Benutzer konnten nicht geladen werden.',
          { variant: 'error' }
        );
      } finally {
        setLoadingOptions(false);
      }
    })();
  }, [enqueueSnackbar, setValue]);

  const onSubmit = async (values: FormValues) => {
    const payload: CreateGameRequest = {
      seasonId: values.seasonId,
      playedAt: new Date(values.playedAt).toISOString(),
      gameName: values.gameName.trim(),
      organizedByUserId: values.organizedByUserId,
    };

    try {
      await apiGame.create(payload);
      enqueueSnackbar('Spiel wurde erstellt!', { variant: 'success' });
      reset({
        seasonId: values.seasonId,
        playedAt: new Date().toISOString().slice(0, 10),
        gameName: '',
        organizedByUserId: 0,
      });
      router.push('/admincenter/game');
    } catch (error) {
      enqueueSnackbar(
        (error as Error)?.message ?? 'Spiel konnte nicht erstellt werden.',
        { variant: 'error' }
      );
    }
  };

  return (
    <Layout>
      <Box
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        sx={{ maxWidth: 600, mx: 'auto', p: 3 }}
      >
        <CustomTitle text="Spiel erstellen" />
        <Stack spacing={2}>
          {/* Saison */}
          <Controller
            name="seasonId"
            control={control}
            render={({ field }) => (
              <TextField
                select
                label="Saison"
                value={field.value || ''}
                onChange={(e) => field.onChange(Number(e.target.value))}
                error={!!errors.seasonId}
                helperText={errors.seasonId?.message}
                disabled={isSubmitting || loadingOptions}
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
            disabled={isSubmitting}
            fullWidth
            slotProps={{
              inputLabel: { shrink: true },
            }}
          />

          {/* Spielname */}
          <TextField
            label="Spielname"
            {...register('gameName')}
            error={!!errors.gameName}
            helperText={errors.gameName?.message}
            disabled={isSubmitting}
            fullWidth
            autoComplete="off"
          />

          {/* Organisiert von (Dropdown mit Usern) */}
          <Controller
            name="organizedByUserId"
            control={control}
            render={({ field }) => (
              <TextField
                select
                label="Organisiert von"
                value={field.value || ''}
                onChange={(e) => field.onChange(Number(e.target.value))}
                error={!!errors.organizedByUserId}
                helperText={errors.organizedByUserId?.message}
                disabled={isSubmitting || loadingOptions}
                fullWidth
              >
                <MenuItem value={0} disabled>
                  Bitte wählen
                </MenuItem>
                {users.map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    {u.displayName}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />

          <Stack direction="row" spacing={2}>
            <Button
              type="button"
              variant="outlined"
              disabled={isSubmitting}
              onClick={() =>
                reset({
                  seasonId: 0,
                  playedAt: new Date().toISOString().slice(0, 10),
                  gameName: '',
                  organizedByUserId: 0,
                })
              }
            >
              Zurücksetzen
            </Button>

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={isSubmitting}
              startIcon={
                isSubmitting ? <CircularProgress size={18} /> : <AddIcon />
              }
            >
              {isSubmitting ? 'wird erstellt...' : 'Erstellen'}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Layout>
  );
}
