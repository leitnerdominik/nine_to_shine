import {
  Avatar,
  Box,
  Checkbox,
  FormControlLabel,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  Control,
  FieldErrors,
  UseFormRegister,
  useWatch,
} from 'react-hook-form';
import { FormInput } from '../schema/deposit';

interface MemberRowProps {
  index: number;
  control: Control<FormInput>;
  register: UseFormRegister<FormInput>;
  errors: FieldErrors<FormInput>;
}

const desktopColumns =
  'minmax(160px, 1.35fr) minmax(105px, 0.75fr) minmax(115px, 0.9fr) minmax(115px, 0.9fr) minmax(160px, 1.35fr)';

const getInitials = (displayName: string) => {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';

  return `${parts[0][0]}${
    parts.length > 1 ? parts.at(-1)?.[0] ?? '' : ''
  }`.toUpperCase();
};

const MobileLabel = ({ children }: { children: React.ReactNode }) => (
  <Typography
    variant="overline"
    color="text.secondary"
    sx={{
      display: { xs: 'block', md: 'none' },
      mb: 0.5,
      fontSize: '0.68rem',
    }}
  >
    {children}
  </Typography>
);

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
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: desktopColumns },
        gap: { xs: 2, md: 1.5 },
        alignItems: 'center',
        p: { xs: 2, md: 1.5 },
        border: 1,
        borderColor: 'divider',
        borderRadius: '14px',
        bgcolor: 'background.paper',
        opacity: hasPaid ? 1 : 0.72,
        transition: 'opacity 180ms ease, border-color 180ms ease',
        '&:focus-within': { borderColor: 'primary.light' },
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center" minWidth={0}>
        <Avatar
          aria-hidden="true"
          sx={{
            width: 38,
            height: 38,
            bgcolor: '#EAF2FC',
            color: 'text.primary',
            fontSize: '0.78rem',
            fontWeight: 800,
          }}
        >
          {getInitials(displayName)}
        </Avatar>
        <Typography fontWeight={600} noWrap title={displayName}>
          {displayName}
        </Typography>
      </Stack>

      <Box>
        <MobileLabel>Bezahlt</MobileLabel>
        <FormControlLabel
          sx={{ m: 0 }}
          control={
            <Checkbox
              {...register(`entries.${index}.hasPaid`)}
              checked={!!hasPaid}
              sx={{ p: 0.75, mr: 0.5 }}
            />
          }
          label={<Typography color="text.secondary">Bezahlt</Typography>}
        />
      </Box>

      <Box>
        <MobileLabel>Gutschrift</MobileLabel>
        <TextField
          label="Gutschrift"
          type="number"
          size="small"
          disabled={!hasPaid}
          {...register(`entries.${index}.memberAmount`)}
          error={!!rowError?.memberAmount}
          helperText={rowError?.memberAmount?.message}
          slotProps={{
            input: {
              endAdornment: <InputAdornment position="end">€</InputAdornment>,
            },
            inputLabel: { shrink: true },
          }}
          fullWidth
        />
      </Box>

      <Box>
        <MobileLabel>Kasse</MobileLabel>
        <TextField
          label="Kasse"
          type="number"
          size="small"
          disabled={!hasPaid}
          {...register(`entries.${index}.clubAmount`)}
          error={!!rowError?.clubAmount}
          helperText={rowError?.clubAmount?.message}
          slotProps={{
            input: {
              endAdornment: <InputAdornment position="end">€</InputAdornment>,
            },
            inputLabel: { shrink: true },
          }}
          fullWidth
        />
      </Box>

      <Box>
        <MobileLabel>Bemerkung</MobileLabel>
        <TextField
          label="Bemerkung"
          size="small"
          placeholder="Bemerkung"
          disabled={!hasPaid}
          {...register(`entries.${index}.description`)}
          fullWidth
        />
      </Box>
    </Box>
  );
}
