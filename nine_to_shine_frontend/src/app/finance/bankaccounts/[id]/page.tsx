'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button } from '@mui/material';
import { useRouter } from 'next/navigation';

import BankAccountDetails from '@/components/finance/BankAccountDetails';
import Layout from '@/components/Layout';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { toErrorMessage } from '@/definitions/api';
import { apiFinance, apiUsers } from '@/definitions/commands';
import type { FinanceDto, UserDto } from '@/definitions/types';

export default function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const userId = Number(id);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<FinanceDto[]>([]);
  const [user, setUser] = useState<UserDto | null>(null);
  const [balance, setBalance] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const [userData, txData, userBalance] = await Promise.all([
        apiUsers.getById(userId),
        apiFinance.getAll({ userId }),
        apiFinance.getUserBalance(userId),
      ]);

      setUser(userData);
      setTransactions(txData);
      setBalance(userBalance);
    } catch (error) {
      setLoadError(
        `Konto konnte nicht geladen werden. ${toErrorMessage(error)}`
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <Layout>
        <LoadingSkeleton />
      </Layout>
    );
  }

  if (loadError || !user) {
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
            {loadError ?? 'User nicht gefunden.'}
          </Alert>
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <BankAccountDetails
        title={`Konto: ${user.displayName}`}
        balanceLabel="Aktueller Kontostand"
        balance={balance}
        transactions={transactions}
        emptyMessage="Keine Transaktionen gefunden."
        onBack={() => router.back()}
      />
    </Layout>
  );
}
