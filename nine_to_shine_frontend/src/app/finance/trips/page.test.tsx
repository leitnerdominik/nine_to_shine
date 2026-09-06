import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import TripHistoryPage from './page';

const mocks = vi.hoisted(() => ({
  getTrips: vi.fn(),
  push: vi.fn(),
}));

vi.mock('@/definitions/commands', () => ({
  apiTrips: { getAll: mocks.getTrips },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock('@/components/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

vi.mock('@/components/TripCard', () => ({
  default: ({
    description,
    onClick,
  }: {
    description: string;
    onClick: () => void;
  }) => React.createElement('button', { onClick }, description),
}));

describe('TripHistoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getTrips.mockResolvedValue([
      {
        id: 41,
        name: 'First',
        occurredAt: '2026-06-16T12:00:00.000Z',
        seasonId: 3,
        totalAmount: 10,
      },
      {
        id: 42,
        name: 'Second',
        occurredAt: '2026-06-16T12:00:00.000Z',
        seasonId: 3,
        totalAmount: 20,
      },
    ]);
  });

  it('renders same-timestamp trips separately and navigates by id', async () => {
    const browser = userEvent.setup();
    renderWithProviders(<TripHistoryPage />);

    expect(await screen.findByRole('button', { name: 'First' })).toBeVisible();
    await browser.click(screen.getByRole('button', { name: 'Second' }));

    expect(mocks.push).toHaveBeenCalledWith('/finance/trips/42');
  });
});
