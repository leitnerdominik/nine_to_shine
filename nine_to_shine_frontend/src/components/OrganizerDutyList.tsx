'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Chip,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import dayjs from 'dayjs';
import 'dayjs/locale/de';
import { useSnackbar } from 'notistack';

import { apiOrganizerDuty, apiSeason } from '@/definitions/commands';
import type { OrganizerDutyDto, SeasonDto } from '@/definitions/types';
import LoadingSkeleton from './LoadingSkeleton';
import PageTitle from './PageTitle';

// Deutsche Lokalisierung aktivieren
dayjs.locale('de');

export default function OrganizerDutyList() {
  const { enqueueSnackbar } = useSnackbar();

  // State
  const [loading, setLoading] = useState<boolean>(true);
  const [seasons, setSeasons] = useState<SeasonDto[]>([]);
  const [duties, setDuties] = useState<OrganizerDutyDto[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);

  // Daten laden
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [allSeasons, allDuties] = await Promise.all([
        apiSeason.getAll(),
        apiOrganizerDuty.getAll(),
      ]);

      setSeasons(allSeasons);
      setDuties(allDuties);

      // Automatisch die aktuellste Saison (höchste Nummer) auswählen, falls vorhanden
      if (allSeasons.length > 0) {
        const sortedSeasons = [...allSeasons].sort(
          (a, b) => b.seasonNumber - a.seasonNumber
        );
        setSelectedSeasonId(sortedSeasons[0].id);
      }
    } catch (e) {
      enqueueSnackbar(
        (e as Error)?.message ?? 'Daten konnten nicht geladen werden.',
        { variant: 'error' }
      );
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Daten filtern und sortieren basierend auf der Auswahl
  const filteredDuties = useMemo(() => {
    if (!selectedSeasonId) return [];

    return duties
      .filter((d) => d.seasonId === selectedSeasonId)
      .sort(
        (a, b) => dayjs(a.dutyDate).valueOf() - dayjs(b.dutyDate).valueOf()
      );
  }, [duties, selectedSeasonId]);

  // Saison-Liste für die Auswahl sortieren (Neueste zuerst)
  const sortedSeasons = useMemo(() => {
    return [...seasons].sort((a, b) => b.seasonNumber - a.seasonNumber);
  }, [seasons]);

  const selectedSeason = seasons.find(
    (season) => season.id === selectedSeasonId
  );
  const selectedSeasonYear = useMemo(() => {
    const earliestDutyTimestamp = filteredDuties.reduce<number | null>(
      (earliest, duty) => {
        const dutyDate = dayjs(duty.dutyDate);

        if (!dutyDate.isValid()) return earliest;

        const timestamp = dutyDate.valueOf();
        return earliest == null || timestamp < earliest ? timestamp : earliest;
      },
      null
    );

    return earliestDutyTimestamp == null
      ? null
      : dayjs(earliestDutyTimestamp).year();
  }, [filteredDuties]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <Box
      sx={{
        minHeight: { xs: 'calc(100vh - 176px)', md: 'calc(100vh - 128px)' },
        mx: { xs: -1.5, sm: 0 },
        px: { xs: 1.5, sm: 0 },
        pb: 4,
      }}
    >
      <Box sx={{ maxWidth: 1180, mx: 'auto', width: '100%' }}>
        <Stack
          component="header"
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', md: 'flex-end' }}
          spacing={{ xs: 2.5, md: 4 }}
          sx={{ mb: { xs: 2.5, md: 3 } }}
        >
          <Box>
            {selectedSeason && (
              <Typography
                variant="overline"
                color="text.secondary"
                sx={{ display: 'block', mb: 0.75 }}
              >
                Saison {selectedSeason.seasonNumber}
                {selectedSeasonYear == null ? '' : ` • ${selectedSeasonYear}`}
              </Typography>
            )}
            <Box sx={{ mb: 1.75 }}>
              <PageTitle title="Organisieren der Treffen" />
            </Box>
          </Box>

          {sortedSeasons.length > 0 ? (
            <TextField
              select
              label="Saison"
              value={selectedSeasonId ?? ''}
              onChange={(event) =>
                setSelectedSeasonId(Number(event.target.value))
              }
              sx={{
                width: { xs: '100%', md: 260 },
                flexShrink: 0,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2.5,
                  bgcolor: (theme) =>
                    alpha(theme.palette.background.paper, 0.94),
                  boxShadow: (theme) =>
                    `0 8px 24px ${alpha(theme.palette.primary.dark, 0.06)}`,
                },
              }}
            >
              {sortedSeasons.map((season) => (
                <MenuItem key={season.id} value={season.id}>
                  Saison {season.seasonNumber}
                </MenuItem>
              ))}
            </TextField>
          ) : (
            <Typography color="text.secondary">
              Keine Saisons gefunden.
            </Typography>
          )}
        </Stack>

        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            borderRadius: { xs: 3, sm: 3.5 },
            border: 1,
            borderColor: (theme) => alpha(theme.palette.primary.main, 0.08),
            boxShadow: (theme) =>
              `0 16px 42px ${alpha(theme.palette.primary.dark, 0.09)}`,
            overflow: 'hidden',
          }}
        >
          <Table
            aria-label="Organisatoren Tabelle"
            sx={{ tableLayout: 'fixed' }}
          >
            <TableHead
              sx={{
                background: (theme) =>
                  `linear-gradient(110deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
              }}
            >
              <TableRow>
                <TableCell
                  sx={{
                    width: '40%',
                    py: { xs: 1.5, sm: 1.75 },
                    px: { xs: 2, sm: 3 },
                    borderBottom: 0,
                    color: 'primary.contrastText',
                    fontSize: { xs: '0.95rem', sm: '1.05rem' },
                    fontWeight: 800,
                  }}
                >
                  Monat
                </TableCell>
                <TableCell
                  sx={{
                    py: { xs: 1.5, sm: 1.75 },
                    px: { xs: 2, sm: 3 },
                    borderBottom: 0,
                    color: 'primary.contrastText',
                    fontSize: { xs: '0.95rem', sm: '1.05rem' },
                    fontWeight: 800,
                  }}
                >
                  Name
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredDuties.map((duty) => (
                <TableRow
                  key={duty.id}
                  sx={{
                    '&:last-child .MuiTableCell-root': { borderBottom: 0 },
                  }}
                >
                  <TableCell
                    sx={{
                      py: { xs: 1.45, sm: 1.65 },
                      px: { xs: 2, sm: 3 },
                      borderColor: 'divider',
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: { xs: '0.9rem', sm: '1rem' },
                        fontWeight: 500,
                        lineHeight: 1.35,
                      }}
                    >
                      {dayjs(duty.dutyDate).format('MMMM YYYY')}
                    </Typography>
                  </TableCell>
                  <TableCell
                    sx={{
                      py: { xs: 1.45, sm: 1.65 },
                      px: { xs: 2, sm: 3 },
                      borderColor: 'divider',
                    }}
                  >
                    {duty.isSkipped ? (
                      <Chip
                        label="Entfällt"
                        size="small"
                        sx={{
                          bgcolor: 'grey.100',
                          color: 'text.primary',
                          fontWeight: 500,
                        }}
                      />
                    ) : (
                      <Typography
                        sx={{
                          color: 'text.secondary',
                          fontSize: { xs: '0.9rem', sm: '1rem' },
                          fontWeight: 500,
                          lineHeight: 1.35,
                          overflowWrap: 'anywhere',
                        }}
                      >
                        {duty.userDisplayName ?? '-'}
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}

              {filteredDuties.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={2}
                    align="center"
                    sx={{ py: 4, color: 'text.secondary', borderBottom: 0 }}
                  >
                    Keine Einträge für diese Saison vorhanden.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
}
