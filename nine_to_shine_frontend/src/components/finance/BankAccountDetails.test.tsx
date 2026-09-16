import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/test-utils';
import type { FinanceDto } from '@/definitions/types';
import BankAccountDetails from './BankAccountDetails';

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

const transactions: FinanceDto[] = [
  {
    id: 1,
    updatedAt: '2026-09-15T12:00:00.000Z',
    occurredAt: '2026-09-15T12:00:00.000Z',
    direction: 'income',
    amount: 3000,
    category: 'DUES',
    description: 'Mitgliedsbeitrag',
    gameName: 'Demo-Tischtennis',
  },
  {
    id: 2,
    updatedAt: '2026-09-06T12:00:00.000Z',
    occurredAt: '2026-09-06T12:00:00.000Z',
    direction: 'expense',
    amount: 500.89,
    category: 'TRIP',
  },
];

describe('BankAccountDetails', () => {
  beforeEach(() => {
    setDesktopViewport(false);
  });

  it('renders mobile transaction cards with shared transaction formatting', async () => {
    const onBack = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(
      <BankAccountDetails
        title="Konto: Demo Tobias Gruber"
        balanceLabel="Aktueller Kontostand"
        balance={2499.11}
        transactions={transactions}
        emptyMessage="Keine Transaktionen gefunden."
        onBack={onBack}
      />
    );

    expect(
      screen.getByRole('heading', { name: 'Konto: Demo Tobias Gruber' })
    ).toBeInTheDocument();
    expect(screen.getByText('2.499,11 €')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    const transactionCards = screen.getAllByRole('article');
    expect(transactionCards).toHaveLength(2);
    expect(within(transactionCards[0]).getByText('15.09.2026')).toBeInTheDocument();
    expect(within(transactionCards[1]).getByText('06.09.2026')).toBeInTheDocument();
    expect(screen.getByText('15.09.2026')).toBeInTheDocument();
    expect(screen.getByText('Spiel: Demo-Tischtennis')).toBeInTheDocument();
    expect(screen.getByText('3.000,00 €')).toHaveStyle({ color: '#2e7d32' });
    expect(screen.getByText('-500,89 €')).toHaveStyle({ color: '#d32f2f' });
    expect(screen.getByText('-')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Zurück' }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('renders the desktop transaction table at the desktop breakpoint', () => {
    setDesktopViewport(true);

    renderWithProviders(
      <BankAccountDetails
        title="N2S Vereinskonto"
        balanceLabel="Aktueller Kassenbestand"
        balance={100}
        transactions={transactions}
        emptyMessage="Noch keine Buchungen vorhanden."
        onBack={vi.fn()}
      />
    );

    expect(screen.getByRole('table', { name: 'Kontobuchungen' })).toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Datum' })).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Kategorie' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Beschreibung' })
    ).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Betrag' })).toBeInTheDocument();
    const rows = screen.getAllByRole('row');
    expect(within(rows[1]).getByText('15.09.2026')).toBeInTheDocument();
    expect(within(rows[1]).getByText('DUES')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Mitgliedsbeitrag')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Spiel: Demo-Tischtennis')).toBeInTheDocument();
    expect(within(rows[1]).getByText('3.000,00 €')).toBeInTheDocument();
    expect(within(rows[2]).getByText('06.09.2026')).toBeInTheDocument();
    expect(within(rows[2]).getByText('TRIP')).toBeInTheDocument();
    expect(within(rows[2]).getByText('-500,89 €')).toBeInTheDocument();
  });

  it('renders the supplied empty-state copy', () => {
    renderWithProviders(
      <BankAccountDetails
        title="N2S Vereinskonto"
        balanceLabel="Aktueller Kassenbestand"
        balance={0}
        transactions={[]}
        emptyMessage="Noch keine Buchungen auf dem Vereinskonto vorhanden."
        onBack={vi.fn()}
      />
    );

    expect(
      screen.getByText('Noch keine Buchungen auf dem Vereinskonto vorhanden.')
    ).toBeInTheDocument();
  });
});
