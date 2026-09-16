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
  createDepositBatch: vi.fn(),
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
    createDepositBatch: mocks.createDepositBatch,
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
    updatedAt: '2026-07-01T09:00:00.000Z',
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
    updatedAt: '2026-07-01T09:00:01.000Z',
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
    updatedAt: '2026-07-01T09:00:02.000Z',
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
    vi.clearAllMocks();
    mocks.search = 'editGameId=10';
    mocks.getUsers.mockResolvedValue([user]);
    mocks.getSeasons.mockResolvedValue([season]);
    mocks.getGames.mockResolvedValue([game]);
    mocks.getFinances.mockResolvedValue(finances);
    mocks.createDepositBatch.mockResolvedValue([]);
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
        transactions: [
          { id: 20, updatedAt: '2026-07-01T09:00:00.000Z' },
          { id: 21, updatedAt: '2026-07-01T09:00:01.000Z' },
          { id: 22, updatedAt: '2026-07-01T09:00:02.000Z' },
        ],
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

  it('submits aggregated cent amounts without floating-point drift', async () => {
    const browser = userEvent.setup();
    mocks.getFinances.mockResolvedValueOnce([
      { ...finances[0], amount: 0.1 },
      { ...finances[0], id: 23, amount: 0.2 },
      { ...finances[1], amount: 0.1 },
      { ...finances[1], id: 24, amount: 0.2 },
    ]);
    renderWithProviders(<BulkDepositPage />);

    expect(
      await screen.findByRole('spinbutton', { name: 'Gutschrift' })
    ).toHaveValue(0.3);
    expect(screen.getByRole('spinbutton', { name: 'Kasse' })).toHaveValue(0.3);

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
              memberAmount: 0.3,
              clubAmount: 0.3,
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

    await waitFor(() =>
      expect(mocks.createDepositBatch).toHaveBeenCalledWith({
        occurredAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$/),
        seasonId: 3,
        gameId: undefined,
        members: [
          {
            userId: 1,
            memberAmount: 30,
            clubAmount: 20,
            description: undefined,
          },
        ],
        otherIncomes: [],
      })
    );
    expect(mocks.replaceGameDeposits).not.toHaveBeenCalled();
    expect(mocks.push).toHaveBeenCalledWith('/finance');
  });

  it('shows every member with initials and enables only selected member fields', async () => {
    const browser = userEvent.setup();
    mocks.search = '';
    mocks.getUsers.mockResolvedValueOnce([
      { ...user, displayName: 'Nina Hartmann' },
      { ...user, id: 2, displayName: 'Tobias Gruber' },
    ]);
    renderWithProviders(<BulkDepositPage />);

    expect(
      await screen.findByRole('heading', {
        name: 'Mitgliedsbeiträge einfügen',
      })
    ).toBeInTheDocument();
    expect(screen.getByText('2 Mitglieder')).toBeInTheDocument();
    expect(screen.getByText('Nina Hartmann')).toBeInTheDocument();
    expect(screen.getByText('Tobias Gruber')).toBeInTheDocument();
    expect(screen.getByText('NH')).toBeInTheDocument();
    expect(screen.getByText('TG')).toBeInTheDocument();

    const checkboxes = screen.getAllByRole('checkbox', { name: 'Bezahlt' });
    const memberAmounts = screen.getAllByRole('spinbutton', {
      name: 'Gutschrift',
    });
    expect(memberAmounts[0]).toBeDisabled();
    expect(memberAmounts[1]).toBeDisabled();

    await browser.click(checkboxes[0]);

    expect(memberAmounts[0]).toBeEnabled();
    expect(memberAmounts[1]).toBeDisabled();
  });

  it('keeps create-mode input and stays on the page when the batch fails', async () => {
    const browser = userEvent.setup();
    mocks.search = '';
    mocks.createDepositBatch.mockRejectedValueOnce(new Error('Nicht gespeichert'));
    renderWithProviders(<BulkDepositPage />);

    await browser.click(
      await screen.findByRole('checkbox', { name: 'Bezahlt' })
    );
    const memberAmount = screen.getByRole('spinbutton', {
      name: 'Gutschrift',
    });
    await browser.click(screen.getByRole('button', { name: 'Speichern' }));

    await waitFor(() =>
      expect(mocks.createDepositBatch).toHaveBeenCalledTimes(1)
    );
    expect(memberAmount).toHaveValue(30);
    expect(mocks.push).not.toHaveBeenCalled();
    expect(await screen.findByText('Nicht gespeichert')).toBeInTheDocument();
  });
});
