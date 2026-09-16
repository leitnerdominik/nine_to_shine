import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import ExpensesPage from './page';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  getSeasons: vi.fn(),
  getGames: vi.fn(),
  createExpenseBatch: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock('@/definitions/commands', () => ({
  apiSeason: { getAll: mocks.getSeasons },
  apiGame: { getAll: mocks.getGames },
  apiFinance: { createExpenseBatch: mocks.createExpenseBatch },
}));

vi.mock('@/components/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

vi.mock('@/components/LoadingSkeleton', () => ({
  default: () => React.createElement('div', null, 'Loading expenses'),
}));

const season = { id: 3, seasonNumber: 7 };

describe('ExpensesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSeasons.mockResolvedValue([season]);
    mocks.getGames.mockResolvedValue([]);
    mocks.createExpenseBatch.mockResolvedValue([]);
  });

  it('submits every expense in one batch and navigates after success', async () => {
    const browser = userEvent.setup();
    renderWithProviders(<ExpensesPage />);

    expect(
      await screen.findByRole('heading', { name: 'Vereinsausgaben erfassen' })
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        'Erfasse die Ausgaben für ein Spiel, eine Saison oder einen sonstigen Anlass.'
      )
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Löschen' })).toBeDisabled();
    expect(screen.getByText(/Gesamt:/)).toHaveTextContent('Gesamt: 0,00 €');
    await browser.type(screen.getByRole('spinbutton', { name: 'Betrag' }), '12.5');
    await browser.type(
      screen.getByRole('textbox', { name: 'Verwendungszweck (Optional)' }),
      'Pizza'
    );
    await browser.click(screen.getByRole('button', { name: 'Ausgabe hinzufügen' }));

    expect(screen.getAllByRole('button', { name: 'Löschen' })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Löschen' })[0]).toBeEnabled();

    const amounts = screen.getAllByRole('spinbutton', { name: 'Betrag' });
    const descriptions = screen.getAllByRole('textbox', {
      name: 'Verwendungszweck (Optional)',
    });
    await browser.type(amounts[1], '7.5');
    await browser.type(descriptions[1], 'Getränke');
    await browser.click(screen.getByRole('button', { name: 'Ausgaben Speichern' }));

    await waitFor(() =>
      expect(mocks.createExpenseBatch).toHaveBeenCalledWith({
        occurredAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$/),
        seasonId: 3,
        gameId: undefined,
        items: [
          { amount: 12.5, description: 'Pizza' },
          { amount: 7.5, description: 'Getränke' },
        ],
      })
    );
    expect(mocks.createExpenseBatch).toHaveBeenCalledTimes(1);
    expect(mocks.push).toHaveBeenCalledWith('/finance');
  });

  it('keeps the form and stays on the page when the batch fails', async () => {
    const browser = userEvent.setup();
    mocks.createExpenseBatch.mockRejectedValueOnce(new Error('Nicht gespeichert'));
    renderWithProviders(<ExpensesPage />);

    const amount = await screen.findByRole('spinbutton', { name: 'Betrag' });
    await browser.type(amount, '12.5');
    await browser.click(screen.getByRole('button', { name: 'Ausgaben Speichern' }));

    await waitFor(() =>
      expect(mocks.createExpenseBatch).toHaveBeenCalledTimes(1)
    );
    expect(amount).toHaveValue(12.5);
    expect(mocks.push).not.toHaveBeenCalled();
    expect(await screen.findByText('Nicht gespeichert')).toBeInTheDocument();
  });
});
