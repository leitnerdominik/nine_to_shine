import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/test-utils';
import AccountDetailPage from './page';

const userId = 7;
const mocks = vi.hoisted(() => ({
  back: vi.fn(),
  getUser: vi.fn(),
  getTransactions: vi.fn(),
  getUserBalance: vi.fn(),
}));

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return { ...actual, use: () => ({ id: String(userId) }) };
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: mocks.back }),
}));

vi.mock('@/definitions/commands', () => ({
  apiUsers: { getById: mocks.getUser },
  apiFinance: {
    getAll: mocks.getTransactions,
    getUserBalance: mocks.getUserBalance,
  },
}));

vi.mock('@/components/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

vi.mock('@/components/LoadingSkeleton', () => ({
  default: () => React.createElement('div', null, 'Konto wird geladen'),
}));

const transaction = {
  id: 11,
  updatedAt: '2026-09-15T12:00:00.000Z',
  occurredAt: '2026-09-15T12:00:00.000Z',
  direction: 'income' as const,
  amount: 30,
  category: 'DUES',
  description: 'Mitgliedsbeitrag',
};

describe('AccountDetailPage', () => {
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
    mocks.getUser.mockResolvedValue({
      id: userId,
      displayName: 'Demo Tobias Gruber',
      isActive: true,
      createdAt: '2025-01-01T00:00:00.000Z',
    });
    mocks.getTransactions.mockResolvedValue([transaction]);
    mocks.getUserBalance.mockResolvedValue(2534.61);
  });

  it('loads the member account and preserves the back action', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <AccountDetailPage params={Promise.resolve({ id: String(userId) })} />
    );

    expect(screen.getByText('Konto wird geladen')).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Konto: Demo Tobias Gruber' })
    ).toBeInTheDocument();
    expect(mocks.getUser).toHaveBeenCalledWith(userId);
    expect(mocks.getTransactions).toHaveBeenCalledWith({ userId });
    expect(mocks.getUserBalance).toHaveBeenCalledWith(userId);
    expect(screen.getByText(/Aktueller Kontostand:/)).toBeInTheDocument();
    expect(screen.getByText('2.534,61 €')).toBeInTheDocument();
    expect(screen.getByText('Mitgliedsbeitrag')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Zurück' }));
    expect(mocks.back).toHaveBeenCalledOnce();
  });

  it('shows the valid member-account empty state', async () => {
    mocks.getTransactions.mockResolvedValue([]);
    renderWithProviders(
      <AccountDetailPage params={Promise.resolve({ id: String(userId) })} />
    );

    expect(
      await screen.findByText('Keine Transaktionen gefunden.')
    ).toBeInTheDocument();
  });

  it.each(['user', 'transactions', 'balance'] as const)(
    'shows a retryable error when the %s request fails',
    async (failedRequest) => {
    const user = userEvent.setup();
      const request = {
        user: mocks.getUser,
        transactions: mocks.getTransactions,
        balance: mocks.getUserBalance,
      }[failedRequest];
      request.mockRejectedValueOnce(new Error('API nicht erreichbar'));

      renderWithProviders(
        <AccountDetailPage params={Promise.resolve({ id: String(userId) })} />
      );

      expect(
        await screen.findByText(
          'Konto konnte nicht geladen werden. API nicht erreichbar'
        )
      ).toBeInTheDocument();
      expect(
        screen.queryByText('Keine Transaktionen gefunden.')
      ).not.toBeInTheDocument();
      expect(screen.queryByText('0,00 €')).not.toBeInTheDocument();

      await user.click(
        screen.getByRole('button', { name: 'Erneut versuchen' })
      );
      await waitFor(() => expect(mocks.getUser).toHaveBeenCalledTimes(2));
      expect(mocks.getTransactions).toHaveBeenCalledTimes(2);
      expect(mocks.getUserBalance).toHaveBeenCalledTimes(2);
      expect(
        await screen.findByRole('heading', {
          name: 'Konto: Demo Tobias Gruber',
        })
      ).toBeInTheDocument();
    }
  );
});
