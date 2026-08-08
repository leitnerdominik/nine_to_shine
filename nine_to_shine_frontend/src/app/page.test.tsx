import React from 'react';
import { screen, waitFor } from '@testing-library/react';
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

vi.mock('@/components/LoadingSkeleton', () => ({
  default: () => React.createElement('div', null, 'Loading dashboard'),
}));

describe('DashboardPage dues summary', () => {
  beforeEach(() => {
    mocks.getSeasons.mockResolvedValue([{ id: 5, seasonNumber: 7 }]);
    mocks.getTopRanked.mockResolvedValue(null);
    mocks.getNextDuty.mockResolvedValue(null);
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
