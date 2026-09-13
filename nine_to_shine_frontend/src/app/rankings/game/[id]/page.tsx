'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { useSnackbar } from 'notistack';
import {
  apiSeason,
  apiUsers,
  apiGame,
  apiRanking,
} from '@/definitions/commands';
import type {
  SeasonDto,
  UserDto,
  GameDto,
  RankingDto,
  SaveRankedGameRequest,
} from '@/definitions/types';
import dayjs from 'dayjs';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { routes } from '@/common/routes';
import RankedGameForm from '../RankedGameForm';
import {
  useRankedGameForm,
  type RankedGameFormOutput,
} from '../rankedGameForm';

export default function SpielBearbeitenPage() {
  const { enqueueSnackbar } = useSnackbar();
  const router = useRouter();
  const params = useParams();
  const gameId = Number(params?.id);

  const [seasons, setSeasons] = useState<SeasonDto[]>([]);
  const [users, setUsers] = useState<UserDto[]>([]);
  const [game, setGame] = useState<GameDto | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const form = useRankedGameForm({
    seasonId: undefined as unknown as number,
    playedAt: '',
    gameName: '',
    organizedByUserId: 0,
    entries: [],
  });
  const { reset } = form;

  useEffect(() => {
    (async () => {
      if (!Number.isFinite(gameId)) {
        enqueueSnackbar('Ungültige Spiel-ID.', { variant: 'error' });
        router.push(routes.adminGames);
        return;
      }
      try {
        setLoading(true);
        const [s, u, g, rAll] = await Promise.all([
          apiSeason.getAll(),
          apiUsers.getAll(),
          apiGame.getById(gameId),
          apiRanking.getAll(),
        ]);
        setSeasons(s);
        setUsers(u);
        setGame(g);

        const rs = rAll.filter((x) => x.gameId === gameId);
        const rByUser = new Map<number, RankingDto>();
        rs.forEach((r) => rByUser.set(r.userId, r));

        const entries = u.map((usr) => {
          const r = rByUser.get(usr.id);
          const isPresent = r?.isPresent ?? true;
          const pointsStr = isPresent ? (r ? String(r.points) : '') : '1';
          return { userId: usr.id, isPresent, points: pointsStr };
        });

        reset({
          seasonId: g.seasonId,
          playedAt: dayjs(g.playedAt).format('YYYY-MM-DD'),
          gameName: g.gameName,
          organizedByUserId: g.organizedByUserId,
          entries,
        });
      } catch (e) {
        enqueueSnackbar(
          (e as Error)?.message ?? 'Daten konnten nicht geladen werden.',
          {
            variant: 'error',
          }
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [enqueueSnackbar, reset, router, gameId]);

  const onSubmit = async (values: RankedGameFormOutput) => {
    try {
      if (!Number.isFinite(gameId)) throw new Error('Ungültige Spiel-ID.');

      const payload: SaveRankedGameRequest = {
        gameId,
        seasonId: values.seasonId,
        playedAt: new Date(values.playedAt).toISOString(),
        gameName: values.gameName.trim(),
        organizedByUserId: values.organizedByUserId,
        rankings: values.entries.map((entry) => ({
          userId: entry.userId,
          points: entry.isPresent ? entry.points : 1,
          isPresent: entry.isPresent,
        })),
      };
      await apiRanking.saveGameSnapshot(payload);

      enqueueSnackbar('Spiel wurde aktualisiert.', { variant: 'success' });
      router.push(`/rankings/${gameId}`);
    } catch (e) {
      enqueueSnackbar(
        (e as Error)?.message ?? 'Aktualisierung fehlgeschlagen.',
        {
          variant: 'error',
        }
      );
    }
  };

  if (loading) {
    return (
      <Layout>
        <LoadingSkeleton />
      </Layout>
    );
  }

  return (
    <Layout>
      <RankedGameForm
        mode="edit"
        title={
          game
            ? `Spiel bearbeiten: ${game.gameName}`
            : `Spiel #${gameId} bearbeiten`
        }
        seasons={seasons}
        users={users}
        form={form}
        onSubmit={onSubmit}
        secondaryAction={{
          label: 'Abbrechen',
          onClick: () => router.push(`/rankings/${gameId}`),
        }}
      />
    </Layout>
  );
}
