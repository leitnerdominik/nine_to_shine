'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import SavingsIcon from '@mui/icons-material/Savings';
import type { SvgIconComponent } from '@mui/icons-material';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardActionArea,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import Grid2 from '@mui/material/Grid2';
import type { Theme } from '@mui/material/styles';

import Layout from '@/components/Layout';
import PageTitle from '@/components/PageTitle';
import { formatCurrency, stringAvatar } from '@/common/misc';
import { apiFinance } from '@/definitions/commands';
import { toErrorMessage } from '@/definitions/api';

interface AccountData {
  id: string;
  title: string;
  balance: number;
  variant: 'total' | 'travel' | 'club' | 'user';
}

const cardSurface = {
  border: 0,
  borderRadius: '18px',
  boxShadow: '0 12px 32px rgba(49, 112, 178, 0.1)',
  overflow: 'hidden',
} as const;

const actionAreaFocus = {
  '&.Mui-focusVisible': {
    outline: '3px solid',
    outlineColor: 'primary.main',
    outlineOffset: -4,
  },
} as const;

function getBalanceColor(theme: Theme, balance: number) {
  if (balance < 0) return theme.palette.error.main;
  if (balance > 0) return theme.palette.success.main;
  return theme.palette.text.primary;
}

function PageHeading() {
  return (
    <Box component="header" sx={{ mb: { xs: 3, md: 3.5 } }}>
      <PageTitle title="Kontenübersicht" />
    </Box>
  );
}

function DecorativeCircle({ sx }: { sx: Record<string, unknown> }) {
  return (
    <Box
      aria-hidden="true"
      sx={{
        position: 'absolute',
        borderRadius: '50%',
        bgcolor: 'rgba(255, 255, 255, 0.24)',
        ...sx,
      }}
    />
  );
}

function HeroAccountCard({ account }: { account: AccountData }) {
  return (
    <Card
      elevation={0}
      sx={{
        ...cardSurface,
        height: '100%',
        minHeight: { xs: 310, md: 330 },
        background:
          'linear-gradient(135deg, #E1F2FF 0%, #C7E6FF 52%, #ADD7FF 100%)',
      }}
    >
      <CardActionArea
        component={Link}
        href="/finance/transactions"
        aria-label={`${account.title}: ${formatCurrency(account.balance)}`}
        sx={{ ...actionAreaFocus, position: 'relative', height: '100%' }}
      >
        <DecorativeCircle
          sx={{ width: 150, height: 150, right: 28, top: 36 }}
        />
        <DecorativeCircle
          sx={{
            width: 105,
            height: 105,
            right: 170,
            bottom: -28,
            opacity: 0.45,
          }}
        />

        <Stack
          sx={{
            position: 'relative',
            zIndex: 1,
            height: '100%',
            minHeight: 'inherit',
            p: { xs: 3, sm: 4 },
          }}
        >
          <Box
            aria-hidden="true"
            sx={{
              width: { xs: 70, sm: 78 },
              height: { xs: 70, sm: 78 },
              display: 'grid',
              placeItems: 'center',
              borderRadius: '18px',
              color: 'common.white',
              background: 'linear-gradient(145deg, #A8D5FF 0%, #7FBFFF 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.45)',
            }}
          >
            <AccountBalanceIcon sx={{ fontSize: { xs: 42, sm: 48 } }} />
          </Box>

          <Box sx={{ mt: 'auto', minWidth: 0 }}>
            <Typography
              component="h2"
              sx={{
                fontSize: { xs: '1.75rem', sm: '2rem' },
                fontWeight: 800,
                letterSpacing: '-0.035em',
                lineHeight: 1.1,
              }}
            >
              {account.title}
            </Typography>
            <Typography
              color="text.secondary"
              sx={{ mt: 0.5, fontSize: { xs: '1rem', sm: '1.1rem' } }}
            >
              Physischer Kontostand
            </Typography>
            <Typography
              sx={{
                mt: { xs: 2.25, sm: 2.75 },
                color: '#087FF5',
                fontSize: { xs: '2.45rem', sm: '3.25rem' },
                fontWeight: 800,
                letterSpacing: '-0.045em',
                lineHeight: 1,
                whiteSpace: 'nowrap',
              }}
            >
              {formatCurrency(account.balance)}
            </Typography>
          </Box>
        </Stack>

        <Box
          aria-hidden="true"
          sx={{
            position: 'absolute',
            right: { xs: 22, sm: 42 },
            bottom: { xs: 72, sm: 54 },
            zIndex: 0,
            color: 'rgba(255, 255, 255, 0.72)',
            filter: 'drop-shadow(0 14px 14px rgba(54, 132, 207, 0.24))',
            transform: 'perspective(280px) rotateX(8deg) rotateY(-8deg)',
          }}
        >
          <AccountBalanceIcon sx={{ fontSize: { xs: 116, sm: 150 } }} />
        </Box>
      </CardActionArea>
    </Card>
  );
}

