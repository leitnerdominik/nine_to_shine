import React from 'react';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import GamesListPage from './page';

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  searchParams: new URLSearchParams(),
  getSeasons: vi.fn(),
  getGamesWithBookings: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace }),
  usePathname: () => '/finance/games',
  useSearchParams: () => mocks.searchParams,
}));

vi.mock('@/definitions/commands', () => ({
  apiSeason: { getAll: mocks.getSeasons },
  apiGame: { getGamesWithBookings: mocks.getGamesWithBookings },
}));

vi.mock('@/components/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

vi.mock('@/components/LoadingSkeleton', () => ({
  default: () => React.createElement('div', null, 'Loading games'),
}));

describe('GamesListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.searchParams = new URLSearchParams();
    mocks.getSeasons.mockResolvedValue([
      { id: 80, seasonNumber: 8 },
      { id: 90, seasonNumber: 9 },
    ]);
    mocks.getGamesWithBookings.mockResolvedValue([
      {
        id: 12,
        seasonId: 90,
        gameName: 'Demo-Bowling',
        playedAt: '2026-08-23T18:00:00.000Z',
      },
      {
        id: 11,
        seasonId: 90,
        gameName: 'Demo-Pubquiz',
        playedAt: '2026-07-23T18:00:00.000Z',
      },
      {
        id: 10,
        seasonId: 80,
        gameName: 'Demo-Watten',
        playedAt: '2025-10-11T18:00:00.000Z',
      },
    ]);
  });

  it('shows the newest season by default with its year, emojis, and detail links', async () => {
    renderWithProviders(<GamesListPage />);

    expect(await screen.findByText('Demo-Bowling')).toBeVisible();
    expect(screen.getByText('Saison 9 · 2026')).toBeVisible();
    expect(screen.getByText('Demo-Pubquiz')).toBeVisible();
    expect(screen.queryByText('Demo-Watten')).not.toBeInTheDocument();
    const bowlingLink = screen.getByRole('link', {
      name: 'Demo-Bowling – Details öffnen',
    });
    expect(bowlingLink).toHaveAttribute('href', '/finance/games/12');
    expect(within(bowlingLink).getByText('🎳')).toBeVisible();
    expect(within(bowlingLink).getByText('23.08.2026')).toBeVisible();
    expect(within(bowlingLink).getByText('Details')).toBeVisible();
    expect(mocks.getSeasons).toHaveBeenCalledTimes(1);
  });

  it('reads the selected season from the URL and preserves other query parameters', async () => {
    const browser = userEvent.setup();
    mocks.searchParams = new URLSearchParams('season=8&source=dues');

    renderWithProviders(<GamesListPage />);

    expect(await screen.findByText('Demo-Watten')).toBeVisible();
    expect(screen.getByText('Saison 8 · 2025')).toBeVisible();
    expect(screen.queryByText('Demo-Bowling')).not.toBeInTheDocument();

    await browser.click(screen.getByRole('combobox', { name: 'Saison' }));
    await browser.click(screen.getByRole('option', { name: 'Saison 9' }));
    expect(mocks.replace).toHaveBeenCalledWith(
      '/finance/games?season=9&source=dues'
    );
  });

  it('shows the selected season without a year when it has no booked games', async () => {
    mocks.getSeasons.mockResolvedValue([
      { id: 100, seasonNumber: 10 },
      { id: 90, seasonNumber: 9 },
    ]);

    renderWithProviders(<GamesListPage />);

    expect(await screen.findByText('Keine Spiele mit Buchungen gefunden.')).toBeVisible();
    expect(screen.getByText('Saison 10', { selector: 'p' })).toBeVisible();
    expect(screen.queryByText('Demo-Bowling')).not.toBeInTheDocument();
  });

  it('shows an empty state when no seasons exist', async () => {
    mocks.getSeasons.mockResolvedValue([]);
    renderWithProviders(<GamesListPage />);
    expect(await screen.findByText('Keine Saison vorhanden.')).toBeVisible();
    expect(screen.queryByRole('combobox', { name: 'Saison' })).not.toBeInTheDocument();
  });

  it('shows an initial-load error instead of the empty state and retries', async () => {
    const browser = userEvent.setup();
    mocks.getGamesWithBookings.mockRejectedValueOnce(
      new Error('API nicht erreichbar')
    );

    renderWithProviders(<GamesListPage />);

    expect(
      await screen.findByText(
        'Spiele konnten nicht geladen werden. API nicht erreichbar'
      )
    ).toBeVisible();
    expect(
      screen.queryByText('Keine Spiele mit Buchungen gefunden.')
    ).not.toBeInTheDocument();

    await browser.click(
      screen.getByRole('button', { name: 'Erneut versuchen' })
    );

    expect(await screen.findByText('Demo-Bowling')).toBeVisible();
    await waitFor(() =>
      expect(mocks.getGamesWithBookings).toHaveBeenCalledTimes(2)
    );
    expect(mocks.getSeasons).toHaveBeenCalledTimes(2);
  });
});
