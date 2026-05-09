'use client';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Box, Stack, TextField, Button, CircularProgress } from '@mui/material';
import { apiUsers } from '@/definitions/commands';
import { type CreateUserRequest } from '@/definitions/types';
import Layout from '@/components/Layout';
import { useSnackbar } from 'notistack';
import CustomTitle from '@/components/CustomTitle';
import AddIcon from '@mui/icons-material/Add';
import { useRouter } from 'next/navigation';

const schema = z.object({
  displayName: z.string().min(1, 'Name ist pflicht.').max(20, 'Too long'),
  email: z.string(),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export default function UserCreateForm() {
  const { enqueueSnackbar } = useSnackbar();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { displayName: '', email: '', isActive: true },
    mode: 'onBlur',
  });

  const onSubmit = async (values: FormValues) => {
    const payload: CreateUserRequest = {
      displayName: values.displayName.trim(),
      email: values.email ? values.email.trim() : undefined,
      isActive: values.isActive,
    };

    try {
      await apiUsers.create(payload);
      enqueueSnackbar('Benutzer wurde erstellt!', { variant: 'success' });
      router.push('/admincenter/users');
    } catch (error) {
      enqueueSnackbar((error as Error)?.message ?? 'Benutzer erstellen fehlgeschlagen.', {
        variant: 'error',
      });
    }
  };

  return (
    <Layout>
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <CustomTitle text="Benutzer erstellen" />
        <Stack spacing={2}>
          <TextField
            label="Name"
            {...register('displayName')}
            error={!!errors.displayName}
            helperText={errors.displayName?.message}
            disabled={isSubmitting}
            fullWidth
            autoComplete="off"
          />

          <TextField
            label="Email"
            type="email"
            {...register('email')}
            error={!!errors.email}
            helperText={errors.email?.message ?? 'Optional'}
            disabled={isSubmitting}
            fullWidth
            autoComplete="off"
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
