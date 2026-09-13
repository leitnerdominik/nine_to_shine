import React from 'react';
import { act, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import DashboardPage from './page';

const mocks = vi.hoisted(() => ({
  getSeasons: vi.fn(),
  getTopRanked: vi.fn(),
  getNextDuty: vi.fn(),
  getDuesStatus: vi.fn(),
}));

vi.mock('@/definitions/commands', () => ({
  apiSeason: { getAll: mocks.getSeasons },
  apiRanking: { getTopRanked: mocks.getTopRanked },
  apiOrganizerDuty: { getNextDuty: mocks.getNextDuty },
  apiFinance: { getDuesStatus: mocks.getDuesStatus },
}));

vi.mock('@/components/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, resolve, reject };
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSeasons.mockResolvedValue([{ id: 5, seasonNumber: 7 }]);
    mocks.getTopRanked.mockResolvedValue(null);
    mocks.getNextDuty.mockResolvedValue(null);
    mocks.getDuesStatus.mockResolvedValue([]);
  });

  it('shows the dashboard skeleton until all summary requests settle', async () => {
    const duesRequest = deferred<[]>();
    mocks.getDuesStatus.mockReturnValue(duesRequest.promise);

    renderWithProviders(<DashboardPage />);

    const loadingStatus = screen.getByRole('status', {
      name: 'Dashboard wird geladen',
    });
    expect(loadingStatus).toHaveAttribute('aria-busy', 'true');
    await waitFor(() => expect(mocks.getDuesStatus).toHaveBeenCalledWith(5));
    expect(loadingStatus).toBeInTheDocument();

    await act(async () => {
      duesRequest.resolve([]);
    });

    await waitFor(() =>
      expect(
        screen.queryByRole('status', { name: 'Dashboard wird geladen' })
      ).not.toBeInTheDocument()
    );
    expect(
      screen.getByRole('heading', { level: 1, name: 'Saison 7' })
    ).toBeInTheDocument();
  });

  it('shows the existing fallbacks after a dashboard request fails', async () => {
    mocks.getDuesStatus.mockRejectedValueOnce(new Error('Request failed'));

    renderWithProviders(<DashboardPage />);

    expect(
      await screen.findByText('Fehler beim Laden des Dashboards')
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.queryByRole('status', { name: 'Dashboard wird geladen' })
      ).not.toBeInTheDocument()
    );
    expect(screen.getByText('Noch keine Punkte')).toBeInTheDocument();
    expect(screen.getByText('Nicht verfügbar')).toBeInTheDocument();
    expect(screen.getByText('Frei!')).toBeInTheDocument();
  });

  it('keeps the successful empty state when no season exists', async () => {
    mocks.getSeasons.mockResolvedValue([]);

    renderWithProviders(<DashboardPage />);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Saison –' })
    ).toBeInTheDocument();
    expect(mocks.getTopRanked).toHaveBeenCalledWith(undefined);
    expect(mocks.getNextDuty).toHaveBeenCalledTimes(1);
    expect(mocks.getDuesStatus).not.toHaveBeenCalled();
    expect(screen.getByText('Noch keine Punkte')).toBeInTheDocument();
    expect(screen.getByText('Alles bezahlt')).toBeInTheDocument();
    expect(screen.getByText('Keine offenen Spielbeiträge')).toBeInTheDocument();
    expect(screen.getByText('Frei!')).toBeInTheDocument();
  });

  it('uses the highest season and preserves summary navigation', async () => {
    mocks.getSeasons.mockResolvedValue([
      { id: 3, seasonNumber: 3 },
      { id: 9, seasonNumber: 9 },
      { id: 7, seasonNumber: 7 },
    ]);
    mocks.getTopRanked.mockResolvedValue({
      userId: 12,
      userDisplayName: 'Dominik Leitner',
      totalPoints: 128,
    });
    mocks.getNextDuty.mockResolvedValue({
      id: 4,
      dutyDate: '2026-10-01T00:00:00.000Z',
      userId: 15,
      userDisplayName: 'Florian',
      seasonId: 9,
      seasonDisplayNumber: 9,
      isSkipped: false,
      isManualOverride: false,
    });

    renderWithProviders(<DashboardPage />);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Saison 9' })
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(mocks.getTopRanked).toHaveBeenCalledWith(9);
      expect(mocks.getDuesStatus).toHaveBeenCalledWith(9);
    });

    expect(screen.getByText('Dominik Leitner').closest('a')).toHaveAttribute(
      'href',
      '/rankings'
    );
    expect(screen.getByText('128 Punkte')).toBeInTheDocument();
    expect(screen.getByText('Florian').closest('a')).toHaveAttribute(
      'href',
      '/organizer-duties'
    );
    expect(screen.getByText('für Oktober 2026')).toBeInTheDocument();
  });

  it('shows the current-season open count and links to the overview', async () => {
    mocks.getDuesStatus.mockResolvedValue([
      {
        gameId: 10,
        seasonId: 5,
        playedAt: '2026-07-15T18:00:00.000Z',
        gameName: 'Open game',
        activeMemberCount: 3,
        paidMemberCount: 1,
        unpaidMembers: [
          { userId: 2, displayName: 'Alex' },
          { userId: 3, displayName: 'Bob' },
        ],
      },
    ]);

    renderWithProviders(<DashboardPage />);

    await waitFor(() =>
      expect(mocks.getDuesStatus).toHaveBeenCalledWith(5)
    );
    const openCount = await screen.findByText('2 offen');
    expect(screen.getByText('1 Spiel betroffen')).toBeInTheDocument();
    expect(openCount.closest('a')).toHaveAttribute('href', '/finance/dues');
  });

  it('shows the all-paid state when no payments are open', async () => {
    mocks.getDuesStatus.mockResolvedValue([
      {
        gameId: 10,
        seasonId: 5,
        playedAt: '2026-07-15T18:00:00.000Z',
        gameName: 'Settled game',
        activeMemberCount: 3,
        paidMemberCount: 3,
        unpaidMembers: [],
      },
    ]);

    renderWithProviders(<DashboardPage />);

    expect(await screen.findByText('Alles bezahlt')).toBeInTheDocument();
    expect(screen.getByText('Keine offenen Spielbeiträge')).toBeInTheDocument();
  });
});
