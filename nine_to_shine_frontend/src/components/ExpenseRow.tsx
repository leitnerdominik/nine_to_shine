import {
  Stack,
  TextField,
  InputAdornment,
  Box,
  IconButton,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { FormInput } from '../schema/expense';

interface ExpenseRowProps {
  index: number;
  register: UseFormRegister<FormInput>;
  errors: FieldErrors<FormInput>;
  onRemove: () => void;
  canRemove: boolean;
}

export default function ExpenseRow({
  index,
  register,
  errors,
  onRemove,
  canRemove,
}: ExpenseRowProps) {
  const rowError = errors.items?.[index];

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      alignItems={{ xs: 'stretch', sm: 'flex-start' }}
      sx={{
        p: { xs: 1.5, sm: 1.75 },
        borderRadius: '12px',
        bgcolor: '#F4F8FD',
      }}
    >
      <TextField
        label="Betrag"
        type="number"
        placeholder="0.00"
        {...register(`items.${index}.amount`)}
        error={!!rowError?.amount}
        helperText={rowError?.amount?.message}
        slotProps={{
          input: {
            endAdornment: <InputAdornment position="end">€</InputAdornment>,
          },
        }}
        sx={{
          width: { xs: '100%', sm: 260 },
          flexShrink: 0,
          '& .MuiOutlinedInput-root': { bgcolor: 'background.paper' },
        }}
      />

      <TextField
        label="Verwendungszweck (Optional)"
        fullWidth
        {...register(`items.${index}.description`)}
        error={!!rowError?.description}
        helperText={rowError?.description?.message}
        placeholder="z.B. Essen, Pokale..."
        sx={{
          flex: 1,
          '& .MuiOutlinedInput-root': { bgcolor: 'background.paper' },
        }}
      />

      <Box
        sx={{
          display: 'flex',
          justifyContent: { xs: 'flex-end', sm: 'center' },
          alignItems: 'center',
          minHeight: { sm: 56 },
          px: { sm: 0.25 },
        }}
      >
        <IconButton
          onClick={onRemove}
          disabled={!canRemove}
          aria-label="Löschen"
          sx={{ color: 'text.secondary' }}
        >
          <DeleteIcon />
        </IconButton>
      </Box>
    </Stack>
  );
}
