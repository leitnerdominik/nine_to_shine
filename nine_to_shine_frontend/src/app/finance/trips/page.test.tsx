import React from 'react';
import { screen, within } from '@testing-library/react';
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

  it('renders the responsive page content and navigates to create a trip', async () => {
    const browser = userEvent.setup();
    renderWithProviders(<TripHistoryPage />);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Urlaube' })
    ).toBeVisible();
    const firstTrip = screen.getByRole('button', {
      name: 'Details zu First',
    });
    expect(within(firstTrip).getByText('16.06.2026')).toBeVisible();
    expect(within(firstTrip).getByText(/Gesamt: 10,00/)).toBeVisible();

    await browser.click(
      screen.getByRole('button', { name: 'Urlaub hinzufügen' })
    );

    expect(mocks.push).toHaveBeenCalledWith('/finance/trips/create-trip');
  });

  it('renders same-timestamp trips separately and navigates by id', async () => {
    const browser = userEvent.setup();
    renderWithProviders(<TripHistoryPage />);

    expect(
      await screen.findByRole('button', { name: 'Details zu First' })
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Details zu Second' })
    ).toBeVisible();
    await browser.click(
      screen.getByRole('button', { name: 'Details zu Second' })
    );

    expect(mocks.push).toHaveBeenCalledWith('/finance/trips/42');
  });

  it('shows an initial-load error instead of the empty state and retries', async () => {
    const browser = userEvent.setup();
    mocks.getTrips.mockRejectedValueOnce(new Error('API nicht erreichbar'));

    renderWithProviders(<TripHistoryPage />);

    expect(
      await screen.findByText(
        'Urlaubsreisen konnten nicht geladen werden. API nicht erreichbar'
      )
    ).toBeVisible();
    expect(
      screen.queryByText('Keine Urlaubsreisen gefunden.')
    ).not.toBeInTheDocument();

    await browser.click(
      screen.getByRole('button', { name: 'Erneut versuchen' })
    );

    expect(
      await screen.findByRole('button', { name: 'Details zu First' })
    ).toBeVisible();
    expect(mocks.getTrips).toHaveBeenCalledTimes(2);
  });

  it('shows the empty state for a successful empty response', async () => {
    mocks.getTrips.mockResolvedValue([]);

    renderWithProviders(<TripHistoryPage />);

    expect(
      await screen.findByText('Keine Urlaubsreisen gefunden.')
    ).toBeVisible();
    expect(
      screen.queryByRole('region', { name: 'Urlaubsreisen' })
    ).not.toBeInTheDocument();
  });
});
