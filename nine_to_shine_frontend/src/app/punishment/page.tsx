'use client';

import { client } from '@/common/contentful';
import Layout from '@/components/Layout';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import {
  Box,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useTheme,
} from '@mui/material';
import { Entry, EntryCollection, EntrySkeletonType } from 'contentful';
import { useSnackbar } from 'notistack';
import React, { useCallback, useEffect, useState } from 'react';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import CustomTitle from '@/components/CustomTitle';

interface PunishmentEntry {
  vergehen: string;
  betrag: number;
  bemerkung: string;
}

interface AssignPenaltyEntry {
  name: string;
  betrag: number;
  vergehen: string;
  bemerkung: string;
  bezahlt: boolean;
}

type PunishmentSkeleton = EntrySkeletonType<PunishmentEntry, 'strafen'>;

type AssignPenaltySkeleton = EntrySkeletonType<
  AssignPenaltyEntry,
  'strafenVergeben'
>;

type ContentfulPunishmentEntry = Entry<PunishmentSkeleton, undefined, string>;

type ContentfulAssignPenaltyEntry = Entry<
  AssignPenaltySkeleton,
  undefined,
  string
>;

const Punishment: React.FC = () => {
  const [punishments, setPunishments] = useState<PunishmentEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [assignPenalty, setAssignPenalty] = useState<AssignPenaltyEntry[]>([]);
  const [loadingAssignPenalty, setLoadingAssignPenalty] =
    useState<boolean>(true);
  const theme = useTheme();

  const { enqueueSnackbar } = useSnackbar();

  const fetchPunishments = useCallback(async (): Promise<PunishmentEntry[]> => {
    try {
      const response: EntryCollection<PunishmentSkeleton> =
        await client.getEntries<PunishmentSkeleton>({
          content_type: 'strafen',
        });
      const items = response.items as ContentfulPunishmentEntry[];
      const result: PunishmentEntry[] = items.map((item) => ({
        vergehen: item.fields.vergehen,
        betrag: item.fields.betrag,
        bemerkung: item.fields.bemerkung,
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

  const fetchAssignPenalty = useCallback(async (): Promise<
    AssignPenaltyEntry[]
  > => {
    try {
      const response: EntryCollection<AssignPenaltySkeleton> =
        await client.getEntries<AssignPenaltySkeleton>({
          content_type: 'strafenVergeben',
        });
      const items = response.items as ContentfulAssignPenaltyEntry[];
      const result: AssignPenaltyEntry[] = items.map((item) => ({
        name: item.fields.name,
        bezahlt: item.fields.bezahlt,
        vergehen: item.fields.vergehen,
        betrag: item.fields.betrag,
        bemerkung: item.fields.bemerkung,
      }));
      return result;
    } catch (error) {
      if (error instanceof Error) {
        enqueueSnackbar(error.message, { variant: 'error' });
      }
      return [];
    } finally {
      setLoadingAssignPenalty(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    const getContent = async () => {
      const data = await fetchPunishments();
      setPunishments(data);

      const assPenalty = await fetchAssignPenalty();
      setAssignPenalty(assPenalty);
    };
    getContent();
  }, [fetchAssignPenalty, fetchPunishments]);

  return (
    <Layout>
      <Box>
        {loading ? (
          <LoadingSkeleton />
        ) : (
          <>
            <CustomTitle text="Strafen " />
            <TableContainer component={Paper}>
              <Table aria-label="a punishment table">
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
                      Vergehen
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        fontSize: 'inherit',
                        color: 'inherit',
                      }}
                    >
                      Betrag
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        fontSize: 'inherit',
                        color: 'inherit',
                      }}
                    >
                      Bemerkung
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {punishments.map((punish, index) => (
                    <TableRow key={index}>
                      <TableCell>{punish.vergehen}</TableCell>
                      <TableCell>{punish.betrag} €</TableCell>
                      <TableCell>{punish.bemerkung}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
        <Divider sx={{ my: 3 }} />
        {loadingAssignPenalty ? (
          <LoadingSkeleton />
        ) : (
          <>
            <CustomTitle text="Vergehen " />
            <TableContainer component={Paper}>
              <Table aria-label="a penalty table">
                <TableHead>
                  <TableRow
                    sx={{
                      background: theme.palette.primary.main,
                      color: theme.palette.primary.contrastText,
                      fontSize: '1.1rem',
                    }}
                  >
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
                      Betrag
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        fontSize: 'inherit',
                        color: 'inherit',
                      }}
                    >
                      Vergehen
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        fontSize: 'inherit',
                        color: 'inherit',
                      }}
                    >
                      Bemerkung
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        fontSize: 'inherit',
                        color: 'inherit',
                      }}
                    >
                      Bezahlt
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {assignPenalty.map((penalty, index) => (
                    <TableRow key={index}>
                      <TableCell>{penalty.name}</TableCell>
                      <TableCell>{penalty.betrag} €</TableCell>
                      <TableCell>{penalty.vergehen}</TableCell>
                      <TableCell>{penalty.bemerkung}</TableCell>
                      <TableCell>
                        {penalty.bezahlt ? (
                          <CheckIcon color="success" />
                        ) : (
                          <CloseIcon color="error" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </Box>
    </Layout>
  );
};

export default Punishment;
