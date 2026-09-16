'use client';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  Box,
  Chip,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import dayjs from 'dayjs';

import { formatCurrency } from '@/common/misc';
import type { FinanceDto } from '@/definitions/types';

type BankAccountDetailsProps = {
  title: string;
  balanceLabel: string;
  balance: number;
  transactions: FinanceDto[];
  emptyMessage: string;
  onBack: () => void;
};

function TransactionCategory({ category }: { category: string }) {
  return (
    <Chip
      label={category}
      size="small"
      variant="outlined"
      color={category === 'DUES' ? 'primary' : 'default'}
      sx={{
        minWidth: 76,
        borderRadius: '999px',
        fontWeight: 500,
        '& .MuiChip-label': { px: 1.5 },
      }}
    />
  );
}

function TransactionDescription({ transaction }: { transaction: FinanceDto }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography
        sx={{
          fontSize: { xs: '0.95rem', md: '1rem' },
          lineHeight: 1.35,
          overflowWrap: 'anywhere',
        }}
      >
        {transaction.description || '-'}
      </Typography>
      {transaction.gameName && (
        <Typography
          color="text.secondary"
          sx={{
            mt: 0.25,
            fontSize: { xs: '0.8rem', md: '0.875rem' },
            lineHeight: 1.35,
            overflowWrap: 'anywhere',
          }}
        >
          Spiel: {transaction.gameName}
        </Typography>
      )}
    </Box>
  );
}

function TransactionAmount({ transaction }: { transaction: FinanceDto }) {
  const isIncome = transaction.direction === 'income';
  const displayAmount = isIncome ? transaction.amount : -transaction.amount;

  return (
    <Typography
      component="span"
      sx={{
        color: isIncome ? 'success.main' : 'error.main',
        fontSize: { xs: '0.95rem', md: '1rem' },
        fontWeight: 800,
        whiteSpace: 'nowrap',
      }}
    >
      {formatCurrency(displayAmount)}
    </Typography>
  );
}

function DesktopTransactions({
  transactions,
  emptyMessage,
}: Pick<BankAccountDetailsProps, 'transactions' | 'emptyMessage'>) {
  return (
    <TableContainer
      component={Paper}
      variant="outlined"
      sx={{
        borderColor: 'divider',
        borderRadius: '16px',
        boxShadow: '0 12px 34px rgba(7, 17, 47, 0.04)',
        overflow: 'hidden',
      }}
    >
      <Table aria-label="Kontobuchungen">
        <TableHead sx={{ bgcolor: '#F7FAFE' }}>
          <TableRow>
            <TableCell sx={{ width: 180, py: 2.25, fontWeight: 800 }}>
              Datum
            </TableCell>
            <TableCell sx={{ width: 190, py: 2.25, fontWeight: 800 }}>
              Kategorie
            </TableCell>
            <TableCell sx={{ py: 2.25, fontWeight: 800 }}>
              Beschreibung
            </TableCell>
            <TableCell
              align="right"
              sx={{ width: 180, py: 2.25, fontWeight: 800 }}
            >
              Betrag
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {transactions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} align="center" sx={{ py: 5 }}>
                <Typography color="text.secondary">{emptyMessage}</Typography>
              </TableCell>
            </TableRow>
          ) : (
            transactions.map((transaction) => (
              <TableRow key={transaction.id} hover>
                <TableCell sx={{ py: 2.25 }}>
                  {dayjs(transaction.occurredAt).format('DD.MM.YYYY')}
                </TableCell>
                <TableCell sx={{ py: 2.25 }}>
                  <TransactionCategory category={transaction.category} />
                </TableCell>
                <TableCell sx={{ py: 2.25 }}>
                  <TransactionDescription transaction={transaction} />
                </TableCell>
                <TableCell align="right" sx={{ py: 2.25 }}>
                  <TransactionAmount transaction={transaction} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function MobileTransactions({
  transactions,
  emptyMessage,
}: Pick<BankAccountDetailsProps, 'transactions' | 'emptyMessage'>) {
  if (transactions.length === 0) {
    return (
      <Paper
        variant="outlined"
        sx={{ p: 3, borderColor: 'divider', borderRadius: '16px' }}
      >
        <Typography align="center" color="text.secondary">
          {emptyMessage}
        </Typography>
      </Paper>
    );
  }

  return (
    <Stack component="section" aria-label="Kontobuchungen" spacing={1.5}>
      {transactions.map((transaction) => (
        <Paper
          component="article"
          key={transaction.id}
          variant="outlined"
          sx={{
            display: 'grid',
            gridTemplateColumns: 'minmax(92px, auto) minmax(0, 1fr) auto',
            alignItems: 'center',
            columnGap: 1.5,
            minWidth: 0,
            p: 2,
            borderColor: 'divider',
            borderRadius: '16px',
            boxShadow: '0 8px 24px rgba(7, 17, 47, 0.035)',
          }}
        >
          <Stack alignItems="flex-start" spacing={1}>
            <Typography sx={{ fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
              {dayjs(transaction.occurredAt).format('DD.MM.YYYY')}
            </Typography>
            <TransactionCategory category={transaction.category} />
          </Stack>
          <TransactionDescription transaction={transaction} />
          <Box sx={{ justifySelf: 'end' }}>
            <TransactionAmount transaction={transaction} />
          </Box>
        </Paper>
      ))}
    </Stack>
  );
}

export default function BankAccountDetails({
  title,
  balanceLabel,
  balance,
  transactions,
  emptyMessage,
  onBack,
}: BankAccountDetailsProps) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 1200,
        mx: 'auto',
        pb: { xs: 2, md: 5 },
      }}
    >
      <Stack
        component="header"
        direction="row"
        alignItems="flex-start"
        spacing={{ xs: 1, sm: 1.5, md: 2 }}
        sx={{ mb: { xs: 3, md: 3.5 } }}
      >
        <IconButton
          aria-label="Zurück"
          onClick={onBack}
          sx={{ mt: { xs: -0.5, md: 0 }, color: 'secondary.main' }}
        >
          <ArrowBackIcon sx={{ fontSize: { xs: 30, md: 36 } }} />
        </IconButton>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            component="h1"
            sx={{
              fontSize: { xs: '1.65rem', sm: '2rem', md: '2.25rem' },
              fontWeight: 800,
              letterSpacing: '-0.035em',
              lineHeight: 1.12,
              overflowWrap: 'anywhere',
            }}
          >
            {title}
          </Typography>
          <Typography
            color="text.secondary"
            sx={{ mt: 0.5, fontSize: { xs: '1rem', md: '1.1rem' } }}
          >
            {balanceLabel}:{' '}
            <Box
              component="span"
              sx={{
                color: balance >= 0 ? 'success.main' : 'error.main',
                fontWeight: 800,
                whiteSpace: 'nowrap',
              }}
            >
              {formatCurrency(balance)}
            </Box>
          </Typography>
        </Box>
      </Stack>

      {isDesktop ? (
        <DesktopTransactions
          transactions={transactions}
          emptyMessage={emptyMessage}
        />
      ) : (
        <MobileTransactions
          transactions={transactions}
          emptyMessage={emptyMessage}
        />
      )}
    </Box>
  );
}
