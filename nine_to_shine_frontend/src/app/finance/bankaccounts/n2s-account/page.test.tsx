import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/test-utils';
import N2SBankAccountPage from './page';

const mocks = vi.hoisted(() => ({
  back: vi.fn(),
  getTransactions: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: mocks.back }),
}));

vi.mock('@/definitions/commands', () => ({
  apiFinance: { getAll: mocks.getTransactions },
}));

vi.mock('@/components/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

vi.mock('@/components/LoadingSkeleton', () => ({
  default: () => React.createElement('div', null, 'Vereinskonto wird geladen'),
}));

const transactions = [
  {
    id: 20,
    updatedAt: '2026-09-15T12:00:00.000Z',
    occurredAt: '2026-09-15T12:00:00.000Z',
    direction: 'income' as const,
    amount: 100,
    category: 'OTHER',
    description: 'Einnahme',
  },
  {
    id: 21,
    updatedAt: '2026-09-14T12:00:00.000Z',
    occurredAt: '2026-09-14T12:00:00.000Z',
    direction: 'expense' as const,
    amount: 25,
    category: 'OTHER',
    description: 'Ausgabe',
  },
];

describe('N2SBankAccountPage', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        media: '(min-width:900px)',
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    mocks.getTransactions.mockResolvedValue(transactions);
  });

  it('loads global transactions and derives the club balance', async () => {
    const user = userEvent.setup();
    renderWithProviders(<N2SBankAccountPage />);

    expect(screen.getByText('Vereinskonto wird geladen')).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'N2S Vereinskonto' })
    ).toBeInTheDocument();
    expect(mocks.getTransactions).toHaveBeenCalledWith({ scope: 'global' });
    expect(screen.getByText(/Aktueller Kassenbestand:/)).toBeInTheDocument();
    expect(screen.getByText('75,00 €')).toBeInTheDocument();
    expect(screen.getByText('Einnahme')).toBeInTheDocument();
    expect(screen.getByText('Ausgabe')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Zurück' }));
    expect(mocks.back).toHaveBeenCalledOnce();
  });

  it('shows the valid club-account empty state', async () => {
    mocks.getTransactions.mockResolvedValue([]);
    renderWithProviders(<N2SBankAccountPage />);

    expect(
      await screen.findByText(
        'Noch keine Buchungen auf dem Vereinskonto vorhanden.'
      )
    ).toBeInTheDocument();
  });

  it('shows a retryable error instead of a zero balance', async () => {
    const user = userEvent.setup();
    mocks.getTransactions.mockRejectedValueOnce(new Error('API nicht erreichbar'));
    renderWithProviders(<N2SBankAccountPage />);

    expect(
      await screen.findByText(
        'Vereinskonto konnte nicht geladen werden. API nicht erreichbar'
      )
    ).toBeInTheDocument();
    expect(screen.queryByText('0,00 €')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Erneut versuchen' }));
    await waitFor(() => expect(mocks.getTransactions).toHaveBeenCalledTimes(2));
    expect(
      await screen.findByRole('heading', { name: 'N2S Vereinskonto' })
    ).toBeInTheDocument();
  });
});
