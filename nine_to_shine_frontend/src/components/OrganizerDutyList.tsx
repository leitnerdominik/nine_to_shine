'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useTheme,
} from '@mui/material';
import dayjs from 'dayjs';
import 'dayjs/locale/de';
import { useSnackbar } from 'notistack';

import CustomTitle from '@/components/CustomTitle';
import { apiOrganizerDuty, apiSeason } from '@/definitions/commands';
import type { OrganizerDutyDto, SeasonDto } from '@/definitions/types';
import LoadingSkeleton from './LoadingSkeleton';

// Deutsche Lokalisierung aktivieren
dayjs.locale('de');

export default function OrganizerDutyList() {
  const theme = useTheme();
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

  // Saison-Liste für die Buttons sortieren (Neueste zuerst)
  const sortedSeasons = useMemo(() => {
    return [...seasons].sort((a, b) => b.seasonNumber - a.seasonNumber);
  }, [seasons]);

  if (loading) {
    return (
      <LoadingSkeleton />
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', width: '100%' }}>
      <Stack spacing={2} sx={{ mb: 3 }}>
        <CustomTitle text="Organisieren der Treffen" />

        {/* Saison Auswahl Buttons */}
        {sortedSeasons.length > 0 ? (
          <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1}>
            {sortedSeasons.map((s) => (
              <Button
                key={s.id}
                variant={selectedSeasonId === s.id ? 'contained' : 'outlined'}
                onClick={() => setSelectedSeasonId(s.id)}
              >
                Saison {s.seasonNumber}
              </Button>
            ))}
          </Stack>
        ) : (
          <Typography color="text.secondary">
            Keine Saisons gefunden.
          </Typography>
        )}
      </Stack>

      {/* Tabelle */}
      <TableContainer component={Paper} elevation={1}>
        <Table aria-label="Organisatoren Tabelle">
          <TableHead
            sx={{
              background: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
            }}
          >
            <TableRow>
              <TableCell
                sx={{
                  fontWeight: 700,
                  color: 'inherit',
                  fontSize: '1.1rem',
                }}
                width="40%"
              >
                Monat
              </TableCell>
              <TableCell
                sx={{
                  fontWeight: 700,
                  color: 'inherit',
                  fontSize: '1.1rem',
                }}
              >
                Name
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredDuties.map((duty) => (
              <TableRow key={duty.id} hover>
                <TableCell>
                  {/* Formatierung: Dezember 2025 */}
                  <Typography variant="body1">
                    {dayjs(duty.dutyDate).format('MMMM YYYY')}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body1" fontWeight={500}>
                    {duty.userDisplayName}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}

            {filteredDuties.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={2}
                  align="center"
                  sx={{ py: 4, color: 'text.secondary' }}
                >
                  Keine Einträge für diese Saison vorhanden.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
