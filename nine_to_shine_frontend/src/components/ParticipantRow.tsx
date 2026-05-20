import {
  Box,
  Card,
  CardContent,
  Checkbox,
  Stack,
  Typography,
} from '@mui/material';
import { Control, UseFormRegister, useWatch } from 'react-hook-form';
import { FormInput, formatCurrency } from '../schema/trip';

interface ParticipantRowProps {
  index: number;
  control: Control<FormInput>;
  register: UseFormRegister<FormInput>;
  baseShare: number;
}

export default function ParticipantRow({
  index,
  control,
  register,
  baseShare,
}: ParticipantRowProps) {
  const isOnTrip = useWatch({
    control,
    name: `participants.${index}.isOnTrip`,
  });
  const displayName = useWatch({
    control,
    name: `participants.${index}.displayName`,
  });

  const myTotal = isOnTrip ? baseShare : 0;

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
      <CardContent sx={{ p: 1.25, '&:last-child': { pb: 1.25 } }}>
        <Stack
          direction="row"
          spacing={1.5}
          alignItems="center"
          justifyContent="space-between"
        >
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ minWidth: 0 }}
          >
            <Checkbox
              size="small"
              {...register(`participants.${index}.isOnTrip`)}
              checked={!!isOnTrip}
              sx={{ p: 0.5 }}
            />
            <Typography
              variant="body1"
              sx={{
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {displayName}
            </Typography>
          </Stack>

          <Box
            sx={{
              flexShrink: 0,
              minWidth: 112,
              px: 1,
              py: 0.5,
              borderRadius: 1,
              bgcolor: isOnTrip ? 'rgba(211, 47, 47, 0.08)' : 'action.hover',
              textAlign: 'right',
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Anteil:
            </Typography>
            <Typography
              variant="body2"
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
