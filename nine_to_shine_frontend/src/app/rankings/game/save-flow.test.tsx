import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import NewRankedGamePage from './new/page';
import EditRankedGamePage from './[id]/page';

const mocks = vi.hoisted(() => ({
  router: { push: vi.fn() },
  params: { id: '10' },
  getSeasons: vi.fn(),
  getUsers: vi.fn(),
  getGames: vi.fn(),
  getGameById: vi.fn(),
  createGame: vi.fn(),
  updateGame: vi.fn(),
  getRankings: vi.fn(),
  createRanking: vi.fn(),
  deleteRankingsByGame: vi.fn(),
  removeRanking: vi.fn(),
  saveGameSnapshot: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => mocks.router,
  useParams: () => mocks.params,
}));

vi.mock('@/definitions/commands', () => ({
  apiSeason: { getAll: mocks.getSeasons },
  apiUsers: { getAll: mocks.getUsers },
  apiGame: {
    getAll: mocks.getGames,
    getById: mocks.getGameById,
    create: mocks.createGame,
    update: mocks.updateGame,
  },
  apiRanking: {
    getAll: mocks.getRankings,
    create: mocks.createRanking,
    deleteByGame: mocks.deleteRankingsByGame,
    remove: mocks.removeRanking,
    saveGameSnapshot: mocks.saveGameSnapshot,
  },
}));

