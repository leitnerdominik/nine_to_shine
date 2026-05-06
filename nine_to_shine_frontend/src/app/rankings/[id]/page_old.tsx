'use client';

import { client } from '@/common/contentful';
import Layout from '@/components/Layout';
import { Entry } from 'contentful';
import dayjs from 'dayjs';
import { useParams } from 'next/navigation';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ContentfulRankingEntry,
  IRankingEntry,
  RankingSkeleton,
} from '@/common/types';
import {
  Box,
  Chip,
  Container,
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
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { useSnackbar } from 'notistack';
import CustomTitle from '@/components/CustomTitle';

const RankingEntry: React.FC = () => {
  const params = useParams(); // Use `useParams` to get the route parameters
  const id = params?.id as string;

  const [ranking, setRanking] = useState<IRankingEntry | undefined>();
  const [loading, setLoading] = useState(true);
  const theme = useTheme();

  const { enqueueSnackbar } = useSnackbar();

  const fetchContent = useCallback(async (): Promise<IRankingEntry | null> => {
    try {
      const response: Entry<RankingSkeleton> = await client.getEntry(id);
      const item = response as ContentfulRankingEntry;
      const result: IRankingEntry = {
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
      };
      setLoading(false);
      return result;
    } catch (error) {
      if (error instanceof Error) {
        enqueueSnackbar(error.message, { variant: 'error' });
      }

      return null;
    }
  }, [enqueueSnackbar, id]);

  useEffect(() => {
    const getContent = async () => {
      const data = await fetchContent();
      if (data) setRanking(data);
    };
    getContent();
  }, [fetchContent]);

  return (
    <Layout>
      {loading ? (
        <LoadingSkeleton />
      ) : (
        ranking && (
          <Container>
            <Box marginBottom="2rem">
              <CustomTitle text={ranking.title} />
              <Stack direction="column" spacing={1} alignItems="flex-start">
                <Typography variant="body2">{ranking.datum}</Typography>
                <Chip
                  label={`Saison ${ranking.season}`}
                  size="medium"
                  sx={{ bgcolor: theme.palette.action.selected }}
                />
              </Stack>
              <Divider sx={{ mt: 1 }} />
              <Divider />
            </Box>
            <TableContainer component={Paper}>
              <Table aria-label="a table">
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
                  {Object.entries(ranking)
                    .filter(
                      ([key]) =>
                        key !== 'id' && key !== 'title' && key !== 'datum'
                    ) // Exclude metadata fields
                    .map(([key, value]) => ({
                      name: key.charAt(0).toUpperCase() + key.slice(1),
                      value,
                    })) // Map to name-value objects
                    .sort((a, b) => b.value - a.value) // Sort by value in descending order
                    .map((entry, index) => (
                      <TableRow key={entry.name}>
                        <TableCell># {index + 1}</TableCell>
                        <TableCell>{entry.name}</TableCell>
                        <TableCell>{entry.value}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Container>
        )
      )}
    </Layout>
  );
};

export default RankingEntry;
