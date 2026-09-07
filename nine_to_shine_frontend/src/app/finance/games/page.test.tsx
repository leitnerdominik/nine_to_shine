import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import GamesListPage from './page';

const mocks = vi.hoisted(() => ({
  getGamesWithBookings: vi.fn(),
}));

vi.mock('@/definitions/commands', () => ({
  apiGame: { getGamesWithBookings: mocks.getGamesWithBookings },
}));

vi.mock('@/components/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

vi.mock('@/components/LoadingSkeleton', () => ({
  default: () => React.createElement('div', null, 'Loading games'),
}));

describe('GamesListPage', () => {
  beforeEach(() => {
    mocks.getGamesWithBookings.mockResolvedValue([
      {
        id: 12,
        gameName: 'Freitagsspiel',
        playedAt: '2026-09-04T18:00:00.000Z',
      },
    ]);
  });

  it('shows an initial-load error instead of the empty state and retries', async () => {
    const browser = userEvent.setup();
    mocks.getGamesWithBookings.mockRejectedValueOnce(
      new Error('API nicht erreichbar')
    );

    renderWithProviders(<GamesListPage />);

    expect(
      await screen.findByText(
        'Spiele konnten nicht geladen werden. API nicht erreichbar'
      )
    ).toBeVisible();
    expect(
      screen.queryByText('Keine Spiele mit Buchungen gefunden.')
    ).not.toBeInTheDocument();

    await browser.click(
      screen.getByRole('button', { name: 'Erneut versuchen' })
    );

    expect(await screen.findByText('Freitagsspiel')).toBeVisible();
    await waitFor(() =>
      expect(mocks.getGamesWithBookings).toHaveBeenCalledTimes(2)
    );
  });
});
