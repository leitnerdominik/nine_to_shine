import {
  Stack,
  TextField,
  Box,
  IconButton,
  InputAdornment,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { FormInput } from '../schema/deposit';

interface DepositOtherIncomeRowProps {
  index: number;
  register: UseFormRegister<FormInput>;
  errors: FieldErrors<FormInput>;
  onRemove: () => void;
  canRemove: boolean;
}

export default function DepositOtherIncomeRow({
  index,
  register,
  errors,
  onRemove,
  canRemove,
}: DepositOtherIncomeRowProps) {
  const rowError = errors.otherIncomes?.[index];

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      alignItems="flex-start"
    >
      <TextField
        label="Betrag"
        type="number"
        {...register(`otherIncomes.${index}.amount`)}
        error={!!rowError?.amount}
        helperText={rowError?.amount?.message}
        slotProps={{
          input: {
            endAdornment: <InputAdornment position="end">€</InputAdornment>,
          },
        }}
        sx={{ width: { xs: '100%', sm: 150 } }}
      />

      <TextField
        fullWidth
        label="Bemerkung"
        {...register(`otherIncomes.${index}.description`)}
        placeholder="z.B. Geld übrig essen"
      />

      <Box sx={{ pt: 1 }}>
        <IconButton
          onClick={onRemove}
          disabled={!canRemove}
          color="error"
          size="small"
        >
          <DeleteIcon />
        </IconButton>
      </Box>
    </Stack>
  );
}
