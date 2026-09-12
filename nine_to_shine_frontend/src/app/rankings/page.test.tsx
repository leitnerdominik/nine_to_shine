import React from 'react';
import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import RankingsPage from './page';

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  getSeasons: vi.fn(),
  getUsers: vi.fn(),
  getGames: vi.fn(),
  getRankings: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace }),
  usePathname: () => '/rankings',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/definitions/commands', () => ({
  apiSeason: { getAll: mocks.getSeasons },
  apiUsers: { getAll: mocks.getUsers },
  apiGame: { getAll: mocks.getGames },
  apiRanking: { getAll: mocks.getRankings },
}));

vi.mock('@/components/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

vi.mock('@/components/LoadingSkeleton', () => ({
  default: () => React.createElement('div', null, 'Loading rankings'),
}));

describe('RankingsPage season totals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSeasons.mockResolvedValue([{ id: 3, seasonNumber: 7 }]);
    mocks.getUsers.mockResolvedValue([
      {
        id: 1,
        displayName: 'Alex',
        isActive: true,
        createdAt: '2025-01-01T00:00:00.000Z',
      },
      {
        id: 2,
        displayName: 'Alex',
        isActive: true,
        createdAt: '2025-01-01T00:00:00.000Z',
      },
    ]);
    mocks.getGames.mockResolvedValue([
      {
        id: 10,
        seasonId: 3,
        playedAt: '2026-07-01T18:00:00.000Z',
        gameName: 'Tennis',
        organizedByUserId: 1,
        organizedByDisplayName: 'Alex',
      },
    ]);
    mocks.getRankings.mockResolvedValue([
      { id: 20, gameId: 10, userId: 1, points: 8, isPresent: true },
      { id: 21, gameId: 10, userId: 2, points: 5, isPresent: true },
    ]);
  });

  it('keeps users with the same display name in separate rows', async () => {
    renderWithProviders(<RankingsPage />);

    const table = await screen.findByRole('table', {
      name: 'Saison-Gesamtpunkte',
    });
    const rows = within(table).getAllByRole('row').slice(1);

    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText('Alex')).toBeInTheDocument();
    expect(within(rows[0]).getByText('8')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Alex')).toBeInTheDocument();
    expect(within(rows[1]).getByText('5')).toBeInTheDocument();
    expect(within(table).queryByText('13')).not.toBeInTheDocument();
  });

  it('sums multiple games by user ID without merging a namesake', async () => {
    mocks.getGames.mockResolvedValue([
      {
        id: 10,
        seasonId: 3,
        playedAt: '2026-07-01T18:00:00.000Z',
        gameName: 'Tennis',
        organizedByUserId: 1,
        organizedByDisplayName: 'Alex',
      },
      {
        id: 11,
        seasonId: 3,
        playedAt: '2026-07-08T18:00:00.000Z',
        gameName: 'Badminton',
        organizedByUserId: 2,
        organizedByDisplayName: 'Alex',
      },
    ]);
    mocks.getRankings.mockResolvedValue([
      { id: 20, gameId: 10, userId: 1, points: 8, isPresent: true },
      { id: 21, gameId: 11, userId: 1, points: 2, isPresent: true },
      { id: 22, gameId: 10, userId: 2, points: 5, isPresent: true },
    ]);

    renderWithProviders(<RankingsPage />);

    const table = await screen.findByRole('table', {
      name: 'Saison-Gesamtpunkte',
    });
    const rows = within(table).getAllByRole('row').slice(1);

    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText('10')).toBeInTheDocument();
    expect(within(rows[1]).getByText('5')).toBeInTheDocument();
    expect(within(table).queryByText('15')).not.toBeInTheDocument();
  });
});
