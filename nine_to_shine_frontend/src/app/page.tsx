'use client';

import { useEffect, useState } from 'react';
import { Box, Grid2 } from '@mui/material';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
import SavingsIcon from '@mui/icons-material/Savings';
import dayjs from 'dayjs';
import 'dayjs/locale/de';

import Layout from '@/components/Layout';
import CustomTitle from '@/components/CustomTitle';
import {
  apiRanking,
  apiOrganizerDuty,
  apiSeason,
  apiFinance,
} from '@/definitions/commands';
import type {
  GameDuesStatusDto,
  TopRankedDto,
  OrganizerDutyDto,
} from '@/definitions/types';
import { useSnackbar } from 'notistack';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { routes } from '@/common/routes';
import {
  DashboardLeaderCard,
  DashboardStatusCard,
  type DashboardStatusTone,
} from '@/components/dashboard/DashboardCards';

dayjs.locale('de');

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);

  const [topPlayer, setTopPlayer] = useState<TopRankedDto | null>(null);
  const [nextDuty, setNextDuty] = useState<OrganizerDutyDto | null>(null);
  const [currentSeasonNumber, setCurrentSeasonNumber] = useState<number | null>(
    null
  );
  const [openDuesCount, setOpenDuesCount] = useState<number | null>(null);
  const [openDuesGameCount, setOpenDuesGameCount] = useState<number | null>(
    null
  );

  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    (async () => {
      try {
        const seasons = await apiSeason.getAll();
        const currentSeason = [...seasons].sort(
          (a, b) => b.seasonNumber - a.seasonNumber
        )[0];
        setCurrentSeasonNumber(currentSeason?.seasonNumber || null);

        const [topData, dutyData, duesData] = await Promise.all([
          apiRanking.getTopRanked(currentSeason?.id),
          apiOrganizerDuty.getNextDuty(),
          currentSeason
            ? apiFinance.getDuesStatus(currentSeason.id)
            : Promise.resolve([] as GameDuesStatusDto[]),
        ]);

        setTopPlayer(topData);
        setNextDuty(dutyData);
        setOpenDuesCount(
          duesData.reduce(
            (total, game) => total + game.unpaidMembers.length,
            0
          )
        );
        setOpenDuesGameCount(
          duesData.filter((game) => game.unpaidMembers.length > 0).length
        );
      } catch {
        enqueueSnackbar('Fehler beim Laden des Dashboards', {
              variant: 'error',
            });
      } finally {
        setLoading(false);
      }
    })();
  }, [enqueueSnackbar]);

  if (loading) {
    return (
      <Layout>
        <LoadingSkeleton />
      </Layout>
    );
  }

  const hasOpenDues = openDuesCount !== null && openDuesCount > 0;
  const duesTone: DashboardStatusTone =
    openDuesCount === null ? 'neutral' : hasOpenDues ? 'warning' : 'success';

  return (
    <Layout>
      <Box sx={{ maxWidth: 1000, mx: 'auto', p: 3 }}>
        <CustomTitle text="Übersicht" />

        <Grid2 container spacing={3} sx={{ mt: 2 }}>
          {/* --- KACHEL 1: TOP PLAYER (RANKING) -> /rankings --- */}
          <Grid2 size={{ xs: 12, md: 6 }}>
            <DashboardLeaderCard
              label={`Platz #1${
                currentSeasonNumber ? ` (SAISON ${currentSeasonNumber})` : ''
              }`}
              name={topPlayer?.userDisplayName ?? null}
              points={topPlayer ? `${topPlayer.totalPoints} Punkte` : null}
              emptyText="Noch keine Punkte"
              href={routes.rankings}
            />
          </Grid2>

          {/* --- KACHEL 2: ORGANISATION -> /organizer-duties --- */}
          <Grid2 size={{ xs: 12, md: 6 }}>
            <DashboardStatusCard
              label="NÄCHSTER ZU ORGANISIEREN"
              value={nextDuty ? nextDuty.userDisplayName ?? '-' : 'Frei!'}
              detail={
                nextDuty
                  ? `für ${dayjs(nextDuty.dutyDate).format('MMMM YYYY')}`
                  : 'Keiner Eingetragen!'
              }
              href={routes.organizeduties}
              icon={<CleaningServicesIcon />}
              tone="info"
            />
          </Grid2>

          <Grid2 size={{ xs: 12 }}>
            <DashboardStatusCard
              label={`OFFENE SPIELBEITRÄGE${
                currentSeasonNumber ? ` (SAISON ${currentSeasonNumber})` : ''
              }`}
              value={
                openDuesCount === null
                  ? 'Nicht verfügbar'
                  : hasOpenDues
                    ? `${openDuesCount} offen`
                    : 'Alles bezahlt'
              }
              detail={
                openDuesCount === null
                  ? 'Status konnte nicht geladen werden'
                  : hasOpenDues
                    ? `${openDuesGameCount} ${
                        openDuesGameCount === 1 ? 'Spiel' : 'Spiele'
                      } betroffen`
                    : 'Keine offenen Spielbeiträge'
              }
              href={routes.duesOverview}
              icon={<SavingsIcon />}
              tone={duesTone}
            />
          </Grid2>
        </Grid2>
      </Box>
    </Layout>
  );
}