vi.mock('@/components/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

vi.mock('@/components/LoadingSkeleton', () => ({
  default: () => React.createElement('div', null, 'Loading ranked game'),
}));

const nina = {
  id: 1,
  displayName: 'Nina',
  isActive: true,
  createdAt: '2025-01-01T00:00:00.000Z',
};
const season = { id: 3, seasonNumber: 7 };
const game = {
  id: 10,
  seasonId: 3,
  playedAt: '2026-07-01T18:00:00.000Z',
  gameName: 'Tennis',
  organizedByUserId: 1,
  organizedByDisplayName: 'Nina',
};
const ranking = {
  id: 20,
  gameId: 10,
  userId: 1,
  points: 5,
  seasonId: 3,
  gameName: 'Tennis',
  playedAt: '2026-07-01T18:00:00.000Z',
  isPresent: true,
};

const rankingPointCases = [
  { input: '0', expected: 0, error: null },
  { input: '10', expected: 10, error: null },
  { input: '-1', expected: null, error: 'Mindestens 0 Punkte.' },
  { input: '11', expected: null, error: 'Maximal 10 Punkte.' },
] as const;

describe('ranked-game save flows', () => {
  beforeEach(() => {
    mocks.params.id = '10';
    mocks.getSeasons.mockResolvedValue([season]);
    mocks.getUsers.mockResolvedValue([nina]);
    mocks.getGames.mockResolvedValue([game]);
    mocks.getGameById.mockResolvedValue(game);
    mocks.getRankings.mockResolvedValue([]);
    mocks.saveGameSnapshot.mockResolvedValue(game);
  });

  it('redirects a nonnumeric game ID to the admin game list', async () => {
    mocks.params.id = 'not-a-number';

    renderWithProviders(<EditRankedGamePage />);

    await waitFor(() =>
      expect(mocks.router.push).toHaveBeenCalledWith('/admincenter/game')
    );
    expect(mocks.getGameById).not.toHaveBeenCalled();
  });

  it('saves an existing unranked game with one snapshot request', async () => {
    const browser = userEvent.setup();
    renderWithProviders(<NewRankedGamePage />);

    const selects = await screen.findAllByRole('combobox');
    await browser.click(selects[0]);
    await browser.click(screen.getByRole('option', { name: 'Tennis – Nina' }));
    const points = screen.getByRole('spinbutton', { name: 'Punkte' });
    await browser.clear(points);
    await browser.type(points, '9');
    await browser.click(screen.getByRole('button', { name: 'Speichern' }));

    await waitFor(() =>
      expect(mocks.saveGameSnapshot).toHaveBeenCalledWith({
        gameId: 10,
        seasonId: 3,
        playedAt: '2026-07-01T00:00:00.000Z',
        gameName: 'Tennis',
        organizedByUserId: 1,
        rankings: [{ userId: 1, points: 9, isPresent: true }],
      })
    );
    expect(mocks.saveGameSnapshot).toHaveBeenCalledTimes(1);
    expect(mocks.createGame).not.toHaveBeenCalled();
    expect(mocks.createRanking).not.toHaveBeenCalled();
    expect(mocks.router.push).toHaveBeenCalledWith('/rankings');
  });

  it('renders the redesigned form sections and prefills an existing game', async () => {
    const browser = userEvent.setup();
    renderWithProviders(<NewRankedGamePage />);

    expect(
      await screen.findByRole('heading', {
        name: 'Neues Spiel erstellen',
        level: 1,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Spiel auswählen', level: 2 })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Spieldaten', level: 2 })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Punkte pro Spieler', level: 2 })
    ).toBeInTheDocument();

    await browser.click(
      screen.getByRole('combobox', { name: 'Vorhandenes Spiel auswählen' })
    );
    await browser.click(screen.getByRole('option', { name: 'Tennis – Nina' }));

    expect(screen.getByRole('combobox', { name: 'Saison' })).toHaveAttribute(
      'aria-disabled',
      'true'
    );
    expect(screen.getByLabelText('Datum')).toBeDisabled();
    expect(screen.getByRole('textbox', { name: 'Spielname' })).toHaveValue(
      'Tennis'
    );
    expect(
      screen.getByRole('combobox', { name: 'Organisiert von' })
    ).toHaveAttribute('aria-disabled', 'true');
  });

  it('updates attendance points and restores the blank form on reset', async () => {
    const browser = userEvent.setup();
    renderWithProviders(<NewRankedGamePage />);

    const attendance = await screen.findByRole('checkbox', {
      name: 'Anwesend',
    });
    const points = screen.getByRole('spinbutton', { name: 'Punkte' });
    const gameName = screen.getByRole('textbox', { name: 'Spielname' });

    await browser.click(attendance);
    expect(attendance).not.toBeChecked();
    expect(points).toBeDisabled();
    expect(points).toHaveValue(1);

    await browser.click(attendance);
    expect(attendance).toBeChecked();
    expect(points).toBeEnabled();
    expect(points).toHaveValue(null);

    await browser.type(gameName, 'Tennis');
    await browser.type(points, '8');
    await browser.click(screen.getByRole('button', { name: 'Zurücksetzen' }));

    expect(gameName).toHaveValue('');
    expect(points).toHaveValue(null);
    expect(attendance).toBeChecked();
  });

  it('disables submission while the snapshot request is pending', async () => {
    const browser = userEvent.setup();
    let finishSave: ((value: typeof game) => void) | undefined;
    mocks.saveGameSnapshot.mockReturnValue(
      new Promise<typeof game>((resolve) => {
        finishSave = resolve;
      })
    );
    renderWithProviders(<NewRankedGamePage />);

    const selects = await screen.findAllByRole('combobox');
    await browser.click(selects[0]);
    await browser.click(screen.getByRole('option', { name: 'Tennis – Nina' }));
    await browser.type(screen.getByRole('spinbutton', { name: 'Punkte' }), '9');
    await browser.click(screen.getByRole('button', { name: 'Speichern' }));

    expect(
      await screen.findByRole('button', { name: 'Speichern…' })
    ).toBeDisabled();

    finishSave?.(game);
    await waitFor(() =>
      expect(mocks.router.push).toHaveBeenCalledWith('/rankings')
    );
  });

  it('creates a ranked game with one snapshot request and no game ID', async () => {
    const browser = userEvent.setup();
    mocks.getGames.mockResolvedValueOnce([]);
    renderWithProviders(<NewRankedGamePage />);

    await screen.findByRole('heading', { name: 'Neues Spiel erstellen' });
    await browser.type(screen.getByRole('textbox', { name: 'Spielname' }), 'Tennis');
    await browser.click(
      screen.getByRole('combobox', { name: 'Organisiert von' })
    );
    await browser.click(screen.getByRole('option', { name: 'Nina' }));
    await browser.type(screen.getByRole('spinbutton', { name: 'Punkte' }), '9');
    await browser.click(screen.getByRole('button', { name: 'Speichern' }));

    await waitFor(() =>
      expect(mocks.saveGameSnapshot).toHaveBeenCalledWith({
        seasonId: 3,
        playedAt: expect.any(String),
        gameName: 'Tennis',
        organizedByUserId: 1,
        rankings: [{ userId: 1, points: 9, isPresent: true }],
      })
    );
    expect(mocks.saveGameSnapshot).toHaveBeenCalledTimes(1);
    expect(mocks.createGame).not.toHaveBeenCalled();
    expect(mocks.createRanking).not.toHaveBeenCalled();
  });

  it('edits game metadata and rankings with one snapshot request', async () => {
    const browser = userEvent.setup();
    mocks.getRankings.mockResolvedValueOnce([ranking]);
    renderWithProviders(<EditRankedGamePage />);

    expect(
      await screen.findByRole('heading', { name: 'Spiel bearbeiten: Tennis' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Spieldaten', level: 2 })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Punkte pro Spieler', level: 2 })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Spiel auswählen' })
    ).not.toBeInTheDocument();
    await browser.click(screen.getByRole('button', { name: 'Speichern' }));

    await waitFor(() =>
      expect(mocks.saveGameSnapshot).toHaveBeenCalledWith({
        gameId: 10,
        seasonId: 3,
        playedAt: '2026-07-01T00:00:00.000Z',
        gameName: 'Tennis',
        organizedByUserId: 1,
        rankings: [{ userId: 1, points: 5, isPresent: true }],
      })
    );
    expect(mocks.saveGameSnapshot).toHaveBeenCalledTimes(1);
    expect(mocks.updateGame).not.toHaveBeenCalled();
    expect(mocks.deleteRankingsByGame).not.toHaveBeenCalled();
    expect(mocks.removeRanking).not.toHaveBeenCalled();
    expect(mocks.createRanking).not.toHaveBeenCalled();
    expect(mocks.router.push).toHaveBeenCalledWith('/rankings/10');
  });

  it('cancels editing back to the game ranking', async () => {
    const browser = userEvent.setup();
    mocks.getRankings.mockResolvedValueOnce([ranking]);
    renderWithProviders(<EditRankedGamePage />);

    await browser.click(
      await screen.findByRole('button', { name: 'Abbrechen' })
    );

    expect(mocks.router.push).toHaveBeenCalledWith('/rankings/10');
  });

  it('shows the shared absent-player state in edit mode', async () => {
    mocks.getRankings.mockResolvedValueOnce([
      { ...ranking, points: 1, isPresent: false },
    ]);
    renderWithProviders(<EditRankedGamePage />);

    const attendance = await screen.findByRole('checkbox', {
      name: 'Anwesend',
    });
    const points = screen.getByRole('spinbutton', { name: 'Punkte' });

    expect(attendance).not.toBeChecked();
    expect(points).toBeDisabled();
    expect(
      screen.getByText('Abwesend: automatisch 1 Punkt')
    ).toBeInTheDocument();
  });

  it.each(rankingPointCases)(
    'validates $input points in the create form',
    async ({ input, expected, error }) => {
      const browser = userEvent.setup();
      renderWithProviders(<NewRankedGamePage />);

      const selects = await screen.findAllByRole('combobox');
      await browser.click(selects[0]);
      await browser.click(screen.getByRole('option', { name: 'Tennis – Nina' }));

      const points = screen.getByRole('spinbutton', { name: 'Punkte' });
      expect(points).toHaveAttribute('min', '0');
      expect(points).toHaveAttribute('max', '10');
      await browser.clear(points);
      await browser.type(points, input);
      await browser.click(screen.getByRole('button', { name: 'Speichern' }));

      if (error) {
        expect(await screen.findByText(error)).toBeInTheDocument();
        expect(mocks.saveGameSnapshot).not.toHaveBeenCalled();
        return;
      }

      await waitFor(() =>
        expect(mocks.saveGameSnapshot).toHaveBeenCalledWith(
          expect.objectContaining({
            rankings: [{ userId: 1, points: expected, isPresent: true }],
          })
        )
      );
    }
  );

  it.each(rankingPointCases)(
    'validates $input points in the edit form',
    async ({ input, expected, error }) => {
      const browser = userEvent.setup();
      mocks.getRankings.mockResolvedValueOnce([ranking]);
      renderWithProviders(<EditRankedGamePage />);

      await screen.findByRole('heading', { name: 'Spiel bearbeiten: Tennis' });
      const points = screen.getByRole('spinbutton', { name: 'Punkte' });
      expect(points).toHaveAttribute('min', '0');
      expect(points).toHaveAttribute('max', '10');
      await browser.clear(points);
      await browser.type(points, input);
      await browser.click(screen.getByRole('button', { name: 'Speichern' }));

      if (error) {
        expect(await screen.findByText(error)).toBeInTheDocument();
        expect(mocks.saveGameSnapshot).not.toHaveBeenCalled();
        return;
      }

      await waitFor(() =>
        expect(mocks.saveGameSnapshot).toHaveBeenCalledWith(
          expect.objectContaining({
            rankings: [{ userId: 1, points: expected, isPresent: true }],
          })
        )
      );
    }
  );
});
