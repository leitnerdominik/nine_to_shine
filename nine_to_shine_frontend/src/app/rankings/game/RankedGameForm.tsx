'use client';

import { Controller, useWatch } from 'react-hook-form';
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  FormControlLabel,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';

import PageTitle from '@/components/PageTitle';
import type { GameDto, SeasonDto, UserDto } from '@/definitions/types';
import {
  RANKING_POINTS_MAX,
  RANKING_POINTS_MIN,
} from '@/schema/ranking';
import type {
  RankedGameFormApi,
  RankedGameFormOutput,
} from './rankedGameForm';

type ExistingGameSelection = {
  games: GameDto[];
  selectedGameId: number | null;
  onChange: (gameId: number | null) => void;
};

type RankedGameFormProps = {
  mode: 'create' | 'edit';
  title: string;
  seasons: SeasonDto[];
  users: UserDto[];
  form: RankedGameFormApi;
  onSubmit: (values: RankedGameFormOutput) => Promise<void>;
  secondaryAction: {
    label: string;
    onClick: () => void;
  };
  detailsDisabled?: boolean;
  existingGameSelection?: ExistingGameSelection;
};

export default function RankedGameForm({
  mode,
  title,
  seasons,
  users,
  form,
  onSubmit,
  secondaryAction,
  detailsDisabled = false,
  existingGameSelection,
}: RankedGameFormProps) {
  const {
    control,
    register,
    handleSubmit,
    setValue,
    clearErrors,
    formState: { errors, isSubmitting },
  } = form;
  const entries = useWatch({ control, name: 'entries' });
  const userNames = new Map(users.map((user) => [user.id, user.displayName]));

  const handlePresenceToggle = (index: number, present: boolean) => {
    setValue(`entries.${index}.isPresent`, present, {
      shouldValidate: true,
      shouldDirty: true,
    });
    setValue(`entries.${index}.points`, present ? '' : '1', {
      shouldValidate: !present,
      shouldDirty: true,
    });
    if (present) {
      clearErrors(`entries.${index}.points`);
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      sx={{
        width: '100%',
        maxWidth: 1180,
        minHeight: {
          xs: 'calc(100vh - 176px)',
          md: 'calc(100vh - 128px)',
        },
        mx: 'auto',
        pb: 4,
      }}
    >
      <Box component="header" sx={{ mb: { xs: 3, md: 4 } }}>
        <PageTitle title={title} />
      </Box>

      {existingGameSelection && (
        <Paper
          component="section"
          elevation={0}
          aria-labelledby="game-selection-title"
          sx={{
            p: { xs: 2, sm: 3 },
            mb: 2,
            borderRadius: { xs: 3, sm: 4 },
          }}
        >
          <Typography
            id="game-selection-title"
            component="h2"
            variant="overline"
            color="text.secondary"
            sx={{ display: 'block', mb: 2 }}
          >
            Spiel auswählen
          </Typography>
          <TextField
            select
            label="Vorhandenes Spiel auswählen"
            value={existingGameSelection.selectedGameId ?? ''}
            onChange={(event) => {
              const value = event.target.value;
              existingGameSelection.onChange(
                value === '' || value === undefined ? null : Number(value)
              );
            }}
            fullWidth
          >
            <MenuItem value="">Neues Spiel anlegen</MenuItem>
            {existingGameSelection.games.map((game) => (
              <MenuItem key={game.id} value={game.id}>
                {game.gameName}
                {' – '}
                {userNames.get(game.organizedByUserId) ??
                  `#${game.organizedByUserId.toString()}`}
              </MenuItem>
            ))}
          </TextField>
        </Paper>
      )}

      <Paper
        component="section"
        elevation={0}
        aria-labelledby="game-details-title"
        sx={{ p: { xs: 2, sm: 3 }, mb: 2, borderRadius: { xs: 3, sm: 4 } }}
      >
        <Typography
          id="game-details-title"
          component="h2"
          variant="overline"
          color="text.secondary"
          sx={{ display: 'block', mb: 2 }}
        >
          Spieldaten
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: 'repeat(2, minmax(0, 1fr))',
            },
            gap: 2,
          }}
        >
          <Controller
            name="seasonId"
            control={control}
            render={({ field }) => (
              <TextField
                select
                label="Saison"
                value={field.value ?? ''}
                onChange={(event) => field.onChange(Number(event.target.value))}
                error={!!errors.seasonId}
                helperText={errors.seasonId?.message}
                fullWidth
                disabled={detailsDisabled}
              >
                {seasons.map((season) => (
                  <MenuItem key={season.id} value={season.id}>
                    Saison {season.seasonNumber}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />

          <TextField
            label="Datum"
            type="date"
            {...register('playedAt')}
            error={!!errors.playedAt}
            helperText={errors.playedAt?.message}
            fullWidth
            disabled={detailsDisabled}
          />

          <TextField
            label="Spielname"
            {...register('gameName')}
            error={!!errors.gameName}
            helperText={errors.gameName?.message}
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
            autoComplete="off"
            disabled={detailsDisabled}
          />

          <Controller
            name="organizedByUserId"
            control={control}
            render={({ field }) => (
              <TextField
                select
                label="Organisiert von"
                value={field.value && field.value > 0 ? field.value : ''}
                onChange={(event) => field.onChange(Number(event.target.value))}
                error={!!errors.organizedByUserId}
                helperText={errors.organizedByUserId?.message}
                fullWidth
                disabled={detailsDisabled}
              >
                {users.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.displayName}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
        </Box>
      </Paper>

      <Paper
        component="section"
        elevation={0}
        aria-labelledby="player-points-title"
        sx={{ p: { xs: 2, sm: 3 }, borderRadius: { xs: 3, sm: 4 } }}
      >
        <Typography
          id="player-points-title"
          component="h2"
          variant="h6"
          sx={{ mb: 2.5 }}
        >
          Punkte pro Spieler
        </Typography>

        <Box
          aria-hidden="true"
          sx={{
            display: { xs: 'none', sm: 'grid' },
            gridTemplateColumns:
              'minmax(0, 2fr) minmax(150px, 1fr) minmax(120px, 0.7fr)',
            gap: 2,
            px: 1,
            pb: 1.5,
            color: 'text.secondary',
          }}
        >
          {['Name', 'Anwesenheit', 'Punkte'].map((label) => (
            <Typography key={label} variant="overline">
              {label}
            </Typography>
          ))}
        </Box>

        <Stack divider={<Divider />}>
          {entries?.map((entry, index) => {
            const disabled = entry.isPresent === false;
            const points = entry.points ?? '';
            return (
              <Stack
                key={entry.userId}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: 'minmax(0, 1fr)',
                    sm: 'minmax(0, 2fr) minmax(150px, 1fr) minmax(120px, 0.7fr)',
                  },
                  gap: { xs: 1.5, sm: 2 },
                  alignItems: 'center',
                  px: 1,
                  py: 2,
                }}
              >
                <Typography fontWeight={600}>
                  {userNames.get(entry.userId) ?? `Spieler #${entry.userId}`}
                </Typography>

                <FormControlLabel
                  control={
                    <Controller
                      name={`entries.${index}.isPresent`}
                      control={control}
                      render={({ field }) => (
                        <Switch
                          checked={!!field.value}
                          onChange={(event) =>
                            handlePresenceToggle(index, event.target.checked)
                          }
                        />
                      )}
                    />
                  }
                  label="Anwesend"
                  sx={{ m: 0 }}
                />

                <TextField
                  label="Punkte"
                  type="number"
                  {...register(`entries.${index}.points` as const)}
                  error={!!errors.entries?.[index]?.points}
                  helperText={
                    disabled
                      ? 'Abwesend: automatisch 1 Punkt'
                      : errors.entries?.[index]?.points?.message
                  }
                  slotProps={{
                    htmlInput: {
                      min: RANKING_POINTS_MIN,
                      max: RANKING_POINTS_MAX,
                      inputMode: 'numeric',
                      pattern: '[0-9]*',
                    },
                    inputLabel: { shrink: disabled || points !== '' },
                  }}
                  fullWidth
                  disabled={disabled}
                />
              </Stack>
            );
          })}
        </Stack>
      </Paper>

      <Stack
        direction={{ xs: 'column-reverse', sm: 'row' }}
        justifyContent="flex-end"
        spacing={2}
        sx={{ mt: 3 }}
      >
        <Button
          type="button"
          variant="outlined"
          onClick={secondaryAction.onClick}
          sx={{
            width: { xs: '100%', sm: 'auto' },
            borderRadius: 999,
            px: 3,
            textTransform: 'none',
            fontWeight: 700,
          }}
        >
          {secondaryAction.label}
        </Button>

        <Button
          type="submit"
          variant="contained"
          disabled={isSubmitting}
          startIcon={
            isSubmitting ? (
              <CircularProgress size={18} />
            ) : mode === 'create' ? (
              <AddIcon />
            ) : (
              <SaveIcon />
            )
          }
          sx={{
            width: { xs: '100%', sm: 'auto' },
            borderRadius: 999,
            px: 3,
            textTransform: 'none',
            fontWeight: 700,
          }}
        >
          {isSubmitting
            ? mode === 'create'
              ? 'Speichern…'
              : 'Speichert…'
            : 'Speichern'}
        </Button>
      </Stack>
    </Box>
  );
}
