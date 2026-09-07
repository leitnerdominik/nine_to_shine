import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import TransactionsPage from './page';

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
    mocks.getTransactions.mockResolvedValue([]);
    mocks.getUsers.mockResolvedValue([]);
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
