import React from 'react';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import TripDetailsPage from './page';

const occurredAt = '2026-06-16T12:00:00.000Z';
const tripId = 42;

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  getUsers: vi.fn(),
  getTrip: vi.fn(),
  replaceSplit: vi.fn(),
  replaceSplitsBatch: vi.fn(),
  removeTrip: vi.fn(),
}));

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    use: () => ({ tripId: String(tripId) }),
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock('@/definitions/commands', () => ({
  apiUsers: { getAll: mocks.getUsers },
  apiTrips: {
    getById: mocks.getTrip,
    replaceSplit: mocks.replaceSplit,
    replaceSplitsBatch: mocks.replaceSplitsBatch,
    remove: mocks.removeTrip,
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
    mocks.getTrip.mockResolvedValue({
      id: tripId,
      name: 'Urlaub',
      occurredAt,
      seasonId: 3,
      transactions: finances,
    });
    mocks.replaceSplit.mockResolvedValue([]);
    mocks.replaceSplitsBatch.mockResolvedValue([]);
    mocks.removeTrip.mockResolvedValue(undefined);
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
      expect(mocks.replaceSplitsBatch).toHaveBeenCalledWith(tripId, {
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
    expect(mocks.replaceSplitsBatch).toHaveBeenCalledTimes(1);
  });

  it('keeps trip setup editing active after a conflict', async () => {
    const browser = userEvent.setup();
    mocks.replaceSplitsBatch.mockRejectedValueOnce({ status: 409 });
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
    expect(mocks.getTrip).toHaveBeenCalledTimes(1);
  });

  it('preserves conflict and unsaved trip setup when reload fails', async () => {
    const browser = userEvent.setup();
    mocks.replaceSplitsBatch.mockRejectedValueOnce({ status: 409 });
    renderWithProviders(
      <TripDetailsPage params={Promise.resolve({ tripId: occurredAt })} />
    );

    const setupSection = (await screen.findByText('Grundkosten & Teilnehmer'))
      .closest('.MuiPaper-root')!;
    await browser.click(
      within(setupSection).getByRole('button', { name: 'Bearbeiten' })
    );
    const baseAmount = within(setupSection).getByRole('spinbutton', {
      name: 'Grundkosten gesamt',
    });
    await browser.clear(baseAmount);
    await browser.type(baseAmount, '17.50');
    await browser.click(
      within(setupSection).getByRole('button', { name: 'Speichern' })
    );

    await screen.findByText(
      /Die Finanzdaten wurden inzwischen geändert/
    );
    mocks.getTrip.mockRejectedValueOnce(new Error('Reload failed'));
    await browser.click(screen.getByRole('button', { name: 'Neu laden' }));

    await waitFor(() => expect(mocks.getTrip).toHaveBeenCalledTimes(2));
    expect(
      screen.getByText(/Die Finanzdaten wurden inzwischen geändert/)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('spinbutton', { name: 'Grundkosten gesamt' })
    ).toHaveValue(17.5);
  });

  it('preserves conflict and unsaved booking edits when reload fails', async () => {
    const browser = userEvent.setup();
    mocks.replaceSplit.mockRejectedValueOnce({ status: 409 });
    renderWithProviders(
      <TripDetailsPage params={Promise.resolve({ tripId: occurredAt })} />
    );

    const bookingsSection = (
      await screen.findByRole('heading', { name: 'Weitere Buchungen' })
    ).closest('.MuiPaper-root')!;
    await browser.click(
      within(bookingsSection).getByRole('button', { name: 'Bearbeiten' })
    );
    const bookingAmount = within(bookingsSection).getByRole('spinbutton', {
      name: 'Betrag',
    });
    const bookingDescription = within(bookingsSection).getByRole('textbox', {
      name: 'Beschreibung',
    });
    await browser.clear(bookingAmount);
    await browser.type(bookingAmount, '7.50');
    await browser.clear(bookingDescription);
    await browser.type(bookingDescription, 'Museum mit Führung');
    await browser.click(
      within(bookingsSection).getByRole('button', { name: 'Speichern' })
    );

    await screen.findByText(/Die Finanzdaten wurden inzwischen geändert/);
    mocks.getTrip.mockRejectedValueOnce(new Error('Reload failed'));
    await browser.click(screen.getByRole('button', { name: 'Neu laden' }));

    await waitFor(() => expect(mocks.getTrip).toHaveBeenCalledTimes(2));
    expect(
      screen.getByText(/Die Finanzdaten wurden inzwischen geändert/)
    ).toBeInTheDocument();
    const reloadedBookingsSection = screen
      .getByRole('heading', { name: 'Weitere Buchungen' })
      .closest('.MuiPaper-root')!;
    expect(
      within(reloadedBookingsSection).getByRole('spinbutton', { name: 'Betrag' })
    ).toHaveValue(7.5);
    expect(
      within(reloadedBookingsSection).getByRole('textbox', {
        name: 'Beschreibung',
      })
    ).toHaveValue('Museum mit Führung');
  });

  it('creates a missing base split in the same batch as existing bookings', async () => {
    const browser = userEvent.setup();
    mocks.getTrip.mockResolvedValue({
      id: tripId,
      name: 'Urlaub',
      occurredAt,
      seasonId: 3,
      transactions: finances.slice(2),
    });
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
      expect(mocks.replaceSplitsBatch).toHaveBeenCalledWith(
        tripId,
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

  it('deletes the selected trip by id with its complete version snapshot', async () => {
    const browser = userEvent.setup();
    renderWithProviders(
      <TripDetailsPage params={Promise.resolve({ tripId: String(tripId) })} />
    );

    await screen.findByText('Grundkosten & Teilnehmer');
    await browser.click(screen.getAllByRole('button', { name: 'Löschen' })[0]);
    await browser.click(screen.getAllByRole('button', { name: 'Löschen' }).at(-1)!);

    await waitFor(() =>
      expect(mocks.removeTrip).toHaveBeenCalledWith(
        tripId,
        finances.map(({ id, updatedAt }) => ({ id, updatedAt }))
      )
    );
    expect(mocks.push).toHaveBeenCalledWith('/finance/trips');
  });

  it('keeps the user on the trip when deletion conflicts', async () => {
    const browser = userEvent.setup();
    mocks.removeTrip.mockRejectedValueOnce({ status: 409 });
    renderWithProviders(
      <TripDetailsPage params={Promise.resolve({ tripId: String(tripId) })} />
    );

    await screen.findByText('Grundkosten & Teilnehmer');
    await browser.click(screen.getAllByRole('button', { name: 'Löschen' })[0]);
    await browser.click(screen.getAllByRole('button', { name: 'Löschen' }).at(-1)!);

    expect(
      await screen.findByText(/Die Finanzdaten wurden inzwischen geändert/)
    ).toBeInTheDocument();
    expect(mocks.push).not.toHaveBeenCalled();
  });
});
