'use client';

import { client } from '@/common/contentful';
import { capitalizeFirstLetter } from '@/common/misc';
import { options } from '@/common/richtextoptions';
import Layout from '@/components/Layout';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { documentToReactComponents } from '@contentful/rich-text-react-renderer';
import { Document } from '@contentful/rich-text-types';
import {
  Box,
  Button,
  Divider,
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
import {
  Entry,
  EntryCollection,
  EntryFieldTypes,
  EntrySkeletonType,
} from 'contentful';
import dayjs from 'dayjs';
import localeData from 'dayjs/plugin/localeData';
import 'dayjs/locale/de'; // Import German locale
import { useSnackbar } from 'notistack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import CustomTitle from '@/components/CustomTitle';

interface ContentfulConstitutionFields {
  content: EntryFieldTypes.RichText;
}

interface ConstitutionEntry {
  content: Document;
}

type ConstitutionSkeleton = EntrySkeletonType<
  ContentfulConstitutionFields,
  'home'
>;

export type ContentfulConstitutionEntry = Entry<
  ConstitutionSkeleton,
  undefined,
  string
>;

interface IEventOrganize {
  id: string;
  name: string;
  date: Date;
  aktivitaet: string;
  season: number;
}

type EventOrganizeSkeleton = EntrySkeletonType<IEventOrganize, 'eventOrganize'>;

type ContentfulEventOrganizeEntry = Entry<
  EventOrganizeSkeleton,
  undefined,
  string
>;

export default function Home() {
  const [constitution, setConstitution] = useState<
    ConstitutionEntry | undefined
  >();
  const [eventOrganize, setEventOrganize] = useState<IEventOrganize[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingEventOrganize, setLoadingEventOrganize] =
    useState<boolean>(false);
  const [selectedSeason, setSelectedSeason] = useState<number | undefined>(
    undefined
  );

  const theme = useTheme();

  dayjs.extend(localeData);
  dayjs.locale('de');

  const { enqueueSnackbar } = useSnackbar();

  const fetchContent = useCallback(async (): Promise<
    ConstitutionEntry | undefined
  > => {
    try {
      setLoading(true);
      const response: EntryCollection<ConstitutionSkeleton> =
        await client.getEntries<ConstitutionSkeleton>({
          content_type: 'home',
          order: ['-sys.createdAt'],
          limit: 1,
        });
      const item = response.items as ContentfulConstitutionEntry[];
      const result: ConstitutionEntry = {
        content: item[0].fields.content,
      };
      setLoading(false);
      return result;
    } catch (error) {
      console.error(error);
      return undefined;
    }
  }, []);

  const fetchEventOrganize = useCallback(async (): Promise<
    IEventOrganize[]
  > => {
    try {
      setLoadingEventOrganize(true);
      const response: EntryCollection<EventOrganizeSkeleton> =
        await client.getEntries<EventOrganizeSkeleton>({
          content_type: 'eventOrganize',
        });
      const items = response.items as ContentfulEventOrganizeEntry[];
      const result: IEventOrganize[] = items.map((item) => ({
        id: item.sys.id,
        name: item.fields.name,
        date: item.fields.date,
        aktivitaet: item.fields.aktivitaet,
        season: Number(item.fields.season),
      }));
      return result;
    } catch (error) {
      if (error instanceof Error) {
        enqueueSnackbar(error.message, { variant: 'error' });
      }
      return [];
    } finally {
      setLoadingEventOrganize(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    const getContent = async () => {
      const data = await fetchContent();
      setConstitution(data);
    };
    getContent();
  }, [fetchContent]);

  useEffect(() => {
    const getEventOrganizes = async () => {
      const data = await fetchEventOrganize();
      const dataSorted = [...data].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      setEventOrganize(dataSorted);
    };
    getEventOrganizes();
  }, [fetchEventOrganize]);

  const seasons = useMemo<number[]>(() => {
    const uniq = Array.from(new Set(eventOrganize.map((e) => e.season))).filter(
      (v): v is number => typeof v === 'number' && !Number.isNaN(v)
    );
    return uniq.sort((a, b) =>
      String(b).localeCompare(String(a), undefined, {
        numeric: true,
        sensitivity: 'base',
      })
    );
  }, [eventOrganize]);

  // Default to first season when data arrives / changes
  useEffect(() => {
    if (selectedSeason == null && seasons.length > 0) {
      setSelectedSeason(seasons[0]);
    }
  }, [seasons, selectedSeason]);

  // Filter events to selected season and then sort by date ASC
  const eventsForSeason = useMemo(() => {
    if (selectedSeason == null) return [] as IEventOrganize[];
    return [...eventOrganize]
      .filter((e) => e.season === selectedSeason)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [eventOrganize, selectedSeason]);

  return (
    <Layout>
      {loading ? (
        <LoadingSkeleton />
      ) : (
        constitution?.content && (
          <Box sx={{ marginTop: '3rem' }}>
            {documentToReactComponents(constitution?.content, options)}
          </Box>
        )
      )}
      <Divider sx={{ mt: 10, mb: 10 }} />
      {loadingEventOrganize ? (
        <LoadingSkeleton />
      ) : (
        <Box>
          <Stack
            direction="column"
            alignItems="flex-start"
            justifyContent="space-between"
            spacing={2}
            sx={{ mb: 2 }}
          >
            <CustomTitle text="Treffen organisieren" />
            <Typography sx={{ mt: 5 }} component="h5" variant="h5">
              Saison
            </Typography>
          </Stack>
          {seasons.length > 0 && (
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
                  size="small"
                  variant={s === selectedSeason ? 'contained' : 'outlined'}
                  onClick={() => setSelectedSeason(s)}
                >
                  {s}
                </Button>
              ))}
            </Stack>
          )}
          <TableContainer component={Paper}>
            <Table aria-label="a table">
              <TableHead
                sx={{
                  background: theme.palette.primary.main,
                  color: theme.palette.primary.contrastText,
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
                    Monat
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
                    Aktivität
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {eventsForSeason.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      {dayjs(event.date).format('MMMM YYYY')}
                    </TableCell>
                    <TableCell>{capitalizeFirstLetter(event.name)}</TableCell>
                    <TableCell>{event.aktivitaet}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Layout>
  );
}
