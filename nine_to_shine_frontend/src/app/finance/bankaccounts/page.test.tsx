import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import BankAccountsPage from './page';

const mocks = vi.hoisted(() => ({
  getBalanceOverview: vi.fn(),
}));

vi.mock('@/definitions/commands', () => ({
  apiFinance: { getBalanceOverview: mocks.getBalanceOverview },
}));

vi.mock('@/components/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

vi.mock('@/components/LoadingSkeleton', () => ({
  default: () => React.createElement('div', null, 'Loading accounts'),
}));

describe('BankAccountsPage', () => {
  beforeEach(() => {
    mocks.getBalanceOverview.mockResolvedValue({
      globalBalance: 95,
      clubBalance: 70,
      membersBalance: 25,
      userBalances: [
        { userId: 1, displayName: 'Nina', balance: 15 },
        { userId: 2, displayName: 'Alex', balance: 10 },
      ],
    });
  });

  it('loads multiple users and totals through one balance request', async () => {
    renderWithProviders(<BankAccountsPage />);

    await waitFor(() =>
      expect(mocks.getBalanceOverview).toHaveBeenCalledOnce()
    );
    expect(await screen.findByText('Gesamtvermögen')).toBeInTheDocument();
    expect(screen.getByText('Reise Kasse')).toBeInTheDocument();
    expect(screen.getByText('Vereinskasse')).toBeInTheDocument();
    expect(screen.getByText('Nina')).toBeInTheDocument();
    expect(screen.getByText('Alex')).toBeInTheDocument();
    expect(screen.getByText('95,00 €')).toBeInTheDocument();
    expect(screen.getByText('70,00 €')).toBeInTheDocument();
    expect(screen.getByText('25,00 €')).toBeInTheDocument();
    expect(screen.getByText('15,00 €')).toBeInTheDocument();
    expect(screen.getByText('10,00 €')).toBeInTheDocument();
  });

  it('shows an initial-load error instead of zero accounts and retries', async () => {
    const browser = userEvent.setup();
    mocks.getBalanceOverview.mockRejectedValueOnce(
      new Error('API nicht erreichbar')
    );

    renderWithProviders(<BankAccountsPage />);

    expect(
      await screen.findByText(
        'Konten konnten nicht geladen werden. API nicht erreichbar'
      )
    ).toBeVisible();
    expect(screen.queryByText('Gesamtvermögen')).not.toBeInTheDocument();

    await browser.click(
      screen.getByRole('button', { name: 'Erneut versuchen' })
    );

    expect(await screen.findByText('Gesamtvermögen')).toBeVisible();
    await waitFor(() =>
      expect(mocks.getBalanceOverview).toHaveBeenCalledTimes(2)
    );
  });
});
