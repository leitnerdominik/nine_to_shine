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
    <Stack direction="column" spacing={2} alignItems="flex-start">
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
      />

      <TextField
        label="Verwendungszweck (Optional)"
        fullWidth
        {...register(`items.${index}.description`)}
        error={!!rowError?.description}
        helperText={rowError?.description?.message}
        placeholder="z.B. Essen, Pokale..."
      />

      <Box sx={{ pt: 1 }}>
        <IconButton
          onClick={onRemove}
          disabled={!canRemove}
          color="error"
          aria-label="Löschen"
        >
          <DeleteIcon />
        </IconButton>
      </Box>
    </Stack>
  );
}
