'use client';

import { useEffect, useMemo, useState } from 'react';
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
  Typography,
} from '@mui/material';
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { useSnackbar } from 'notistack';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import 'dayjs/locale/de';

import Layout from '@/components/Layout';
import CustomTitle from '@/components/CustomTitle';
import { apiOrganizerDuty, apiSeason } from '@/definitions/commands';
import type { SeasonDto } from '@/definitions/types';

dayjs.locale('de');

const currentMonth = dayjs().format('YYYY-MM');

const schema = z.object({
  seasonId: z.number().int().min(1, 'Bitte Saison waehlen.'),
  startMonth: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'Bitte Startmonat waehlen.'),
  monthCount: z
    .number()
    .int('Bitte eine ganze Zahl eingeben.')
    .min(1, 'Mindestens ein Monat.')
    .max(36, 'Maximal 36 Monate.'),
});

type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

export default function OrganizerTermGenerator() {
  const { enqueueSnackbar } = useSnackbar();
  const router = useRouter();

  const [seasons, setSeasons] = useState<SeasonDto[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(true);

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: {
      startMonth: currentMonth,
      monthCount: 12,
      seasonId: 0,
    },
    mode: 'onBlur',
  });

  const startMonth = watch('startMonth');
  const monthCount = watch('monthCount');

  const previewMonths = useMemo(() => {
    if (!startMonth || !Number.isFinite(monthCount) || monthCount < 1) {
      return [];
    }

    return Array.from({ length: Math.min(monthCount, 36) }, (_, index) =>
      dayjs(`${startMonth}-01`).add(index, 'month').format('MMMM YYYY')
    );
  }, [monthCount, startMonth]);

  useEffect(() => {
    (async () => {
      try {
        const seasonsData = await apiSeason.getAll();
        setSeasons(seasonsData);

        const highestSeason = seasonsData.reduce<SeasonDto | null>(
          (acc, cur) =>
            acc === null || cur.seasonNumber > acc.seasonNumber ? cur : acc,
          null
        );

        if (highestSeason) {
          setValue('seasonId', highestSeason.id);
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
    try {
      const result = await apiOrganizerDuty.generate({
        seasonId: values.seasonId,
        startMonth: `${values.startMonth}-01T00:00:00.000Z`,
        monthCount: values.monthCount,
      });

      enqueueSnackbar(
        `${result.createdCount} Termine erstellt, ${result.existingCount} bereits vorhanden.`,
        { variant: 'success' }
      );

      router.push('/admincenter/organizer');
    } catch (error) {
      enqueueSnackbar(
        (error as Error)?.message ?? 'Termine konnten nicht erstellt werden.',
        { variant: 'error' }
      );
    }
  };

  const onGenerateClick = () => {
    void handleSubmit(onSubmit)();
  };

  return (
    <Layout>
      <Box
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        sx={{ maxWidth: 640, mx: 'auto', p: 3 }}
      >
        <CustomTitle text="Saison-Termine generieren" />

        <Stack spacing={2}>
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
                {[...seasons]
                  .sort((a, b) => b.seasonNumber - a.seasonNumber)
                  .map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      Saison {s.seasonNumber}
                    </MenuItem>
                  ))}
              </TextField>
            )}
          />

          <TextField
            label="Startmonat"
            type="month"
            {...register('startMonth')}
            error={!!errors.startMonth}
            helperText={errors.startMonth?.message}
            disabled={isSubmitting}
            fullWidth
            slotProps={{
              inputLabel: { shrink: true },
            }}
          />

          <TextField
            label="Anzahl Monate"
            type="number"
            {...register('monthCount', { valueAsNumber: true })}
            error={!!errors.monthCount}
            helperText={errors.monthCount?.message ?? '1 bis 36'}
            disabled={isSubmitting}
            fullWidth
            slotProps={{
              htmlInput: { min: 1, max: 36 },
            }}
          />

          {previewMonths.length > 0 && (
            <Box>
              <Typography variant="subtitle2" color="text.secondary" mb={1}>
                Vorschau
              </Typography>
              <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1}>
                {previewMonths.map((month) => (
                  <Typography
                    key={month}
                    variant="body2"
                    sx={{
                      px: 1.25,
                      py: 0.75,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                    }}
                  >
                    {month}
                  </Typography>
                ))}
              </Stack>
            </Box>
          )}

          <Stack direction="row" spacing={2}>
            <Button
              type="button"
              variant="outlined"
              disabled={isSubmitting}
              startIcon={<RestartAltIcon />}
              onClick={() =>
                reset({
                  seasonId: seasons.length > 0 ? seasons[0].id : 0,
                  startMonth: currentMonth,
                  monthCount: 12,
                })
              }
            >
              Zuruecksetzen
            </Button>

            <Button
              type="button"
              variant="contained"
              size="large"
              disabled={isSubmitting || loadingData}
              onClick={onGenerateClick}
              startIcon={
                isSubmitting ? (
                  <CircularProgress size={18} />
                ) : (
                  <EventRepeatIcon />
                )
              }
            >
              {isSubmitting ? 'wird erstellt...' : 'Generieren'}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Layout>
  );
}
