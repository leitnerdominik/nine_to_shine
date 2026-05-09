'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  useTheme,
  CardActionArea,
} from '@mui/material';
import Grid2 from '@mui/material/Grid2';
import Link from 'next/link';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import SavingsIcon from '@mui/icons-material/Savings';
import Layout from '@/components/Layout';
import CustomTitle from '@/components/CustomTitle';
import { apiFinance, apiUsers } from '@/definitions/commands';
import { UserDto } from '@/definitions/types';
import { formatCurrency, stringAvatar, stringToColor } from '@/common/misc';
import LoadingSkeleton from '@/components/LoadingSkeleton';

// --- Component Data Types ---
interface AccountData {
  id: string;
  title: string;
  balance: number;
  clubOnlyBalance?: number;
  variant: 'total' | 'club' | 'user';
  user?: UserDto;
}

export default function BankAccountsPage() {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<AccountData[]>([]);

  useEffect(() => {
    (async () => {
      try {
        // 1. Initialdaten laden (User + Gesamtstand + Vereinsstand)
        const [users, globalBalance, clubBalance] = await Promise.all([
          apiUsers.getAll(),
          apiFinance.getGlobalBalance(),
          apiFinance.getClubBalance(),
        ]);

        // 2. Kontostände für alle User parallel abfragen
        const userBalancePromises = users.map((u) =>
          apiFinance.getUserBalance(u.id).then((balance) => ({
            user: u,
            balance,
          }))
        );

        const userBalances = await Promise.all(userBalancePromises);

        const totalAccount: AccountData = {
          id: 'total',
          title: 'Gesamtvermögen',
          balance: globalBalance,
          variant: 'total',
        };

        const clubAccount: AccountData = {
          id: 'club',
          title: 'Vereinskasse',
          balance: clubBalance,
          variant: 'club',
        };

        const userAccounts: AccountData[] = userBalances.map(
          ({ user, balance }) => ({
            id: user.id.toString(),
            title: user.displayName,
            balance: balance,
            variant: 'user',
            user: user,
          })
        );

        // Vereinskasse zuerst, dann Mitglieder
        setAccounts([totalAccount, clubAccount, ...userAccounts]);
      } catch (err) {
        console.error('Fehler beim Laden der Konten:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <Layout>
        <LoadingSkeleton />
      </Layout>
    );
  }

  return (
    <Layout>
      <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
        <CustomTitle text="Kontenübersicht" />

        <Grid2 container spacing={4} sx={{ mt: 2 }}>
          {accounts.map((acc) => {
            let avatarBg = stringToColor(acc.title);
            let IconComponent = null;
            let subTitle = 'Mitgliedskonto';
            let linkHref = `/finance/bankaccounts/${acc.id}`;

            if (acc.variant === 'total') {
              avatarBg = theme.palette.grey[700];
              IconComponent = AccountBalanceIcon;
              subTitle = 'Physischer Kontostand';
              linkHref = '/finance/transactions';
            } else if (acc.variant === 'club') {
              avatarBg = theme.palette.primary.main;
              IconComponent = SavingsIcon;
              subTitle = 'Reines Vereinsvermögen';
              linkHref = '/finance/bankaccounts/n2s-account';
            }

            return (
              <Grid2
                key={`${acc.variant}-${acc.id}`}
                size={{ xs: 12, sm: 6, md: 4 }}
                sx={{
                  mt: 1,
                }}
              >
                <Card
                  elevation={3}
                  sx={{
                    borderRadius: 3,
                    height: '100%',
                    position: 'relative',
                    overflow: 'visible',
                    mt: 3,
                  }}
                >
                  <CardActionArea
                    LinkComponent={Link}
                    href={linkHref}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      p: 4,
                      height: '100%',
                    }}
                  >
                    <CardContent
                      sx={{
                        pt: 5,
                        pb: 3,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        width: '100%',
                      }}
                    >
                      {/* --- Avatar --- */}
                      <Box
                        sx={{
                          position: 'absolute',
                          top: -32,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          filter: 'drop-shadow(0px 4px 4px rgba(0,0,0,0.15))',
                        }}
                      >
                        {acc.variant !== 'user' && IconComponent ? (
                          <Avatar
                            sx={{
                              width: 64,
                              height: 64,
                              bgcolor: avatarBg,
                              border: '4px solid white',
                            }}
                          >
                            <IconComponent fontSize="large" />
                          </Avatar>
                        ) : (
                          <Avatar {...stringAvatar(acc.title)} />
                        )}
                      </Box>

                      {/* --- Name --- */}
                      <Typography
                        variant="h6"
                        component="div"
                        align="center"
                        sx={{ fontWeight: 'bold', mb: 0.5, mt: 1 }}
                      >
                        {acc.title}
                      </Typography>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 2 }}
                      >
                        {subTitle}
                      </Typography>

                      {/* --- Betrag --- */}
                      <Typography
                        variant="h4"
                        component="div"
                        sx={{
                          fontWeight: '800',
                          color:
                            acc.balance >= 0
                              ? theme.palette.success.main
                              : theme.palette.error.main,
                        }}
                      >
                        {formatCurrency(acc.balance)}
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid2>
            );
          })}
        </Grid2>
      </Box>
    </Layout>
  );
}
