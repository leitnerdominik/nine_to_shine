import React from 'react';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import GamePaymentDetailsPage from './page';

const gameId = 10;

const mocks = vi.hoisted(() => ({
  back: vi.fn(),
  push: vi.fn(),
  getUsers: vi.fn(),
  getFinances: vi.fn(),
  getGames: vi.fn(),
  deleteByGameId: vi.fn(),
  isConflictError: vi.fn(),
}));

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    use: () => ({ id: String(gameId) }),
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: mocks.back, push: mocks.push }),
}));

vi.mock('@/definitions/commands', () => ({
  apiUsers: { getAll: mocks.getUsers },
  apiFinance: {
    getAll: mocks.getFinances,
    deleteByGameId: mocks.deleteByGameId,
  },
  apiGame: { getAll: mocks.getGames },
}));

vi.mock('@/definitions/api', () => ({
  isConflictError: mocks.isConflictError,
}));

vi.mock('@/components/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

vi.mock('@/components/LoadingSkeleton', () => ({
  default: () => React.createElement('div', null, 'Loading game'),
}));

vi.mock('@/components/EditGameDepositsButton', () => ({
  default: () =>
    React.createElement('button', null, 'Einzahlungen bearbeiten'),
}));

const users = [
  {
    id: 1,
    displayName: 'Nina',
    isActive: true,
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 2,
    displayName: 'Alex',
    isActive: true,
    createdAt: '2025-01-01T00:00:00.000Z',
  },
];

const game = {
  id: gameId,
  seasonId: 3,
  playedAt: '2026-06-16T12:00:00.000Z',
  gameName: 'Testspiel',
  organizedByUserId: 1,
  organizedByDisplayName: 'Nina',
};

describe('GamePaymentDetailsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUsers.mockResolvedValue(users);
    mocks.isConflictError.mockReturnValue(false);
    mocks.deleteByGameId.mockResolvedValue(undefined);
    mocks.getGames.mockResolvedValue([game]);
    mocks.getFinances.mockResolvedValue([
      {
        id: 100,
        updatedAt: '2026-06-16T13:00:00.000Z',
        occurredAt: '2026-06-16T12:00:00.000Z',
        direction: 'income',
        amount: 30,
        category: 'DUES',
        description: 'Mitgliedsbeitrag',
        userId: 1,
        seasonId: 3,
        gameId,
      },
      {
        id: 101,
        updatedAt: '2026-06-16T13:00:01.000Z',
        occurredAt: '2026-06-16T12:00:00.000Z',
        direction: 'income',
        amount: 12,
        category: 'OTHER',
        description: 'Sonstige Einnahme',
        userId: 2,
        seasonId: 3,
        gameId,
      },
    ]);
  });

  it('does not count user-linked other income as paid dues', async () => {
    renderWithProviders(
      <GamePaymentDetailsPage
        params={Promise.resolve({ id: String(gameId) })}
      />
    );

    const ninaRow = (await screen.findByText('Nina')).closest('tr')!;
    expect(within(ninaRow).getByText('Bezahlt')).toBeInTheDocument();
    expect(within(ninaRow).getByText('30,00 €')).toBeInTheDocument();

    const alexRow = screen.getByText('Alex').closest('tr')!;
    expect(within(alexRow).getByText('Offen')).toBeInTheDocument();
    expect(within(alexRow).getByText('-')).toBeInTheDocument();

    const incomeSummary = screen
      .getByText('Einnahmen', { exact: true })
      .closest('.MuiPaper-root')!;
    expect(within(incomeSummary).getByText('42,00 €')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Sonstige Einnahmen' })).not.toBeInTheDocument();
    expect(screen.getByText('Keine Ausgaben für dieses Spiel verbucht.')).toBeInTheDocument();
  });

  it('shows the three totals and every transaction section', async () => {
    mocks.getFinances.mockResolvedValue([
      {
        id: 100, updatedAt: '2026-06-16T13:00:00.000Z', direction: 'income',
        amount: 30, category: 'DUES', userId: 1, gameId,
      },
      {
        id: 101, updatedAt: '2026-06-16T13:00:01.000Z', direction: 'income',
        amount: 15, category: 'OTHER', description: 'Tombola', gameId,
      },
      {
        id: 102, updatedAt: '2026-06-16T13:00:02.000Z', direction: 'expense',
        amount: 12.4, category: 'EVENT', description: 'Raummiete', gameId,
      },
    ]);
    renderWithProviders(<GamePaymentDetailsPage params={Promise.resolve({ id: String(gameId) })} />);

    expect(await screen.findByRole('heading', { name: 'Testspiel' })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Einnahmen der Mitglieder' })).toBeInTheDocument();
    expect(within(screen.getByRole('table', { name: 'Sonstige Einnahmen' })).getByText('Tombola')).toBeInTheDocument();
    expect(within(screen.getByRole('table', { name: 'Ausgaben des Spiels' })).getByText('Raummiete')).toBeInTheDocument();
    expect(screen.getByText('45,00 €')).toBeInTheDocument();
    expect(screen.getByText('12,40 €', { exact: true })).toBeInTheDocument();
    expect(screen.getByText('+32,60 €')).toBeInTheDocument();
    expect(within(screen.getByRole('table', { name: 'Ausgaben des Spiels' })).getByText('- 12,40 €')).toBeInTheDocument();
  });

  it('confirms deletion with the loaded transaction versions', async () => {
    renderWithProviders(<GamePaymentDetailsPage params={Promise.resolve({ id: String(gameId) })} />);
    await screen.findByRole('heading', { name: 'Testspiel' });

    fireEvent.click(screen.getByRole('button', { name: 'Alle Transaktionen zum Spiel löschen' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Löschen' }));

    await waitFor(() => expect(mocks.deleteByGameId).toHaveBeenCalledWith(gameId, [
      { id: 100, updatedAt: '2026-06-16T13:00:00.000Z' },
      { id: 101, updatedAt: '2026-06-16T13:00:01.000Z' },
    ]));
    await waitFor(() => expect(mocks.push).toHaveBeenCalled());
  });

  it('retains the page and offers reload after a deletion conflict', async () => {
    mocks.deleteByGameId.mockRejectedValue(new Error('conflict'));
    mocks.isConflictError.mockReturnValue(true);
    renderWithProviders(<GamePaymentDetailsPage params={Promise.resolve({ id: String(gameId) })} />);
    await screen.findByRole('heading', { name: 'Testspiel' });

    fireEvent.click(screen.getByRole('button', { name: 'Alle Transaktionen zum Spiel löschen' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Löschen' }));

    expect(await screen.findByText(/Die Finanzdaten wurden inzwischen geändert/)).toBeInTheDocument();
    expect(mocks.push).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Neu laden' }));
    await waitFor(() => expect(mocks.getFinances).toHaveBeenCalledTimes(2));
  });
});
