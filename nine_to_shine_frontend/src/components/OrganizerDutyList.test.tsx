import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/test-utils';
import OrganizerDutyList from './OrganizerDutyList';

const mocks = vi.hoisted(() => ({
  getSeasons: vi.fn(),
  getDuties: vi.fn(),
  enqueueSnackbar: vi.fn(),
}));

vi.mock('@/definitions/commands', () => ({
  apiSeason: { getAll: mocks.getSeasons },
  apiOrganizerDuty: { getAll: mocks.getDuties },
}));

vi.mock('notistack', async (importOriginal) => {
  const actual = await importOriginal<typeof import('notistack')>();
  return {
    ...actual,
    useSnackbar: () => ({ enqueueSnackbar: mocks.enqueueSnackbar }),
  };
});

vi.mock('./LoadingSkeleton', () => ({
  default: () => <div>Organisatoren werden geladen</div>,
}));

const seasons = [
  { id: 80, seasonNumber: 8 },
  { id: 90, seasonNumber: 9 },
];

const duties = [
  {
    id: 3,
    dutyDate: '2027-01-01T12:00:00.000Z',
    userId: 3,
    userDisplayName: 'Felix Mair',
    seasonId: 90,
    seasonDisplayNumber: 9,
    isSkipped: false,
    isManualOverride: false,
  },
  {
    id: 1,
    dutyDate: '2026-07-01T12:00:00.000Z',
    userId: 1,
    userDisplayName: 'Lena Hartmann',
    seasonId: 90,
    seasonDisplayNumber: 9,
    isSkipped: false,
    isManualOverride: true,
  },
  {
    id: 4,
    dutyDate: '2025-06-01T12:00:00.000Z',
    userId: null,
    userDisplayName: null,
    seasonId: 80,
    seasonDisplayNumber: 8,
    isSkipped: false,
    isManualOverride: false,
  },
  {
    id: 2,
    dutyDate: '2026-08-01T12:00:00.000Z',
    userId: null,
    userDisplayName: null,
    seasonId: 90,
    seasonDisplayNumber: 9,
    isSkipped: true,
    isManualOverride: false,
  },
];

describe('OrganizerDutyList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSeasons.mockResolvedValue(seasons);
    mocks.getDuties.mockResolvedValue(duties);
  });

  it('selects the newest season and renders its duties chronologically', async () => {
    renderWithProviders(<OrganizerDutyList />);

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Organisieren der Treffen',
      })
    ).toBeInTheDocument();
    expect(screen.getByText('Saison 9 • 2026')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Saison' })).toHaveTextContent(
      'Saison 9'
    );

    const table = screen.getByRole('table', {
      name: 'Organisatoren Tabelle',
    });
    const rows = within(table).getAllByRole('row');

    expect(within(rows[1]).getByText('Juli 2026')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Lena Hartmann')).toBeInTheDocument();
    expect(within(rows[2]).getByText('August 2026')).toBeInTheDocument();
    expect(within(rows[2]).getByText('Entfällt')).toBeInTheDocument();
    expect(within(rows[3]).getByText('Januar 2027')).toBeInTheDocument();
    expect(within(table).queryByText('Juni 2025')).not.toBeInTheDocument();
  });

  it('switches seasons locally and keeps the nullable name fallback', async () => {
    const user = userEvent.setup();
    renderWithProviders(<OrganizerDutyList />);

    await screen.findByRole('heading', { name: 'Organisieren der Treffen' });
    await user.click(screen.getByRole('combobox', { name: 'Saison' }));

    expect(
      screen.getAllByRole('option').map((option) => option.textContent)
    ).toEqual(['Saison 9', 'Saison 8']);

    await user.click(screen.getByRole('option', { name: 'Saison 8' }));

    expect(screen.getByText('Saison 8 • 2025')).toBeInTheDocument();
    const table = screen.getByRole('table', {
      name: 'Organisatoren Tabelle',
    });
    expect(within(table).getByText('Juni 2025')).toBeInTheDocument();
    expect(within(table).getByText('-')).toBeInTheDocument();
    expect(within(table).queryByText('Lena Hartmann')).not.toBeInTheDocument();
  });

  it('shows season and duty empty states without inventing a year', async () => {
    const user = userEvent.setup();
    mocks.getDuties.mockResolvedValue(duties.filter((duty) => duty.seasonId === 90));
    renderWithProviders(<OrganizerDutyList />);

    await screen.findByText('Saison 9 • 2026');
    await user.click(screen.getByRole('combobox', { name: 'Saison' }));
    await user.click(screen.getByRole('option', { name: 'Saison 8' }));

    expect(screen.getAllByText('Saison 8')).toHaveLength(2);
    expect(screen.queryByText(/Saison 8 •/)).not.toBeInTheDocument();
    expect(
      screen.getByText('Keine Einträge für diese Saison vorhanden.')
    ).toBeInTheDocument();
  });

  it('shows the no-season state', async () => {
    mocks.getSeasons.mockResolvedValue([]);
    mocks.getDuties.mockResolvedValue([]);
    renderWithProviders(<OrganizerDutyList />);

    expect(
      await screen.findByText('Keine Saisons gefunden.')
    ).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Saison' })).not.toBeInTheDocument();
    expect(
      screen.getByText('Keine Einträge für diese Saison vorhanden.')
    ).toBeInTheDocument();
  });

  it('keeps loading visible until both requests settle', () => {
    mocks.getSeasons.mockReturnValue(new Promise(() => undefined));
    renderWithProviders(<OrganizerDutyList />);

    expect(screen.getByText('Organisatoren werden geladen')).toBeInTheDocument();
    expect(mocks.getSeasons).toHaveBeenCalledOnce();
    expect(mocks.getDuties).toHaveBeenCalledOnce();
  });

  it('reports loading failures through the existing snackbar', async () => {
    mocks.getDuties.mockRejectedValue(new Error('Dienstplan nicht erreichbar'));
    renderWithProviders(<OrganizerDutyList />);

    await waitFor(() =>
      expect(mocks.enqueueSnackbar).toHaveBeenCalledWith(
        'Dienstplan nicht erreichbar',
        { variant: 'error' }
      )
    );
    expect(screen.getByText('Keine Saisons gefunden.')).toBeInTheDocument();
  });
});
