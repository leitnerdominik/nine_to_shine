import React from 'react';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import RankingEntryPage from './page';

const mocks = vi.hoisted(() => ({
  router: { push: vi.fn() },
  getGameById: vi.fn(),
  removeGame: vi.fn(),
  getRankings: vi.fn(),
  getUsers: vi.fn(),
  getSeasons: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: '10' }),
  useRouter: () => mocks.router,
}));

vi.mock('@/definitions/commands', () => ({
  apiGame: {
    getById: mocks.getGameById,
    remove: mocks.removeGame,
  },
  apiRanking: { getAll: mocks.getRankings },
  apiUsers: { getAll: mocks.getUsers },
  apiSeason: { getAll: mocks.getSeasons },
}));

vi.mock('@/components/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

vi.mock('@/components/LoadingSkeleton', () => ({
  default: () => React.createElement('div', null, 'Loading ranking'),
}));

const game = {
  id: 10,
  seasonId: 3,
  playedAt: '2026-07-01T18:00:00.000Z',
  gameName: 'Tennis',
  organizedByUserId: 1,
  organizedByDisplayName: 'Nina',
};

const users = [
  {
    id: 1,
    displayName: 'Nina',
    isActive: true,
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 2,
    displayName: 'Jonas',
    isActive: true,
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 3,
    displayName: 'Miriam',
    isActive: true,
    createdAt: '2025-01-01T00:00:00.000Z',
  },
];

const rankings = [
  { id: 20, gameId: 10, userId: 2, points: 6, isPresent: true },
  { id: 21, gameId: 10, userId: 3, points: 4, isPresent: false },
  { id: 22, gameId: 10, userId: 1, points: 9, isPresent: true },
];

describe('RankingEntryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getGameById.mockResolvedValue(game);
    mocks.getRankings.mockResolvedValue(rankings);
    mocks.getUsers.mockResolvedValue(users);
    mocks.getSeasons.mockResolvedValue([{ id: 3, seasonNumber: 7 }]);
    mocks.removeGame.mockResolvedValue(undefined);
  });

  it('renders game metadata and the ordered podium table', async () => {
    renderWithProviders(<RankingEntryPage />);

    expect(
      await screen.findByRole('heading', { name: 'Tennis', level: 1 })
    ).toBeInTheDocument();
    expect(screen.getByText('01.07.2026')).toBeInTheDocument();
    expect(screen.getByText('Saison 7')).toBeInTheDocument();
    expect(screen.getByText('Organisiert von: Nina')).toBeInTheDocument();

    const table = screen.getByRole('table', { name: 'Ranking-Tabelle' });
    expect(
      within(table).getByRole('columnheader', { name: 'Platz' })
    ).toBeInTheDocument();
    expect(
      within(table).getByRole('columnheader', { name: 'Punkte' })
    ).toBeInTheDocument();

    const rows = within(table).getAllByRole('row').slice(1);
    expect(within(rows[0]).getByText('#1')).toBeInTheDocument();
    expect(within(rows[0]).getByText('Nina')).toBeInTheDocument();
    expect(within(rows[0]).getByText('9')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Jonas')).toBeInTheDocument();
    expect(within(rows[2]).getByText('Miriam')).toBeInTheDocument();
    expect(within(rows[2]).getByText('(abwesend)')).toBeInTheDocument();
    expect(screen.getByLabelText('Pokal für Platz 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Pokal für Platz 2')).toBeInTheDocument();
    expect(screen.getByLabelText('Pokal für Platz 3')).toBeInTheDocument();
  });

  it('routes to the ranked-game editor', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RankingEntryPage />);

    await user.click(await screen.findByRole('button', { name: 'Bearbeiten' }));

    expect(mocks.router.push).toHaveBeenCalledWith('/rankings/game/10');
  });

  it('supports cancelling and confirming deletion with a pending state', async () => {
    const user = userEvent.setup();
    let finishDelete: (() => void) | undefined;
    mocks.removeGame.mockReturnValue(
      new Promise<void>((resolve) => {
        finishDelete = resolve;
      })
    );
    renderWithProviders(<RankingEntryPage />);

    await user.click(await screen.findByRole('button', { name: 'Löschen' }));
    let dialog = await screen.findByRole('dialog', { name: 'Spiel löschen' });
    await user.click(within(dialog).getByRole('button', { name: 'Abbrechen' }));
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Spiel löschen' })
      ).not.toBeInTheDocument()
    );
    expect(mocks.removeGame).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Löschen' }));
    dialog = await screen.findByRole('dialog', { name: 'Spiel löschen' });
    const confirmButton = within(dialog).getByRole('button', {
      name: 'Löschen',
    });
    await user.click(confirmButton);

    expect(mocks.removeGame).toHaveBeenCalledWith(10);
    expect(confirmButton).toBeDisabled();

    finishDelete?.();
    await waitFor(() =>
      expect(mocks.router.push).toHaveBeenCalledWith('/rankings')
    );
  });

  it('shows the empty ranking state', async () => {
    mocks.getRankings.mockResolvedValue([]);

    renderWithProviders(<RankingEntryPage />);

    expect(
      await screen.findByText('Keine Daten vorhanden.')
    ).toBeInTheDocument();
  });
});
