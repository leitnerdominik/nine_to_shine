import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import DuesOverviewPage from './page';

const mocks = vi.hoisted(() => ({
  getSeasons: vi.fn(),
  getDuesStatus: vi.fn(),
}));

vi.mock('@/definitions/commands', () => ({
  apiSeason: { getAll: mocks.getSeasons },
  apiFinance: { getDuesStatus: mocks.getDuesStatus },
}));

vi.mock('@/components/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

vi.mock('@/components/LoadingSkeleton', () => ({
  default: () => React.createElement('div', null, 'Loading dues'),
}));

const latestSeasonGames = [
  {
    gameId: 10,
    seasonId: 2,
    playedAt: '2026-07-15T18:00:00.000Z',
    gameName: 'Open game',
    activeMemberCount: 3,
    paidMemberCount: 1,
    unpaidMembers: [
      { userId: 2, displayName: 'Alex' },
      { userId: 3, displayName: 'Bob' },
    ],
  },
  {
    gameId: 11,
    seasonId: 2,
    playedAt: '2026-06-15T18:00:00.000Z',
    gameName: 'Settled game',
    activeMemberCount: 3,
    paidMemberCount: 3,
    unpaidMembers: [],
  },
];

describe('DuesOverviewPage', () => {
  beforeEach(() => {
    mocks.getSeasons.mockResolvedValue([
      { id: 1, seasonNumber: 1 },
      { id: 2, seasonNumber: 3 },
    ]);
    mocks.getDuesStatus.mockImplementation((seasonId: number) =>
      Promise.resolve(
        seasonId === 2
          ? latestSeasonGames
          : [
              {
                gameId: 4,
                seasonId: 1,
                playedAt: '2025-05-15T18:00:00.000Z',
                gameName: 'Earlier game',
                activeMemberCount: 3,
                paidMemberCount: 2,
                unpaidMembers: [{ userId: 3, displayName: 'Bob' }],
              },
            ]
      )
    );
  });

  it('defaults to the latest season and renders open and settled games', async () => {
    renderWithProviders(<DuesOverviewPage />);

    await waitFor(() =>
      expect(mocks.getDuesStatus).toHaveBeenCalledWith(2)
    );

    expect(await screen.findByText('Open game')).toBeInTheDocument();
    expect(screen.getByText('Settled game')).toBeInTheDocument();
    expect(screen.getByText('Alex')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('2 offen')).toBeInTheDocument();
    expect(screen.getByText('Alles bezahlt')).toBeInTheDocument();
    expect(screen.getByLabelText('2 offene Beiträge')).toBeInTheDocument();
    expect(screen.getByLabelText('1 betroffene Spiele')).toBeInTheDocument();
    expect(screen.getByText('Open game').closest('a')).toHaveAttribute(
      'href',
      '/finance/games/10'
    );
  });

  it('reloads the overview when another season is selected', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DuesOverviewPage />);

    await screen.findByText('Open game');
    await user.click(screen.getByRole('combobox', { name: 'Saison' }));
    await user.click(screen.getByRole('option', { name: 'Saison 1' }));

    await waitFor(() =>
      expect(mocks.getDuesStatus).toHaveBeenLastCalledWith(1)
    );
    expect(await screen.findByText('Earlier game')).toBeInTheDocument();
  });
});