function SummaryAccountCard({
  account,
  icon: Icon,
  subtitle,
  href,
}: {
  account: AccountData;
  icon: SvgIconComponent;
  subtitle: string;
  href: string;
}) {
  return (
    <Card
      elevation={0}
      sx={{
        ...cardSurface,
        minHeight: { xs: 138, md: 0 },
        height: '100%',
        bgcolor: 'background.paper',
      }}
    >
      <CardActionArea
        component={Link}
        href={href}
        aria-label={`${account.title}: ${formatCurrency(account.balance)}`}
        sx={{
          ...actionAreaFocus,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          height: '100%',
          p: { xs: 2.25, sm: 2.75 },
        }}
      >
        <DecorativeCircle
          sx={{
            width: 94,
            height: 94,
            right: -35,
            bottom: -35,
            bgcolor: '#E8F4FF',
          }}
        />
        <Avatar
          sx={{
            width: { xs: 72, sm: 78 },
            height: { xs: 72, sm: 78 },
            flexShrink: 0,
            bgcolor: '#0496FF',
            color: 'common.white',
            border: '3px solid white',
            boxShadow: '0 7px 16px rgba(4, 150, 255, 0.28)',
          }}
        >
          <Icon sx={{ fontSize: { xs: 37, sm: 41 } }} />
        </Avatar>
        <Box
          sx={{
            position: 'relative',
            zIndex: 1,
            ml: { xs: 2, sm: 2.5 },
            minWidth: 0,
          }}
        >
          <Typography
            component="h2"
            sx={{
              fontSize: { xs: '1.15rem', sm: '1.3rem' },
              fontWeight: 800,
              lineHeight: 1.15,
            }}
          >
            {account.title}
          </Typography>
          <Typography
            color="text.secondary"
            sx={{ mt: 0.35, lineHeight: 1.3 }}
          >
            {subtitle}
          </Typography>
          <Typography
            sx={(theme) => ({
              mt: 1.25,
              color: getBalanceColor(theme, account.balance),
              fontSize: { xs: '1.65rem', sm: '1.9rem' },
              fontWeight: 800,
              letterSpacing: '-0.035em',
              lineHeight: 1,
              whiteSpace: 'nowrap',
            })}
          >
            {formatCurrency(account.balance)}
          </Typography>
        </Box>
      </CardActionArea>
    </Card>
  );
}

function MemberAccountCard({ account }: { account: AccountData }) {
  const avatarProps = stringAvatar(account.title);

  return (
    <Card
      elevation={0}
      sx={{ ...cardSurface, height: '100%', bgcolor: 'background.paper' }}
    >
      <CardActionArea
        component={Link}
        href={`/finance/bankaccounts/${account.id}`}
        aria-label={`${account.title}: ${formatCurrency(account.balance)}`}
        sx={{
          ...actionAreaFocus,
          display: 'flex',
          flexDirection: { xs: 'row', md: 'column' },
          justifyContent: { xs: 'flex-start', md: 'center' },
          minHeight: { xs: 88, md: 210 },
          height: '100%',
          p: { xs: 1.5, sm: 2, md: 2.5 },
        }}
      >
        <Avatar
          {...avatarProps}
          sx={{
            ...avatarProps.sx,
            width: { xs: 56, md: 64 },
            height: { xs: 56, md: 64 },
            flexShrink: 0,
            border: '3px solid white',
            boxShadow: '0 6px 15px rgba(7, 17, 47, 0.14)',
          }}
        />
        <Box
          sx={{
            ml: { xs: 1.75, md: 0 },
            mt: { xs: 0, md: 1.5 },
            minWidth: 0,
            textAlign: { xs: 'left', md: 'center' },
          }}
        >
          <Typography
            component="h3"
            sx={{
              fontSize: { xs: '1rem', sm: '1.1rem', md: '1.15rem' },
              fontWeight: 800,
              lineHeight: 1.2,
              overflowWrap: 'anywhere',
            }}
          >
            {account.title}
          </Typography>
          <Typography
            color="text.secondary"
            sx={{ mt: 0.35, lineHeight: 1.25 }}
          >
            Mitgliedskonto
          </Typography>
        </Box>
        <Typography
          sx={(theme) => ({
            ml: { xs: 'auto', md: 0 },
            mt: { xs: 0, md: 1.5 },
            pl: { xs: 1.5, md: 0 },
            color: getBalanceColor(theme, account.balance),
            fontSize: { xs: '1.15rem', sm: '1.35rem', md: '1.75rem' },
            fontWeight: 800,
            letterSpacing: '-0.035em',
            lineHeight: 1,
            whiteSpace: 'nowrap',
          })}
        >
          {formatCurrency(account.balance)}
        </Typography>
      </CardActionArea>
    </Card>
  );
}

