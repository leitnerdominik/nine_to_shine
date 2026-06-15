import { describe, expect, it } from 'vitest';
import { schema as depositSchema } from './deposit';
import { schema as expenseSchema } from './expense';
import { schema as tripSchema } from './trip';

describe('finance form schemas', () => {
  it('accepts a valid expense form and rejects non-positive amounts', () => {
    expect(
      expenseSchema.safeParse({
        globalDate: '2026-06-15',
        seasonId: 1,
        gameId: 2,
        items: [{ amount: '12.50', description: 'Pizza' }],
      }).success
    ).toBe(true);

    expect(
      expenseSchema.safeParse({
        globalDate: '2026-06-15',
        seasonId: 1,
        items: [{ amount: '0', description: 'Invalid' }],
      }).success
    ).toBe(false);
  });

  it('requires a season for deposits and numeric member amounts', () => {
    expect(
      depositSchema.safeParse({
        globalDate: '2026-06-15',
        seasonId: 3,
        entries: [
          {
            userId: 7,
            displayName: 'Alex',
            useStandard: true,
            hasPaid: true,
            memberAmount: '30',
            clubAmount: '20',
          },
        ],
        otherIncomes: [{ amount: '12', description: 'Sponsor' }],
      }).success
    ).toBe(true);

    expect(
      depositSchema.safeParse({
        globalDate: '2026-06-15',
        seasonId: 0,
        entries: [
          {
            userId: 7,
            displayName: 'Alex',
            useStandard: true,
            hasPaid: true,
            memberAmount: 'not-a-number',
            clubAmount: '20',
          },
        ],
        otherIncomes: [],
      }).success
    ).toBe(false);
  });

  it('validates trip dates, seasons, base costs, and participants', () => {
    expect(
      tripSchema.safeParse({
        globalDate: '2026-06-15',
        seasonId: 4,
        description: 'Hamburg',
        baseCostTotal: '120',
        participants: [
          {
            userId: 1,
            displayName: 'Nina',
            isOnTrip: true,
          },
        ],
      }).success
    ).toBe(true);

    expect(
      tripSchema.safeParse({
        globalDate: '',
        seasonId: 0,
        baseCostTotal: '-1',
        participants: [],
      }).success
    ).toBe(false);
  });
});
