'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button } from '@mui/material';
import { useRouter } from 'next/navigation';

import BankAccountDetails from '@/components/finance/BankAccountDetails';
import Layout from '@/components/Layout';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { toErrorMessage } from '@/definitions/api';
import { apiFinance } from '@/definitions/commands';
import type { FinanceDto } from '@/definitions/types';

export default function N2SBankAccountPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<FinanceDto[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      setTransactions(await apiFinance.getAll({ scope: 'global' }));
    } catch (error) {
      setLoadError(
        `Vereinskonto konnte nicht geladen werden. ${toErrorMessage(error)}`
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const currentBalance = useMemo(
    () =>
      transactions.reduce(
        (sum, transaction) =>
          sum +
          (transaction.direction === 'income'
            ? transaction.amount
            : -transaction.amount),
        0
      ),
    [transactions]
  );

  if (loading) {
    return (
      <Layout>
        <LoadingSkeleton />
      </Layout>
    );
  }

  if (loadError) {
    return (
      <Layout>
        <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto' }}>
          <Alert
            severity="error"
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => void fetchData()}
              >
                Erneut versuchen
              </Button>
            }
          >
            {loadError}
          </Alert>
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <BankAccountDetails
        title="N2S Vereinskonto"
        balanceLabel="Aktueller Kassenbestand"
        balance={currentBalance}
        transactions={transactions}
        emptyMessage="Noch keine Buchungen auf dem Vereinskonto vorhanden."
        onBack={() => router.back()}
      />
    </Layout>
  );
}
