'use client';

import { client } from '@/common/contentful';
import { capitalizeFirstLetter } from '@/common/misc';
import { routes } from '@/common/routes';
import {
  ContentfulRankingEntry,
  IRankingEntry,
  RankingSkeleton,
} from '@/common/types';
import CustomTitle from '@/components/CustomTitle';
import EntryTile from '@/components/EntryTile';
import Layout from '@/components/Layout';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import {
  Box,
  Button,
  Divider,
  Fab,
  Link,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { EntryCollection } from 'contentful';
import dayjs from 'dayjs';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { useSnackbar } from 'notistack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import AddIcon from '@mui/icons-material/Add';

const Rankings = () => {
  const [rankings, setRankings] = useState<IRankingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const fetchRankings = useCallback(async (): Promise<IRankingEntry[]> => {
    try {
      const response: EntryCollection<RankingSkeleton> =
        await client.getEntries<RankingSkeleton>({
          content_type: 'ranking',
        });
      const items = response.items as ContentfulRankingEntry[];
      const result: IRankingEntry[] = items.map((item) => ({
        id: item.sys.id,
        title: item.fields.title,
        datum: dayjs(item.fields.datum).format('DD.MM.YYYY'),
        bubi: item.fields.bubi,
        dave: item.fields.dave,
        dommo: item.fields.dommo,
        flori: item.fields.flori,
        geti: item.fields.geti,
        martin: item.fields.martin,
        simi: item.fields.simi,
        stocki: item.fields.stocki,
        tom: item.fields.tom,
        season: item.fields.season,
      }));
      return result;
    } catch (error) {
      if (error instanceof Error) {
        enqueueSnackbar(error.message, { variant: 'error' });
      }
      return [];
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    const getRankings = async () => {
      const data = await fetchRankings();
      setRankings(data);
    };
    getRankings();
  }, [fetchRankings]);

  // --- Only calculate sums per season ---
  type Totals = {
    flori: number;
    simi: number;
    geti: number;
    stocki: number;
    tom: number;
    martin: number;
    bubi: number;
    dave: number;
    dommo: number;
  };

  const zeroTotals: Totals = useMemo(
    () => ({
      flori: 0,
      simi: 0,
      geti: 0,
      stocki: 0,
      tom: 0,
      martin: 0,
      bubi: 0,
      dave: 0,
      dommo: 0,
    }),
    []
  );

  // Precompute totals grouped by season once from all entries
  const totalsBySeason = useMemo(() => {
    const map = new Map<number, Totals>();
    for (const r of rankings) {
      if (typeof r.season !== 'number' || Number.isNaN(r.season)) continue;
      const current = map.get(r.season) ?? { ...zeroTotals };
      current.flori += r.flori;
      current.simi += r.simi;
      current.geti += r.geti;
      current.stocki += r.stocki;
      current.tom += r.tom;
      current.martin += r.martin;
      current.bubi += r.bubi;
      current.dave += r.dave;
      current.dommo += r.dommo;
      map.set(r.season, current);
    }
    return map;
  }, [rankings, zeroTotals]);

  // All available seasons (numbers), sorted DESC (newest first)
  const seasons = useMemo<number[]>(() => {
    const uniq = Array.from(new Set(rankings.map((r) => r.season))).filter(
      (v): v is number => typeof v === 'number' && !Number.isNaN(v)
    );
    return uniq.sort((a, b) =>
      String(b).localeCompare(String(a), undefined, {
        numeric: true,
        sensitivity: 'base',
      })
    );
  }, [rankings]);

  // Selected season from URL (?season=1234), defaults to first (newest)
  const selectedSeason = useMemo<number | undefined>(() => {
    const s = searchParams.get('season');
    const parsed = s !== null ? Number(s) : NaN;
    if (!Number.isNaN(parsed) && seasons.includes(parsed)) return parsed;
    return seasons[0];
  }, [searchParams, seasons]);

  // Update URL helper (no full reload)
  const setSeason = useCallback(
    (season: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('season', String(season));
      router.replace(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  // Sorted totals for the currently selected season only
  const sortedTotals = useMemo<[string, number][]>(() => {
    if (selectedSeason == null) return [];
    const totals = totalsBySeason.get(selectedSeason) ?? zeroTotals;
    return Object.entries(totals).sort((a, b) => b[1] - a[1]);
  }, [selectedSeason, totalsBySeason, zeroTotals]);

  // Filter rankings by selected season for the games list
  const seasonEntries = useMemo(
    () =>
      selectedSeason == null
        ? []
        : rankings.filter((r) => r.season === selectedSeason),
    [rankings, selectedSeason]
  );

  return (
    <Layout>
      {loading ? (
        <LoadingSkeleton />
      ) : (
        <>
          {/* Season header & navigation */}
          <Stack
            direction="column"
            alignItems="flex-start"
            justifyContent="space-between"
            spacing={2}
            sx={{ mb: 2 }}
          >
            <CustomTitle text="Rangliste" />
            <Typography variant="h5" component="h3">{`Saison ${
              selectedSeason ?? '–'
            }`}</Typography>
          </Stack>

          {/* Season picker buttons */}
          {seasons.length > 1 && selectedSeason != null && (
            <Stack
              direction="row"
              flexWrap="wrap"
              useFlexGap
              spacing={1}
              sx={{ mb: 2 }}
            >
              {seasons.map((s) => (
                <Button
                  key={s}
                  size="large"
                  variant={s === selectedSeason ? 'contained' : 'outlined'}
                  onClick={() => setSeason(s)}
                >
                  {s}
                </Button>
              ))}
            </Stack>
          )}

          {/* Totals for selected season */}
          <Box>
            <TableContainer component={Paper}>
              <Table aria-label="season totals table">
                <TableHead
                  sx={{
                    background: theme.palette.primary.main,
                    color: theme.palette.text.secondary,
                    fontSize: '1.1rem',
                  }}
                >
                  <TableRow>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        fontSize: 'inherit',
                        color: 'inherit',
                      }}
                    >
                      Platz
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        fontSize: 'inherit',
                        color: 'inherit',
                      }}
                    >
                      Name
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        fontSize: 'inherit',
                        color: 'inherit',
                      }}
                    >
                      Punkte
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedTotals.map(([key, value], index) => (
                    <TableRow key={key}>
                      <TableCell># {index + 1}</TableCell>
                      <TableCell>{capitalizeFirstLetter(key)}</TableCell>
                      <TableCell>{value}</TableCell>
                    </TableRow>
                  ))}
                  {sortedTotals.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3}>
                        <Typography variant="body2">
                          Keine Daten für diese Saison.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          <Divider sx={{ margin: '1.5rem 0' }} />

          {/* Games within selected season */}
          <Typography variant="h6" gutterBottom>
            Spiele
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              flexWrap: 'wrap',
              gap: 2,
              justifyContent: 'center',
            }}
          >
            {seasonEntries.map((entry) => (
              <EntryTile
                key={entry.id}
                id={entry.id}
                date={entry.datum}
                title={entry.title}
                baseRoute={routes.rankings}
              />
            ))}
            {seasonEntries.length === 0 && (
              <Typography variant="body2">
                Keine Spiele in dieser Saison vorhanden.
              </Typography>
            )}
          </Box>
        </>
      )}
      <Tooltip title="Neues Spiel hinzufügen" placement="left">
        <Fab
          component={Link}
          href="rankings/new"
          color="primary"
          aria-label="Neu"
          sx={{
            position: 'fixed',
            right: { xs: 16, md: 24 },
            bottom: { xs: 16, md: 24 },
            zIndex: (t) => t.zIndex.tooltip + 1,
          }}
        >
          <AddIcon />
        </Fab>
      </Tooltip>
    </Layout>
  );
};

export default Rankings;
