import { describe, expect, it } from 'vitest';
import type { FinanceDto, GameDto, UserDto } from '@/definitions/types';
import { buildDepositEditData } from './edit-data';

const users: UserDto[] = [
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

const game: GameDto = {
  id: 7,
  seasonId: 3,
  playedAt: '2026-07-01T18:00:00.000Z',
  gameName: 'Tennis',
  organizedByUserId: 1,
  organizedByDisplayName: 'Nina',
};

const finance = (
  id: number,
  overrides: Partial<FinanceDto> = {}
): FinanceDto => ({
  id,
  occurredAt: '2026-07-01T00:00:00.000Z',
  direction: 'income',
  amount: 1,
  category: 'DUES',
  gameId: game.id,
  seasonId: game.seasonId,
  ...overrides,
});

describe('buildDepositEditData', () => {
  it('aggregates member and club dues and preserves only represented IDs', () => {
    const result = buildDepositEditData(users, game, [
      finance(1, {
        userId: 1,
        amount: 30,
        description: 'Mitgliedsbeitrag - Bar',
      }),
      finance(2, {
        userId: 1,
        amount: 30,
        description: 'Mitgliedsbeitrag - Bar',
      }),
      finance(3, {
        amount: 20,
        description: 'Mitgliedsbeitrag - Bar (Nina)',
      }),
      finance(4, {
        amount: 5,
        category: 'OTHER',
        description: 'Restgeld',
      }),
      finance(5, {
        amount: 20,
        description: 'Alter Vereinsbeitrag',
      }),
      finance(6, { direction: 'expense', category: 'PIZZA', amount: 10 }),
      finance(7, { category: 'PRIZE', amount: 3 }),
    ]);

    expect(result.blockingError).toBeUndefined();
    expect(result.transactionIds).toEqual([1, 2, 3, 4]);
    expect(result.unmatchedDuesCount).toBe(1);
    expect(result.defaultValues.globalDate).toBe('2026-07-01');
    expect(result.defaultValues.seasonId).toBe(3);
    expect(result.defaultValues.gameId).toBe(7);
    expect(result.defaultValues.entries[0]).toMatchObject({
      userId: 1,
      hasPaid: true,
      memberAmount: '60',
      clubAmount: '20',
      description: 'Bar',
    });
    expect(result.defaultValues.entries[1]).toMatchObject({
      userId: 2,
      hasPaid: false,
      memberAmount: '30',
      clubAmount: '20',
    });
    expect(result.defaultValues.otherIncomes).toEqual([
      { amount: '5', description: 'Restgeld' },
    ]);
  });

  it('restores a club-only payment without inventing a member amount', () => {
    const result = buildDepositEditData(users, game, [
      finance(1, {
        amount: 20,
        description: 'Mitgliedsbeitrag (Alex)',
      }),
    ]);

    expect(result.defaultValues.entries[1]).toMatchObject({
      hasPaid: true,
      memberAmount: '0',
      clubAmount: '20',
      description: '',
    });
  });

  it('blocks editing when represented rows have different dates', () => {
    const result = buildDepositEditData(users, game, [
      finance(1, { userId: 1, amount: 30 }),
      finance(2, {
        amount: 20,
        description: 'Mitgliedsbeitrag (Nina)',
        occurredAt: '2026-07-02T00:00:00.000Z',
      }),
    ]);

    expect(result.blockingError).toContain('unterschiedliche Buchungsdaten');
  });

  it('blocks editing when one member has conflicting descriptions', () => {
    const result = buildDepositEditData(users, game, [
      finance(1, {
        userId: 1,
        amount: 30,
        description: 'Mitgliedsbeitrag - Bar',
      }),
      finance(2, {
        amount: 20,
        description: 'Mitgliedsbeitrag - Überweisung (Nina)',
      }),
    ]);

    expect(result.blockingError).toBe(
      'Die Beschreibung der Beiträge für Nina ist nicht eindeutig.'
    );
  });
});
