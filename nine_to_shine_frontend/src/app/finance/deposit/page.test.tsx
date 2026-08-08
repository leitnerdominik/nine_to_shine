import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import BulkDepositPage from './page';

const mocks = vi.hoisted(() => ({
  search: 'editGameId=10',
  push: vi.fn(),
  getUsers: vi.fn(),
  getSeasons: vi.fn(),
  getGames: vi.fn(),
  getFinances: vi.fn(),
  createFinance: vi.fn(),
  replaceGameDeposits: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
  useSearchParams: () => new URLSearchParams(mocks.search),
}));

vi.mock('@/definitions/commands', () => ({
  apiUsers: { getAll: mocks.getUsers },
  apiSeason: { getAll: mocks.getSeasons },
  apiGame: { getAll: mocks.getGames },
  apiFinance: {
    getAll: mocks.getFinances,
    create: mocks.createFinance,
    replaceGameDeposits: mocks.replaceGameDeposits,
  },
}));

vi.mock('@/components/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

vi.mock('@/components/LoadingSkeleton', () => ({
  default: () => React.createElement('div', null, 'Loading deposits'),
}));

const user = {
  id: 1,
  displayName: 'Nina',
  isActive: true,
  createdAt: '2025-01-01T00:00:00.000Z',
};
const season = { id: 3, seasonNumber: 7 };
const game = {
  id: 10,
  seasonId: 3,
  playedAt: '2026-07-01T18:00:00.000Z',
  gameName: 'Tennis',
  organizedByUserId: 1,
  organizedByDisplayName: 'Nina',
};
const finances = [
  {
    id: 20,
    occurredAt: '2026-07-01T00:00:00.000Z',
    direction: 'income',
    amount: 30,
    category: 'DUES',
    description: 'Mitgliedsbeitrag - Bar',
    userId: 1,
    seasonId: 3,
    gameId: 10,
  },
  {
    id: 21,
    occurredAt: '2026-07-01T00:00:00.000Z',
    direction: 'income',
    amount: 20,
    category: 'DUES',
    description: 'Mitgliedsbeitrag - Bar (Nina)',
    seasonId: 3,
    gameId: 10,
  },
  {
    id: 22,
    occurredAt: '2026-07-01T00:00:00.000Z',
    direction: 'income',
    amount: 5,
    category: 'OTHER',
    description: 'Restgeld',
    seasonId: 3,
    gameId: 10,
  },
];

describe('BulkDepositPage edit mode', () => {
  beforeEach(() => {
    mocks.search = 'editGameId=10';
    mocks.getUsers.mockResolvedValue([user]);
    mocks.getSeasons.mockResolvedValue([season]);
    mocks.getGames.mockResolvedValue([game]);
    mocks.getFinances.mockResolvedValue(finances);
    mocks.createFinance.mockResolvedValue({});
    mocks.replaceGameDeposits.mockResolvedValue([]);
  });

  it('prefills and locks the game, then replaces deposits and returns to details', async () => {
    const browser = userEvent.setup();
    renderWithProviders(<BulkDepositPage />);

    expect(
      await screen.findByRole('heading', {
        name: 'Mitgliedsbeiträge bearbeiten',
      })
    ).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Bezahlt' })).toBeChecked();
    expect(screen.getByRole('spinbutton', { name: 'Gutschrift' })).toHaveValue(30);
    expect(screen.getByRole('spinbutton', { name: 'Kasse' })).toHaveValue(20);
    expect(screen.getByRole('spinbutton', { name: 'Betrag' })).toHaveValue(5);
    screen.getAllByRole('combobox').forEach((select) =>
      expect(select).toHaveAttribute('aria-disabled', 'true')
    );

    await browser.click(
      screen.getByRole('button', { name: 'Änderungen speichern' })
    );

    await waitFor(() =>
      expect(mocks.replaceGameDeposits).toHaveBeenCalledWith(10, {
        transactionIds: [20, 21, 22],
        occurredAt: '2026-07-01T00:00:00.000Z',
        members: [
          {
            userId: 1,
            memberAmount: 30,
            clubAmount: 20,
            description: 'Bar',
          },
        ],
        otherIncomes: [{ amount: 5, description: 'Restgeld' }],
      })
    );
    expect(mocks.push).toHaveBeenCalledWith('/finance/games/10');
  });

  it('keeps the prefilled form when replacement fails', async () => {
    const browser = userEvent.setup();
    mocks.replaceGameDeposits.mockRejectedValueOnce(new Error('Konflikt'));
    renderWithProviders(<BulkDepositPage />);

    const memberAmount = await screen.findByRole('spinbutton', {
      name: 'Gutschrift',
    });
    await browser.click(
      screen.getByRole('button', { name: 'Änderungen speichern' })
    );

    await waitFor(() =>
      expect(mocks.replaceGameDeposits).toHaveBeenCalledTimes(1)
    );
    expect(memberAmount).toHaveValue(30);
    expect(mocks.push).not.toHaveBeenCalled();
    expect(await screen.findByText('Konflikt')).toBeInTheDocument();
  });

  it('submits a cleared member portion as zero', async () => {
    const browser = userEvent.setup();
    renderWithProviders(<BulkDepositPage />);

    const memberAmount = await screen.findByRole('spinbutton', {
      name: 'Gutschrift',
    });
    await browser.clear(memberAmount);
    await browser.click(
      screen.getByRole('button', { name: 'Änderungen speichern' })
    );

    await waitFor(() =>
      expect(mocks.replaceGameDeposits).toHaveBeenCalledWith(
        10,
        expect.objectContaining({
          members: [
            {
              userId: 1,
              memberAmount: 0,
              clubAmount: 20,
              description: 'Bar',
            },
          ],
        })
      )
    );
  });

  it('cancels back to the game detail without saving', async () => {
    const browser = userEvent.setup();
    renderWithProviders(<BulkDepositPage />);

    await browser.click(await screen.findByRole('button', { name: 'Abbrechen' }));

    expect(mocks.push).toHaveBeenCalledWith('/finance/games/10');
    expect(mocks.replaceGameDeposits).not.toHaveBeenCalled();
  });

  it('keeps the existing create workflow when no edit game is requested', async () => {
    const browser = userEvent.setup();
    mocks.search = '';
    renderWithProviders(<BulkDepositPage />);

    expect(
      await screen.findByRole('heading', {
        name: 'Mitgliedsbeiträge einfügen',
      })
    ).toBeInTheDocument();
    await browser.click(screen.getByRole('checkbox', { name: 'Bezahlt' }));
    await browser.click(screen.getByRole('button', { name: 'Speichern' }));

    await waitFor(() => expect(mocks.createFinance).toHaveBeenCalledTimes(2));
    expect(mocks.replaceGameDeposits).not.toHaveBeenCalled();
    expect(mocks.push).toHaveBeenCalledWith('/finance');
  });
});
