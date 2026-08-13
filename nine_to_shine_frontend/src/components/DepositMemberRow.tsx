import {
  Stack,
  Typography,
  Box,
  FormControlLabel,
  Checkbox,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  Control,
  UseFormRegister,
  FieldErrors,
  useWatch,
} from 'react-hook-form';
import { FormInput } from '../schema/deposit';

interface MemberRowProps {
  index: number;
  control: Control<FormInput>;
  register: UseFormRegister<FormInput>;
  errors: FieldErrors<FormInput>;
}

export default function DepositMemberRow({
  index,
  control,
  register,
  errors,
}: MemberRowProps) {
  const hasPaid = useWatch({ control, name: `entries.${index}.hasPaid` });
  const displayName = useWatch({
    control,
    name: `entries.${index}.displayName`,
  });

  const rowError = errors.entries?.[index];

  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={2}
      alignItems={{ xs: 'stretch', md: 'center' }}
      sx={{
        opacity: hasPaid ? 1 : 0.6,
        transition: 'opacity 0.2s',
      }}
    >
      <Typography sx={{ minWidth: 150 }}>{displayName}</Typography>
      <Box
        sx={{ display: 'flex', alignItems: 'center', flex: 1.2, minWidth: 150 }}
      >
        <FormControlLabel
          control={
            <Checkbox
              {...register(`entries.${index}.hasPaid`)}
              checked={!!hasPaid}
            />
          }
          label={
            <Typography sx={{ fontWeight: hasPaid ? 'bold' : 'normal' }}>
              Bezahlt
            </Typography>
          }
        />
      </Box>

      <Stack direction="row" spacing={2} alignItems="center" sx={{ flex: 2 }}>
        <TextField
          label="Gutschrift"
          type="number"
          size="small"
          disabled={!hasPaid}
          {...register(`entries.${index}.memberAmount`)}
          error={!!rowError?.memberAmount}
          slotProps={{
            input: {
              endAdornment: <InputAdornment position="end">€</InputAdornment>,
            },
            inputLabel: { shrink: true },
          }}
          fullWidth
        />

        <TextField
          label="Kasse"
          type="number"
          size="small"
          disabled={!hasPaid}
          {...register(`entries.${index}.clubAmount`)}
          error={!!rowError?.clubAmount}
          slotProps={{
            input: {
              endAdornment: <InputAdornment position="end">€</InputAdornment>,
            },
            inputLabel: { shrink: true },
          }}
          fullWidth
        />
      </Stack>

      <TextField
        label="Bemerkung"
        size="small"
        placeholder="Bemerkung"
        disabled={!hasPaid}
        {...register(`entries.${index}.description`)}
        sx={{ flex: 1 }}
      />
    </Stack>
  );
}
