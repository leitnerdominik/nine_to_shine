import React from 'react';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import ChronikPage from './page';

vi.mock('@/components/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

describe('Informationen page', () => {
  it('links to all three information areas in the intended order', () => {
    renderWithProviders(<ChronikPage />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Informationen' })
    ).toBeInTheDocument();

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(3);
    expect(links[0]).toHaveAccessibleName(/Strafenkatalog/);
    expect(links[0]).toHaveAttribute('href', '/info/strafenkatalog');
    expect(links[1]).toHaveAccessibleName(/Chronik/);
    expect(links[1]).toHaveAttribute('href', '/info/eintraege');
    expect(links[2]).toHaveAccessibleName(/Verfassung/);
    expect(links[2]).toHaveAttribute('href', '/info/verfassung');
  });
});
