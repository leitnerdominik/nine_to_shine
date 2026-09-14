'use client';

import { useEffect, useState } from 'react';
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
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import RankedGameForm from '../RankedGameForm';
import {
  useRankedGameForm,
  type RankedGameFormOutput,
} from '../rankedGameForm';

export default function SpielNeuPage() {
  const { enqueueSnackbar } = useSnackbar();
  const router = useRouter();

  const [seasons, setSeasons] = useState<SeasonDto[]>([]);
  const [users, setUsers] = useState<UserDto[]>([]);
  const [gamesOhneRankings, setGamesOhneRankings] = useState<GameDto[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const form = useRankedGameForm({
    seasonId: undefined as unknown as number,
    playedAt: new Date().toISOString().slice(0, 10),
    gameName: '',
    organizedByUserId: 0,
    entries: [],
  });
  const { reset, setValue } = form;

  useEffect(() => {
    (async () => {
      try {
        const [s, u, g, r] = await Promise.all([
          apiSeason.getAll(),
          apiUsers.getAll(),
          apiGame.getAll(),
          apiRanking.getAll(),
        ]);

        setSeasons(s);
        setUsers(u);

        // Spiele ohne Rankings ermitteln
        const rankedGameIds = new Set<number>(
          r.map((rk: RankingDto) => rk.gameId)
        );
        const freieGames = (g as GameDto[]).filter(
          (game) => !rankedGameIds.has(game.id)
        );
        setGamesOhneRankings(freieGames);

        // höchste Saison finden (nach seasonNumber)
        const highest = s.reduce<SeasonDto | null>(
          (acc, cur) =>
            acc === null || cur.seasonNumber > acc.seasonNumber ? cur : acc,
          null
        );

        reset((prev) => ({
          ...prev,
          seasonId:
            prev.seasonId ??
            (highest ? highest.id : (undefined as unknown as number)),
          playedAt: prev.playedAt ?? new Date().toISOString().slice(0, 10),
          gameName: prev.gameName ?? '',
          organizedByUserId: prev.organizedByUserId ?? 0,
          entries: u.map((usr) => ({
            userId: usr.id,
            isPresent: true,
            points: '', // anfangs leer
          })),
        }));
      } catch (e) {
        enqueueSnackbar(
          (e as Error)?.message ?? 'Daten konnten nicht geladen werden.',
          { variant: 'error' }
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [enqueueSnackbar, reset]);

  const onSubmit = async (values: RankedGameFormOutput) => {
    try {
      const payload: SaveRankedGameRequest = {
        ...(selectedGameId === null ? {} : { gameId: selectedGameId }),
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

      enqueueSnackbar('Spiel wurde gespeichert.', {
        variant: 'success',
      });
      router.push('/rankings');
    } catch (e) {
      enqueueSnackbar((e as Error)?.message ?? 'Speichern fehlgeschlagen.', {
        variant: 'error',
      });
    }
  };

  const isExistingGame = selectedGameId !== null;

  const handleExistingGameChange = (newId: number | null) => {
    setSelectedGameId(newId);
    if (newId === null) return;

    const game = gamesOhneRankings.find((candidate) => candidate.id === newId);
    if (!game) return;

    setValue('seasonId', game.seasonId, {
      shouldValidate: true,
      shouldDirty: true,
    });
    setValue('playedAt', dayjs(game.playedAt).format('YYYY-MM-DD'), {
      shouldValidate: true,
      shouldDirty: true,
    });
    setValue('gameName', game.gameName, {
      shouldValidate: true,
      shouldDirty: true,
    });
    setValue('organizedByUserId', game.organizedByUserId ?? 0, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const resetNewGame = () => {
    setSelectedGameId(null);
    reset({
      seasonId: undefined as unknown as number,
      playedAt: new Date().toISOString().slice(0, 10),
      gameName: '',
      organizedByUserId: 0,
      entries: users.map((user) => ({
        userId: user.id,
        isPresent: true,
        points: '',
      })),
    });
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
        mode="create"
        title="Neues Spiel erstellen"
        seasons={seasons}
        users={users}
        form={form}
        onSubmit={onSubmit}
        detailsDisabled={isExistingGame || form.formState.isSubmitting}
        existingGameSelection={{
          games: gamesOhneRankings,
          selectedGameId,
          onChange: handleExistingGameChange,
        }}
        secondaryAction={{ label: 'Zurücksetzen', onClick: resetNewGame }}
      />
    </Layout>
  );
}
