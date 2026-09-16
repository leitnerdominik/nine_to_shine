import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import TransactionsPage from './page';
import { ApiRequestError } from '@/definitions/api';

function setDesktopViewport(isDesktop: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockImplementation(() => ({
      matches: isDesktop,
      media: '(min-width:900px)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

const mocks = vi.hoisted(() => ({
  getTransactions: vi.fn(),
  getUsers: vi.fn(),
  bulkDelete: vi.fn(),
}));

vi.mock('@/definitions/commands', () => ({
  apiFinance: {
    getAll: mocks.getTransactions,
    bulkDelete: mocks.bulkDelete,
  },
  apiUsers: { getAll: mocks.getUsers },
}));

vi.mock('@/components/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

vi.mock('@/components/LoadingSkeleton', () => ({
  default: () => React.createElement('div', null, 'Loading transactions'),
}));

describe('TransactionsPage', () => {
  beforeEach(() => {
    setDesktopViewport(false);
    mocks.getTransactions.mockResolvedValue([]);
    mocks.getUsers.mockResolvedValue([]);
    mocks.bulkDelete.mockResolvedValue(undefined);
  });

  it('renders mobile transaction cards and supports select-all', async () => {
    const browser = userEvent.setup();
    mocks.getTransactions.mockResolvedValue([
      {
        id: 1,
        updatedAt: '2026-09-15T10:00:00Z',
        occurredAt: '2026-09-15T10:00:00Z',
        direction: 'income',
        amount: 21,
        category: 'OTHER',
        description: 'Test',
        gameName: 'Eröffnungsspiel',
      },
      {
        id: 2,
        updatedAt: '2026-09-15T11:00:00Z',
        occurredAt: '2026-09-15T11:00:00Z',
        direction: 'expense',
        amount: 5,
        category: 'DUES',
        description: 'Mitgliedsbeitrag',
        userId: 7,
        userDisplayName: 'Demo Paul Leitner',
      },
    ]);

    renderWithProviders(<TransactionsPage />);

    expect(await screen.findByText('Demo Paul Leitner')).toBeVisible();
    expect(screen.getAllByText('15.09.2026')).toHaveLength(2);
    expect(screen.getByText('Vereinskasse')).toBeVisible();
    expect(screen.getByText('OTHER')).toBeVisible();
    expect(screen.getByText('DUES')).toBeVisible();
    expect(screen.getByText('Test')).toBeVisible();
    expect(screen.getByText('Mitgliedsbeitrag')).toBeVisible();
    expect(screen.getByText('Spiel: Eröffnungsspiel')).toBeVisible();
    expect(screen.getByText(/21,00.*€/)).toBeVisible();
    expect(screen.getByText(/-5,00.*€/)).toBeVisible();
    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    const selectAll = screen.getByRole('checkbox', { name: 'Alle auswählen' });
    expect(selectAll).not.toBeChecked();

    await browser.click(selectAll);
    expect(selectAll).toBeChecked();
    expect(screen.getByRole('button', { name: 'Löschen (2)' })).toBeVisible();
  });

  it('renders the populated desktop transaction table at the md breakpoint', async () => {
    setDesktopViewport(true);
    mocks.getTransactions.mockResolvedValue([
      {
        id: 3,
        updatedAt: '2026-09-15T12:00:00Z',
        occurredAt: '2026-09-15T12:00:00Z',
        direction: 'expense',
        amount: 5,
        category: 'TRIP',
        description: 'Busfahrt',
        userId: 7,
        userDisplayName: 'Demo Paul Leitner',
      },
    ]);

    renderWithProviders(<TransactionsPage />);

    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Datum' })).toBeVisible();
    expect(screen.getByText('Demo Paul Leitner')).toBeVisible();
    expect(screen.getByText('TRIP')).toBeVisible();
    expect(screen.getByText('Busfahrt')).toBeVisible();
    expect(screen.getByText(/-5,00.*€/)).toBeVisible();
    expect(
      screen.getByRole('checkbox', {
        name: 'Buchung vom 15.09.2026 für Demo Paul Leitner auswählen',
      })
    ).toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('checkbox', { name: 'Alle auswählen' })
    ).not.toBeInTheDocument();
  });

  it('sends selected transaction versions after confirmation', async () => {
    const browser = userEvent.setup();
    mocks.getTransactions.mockResolvedValue([
      {
        id: 4,
        updatedAt: '2026-09-15T10:00:00Z',
        occurredAt: '2026-09-15T10:00:00Z',
        direction: 'income',
        amount: 10,
        category: 'OTHER',
      },
    ]);
    renderWithProviders(<TransactionsPage />);
    const checkbox = await screen.findByRole('checkbox', {
      name: /Buchung vom/,
    });
    await browser.click(checkbox);
    await browser.click(screen.getByRole('button', { name: 'Löschen (1)' }));
    await browser.click(
      screen.getByRole('button', { name: /^Löschen$/ })
    );

    await waitFor(() =>
      expect(mocks.bulkDelete).toHaveBeenCalledWith({
        transactions: [{ id: 4, updatedAt: '2026-09-15T10:00:00Z' }],
      })
    );
  });

  it('applies member and direction filters and resets them', async () => {
    const browser = userEvent.setup();
    mocks.getUsers.mockResolvedValue([
      { id: 7, displayName: 'Demo Paul Leitner' },
    ]);
    renderWithProviders(<TransactionsPage />);
    await screen.findByRole('combobox', { name: 'Mitglied' });

    await browser.click(screen.getByRole('combobox', { name: 'Mitglied' }));
    await browser.click(
      await screen.findByRole('option', { name: 'Demo Paul Leitner' })
    );
    await browser.click(
      screen.getByRole('combobox', { name: 'Art der Buchung' })
    );
    await browser.click(
      await screen.findByRole('option', { name: 'Nur Einnahmen (+)' })
    );

    await waitFor(() =>
      expect(mocks.getTransactions).toHaveBeenLastCalledWith({
        userId: 7,
        direction: 'income',
      })
    );
    await browser.click(
      screen.getByRole('button', { name: 'Filter zurücksetzen' })
    );
    await waitFor(() =>
      expect(mocks.getTransactions).toHaveBeenLastCalledWith({})
    );
  });

  it('shows an indeterminate select-all state after an individual selection', async () => {
    const browser = userEvent.setup();
    mocks.getTransactions.mockResolvedValue([
      {
        id: 1,
        updatedAt: 'a',
        occurredAt: '2026-09-15',
        direction: 'income',
        amount: 1,
        category: 'OTHER',
      },
      {
        id: 2,
        updatedAt: 'b',
        occurredAt: '2026-09-15',
        direction: 'income',
        amount: 2,
        category: 'OTHER',
      },
    ]);
    renderWithProviders(<TransactionsPage />);
    const individual = (
      await screen.findAllByRole('checkbox', { name: /Buchung vom/ })
    )[0];
    const selectAll = screen.getByRole('checkbox', { name: 'Alle auswählen' });
    await browser.click(individual);
    expect(selectAll).toHaveAttribute('data-indeterminate', 'true');
    expect(selectAll).not.toBeChecked();
  });

  it('retains selected rows and shows reload action on a delete conflict', async () => {
    const browser = userEvent.setup();
    mocks.getTransactions.mockResolvedValue([
      {
        id: 8,
        updatedAt: 'v1',
        occurredAt: '2026-09-15',
        direction: 'income',
        amount: 1,
        category: 'OTHER',
      },
    ]);
    mocks.bulkDelete.mockRejectedValue(new ApiRequestError('conflict', 409));
    renderWithProviders(<TransactionsPage />);
    const individual = (
      await screen.findAllByRole('checkbox', { name: /Buchung vom/ })
    )[0];
    await browser.click(individual);
    await browser.click(screen.getByRole('button', { name: 'Löschen (1)' }));
    await browser.click(
      screen.getByRole('button', { name: /^Löschen$/ })
    );

    expect(await screen.findByText(/Deine Auswahl bleibt erhalten/)).toBeVisible();
    expect(individual).toBeChecked();
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: 'Neu laden' })[0]).toBeVisible()
    );
  });

  it('shows an initial-load error instead of the empty state and retries', async () => {
    const browser = userEvent.setup();
    mocks.getTransactions.mockRejectedValueOnce(
      new Error('API nicht erreichbar')
    );

    renderWithProviders(<TransactionsPage />);

    expect(
      await screen.findByText(
        'Buchungen konnten nicht geladen werden. API nicht erreichbar'
      )
    ).toBeVisible();
    expect(
      screen.queryByText('Keine Transaktionen gefunden.')
    ).not.toBeInTheDocument();

    await browser.click(
      screen.getByRole('button', { name: 'Erneut versuchen' })
    );

    expect(
      await screen.findByText('Keine Transaktionen gefunden.')
    ).toBeVisible();
    await waitFor(() =>
      expect(mocks.getTransactions).toHaveBeenCalledTimes(2)
    );
  });

  it('shows and retries a failure loading the member filter', async () => {
    const browser = userEvent.setup();
    mocks.getUsers.mockRejectedValueOnce(new Error('API nicht erreichbar'));

    renderWithProviders(<TransactionsPage />);

    expect(
      await screen.findByText(
        'Mitglieder konnten nicht geladen werden. API nicht erreichbar'
      )
    ).toBeVisible();

    await browser.click(
      screen.getByRole('button', { name: 'Mitglieder erneut laden' })
    );

    await waitFor(() => expect(mocks.getUsers).toHaveBeenCalledTimes(2));
    expect(
      screen.queryByText(
        'Mitglieder konnten nicht geladen werden. API nicht erreichbar'
      )
    ).not.toBeInTheDocument();
  });
});
