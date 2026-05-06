import {
  Stack,
  Typography,
  Box,
  FormControlLabel,
  Checkbox,
  TextField,
  InputAdornment,
  Button,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import {
  Control,
  UseFormRegister,
  FieldErrors,
  UseFormSetValue,
  UseFormGetValues,
  useWatch,
} from 'react-hook-form';
import { FormInput, STD_MEMBER, STD_CLUB } from '../schema/deposit';

interface MemberRowProps {
  index: number;
  control: Control<FormInput>;
  register: UseFormRegister<FormInput>;
  errors: FieldErrors<FormInput>;
  setValue: UseFormSetValue<FormInput>;
  getValues: UseFormGetValues<FormInput>;
}

export default function DepositMemberRow({
  index,
  control,
  register,
  errors,
  setValue,
  getValues,
}: MemberRowProps) {
  const hasPaid = useWatch({ control, name: `entries.${index}.hasPaid` });
  const displayName = useWatch({
    control,
    name: `entries.${index}.displayName`,
  });

  const rowError = errors.entries?.[index];

  const handleAddStandard = () => {
    const currentMember =
      parseFloat(getValues(`entries.${index}.memberAmount`) || '0') || 0;
    const currentClub =
      parseFloat(getValues(`entries.${index}.clubAmount`) || '0') || 0;

    const addMember = parseFloat(STD_MEMBER);
    const addClub = parseFloat(STD_CLUB);

    setValue(
      `entries.${index}.memberAmount`,
      String(currentMember + addMember),
      { shouldValidate: true }
    );
    setValue(`entries.${index}.clubAmount`, String(currentClub + addClub), {
      shouldValidate: true,
    });
  };

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

        <Button
          variant="outlined"
          size="small"
          onClick={handleAddStandard}
          disabled={!hasPaid}
          sx={{ minWidth: '40px', p: 1 }}
          title="Standardbetrag hinzufügen"
        >
          <AddIcon fontSize="small" />
        </Button>
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
