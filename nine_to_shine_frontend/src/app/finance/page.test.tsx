import React from 'react';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/test-utils';
import FinancePage from './page';

vi.mock('@/components/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

const expectedTiles = [
  ['Mitgliedsbeiträge', 'Einzahlungen erfassen', '/finance/deposit'],
  ['Vereinsausgaben', 'Ausgaben einsehen', '/finance/expenses'],
  ['Konten', 'Übersicht aller Stände', '/finance/bankaccounts'],
  ['Transaktionen', 'Alle Transaktionen anzeigen', '/finance/transactions'],
  ['Urlaube', 'Reisen anzeigen und anlegen', '/finance/trips'],
  ['Spielbeiträge', 'Wer hat gezahlt?', '/finance/games'],
] as const;

describe('FinancePage', () => {
  it('shows the finance destinations in the intended order', () => {
    renderWithProviders(<FinancePage />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Finanzen' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Behalte deine Finanzen im Überblick.')
    ).toBeInTheDocument();

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(expectedTiles.length);

    expectedTiles.forEach(([title, subtitle, href], index) => {
      expect(links[index]).toHaveAccessibleName(
        new RegExp(`${title}.*${subtitle}`)
      );
      expect(links[index]).toHaveAttribute('href', href);
    });
  });
});
