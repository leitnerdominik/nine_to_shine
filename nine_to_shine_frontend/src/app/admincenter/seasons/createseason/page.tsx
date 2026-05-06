'use client';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Box, Stack, TextField, Button, CircularProgress } from '@mui/material';
import { apiSeason } from '@/definitions/commands';
import { type CreateSeasonRequest } from '@/definitions/types';
import Layout from '@/components/Layout';
import { useSnackbar } from 'notistack';
import CustomTitle from '@/components/CustomTitle';
import AddIcon from '@mui/icons-material/Add';
import { useRouter } from 'next/navigation';

const schema = z.object({
  seasonnumber: z
    .number()
    .int('Nur ganze Zahlen erlaubt.')
    .min(1, 'Saisonnummer muss ≥ 1 sein.'),
});

type FormValues = z.infer<typeof schema>;

export default function SeasonCreateForm() {
  const { enqueueSnackbar } = useSnackbar();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    // reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { seasonnumber: 1 },
    mode: 'onBlur',
  });

  const onSubmit = async (values: FormValues) => {
    const payload: CreateSeasonRequest = {
      seasonNumber: values.seasonnumber,
    };

    try {
      await apiSeason.create(payload);
      enqueueSnackbar('Saison wurde erstellt!', { variant: 'success' });
      // reset({ seasonnumber: 1 });
      router.push('/admincenter/seasons');
    } catch (error) {
      enqueueSnackbar(
        (error as Error)?.message ?? 'Saison konnte nicht erstellt werden.',
        { variant: 'error' }
      );
    }
  };

  return (
    <Layout>
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <CustomTitle text="Saison erstellen" />
        <Stack spacing={2}>
          <TextField
            label="Saisonnummer"
            type="number"
            {...register('seasonnumber', { valueAsNumber: true })}
            error={!!errors.seasonnumber}
            helperText={errors.seasonnumber?.message}
            disabled={isSubmitting}
            fullWidth
            autoComplete="off"
            // optional: Scrollen im Number-Input verhindern (UX)
            onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
          />

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
      </Box>
    </Layout>
  );
}
