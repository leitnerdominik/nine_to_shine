import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiModule = vi.hoisted(() => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
  },
  toErrorMessage: vi.fn((err: unknown) =>
    err instanceof Error ? err.message : 'Request failed'
  ),
  toApiRequestError: vi.fn((err: unknown) =>
    err instanceof Error ? err : new Error('Request failed')
  ),
}));

vi.mock('./api', () => apiModule);

import {
  apiFinance,
  apiOrganizerDuty,
  apiRanking,
  apiTrips,
  apiUsers,
} from './commands';

describe('API command wrappers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads users from the backend user endpoint', async () => {
    apiModule.api.get.mockResolvedValueOnce({
      data: [{ id: 1, displayName: 'Nina' }],
    });

    await expect(apiUsers.getAll()).resolves.toEqual([
      { id: 1, displayName: 'Nina' },
    ]);
    expect(apiModule.api.get).toHaveBeenCalledWith('/user');
  });

  it('wraps API errors with readable messages', async () => {
    apiModule.api.get.mockRejectedValueOnce(new Error('Backend unavailable'));

    await expect(apiUsers.getAll()).rejects.toThrow('Backend unavailable');
  });

  it('passes finance filters as query params', async () => {
    apiModule.api.get.mockResolvedValueOnce({ data: [] });

    await apiFinance.getAll({
      userId: 2,
      seasonId: 3,
      direction: 'expense',
    });

    expect(apiModule.api.get).toHaveBeenCalledWith('/finance', {
      params: {
        userId: 2,
        seasonId: 3,
        direction: 'expense',
      },
    });
  });

  it('loads dues status for the selected season', async () => {
    apiModule.api.get.mockResolvedValueOnce({ data: [] });

    await apiFinance.getDuesStatus(7);

    expect(apiModule.api.get).toHaveBeenCalledWith('/finance/dues-status', {
      params: { seasonId: 7 },
    });
  });

  it('loads the complete balance overview through one endpoint', async () => {
    const overview = {
      globalBalance: 95,
      clubBalance: 70,
      membersBalance: 25,
      userBalances: [
        { userId: 1, displayName: 'Nina', balance: 15 },
        { userId: 2, displayName: 'Alex', balance: 10 },
      ],
    };
    apiModule.api.get.mockResolvedValueOnce({ data: overview });

    await expect(apiFinance.getBalanceOverview()).resolves.toEqual(overview);
    expect(apiModule.api.get).toHaveBeenCalledOnce();
    expect(apiModule.api.get).toHaveBeenCalledWith(
      '/finance/balance/overview'
    );
  });

  it('atomically replaces game deposits', async () => {
    apiModule.api.put.mockResolvedValueOnce({ data: [] });
    const payload = {
      transactions: [
        { id: 10, updatedAt: '2026-07-01T09:00:00.000Z' },
        { id: 11, updatedAt: '2026-07-01T09:00:01.000Z' },
      ],
      occurredAt: '2026-07-01T00:00:00.000Z',
      members: [
        {
          userId: 2,
          memberAmount: 30,
          clubAmount: 20,
          description: 'Nachzahlung',
        },
      ],
      otherIncomes: [{ amount: 5, description: 'Restgeld' }],
    };

    await apiFinance.replaceGameDeposits(7, payload);

    expect(apiModule.api.put).toHaveBeenCalledWith(
      '/finance/game/7/deposits/replace',
      payload
    );
  });

  it('creates deposits through the batch endpoint', async () => {
    apiModule.api.post.mockResolvedValueOnce({ data: [] });
    const payload = {
      occurredAt: '2026-07-01T00:00:00.000Z',
      seasonId: 3,
      gameId: 7,
      members: [
        {
          userId: 2,
          memberAmount: 30,
          clubAmount: 20,
          description: 'Bar',
        },
      ],
      otherIncomes: [{ amount: 5, description: 'Restgeld' }],
    };

    await apiFinance.createDepositBatch(payload);

    expect(apiModule.api.post).toHaveBeenCalledWith(
      '/finance/deposits/batch',
      payload
    );
  });

  it('creates expenses through the batch endpoint', async () => {
    apiModule.api.post.mockResolvedValueOnce({ data: [] });
    const payload = {
      occurredAt: '2026-07-01T00:00:00.000Z',
      seasonId: 3,
      items: [
        { amount: 12.5, description: 'Pizza' },
        { amount: 7.5, description: 'Getränke' },
      ],
    };

    await apiFinance.createExpenseBatch(payload);

    expect(apiModule.api.post).toHaveBeenCalledWith(
      '/finance/expenses/batch',
      payload
    );
  });

  it('deletes a trip by its stable id', async () => {
    apiModule.api.delete.mockResolvedValueOnce({});

    const transactions = [
      { id: 10, updatedAt: '2026-06-15T13:00:00.000Z' },
    ];
    await apiTrips.remove(42, transactions);

    expect(apiModule.api.delete).toHaveBeenCalledWith(
      '/trips/42',
      { data: { transactions } }
    );
  });

  it('loads trip summaries and details by id', async () => {
    apiModule.api.get
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: { id: 42 } });

    await apiTrips.getAll();
    await apiTrips.getById(42);

    expect(apiModule.api.get).toHaveBeenNthCalledWith(1, '/trips');
    expect(apiModule.api.get).toHaveBeenNthCalledWith(2, '/trips/42');
  });

  it('creates a trip through the aggregate endpoint', async () => {
    apiModule.api.post.mockResolvedValueOnce({ data: {} });

    const payload = {
      occurredAt: '2026-06-15T12:30:00.000Z',
      name: 'Urlaub',
      direction: 'expense' as const,
      amount: 10,
      description: 'Urlaub (Ausgabe)',
      seasonId: 4,
      userIds: [3, 2, 1],
    };

    await apiTrips.create(payload);

    expect(apiModule.api.post).toHaveBeenCalledWith('/trips', payload);
  });

  it('replaces trip splits through the backend replace endpoint', async () => {
    apiModule.api.put.mockResolvedValueOnce({ data: [] });

    const payload = {
      transactions: [
        { id: 10, updatedAt: '2026-06-15T13:00:00.000Z' },
        { id: 11, updatedAt: '2026-06-15T13:00:01.000Z' },
      ],
      direction: 'expense' as const,
      amount: 10,
      description: 'Urlaub (Ausgabe)',
      userIds: [3, 2, 1],
    };

    await apiTrips.replaceSplit(42, payload);

    expect(apiModule.api.put).toHaveBeenCalledWith('/trips/42/splits', payload);
  });

  it('adds a split to the selected trip', async () => {
    apiModule.api.post.mockResolvedValueOnce({ data: [] });
    const payload = {
      direction: 'income' as const,
      amount: 3,
      description: 'Urlaub (Einnahme)',
      userIds: [1, 2],
    };

    await apiTrips.addSplit(42, payload);

    expect(apiModule.api.post).toHaveBeenCalledWith('/trips/42/splits', payload);
  });

  it('replaces multiple trip splits through the batch endpoint', async () => {
    apiModule.api.put.mockResolvedValueOnce({ data: [] });
    const payload = {
      userIds: [3, 2, 1],
      splits: [
        {
          transactions: [
            { id: 10, updatedAt: '2026-06-15T13:00:00.000Z' },
          ],
          direction: 'expense' as const,
          amount: 10,
          description: 'Urlaub (Anreise/Unterkunft)',
        },
      ],
    };

    await apiTrips.replaceSplitsBatch(42, payload);

    expect(apiModule.api.put).toHaveBeenCalledWith(
      '/trips/42/splits/batch',
      payload
    );
  });

  it('updates organizer rotation for the selected season', async () => {
    apiModule.api.put.mockResolvedValueOnce({ data: [] });

    await apiOrganizerDuty.updateRotation(7, { userIds: [3, 4] });

    expect(apiModule.api.put).toHaveBeenCalledWith('/OrganizerDuty/rotation/7', {
      userIds: [3, 4],
    });
  });

  it('requests top ranking with the current backend route casing', async () => {
    apiModule.api.get.mockResolvedValueOnce({ data: null });

    await apiRanking.getTopRanked(5);

    expect(apiModule.api.get).toHaveBeenCalledWith('/Ranking/top?seasonId=5');
  });

  it('saves a ranked game and its complete ranking snapshot atomically', async () => {
    apiModule.api.post.mockResolvedValueOnce({ data: { id: 7 } });
    const payload = {
      gameId: 7,
      seasonId: 2,
      playedAt: '2026-09-06T00:00:00.000Z',
      gameName: 'Tennis',
      organizedByUserId: 3,
      rankings: [
        { userId: 3, points: 9, isPresent: true },
        { userId: 4, points: 1, isPresent: false },
      ],
    };

    await apiRanking.saveGameSnapshot(payload);

    expect(apiModule.api.post).toHaveBeenCalledWith(
      '/ranking/game-snapshot',
      payload
    );
  });
});
