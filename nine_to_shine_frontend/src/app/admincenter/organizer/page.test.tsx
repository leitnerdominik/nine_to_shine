import React from 'react';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/test-utils';
import OrganizerDutyPage from './page';

const mocks = vi.hoisted(() => ({
  getDuties: vi.fn(),
  push: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock('@/definitions/commands', () => ({
  apiOrganizerDuty: { getAll: mocks.getDuties },
  apiSeason: { getAll: vi.fn() },
  apiUsers: { getAll: vi.fn() },
}));

vi.mock('@/components/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

vi.mock('@/components/LoadingSkeleton', () => ({
  default: () => React.createElement('div', null, 'Loading duties'),
}));

describe('OrganizerDutyPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDuties.mockResolvedValue([]);
  });

  it('keeps the page actions alongside the shared title', async () => {
    renderWithProviders(<OrganizerDutyPage />);

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Organisation Termine',
      })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rotation' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Aktualisieren' })
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('table', { name: 'Organisatoren-Tabelle' })
    ).toBeInTheDocument();
  });
});