function BankAccountsSkeleton() {
  return (
    <Layout>
      <Box
        role="status"
        aria-busy="true"
        aria-label="Konten werden geladen"
        sx={{
          width: '100%',
          maxWidth: 1200,
          mx: 'auto',
          pb: { xs: 3, md: 5 },
        }}
      >
        <Skeleton variant="text" width="min(100%, 420px)" height={64} />
        <Skeleton
          variant="text"
          width="min(100%, 520px)"
          height={36}
          sx={{ mb: 3 }}
        />
        <Grid2 container spacing={{ xs: 2, md: 2.5 }}>
          <Grid2 size={{ xs: 12, md: 7 }}>
            <Skeleton
              variant="rounded"
              height={330}
              sx={{ borderRadius: '18px' }}
            />
          </Grid2>
          <Grid2 size={{ xs: 12, md: 5 }}>
            <Stack spacing={{ xs: 2, md: 2.5 }} sx={{ height: '100%' }}>
              <Skeleton
                variant="rounded"
                sx={{ flex: 1, minHeight: 150, borderRadius: '18px' }}
              />
              <Skeleton
                variant="rounded"
                sx={{ flex: 1, minHeight: 150, borderRadius: '18px' }}
              />
            </Stack>
          </Grid2>
        </Grid2>
      </Box>
    </Layout>
  );
}

export default function BankAccountsPage() {
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<AccountData[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const overview = await apiFinance.getBalanceOverview();

      setAccounts([
        {
          id: 'total',
          title: 'Gesamtvermögen',
          balance: overview.globalBalance,
          variant: 'total',
        },
        {
          id: 'reise-kasse',
          title: 'Reise Kasse',
          balance: overview.membersBalance,
          variant: 'travel',
        },
        {
          id: 'club',
          title: 'Vereinskasse',
          balance: overview.clubBalance,
          variant: 'club',
        },
        ...overview.userBalances.map(({ userId, displayName, balance }) => ({
          id: userId.toString(),
          title: displayName,
          balance,
          variant: 'user' as const,
        })),
      ]);
    } catch (err) {
      setError(`Konten konnten nicht geladen werden. ${toErrorMessage(err)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  if (loading) return <BankAccountsSkeleton />;

  if (error) {
    return (
      <Layout>
        <Box
          sx={{
            width: '100%',
            maxWidth: 1200,
            mx: 'auto',
            pb: { xs: 3, md: 5 },
          }}
        >
          <PageHeading />
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
            {error}
          </Alert>
        </Box>
      </Layout>
    );
  }

  const [totalAccount, travelAccount, clubAccount, ...memberAccounts] = accounts;

  return (
    <Layout>
      <Box
        sx={{
          width: '100%',
          maxWidth: 1200,
          mx: 'auto',
          pb: { xs: 3, md: 5 },
        }}
      >
        <PageHeading />

        <Grid2 container spacing={{ xs: 2, md: 2.5 }}>
          <Grid2 size={{ xs: 12, md: 7 }}>
            <HeroAccountCard account={totalAccount} />
          </Grid2>
          <Grid2 size={{ xs: 12, md: 5 }}>
            <Stack spacing={{ xs: 2, md: 2.5 }} sx={{ height: '100%' }}>
              <SummaryAccountCard
                account={travelAccount}
                icon={FlightTakeoffIcon}
                subtitle="Guthaben aller Mitglieder"
                href="/finance/transactions"
              />
              <SummaryAccountCard
                account={clubAccount}
                icon={SavingsIcon}
                subtitle="Reines Vereinsvermögen"
                href="/finance/bankaccounts/n2s-account"
              />
            </Stack>
          </Grid2>
        </Grid2>

        <Box
          component="section"
          aria-labelledby="member-accounts-title"
          sx={{
            mt: { xs: 4, md: 5 },
            pt: { md: 4 },
            borderTop: { md: 1 },
            borderColor: 'divider',
          }}
        >
          <Typography
            id="member-accounts-title"
            component="h2"
            sx={{
              fontSize: { xs: '1.8rem', sm: '2.1rem' },
              fontWeight: 800,
              letterSpacing: '-0.035em',
              lineHeight: 1.1,
            }}
          >
            Mitgliedskonten
          </Typography>
          <Typography
            color="text.secondary"
            sx={{ mt: 0.75, fontSize: { sm: '1.05rem' } }}
          >
            Kontostände der einzelnen Mitglieder.
          </Typography>

          <Grid2
            container
            spacing={{ xs: 1.5, sm: 2, md: 2.5 }}
            sx={{ mt: { xs: 1.25, md: 1.75 } }}
          >
            {memberAccounts.map((account) => (
              <Grid2 key={account.id} size={{ xs: 12, md: 4 }}>
                <MemberAccountCard account={account} />
              </Grid2>
            ))}
          </Grid2>
        </Box>
      </Box>
    </Layout>
  );
}
