import React from 'react';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import ChronikEntriesPage from './page';

vi.mock('@/components/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

describe('Chronik entries page', () => {
  it('shows newest entries first and links to their nested detail routes', () => {
    renderWithProviders(<ChronikEntriesPage />);

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveTextContent('Hauptversammlung 2025');
    expect(links[0]).toHaveAttribute(
      'href',
      '/chronik/eintraege/1Mzawp47DRaeL8vcGVYALp'
    );
    expect(links[1]).toHaveTextContent('Treffen Dezember 2024');
    expect(links[1]).toHaveAttribute(
      'href',
      '/chronik/eintraege/6BqVUYvbSoeU1o32iQvmtZ'
    );
  });
});
