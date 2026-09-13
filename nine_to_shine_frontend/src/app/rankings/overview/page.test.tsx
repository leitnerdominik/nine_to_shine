import React from 'react';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import RankingsOverviewPage from './page';
import { getPlayerInitials } from './rankingOverview';

const mocks = vi.hoisted(() => ({
  router: { push: vi.fn(), replace: vi.fn() },
  searchParams: new URLSearchParams(),
  getSeasons: vi.fn(),
  getUsers: vi.fn(),
  getGames: vi.fn(),
  getRankings: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => mocks.router,
  usePathname: () => '/rankings/overview',
  useSearchParams: () => mocks.searchParams,
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
  default: () => React.createElement('div', null, 'Loading overview'),
}));

const seasons = [
  { id: 90, seasonNumber: 9 },
  { id: 80, seasonNumber: 8 },
];

const users = [
  {
    id: 1,
    displayName: 'Alex Meier',
    isActive: true,
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 2,
    displayName: 'Alex Mayer',
    isActive: true,
    createdAt: '2025-01-01T00:00:00.000Z',
  },
];

const games = [
  {
    id: 30,
    seasonId: 90,
    playedAt: '2099-09-20T18:00:00.000Z',
    gameName: 'Demo-Spieleabend',
    organizedByUserId: 1,
    organizedByDisplayName: 'Alex Meier',
  },
  {
    id: 20,
    seasonId: 90,
    playedAt: '2026-08-23T18:00:00.000Z',
    gameName: 'Demo-Bowling',
    organizedByUserId: 2,
    organizedByDisplayName: 'Alex Mayer',
  },
  {
    id: 10,
    seasonId: 80,
    playedAt: '2025-06-12T18:00:00.000Z',
    gameName: 'Altes Spiel',
    organizedByUserId: 1,
    organizedByDisplayName: 'Alex Meier',
  },
];

const rankings = [
  { id: 1, gameId: 20, userId: 1, points: 7, isPresent: true },
  { id: 2, gameId: 20, userId: 2, points: 3, isPresent: true },
  { id: 3, gameId: 10, userId: 1, points: 10, isPresent: true },
];

describe('RankingsOverviewPage', () => {
  beforeEach(() => {
    mocks.searchParams = new URLSearchParams();
    mocks.getSeasons.mockResolvedValue(seasons);
    mocks.getUsers.mockResolvedValue(users);
    mocks.getGames.mockResolvedValue(games);
    mocks.getRankings.mockResolvedValue(rankings);
  });

  it('renders the selected season, latest game year, and only its games', async () => {
    renderWithProviders(<RankingsOverviewPage />);

    expect(
      await screen.findByRole('heading', {
        name: 'Übersichtstabelle',
        level: 1,
      })
    ).toBeInTheDocument();
    expect(screen.getByText('Saison 9 • 2099')).toBeInTheDocument();

    const table = screen.getByRole('table', {
      name: 'Übersichtstabelle aller Spiele',
    });
    expect(within(table).getByText('Demo-Spieleabend')).toBeInTheDocument();
    expect(within(table).getByText('Demo-Bowling')).toBeInTheDocument();
    expect(within(table).queryByText('Altes Spiel')).not.toBeInTheDocument();
  });

  it('marks future games as planned and keeps past scoreless cells as dashes', async () => {
    mocks.getGames.mockResolvedValue([
      games[0],
      {
        ...games[1],
        id: 21,
        gameName: 'Vergangenes Spiel ohne Punkte',
      },
      games[1],
    ]);

    renderWithProviders(<RankingsOverviewPage />);

    const table = await screen.findByRole('table', {
      name: 'Übersichtstabelle aller Spiele',
    });
    const plannedRow = within(table)
      .getByText('Demo-Spieleabend')
      .closest('tr');
    const scorelessPastRow = within(table)
      .getByText('Vergangenes Spiel ohne Punkte')
      .closest('tr');

    expect(plannedRow).not.toBeNull();
    expect(within(plannedRow!).getByText('(geplant)')).toBeInTheDocument();
    expect(within(plannedRow!).getAllByText('–')).toHaveLength(2);
    expect(scorelessPastRow).not.toBeNull();
    expect(within(scorelessPastRow!).queryByText('(geplant)')).not.toBeInTheDocument();
    expect(within(scorelessPastRow!).getAllByText('–')).toHaveLength(2);
  });

  it('keeps duplicate display names separate and totals scores by user ID', async () => {
    renderWithProviders(<RankingsOverviewPage />);

    const table = await screen.findByRole('table', {
      name: 'Übersichtstabelle aller Spiele',
    });
    expect(
      within(table).getByRole('columnheader', { name: 'Alex Meier' })
    ).toBeInTheDocument();
    expect(
      within(table).getByRole('columnheader', { name: 'Alex Mayer' })
    ).toBeInTheDocument();

    const totalRow = within(table).getByText('Gesamt').closest('tr');
    expect(totalRow).not.toBeNull();
    expect(within(totalRow!).getByText('7')).toBeInTheDocument();
    expect(within(totalRow!).getByText('3')).toBeInTheDocument();
    expect(within(totalRow!).queryByText('10')).not.toBeInTheDocument();
    expect(screen.getAllByLabelText('Spieler Alex Meier').length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText('Spieler Alex Mayer').length).toBeGreaterThan(0);
  });

  it('updates the season query and exposes accessible game links', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RankingsOverviewPage />);

    await screen.findByRole('table', {
      name: 'Übersichtstabelle aller Spiele',
    });
    await user.click(screen.getByRole('combobox', { name: 'Saison' }));
    await user.click(screen.getByRole('option', { name: 'Saison 8' }));

    expect(mocks.router.replace).toHaveBeenCalledWith(
      '/rankings/overview?season=8'
    );
    expect(
      screen.getAllByRole('link', { name: 'Spiel Demo-Bowling öffnen' })[0]
    ).toHaveAttribute('href', '/rankings/20');
  });

  it('omits the derived year and shows the empty state without games', async () => {
    mocks.getGames.mockResolvedValue([]);
    mocks.getRankings.mockResolvedValue([]);

    renderWithProviders(<RankingsOverviewPage />);

    await screen.findByRole('heading', { name: 'Übersichtstabelle' });
    expect(screen.getAllByText('Saison 9')).toHaveLength(2);
    expect(screen.queryByText('Saison 9 • 2099')).not.toBeInTheDocument();
    expect(
      screen.getByText('Für diese Auswahl sind keine Spiele vorhanden.')
    ).toBeInTheDocument();
  });

  it('shows the loading state while requests are pending', () => {
    mocks.getSeasons.mockReturnValue(new Promise(() => undefined));

    renderWithProviders(<RankingsOverviewPage />);

    expect(screen.getByText('Loading overview')).toBeInTheDocument();
  });

  it('creates compact, deterministic initials', () => {
    expect(getPlayerInitials('Lisa Hofer')).toBe('LH');
    expect(getPlayerInitials('Thomas')).toBe('TH');
    expect(getPlayerInitials('  ')).toBe('?');
  });
});
