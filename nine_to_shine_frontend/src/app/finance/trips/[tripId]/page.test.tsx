import React from 'react';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import TripDetailsPage from './page';

const occurredAt = '2026-06-16T12:00:00.000Z';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  getUsers: vi.fn(),
  getFinances: vi.fn(),
  replaceTripSplitsBatch: vi.fn(),
}));

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    use: () => ({ tripId: encodeURIComponent(occurredAt) }),
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock('@/definitions/commands', () => ({
  apiUsers: { getAll: mocks.getUsers },
  apiFinance: {
    getAll: mocks.getFinances,
    replaceTripSplitsBatch: mocks.replaceTripSplitsBatch,
  },
}));

vi.mock('@/definitions/api', () => ({
  isConflictError: (error: unknown) =>
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    error.status === 409,
}));

vi.mock('@/components/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

vi.mock('@/components/LoadingSkeleton', () => ({
  default: () => React.createElement('div', null, 'Loading trip'),
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

const finances = [
  {
    id: 10,
    updatedAt: '2026-06-16T13:00:00.000Z',
    occurredAt,
    direction: 'expense',
    amount: 5,
    category: 'TRIP',
    description: 'Urlaub (Anreise/Unterkunft)',
    userId: 1,
    seasonId: 3,
  },
  {
    id: 11,
    updatedAt: '2026-06-16T13:00:01.000Z',
    occurredAt,
    direction: 'expense',
    amount: 5,
    category: 'TRIP',
    description: 'Urlaub (Anreise/Unterkunft)',
    userId: 2,
    seasonId: 3,
  },
  {
    id: 12,
    updatedAt: '2026-06-16T13:00:02.000Z',
    occurredAt,
    direction: 'expense',
    amount: 2,
    category: 'TRIP',
    description: 'Urlaub (Aktivität: Museum)',
    userId: 1,
    seasonId: 3,
  },
  {
    id: 13,
    updatedAt: '2026-06-16T13:00:03.000Z',
    occurredAt,
    direction: 'expense',
    amount: 2,
    category: 'TRIP',
    description: 'Urlaub (Aktivität: Museum)',
    userId: 2,
    seasonId: 3,
  },
];

describe('TripDetailsPage trip setup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUsers.mockResolvedValue(users);
    mocks.getFinances.mockResolvedValue(finances);
    mocks.replaceTripSplitsBatch.mockResolvedValue([]);
  });

  it('sends the base and additional bookings in one batch request', async () => {
    const browser = userEvent.setup();
    renderWithProviders(
      <TripDetailsPage params={Promise.resolve({ tripId: occurredAt })} />
    );

    const setupSection = (await screen.findByText('Grundkosten & Teilnehmer'))
      .closest('.MuiPaper-root')!;
    await browser.click(
      within(setupSection).getByRole('button', { name: 'Bearbeiten' })
    );
    await browser.click(
      within(setupSection).getByRole('button', { name: 'Speichern' })
    );

    await waitFor(() =>
      expect(mocks.replaceTripSplitsBatch).toHaveBeenCalledWith({
        occurredAt,
        seasonId: 3,
        userIds: [2, 1],
        splits: [
          {
            transactions: [
              { id: 10, updatedAt: '2026-06-16T13:00:00.000Z' },
              { id: 11, updatedAt: '2026-06-16T13:00:01.000Z' },
            ],
            direction: 'expense',
            amount: 10,
            description: 'Urlaub (Anreise/Unterkunft)',
          },
          {
            transactions: [
              { id: 12, updatedAt: '2026-06-16T13:00:02.000Z' },
              { id: 13, updatedAt: '2026-06-16T13:00:03.000Z' },
            ],
            direction: 'expense',
            amount: 4,
            description: 'Urlaub (Aktivität: Museum)',
          },
        ],
      })
    );
    expect(mocks.replaceTripSplitsBatch).toHaveBeenCalledTimes(1);
  });

  it('keeps trip setup editing active after a conflict', async () => {
    const browser = userEvent.setup();
    mocks.replaceTripSplitsBatch.mockRejectedValueOnce({ status: 409 });
    renderWithProviders(
      <TripDetailsPage params={Promise.resolve({ tripId: occurredAt })} />
    );

    const setupSection = (await screen.findByText('Grundkosten & Teilnehmer'))
      .closest('.MuiPaper-root')!;
    await browser.click(
      within(setupSection).getByRole('button', { name: 'Bearbeiten' })
    );
    await browser.click(
      within(setupSection).getByRole('button', { name: 'Speichern' })
    );

    expect(
      await screen.findByText(/Die Finanzdaten wurden inzwischen geändert/)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('spinbutton', { name: 'Grundkosten gesamt' })
    ).toHaveValue(10);
    expect(mocks.getFinances).toHaveBeenCalledTimes(1);
  });

  it('creates a missing base split in the same batch as existing bookings', async () => {
    const browser = userEvent.setup();
    mocks.getFinances.mockResolvedValue(finances.slice(2));
    renderWithProviders(
      <TripDetailsPage params={Promise.resolve({ tripId: occurredAt })} />
    );

    const setupSection = (await screen.findByText('Grundkosten & Teilnehmer'))
      .closest('.MuiPaper-root')!;
    await browser.click(
      within(setupSection).getByRole('button', { name: 'Bearbeiten' })
    );
    for (const checkbox of screen.getAllByRole('checkbox')) {
      await browser.click(checkbox);
    }
    const baseAmount = within(setupSection).getByRole('spinbutton', {
      name: 'Grundkosten gesamt',
    });
    await browser.clear(baseAmount);
    await browser.type(baseAmount, '10');
    await browser.click(
      within(setupSection).getByRole('button', { name: 'Speichern' })
    );

    await waitFor(() =>
      expect(mocks.replaceTripSplitsBatch).toHaveBeenCalledWith(
        expect.objectContaining({
          userIds: [2, 1],
          splits: [
            expect.objectContaining({
              transactions: [],
              direction: 'expense',
              amount: 10,
              description: 'Urlaub (Anreise/Unterkunft)',
            }),
            expect.objectContaining({
              transactions: [
                { id: 12, updatedAt: '2026-06-16T13:00:02.000Z' },
                { id: 13, updatedAt: '2026-06-16T13:00:03.000Z' },
              ],
            }),
          ],
        })
      )
    );
  });
});
