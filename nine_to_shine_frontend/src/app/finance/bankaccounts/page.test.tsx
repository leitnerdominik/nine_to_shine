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
    expect(screen.getByRole('heading', { name: 'Kontenübersicht' })).toBeVisible();
    expect(
      screen.queryByText('Alle Konten und Mitgliedskonten auf einen Blick.')
    ).not.toBeInTheDocument();
    expect(screen.getByText('Reise Kasse')).toBeInTheDocument();
    expect(screen.getByText('Vereinskasse')).toBeInTheDocument();
    expect(screen.getByText('Mitgliedskonten')).toBeInTheDocument();
    expect(
      screen.getByText('Kontostände der einzelnen Mitglieder.')
    ).toBeInTheDocument();
    expect(screen.getByText('Nina')).toBeInTheDocument();
    expect(screen.getByText('Alex')).toBeInTheDocument();
    expect(screen.getByText('95,00 €')).toBeInTheDocument();
    expect(screen.getByText('70,00 €')).toBeInTheDocument();
    expect(screen.getByText('25,00 €')).toBeInTheDocument();
    expect(screen.getByText('15,00 €')).toBeInTheDocument();
    expect(screen.getByText('10,00 €')).toBeInTheDocument();
  });

  it('links every account card to its existing destination', async () => {
    renderWithProviders(<BankAccountsPage />);

    expect(
      await screen.findByRole('link', { name: /Gesamtvermögen: 95,00/ })
    ).toHaveAttribute('href', '/finance/transactions');
    expect(
      screen.getByRole('link', { name: /Reise Kasse: 25,00/ })
    ).toHaveAttribute('href', '/finance/transactions');
    expect(
      screen.getByRole('link', { name: /Vereinskasse: 70,00/ })
    ).toHaveAttribute('href', '/finance/bankaccounts/n2s-account');
    expect(
      screen.getByRole('link', { name: /Nina: 15,00/ })
    ).toHaveAttribute('href', '/finance/bankaccounts/1');
    expect(
      screen.getByRole('link', { name: /Alex: 10,00/ })
    ).toHaveAttribute('href', '/finance/bankaccounts/2');
  });

  it('shows an accessible page-specific loading state', () => {
    mocks.getBalanceOverview.mockReturnValue(new Promise(() => undefined));

    renderWithProviders(<BankAccountsPage />);

    expect(
      screen.getByRole('status', { name: 'Konten werden geladen' })
    ).toHaveAttribute('aria-busy', 'true');
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
