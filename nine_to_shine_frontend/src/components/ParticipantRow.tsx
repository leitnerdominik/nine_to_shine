import {
  Card,
  CardContent,
  Stack,
  Typography,
  Divider,
  FormControlLabel,
  Checkbox,
  Box,
} from '@mui/material';
import { Control, UseFormRegister, useWatch } from 'react-hook-form';
import { FormInput, formatCurrency } from '../schema/trip';

interface ParticipantRowProps {
  index: number;
  control: Control<FormInput>;
  register: UseFormRegister<FormInput>;
  baseShare: number;
  activityShare: number;
}

export default function ParticipantRow({
  index,
  control,
  register,
  baseShare,
  activityShare,
}: ParticipantRowProps) {
  const isOnTrip = useWatch({
    control,
    name: `participants.${index}.isOnTrip`,
  });
  const isDoingActivity = useWatch({
    control,
    name: `participants.${index}.isDoingActivity`,
  });
  const displayName = useWatch({
    control,
    name: `participants.${index}.displayName`,
  });

  // Individuellen Anteil berechnen
  const myTotal =
    (isOnTrip ? baseShare : 0) + (isDoingActivity ? activityShare : 0);

  return (
    <Card
      variant="outlined"
      sx={{
        borderColor: isOnTrip ? 'primary.light' : 'divider',
        bgcolor: isOnTrip ? '#fff' : '#fafafa',
        opacity: isOnTrip ? 1 : 0.7,
        transition: 'all 0.2s ease-in-out',
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack spacing={1}>
          {/* 1. Name */}
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}
          >
            {displayName}
          </Typography>

          <Divider />

          {/* 2. Checkboxen (Nebeneinander) */}
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <FormControlLabel
              control={
                <Checkbox
                  {...register(`participants.${index}.isOnTrip`)}
                  checked={!!isOnTrip}
                />
              }
              label="Reise"
              sx={{ mr: 3 }}
            />

            <FormControlLabel
              control={
                <Checkbox
                  {...register(`participants.${index}.isDoingActivity`)}
                  checked={!!isDoingActivity}
                  disabled={!isOnTrip}
                />
              }
              label="Aktivität"
            />
          </Stack>

          {/* 3. Anteil (Rechtsbündig hervorgehoben) */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mt: 1,
              pt: 1,
              borderTop: '1px dashed #eee',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Anteil:
            </Typography>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 'bold',
                color: myTotal > 0 ? 'error.main' : 'text.disabled',
              }}
            >
              {myTotal > 0 ? formatCurrency(myTotal) : '-'}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
