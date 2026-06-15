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
}));

vi.mock('./api', () => apiModule);

import {
  apiFinance,
  apiOrganizerDuty,
  apiRanking,
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

  it('uses the backend trip deletion route with an ISO date', async () => {
    apiModule.api.delete.mockResolvedValueOnce({});

    await apiFinance.deleteTripsByDate(new Date('2026-06-15T12:30:00.000Z'));

    expect(apiModule.api.delete).toHaveBeenCalledWith(
      '/finance/trip/by-date?date=2026-06-15T12:30:00.000Z'
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
});
