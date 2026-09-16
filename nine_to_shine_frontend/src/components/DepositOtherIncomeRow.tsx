import {
  Box,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { FieldErrors, UseFormRegister } from 'react-hook-form';
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
      alignItems={{ xs: 'stretch', sm: 'flex-start' }}
    >
      <TextField
        label="Betrag"
        type="number"
        size="small"
        {...register(`otherIncomes.${index}.amount`)}
        error={!!rowError?.amount}
        helperText={rowError?.amount?.message}
        slotProps={{
          input: {
            endAdornment: <InputAdornment position="end">€</InputAdornment>,
          },
        }}
        sx={{ width: { xs: '100%', sm: 220 }, flexShrink: 0 }}
      />

      <TextField
        fullWidth
        label="Bemerkung"
        size="small"
        {...register(`otherIncomes.${index}.description`)}
        placeholder="z. B. Strafe oder Restgeld"
      />

      <Box sx={{ alignSelf: { xs: 'flex-end', sm: 'center' } }}>
        <Tooltip title={canRemove ? 'Einnahme entfernen' : ''}>
          <span>
            <IconButton
              aria-label="Einnahme entfernen"
              onClick={onRemove}
              disabled={!canRemove}
              size="small"
              sx={{ color: 'text.secondary' }}
            >
              <DeleteOutlineIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    </Stack>
  );
}
