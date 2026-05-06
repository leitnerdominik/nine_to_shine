'use client';

import { client } from '@/common/contentful';
import CustomTitle from '@/components/CustomTitle';
import Layout from '@/components/Layout';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import {
  Box,
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
import dayjs from 'dayjs';
import { useSnackbar } from 'notistack';
import { useCallback, useEffect, useState } from 'react';

interface IEinAusZahlung {
  id: string;
  datum: Date;
  betrag: number;
  bemerkung: string;
}

type EinAusZahlungSkeleton = EntrySkeletonType<IEinAusZahlung, 'einAusZahlung'>;

type ContentfulEinAusZahlungenEntry = Entry<
  EinAusZahlungSkeleton,
  undefined,
  string
>;

const EinAusZahlungen = () => {
  const [einAusZahlungen, setEinAusZahlungen] = useState<IEinAusZahlung[]>([]);
  const [sum, setSum] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const theme = useTheme();

  const { enqueueSnackbar } = useSnackbar();

  const fetchEinAusZahlungen = useCallback(async (): Promise<
    IEinAusZahlung[]
  > => {
    try {
      const response: EntryCollection<EinAusZahlungSkeleton> =
        await client.getEntries<EinAusZahlungSkeleton>({
          content_type: 'einAusZahlung',
        });
      const items = response.items as ContentfulEinAusZahlungenEntry[];
      const result: IEinAusZahlung[] = items.map((item) => ({
        id: item.sys.id,
        datum: item.fields.datum,
        betrag: item.fields.betrag,
        bemerkung: item.fields.bemerkung,
      }));
      console.log(result);
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

  const calculateSum = useCallback(() => {
    const totalAmount = [...einAusZahlungen].reduce(
      (sum, item) => sum + item.betrag,
      0
    );

    setSum(totalAmount);
  }, [einAusZahlungen]);

  useEffect(() => {
    const getEinAusZahlungen = async () => {
      const data = await fetchEinAusZahlungen();
      const dataSorted = [...data].sort(
        (a, b) => new Date(a.datum).getTime() - new Date(b.datum).getTime()
      );
      setEinAusZahlungen(dataSorted);
    };
    getEinAusZahlungen();
  }, [fetchEinAusZahlungen]);

  useEffect(() => {
    calculateSum();
  }, [calculateSum]);

  return (
    <Layout>
      {loading ? (
        <LoadingSkeleton />
      ) : (
        <>
          <Box>
            <CustomTitle text="Zahlungen " />
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
                      Datum
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
                  {einAusZahlungen.map((value) => (
                    <TableRow key={value.id}>
                      <TableCell>
                        {dayjs(value.datum).format('DD.MM.YYYY')}
                      </TableCell>
                      <TableCell
                        sx={{ color: value.betrag > 0 ? 'green' : 'red' }}
                      >
                        {value.betrag} €
                      </TableCell>
                      <TableCell>{value.bemerkung}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell
                      align="right"
                      colSpan={3}
                      sx={{ fontWeight: 700 }}
                    >
                      Summe: {sum.toFixed(2)} €
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </>
      )}
    </Layout>
  );
};

export default EinAusZahlungen;
