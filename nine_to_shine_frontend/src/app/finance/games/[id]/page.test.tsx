import React from 'react';
import { screen, within } from '@testing-library/react';
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
  isConflictError: () => false,
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
  });
});
