import React from 'react';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import RankingsPage from './page';
import { getGameEmoji } from './RankingGameRow';

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

  it('shows the selected season even when only one season exists', async () => {
    renderWithProviders(<RankingsPage />);

    const seasonButton = await screen.findByRole('button', {
      name: 'Saison 7',
    });

    expect(seasonButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('updates the season query when another season is selected', async () => {
    const user = userEvent.setup();
    mocks.getSeasons.mockResolvedValue([
      { id: 3, seasonNumber: 7 },
      { id: 4, seasonNumber: 6 },
    ]);

    renderWithProviders(<RankingsPage />);

    await user.click(await screen.findByRole('button', { name: 'Saison 6' }));

    expect(mocks.replace).toHaveBeenCalledWith('/rankings?season=6');
  });

  it('keeps the leaderboard and secondary ranking actions accessible', async () => {
    renderWithProviders(<RankingsPage />);

    const table = await screen.findByRole('table', {
      name: 'Saison-Gesamtpunkte',
    });

    expect(
      within(table).getByRole('columnheader', { name: 'Platz' })
    ).toBeInTheDocument();
    expect(
      within(table).getByRole('columnheader', { name: 'Name' })
    ).toBeInTheDocument();
    expect(
      within(table).getByRole('columnheader', { name: 'Punkte' })
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Pokal für Platz 1')).toBeInTheDocument();
    expect(
      screen.getByRole('link', {
        name: 'Übersichtstabelle aller Spiele öffnen',
      })
    ).toHaveAttribute('href', '/rankings/overview?season=7');
    expect(screen.getByRole('link', { name: 'Neu' })).toHaveAttribute(
      'href',
      '/rankings/game/new'
    );
  });

  it('shows game-row details with mapped and fallback artwork', async () => {
    mocks.getUsers.mockResolvedValue([
      {
        id: 1,
        displayName: 'Miriam',
        isActive: true,
        createdAt: '2025-01-01T00:00:00.000Z',
      },
      {
        id: 2,
        displayName: 'Felix',
        isActive: true,
        createdAt: '2025-01-01T00:00:00.000Z',
      },
      {
        id: 3,
        displayName: 'Clara',
        isActive: true,
        createdAt: '2025-01-01T00:00:00.000Z',
      },
    ]);
    mocks.getGames.mockResolvedValue([
      {
        id: 10,
        seasonId: 3,
        playedAt: '2026-07-01T18:00:00.000Z',
        gameName: 'Demo-Bowling',
        organizedByUserId: 1,
        organizedByDisplayName: 'Miriam',
      },
      {
        id: 11,
        seasonId: 3,
        playedAt: '2026-06-01T18:00:00.000Z',
        gameName: 'Mystery Game',
        organizedByUserId: 2,
        organizedByDisplayName: 'Felix',
      },
    ]);
    mocks.getRankings.mockResolvedValue([
      { id: 22, gameId: 10, userId: 3, points: 10, isPresent: false },
      { id: 21, gameId: 10, userId: 2, points: 8, isPresent: true },
      { id: 20, gameId: 10, userId: 1, points: 8, isPresent: true },
      { id: 23, gameId: 11, userId: 3, points: 9, isPresent: false },
    ]);

    renderWithProviders(<RankingsPage />);

    const bowlingRow = await screen.findByRole('link', {
      name: 'Spiel Demo-Bowling öffnen',
    });
    expect(bowlingRow).toHaveAttribute('href', '/rankings/10');
    expect(within(bowlingRow).getByText('🎳')).toBeInTheDocument();
    expect(within(bowlingRow).getByText('01.07.2026')).toBeInTheDocument();
    expect(within(bowlingRow).getByText('2 Teilnehmer')).toBeInTheDocument();
    expect(within(bowlingRow).getByText('Miriam')).toBeInTheDocument();

    const fallbackRow = screen.getByRole('link', {
      name: 'Spiel Mystery Game öffnen',
    });
    expect(fallbackRow).toHaveAttribute('href', '/rankings/11');
    expect(within(fallbackRow).getByText('🎮')).toBeInTheDocument();
    expect(within(fallbackRow).getByText('0 Teilnehmer')).toBeInTheDocument();
    expect(within(fallbackRow).getByText('–')).toBeInTheDocument();
  });

  it.each([
    ['Bowling-Abend', '🎳'],
    ['Pubquiz', '💡'],
    ['Tischtennis', '🏓'],
    ['Schach', '♟️'],
    ['Darts', '🎯'],
    ['Tischfußball', '⚽'],
    ['Unbekanntes Spiel', '🎮'],
  ])('maps %s to its game artwork', (gameName, emoji) => {
    expect(getGameEmoji(gameName)).toBe(emoji);
  });

  it('shows the ranking and games empty states', async () => {
    mocks.getGames.mockResolvedValue([]);
    mocks.getRankings.mockResolvedValue([]);

    renderWithProviders(<RankingsPage />);

    expect(
      await screen.findByText('Keine Daten für diese Saison.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Keine Spiele in dieser Saison vorhanden.')
    ).toBeInTheDocument();
  });
});
