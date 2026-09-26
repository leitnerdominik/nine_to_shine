import React from 'react';
import { act, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import DashboardPage from './page';

const mocks = vi.hoisted(() => ({
  getSeasons: vi.fn(),
  getTopRanked: vi.fn(),
  getDuties: vi.fn(),
  getDuesStatus: vi.fn(),
}));

vi.mock('@/definitions/commands', () => ({
  apiSeason: { getAll: mocks.getSeasons },
  apiRanking: { getTopRanked: mocks.getTopRanked },
  apiOrganizerDuty: { getAll: mocks.getDuties },
  apiFinance: { getDuesStatus: mocks.getDuesStatus },
}));

vi.mock('@/components/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, resolve, reject };
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSeasons.mockResolvedValue([{ id: 5, seasonNumber: 7 }]);
    mocks.getTopRanked.mockResolvedValue(null);
    mocks.getDuties.mockResolvedValue([]);
    mocks.getDuesStatus.mockResolvedValue([]);
  });

  it('shows the dashboard skeleton until all summary requests settle', async () => {
    const duesRequest = deferred<[]>();
    mocks.getDuesStatus.mockReturnValue(duesRequest.promise);

    renderWithProviders(<DashboardPage />);

    const loadingStatus = screen.getByRole('status', {
      name: 'Dashboard wird geladen',
    });
    expect(loadingStatus).toHaveAttribute('aria-busy', 'true');
    await waitFor(() => expect(mocks.getDuesStatus).toHaveBeenCalledWith(5));
    expect(loadingStatus).toBeInTheDocument();

    await act(async () => {
      duesRequest.resolve([]);
    });

    await waitFor(() =>
      expect(
        screen.queryByRole('status', { name: 'Dashboard wird geladen' })
      ).not.toBeInTheDocument()
    );
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: `Saison 7 · ${new Date().getFullYear()}`,
      })
    ).toBeInTheDocument();
  });

  it('shows unavailable months when the duty request fails', async () => {
    mocks.getDuties.mockRejectedValueOnce(new Error('Request failed'));

    renderWithProviders(<DashboardPage />);

    expect(
      await screen.findByText('Fehler beim Laden des Dashboards')
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.queryByRole('status', { name: 'Dashboard wird geladen' })
      ).not.toBeInTheDocument()
    );
    expect(screen.getByText('Noch keine Punkte')).toBeInTheDocument();
    expect(screen.getByText('Status konnte nicht geladen werden')).toBeInTheDocument();
    expect(
      within(screen.getByRole('listitem', { name: `Januar ${new Date().getFullYear()}` })).getByText(
        'Nicht verfügbar'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Big Meeting')).toBeInTheDocument();
  });

  it('keeps the successful empty state when no season exists', async () => {
    mocks.getSeasons.mockResolvedValue([]);

    renderWithProviders(<DashboardPage />);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Saison –' })
    ).toBeInTheDocument();
    expect(mocks.getTopRanked).toHaveBeenCalledWith(undefined);
    expect(mocks.getDuties).toHaveBeenCalledTimes(1);
    expect(mocks.getDuesStatus).not.toHaveBeenCalled();
    expect(screen.getByText('Noch keine Punkte')).toBeInTheDocument();
    expect(screen.getByText('Alles bezahlt')).toBeInTheDocument();
    expect(screen.getByText('Keine offenen Spielbeiträge')).toBeInTheDocument();
    expect(
      within(screen.getByRole('listitem', { name: `Januar ${new Date().getFullYear()}` })).getByText(
        'Offen'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Frei')).toBeInTheDocument();
  });

  it('uses the highest season and current year for organizer names', async () => {
    const year = new Date().getFullYear();
    mocks.getSeasons.mockResolvedValue([
      { id: 3, seasonNumber: 3 },
      { id: 9, seasonNumber: 9 },
      { id: 7, seasonNumber: 7 },
    ]);
    mocks.getTopRanked.mockResolvedValue({
      userId: 12,
      userDisplayName: 'Dominik Leitner',
      totalPoints: 128,
    });
    const duty = (
      id: number,
      month: string,
      userDisplayName: string,
      seasonId = 9,
      isSkipped = false
    ) => ({
      id,
      dutyDate: `${month}-01T00:00:00.000Z`,
      userId: id,
      userDisplayName,
      seasonId,
      seasonDisplayNumber: seasonId,
      isSkipped,
      isManualOverride: false,
    });
    mocks.getDuties.mockResolvedValue([
      duty(1, `${year}-01`, 'Anna Maria'),
      duty(2, `${year}-01`, 'Florian'),
      duty(3, `${year}-02`, 'Skipped Member', 9, true),
      duty(4, `${year}-03`, 'Other Season', 3),
      duty(5, `${year - 1}-04`, 'Other Year'),
      duty(9, `${year}-06`, 'Skipped Organizer', 9, true),
      duty(10, `${year}-06`, 'Remaining Organizer'),
      duty(6, `${year}-10`, 'October Organizer'),
      duty(7, `${year}-11`, 'November Organizer'),
      duty(8, `${year}-12`, 'December Organizer'),
    ]);

    renderWithProviders(<DashboardPage />);

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: `Saison 9 · ${new Date().getFullYear()}`,
      })
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(mocks.getTopRanked).toHaveBeenCalledWith(9);
      expect(mocks.getDuesStatus).toHaveBeenCalledWith(9);
      expect(mocks.getDuties).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText('Dominik Leitner').closest('a')).toHaveAttribute(
      'href',
      '/rankings'
    );
    expect(screen.getByText('128 Punkte')).toBeInTheDocument();
    const january = screen.getByRole('listitem', { name: `Januar ${year}` });
    expect(within(january).getByText('Anna Maria, Florian')).toBeInTheDocument();
    expect(within(january).getByText('AM')).toBeInTheDocument();
    expect(
      within(screen.getByRole('listitem', { name: `Februar ${year}` })).getByText(
        'Entfällt'
      )
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('listitem', { name: `März ${year}` })).getByText(
        'Offen'
      )
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('listitem', { name: `April ${year}` })).getByText(
        'Offen'
      )
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('listitem', { name: `Juni ${year}` })).getByText(
        'Remaining Organizer'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Big Meeting')).toBeInTheDocument();
    expect(screen.getByText('N2S+1')).toBeInTheDocument();
    expect(screen.getByText('Frei')).toBeInTheDocument();
    expect(screen.queryByText('October Organizer')).not.toBeInTheDocument();
    expect(screen.queryByText('November Organizer')).not.toBeInTheDocument();
    expect(screen.queryByText('December Organizer')).not.toBeInTheDocument();
    const timelineLink = screen.getByRole('link', {
      name: `Wer organisiert wann? ${year} öffnen`,
    });
    expect(timelineLink).toHaveAttribute('href', '/organizer-duties');
    expect(timelineLink).toContainElement(january);
    expect(screen.getByRole('heading', { level: 2, name: 'Wer organisiert wann?' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Organisieren' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(12);
  });

  it('shows unassigned months without implying a duty loading failure', async () => {
    const year = new Date().getFullYear();
    renderWithProviders(<DashboardPage />);

    await screen.findByRole('heading', {
      level: 1,
      name: `Saison 7 · ${year}`,
    });
    expect(
      within(screen.getByRole('listitem', { name: `September ${year}` })).getByText(
        'Offen'
      )
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('listitem', { name: `Dezember ${year}` })).getByText(
        'Frei'
      )
    ).toBeInTheDocument();
  });

  it('shows the current-season open count and links to the overview', async () => {
    mocks.getDuesStatus.mockResolvedValue([
      {
        gameId: 10,
        seasonId: 5,
        playedAt: '2026-07-15T18:00:00.000Z',
        gameName: 'Open game',
        activeMemberCount: 3,
        paidMemberCount: 1,
        unpaidMembers: [
          { userId: 2, displayName: 'Alex' },
          { userId: 3, displayName: 'Bob' },
        ],
      },
    ]);

    renderWithProviders(<DashboardPage />);

    await waitFor(() =>
      expect(mocks.getDuesStatus).toHaveBeenCalledWith(5)
    );
    const openCount = await screen.findByText('2 offen');
    expect(screen.getByText('1 Spiel betroffen')).toBeInTheDocument();
    expect(openCount.closest('a')).toHaveAttribute('href', '/finance/dues');
  });

  it('aggregates open payments across multiple affected games', async () => {
    mocks.getDuesStatus.mockResolvedValue([
      {
        gameId: 10,
        seasonId: 5,
        playedAt: '2026-07-15T18:00:00.000Z',
        gameName: 'First open game',
        activeMemberCount: 3,
        paidMemberCount: 1,
        unpaidMembers: [
          { userId: 2, displayName: 'Alex' },
          { userId: 3, displayName: 'Bob' },
        ],
      },
      {
        gameId: 11,
        seasonId: 5,
        playedAt: '2026-08-15T18:00:00.000Z',
        gameName: 'Second open game',
        activeMemberCount: 3,
        paidMemberCount: 2,
        unpaidMembers: [{ userId: 2, displayName: 'Alex' }],
      },
    ]);

    renderWithProviders(<DashboardPage />);

    expect(await screen.findByText('3 offen')).toBeInTheDocument();
    expect(screen.getByText('2 Spiele betroffen')).toBeInTheDocument();
  });

  it('shows the all-paid state when no payments are open', async () => {
    mocks.getDuesStatus.mockResolvedValue([
      {
        gameId: 10,
        seasonId: 5,
        playedAt: '2026-07-15T18:00:00.000Z',
        gameName: 'Settled game',
        activeMemberCount: 3,
        paidMemberCount: 3,
        unpaidMembers: [],
      },
    ]);

    renderWithProviders(<DashboardPage />);

    expect(await screen.findByText('Alles bezahlt')).toBeInTheDocument();
    expect(screen.getByText('Keine offenen Spielbeiträge')).toBeInTheDocument();
  });
});
