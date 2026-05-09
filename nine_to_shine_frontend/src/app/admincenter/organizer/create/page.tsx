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
import { apiOrganizerDuty, apiUsers, apiSeason } from '@/definitions/commands';
import type {
  CreateOrganizerDutyRequest,
  UserDto,
  SeasonDto,
} from '@/definitions/types';

const schema = z.object({
  seasonId: z.number().int().min(1, 'Bitte Saison wählen.'),
  dutyDate: z
    .string()
    .min(1, 'Bitte Datum wählen.')
    .refine((s) => !Number.isNaN(Date.parse(s)), {
      message: 'Ungültiges Datum.',
    }),
  userId: z.number().int().min(1, 'Bitte Organisator wählen.'),
});

type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

export default function OrganizerCreateForm() {
  const { enqueueSnackbar } = useSnackbar();
  const router = useRouter();

  const [users, setUsers] = useState<UserDto[]>([]);
  const [seasons, setSeasons] = useState<SeasonDto[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(true);

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: {
      dutyDate: new Date().toISOString().slice(0, 10),
      userId: 0,
      seasonId: 0,
    },
    mode: 'onBlur',
  });

  // Daten laden (User & Saisons)
  useEffect(() => {
    (async () => {
      try {
        const [usersData, seasonsData] = await Promise.all([
          apiUsers.getAll(),
          apiSeason.getAll(),
        ]);

        // Nur aktive User
        const activeUsers = usersData.filter((u) => u.isActive);
        setUsers(activeUsers);
        setSeasons(seasonsData);

        // Vorselektierung: Erster User
        if (activeUsers.length > 0) {
          setValue('userId', activeUsers[0].id);
        }

        // Vorselektierung: Höchste Saison
        if (seasonsData.length > 0) {
          const highestSeason = seasonsData.reduce<SeasonDto | null>(
            (acc, cur) =>
              acc === null || cur.seasonNumber > acc.seasonNumber ? cur : acc,
            null
          );
          if (highestSeason) {
            setValue('seasonId', highestSeason.id);
          }
        }
      } catch (e) {
        enqueueSnackbar(
          (e as Error)?.message ?? 'Daten konnten nicht geladen werden.',
          { variant: 'error' }
        );
      } finally {
        setLoadingData(false);
      }
    })();
  }, [enqueueSnackbar, setValue]);

  const onSubmit = async (values: FormOutput) => {
    const payload: CreateOrganizerDutyRequest = {
      dutyDate: new Date(values.dutyDate).toISOString(),
      userId: values.userId,
      seasonId: values.seasonId,
    };

    try {
      await apiOrganizerDuty.create(payload);
      enqueueSnackbar('Organisator-Termin wurde erstellt!', {
        variant: 'success',
      });

      reset({
        dutyDate: new Date().toISOString().slice(0, 10),
        userId: values.userId,
        seasonId: values.userId,
      });

      router.push('/admincenter/organizer');
    } catch (error) {
      enqueueSnackbar(
        (error as Error)?.message ?? 'Termin konnte nicht erstellt werden.',
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
        <CustomTitle text="Organisator-Termin erstellen" />
        <Stack spacing={2}>
          {/* Saison Dropdown */}
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
                disabled={isSubmitting || loadingData}
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

          <TextField
            label="Datum"
            type="date"
            {...register('dutyDate')}
            error={!!errors.dutyDate}
            helperText={errors.dutyDate?.message}
            disabled={isSubmitting}
            fullWidth
            slotProps={{
              inputLabel: { shrink: true }, // Fix für Date-Input Label Überlappung
            }}
          />

          <Controller
            name="userId"
            control={control}
            render={({ field }) => (
              <TextField
                select
                label="Organisator"
                value={field.value || ''}
                onChange={(e) => field.onChange(Number(e.target.value))}
                error={!!errors.userId}
                helperText={errors.userId?.message}
                disabled={isSubmitting || loadingData}
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

          <Stack direction="row" spacing={2}>
            <Button
              type="button"
              variant="outlined"
              disabled={isSubmitting}
              onClick={() =>
                reset({
                  seasonId: seasons.length > 0 ? seasons[0].id : 0,
                  dutyDate: new Date().toISOString().slice(0, 10),
                  userId: users[0]?.id ?? 0,
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
              {isSubmitting ? 'wird erstellt…' : 'Erstellen'}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Layout>
  );
}
