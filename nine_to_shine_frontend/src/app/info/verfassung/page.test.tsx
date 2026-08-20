import React from 'react';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import ConstitutionPage from './page';

vi.mock('@/components/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

const fullConstitutionHeadings = [
  '§ 1 – Name und Sitz',
  '§ 2 – Zweck des Vereins',
  '§ 3 – Mitgliedschaft',
  '§ 4 – Beiträge',
  '§ 5 – Organe des Vereins',
  '§ 6 – Der Verein und seine Ämter',
  '§ 7 – Mitgliederversammlung',
  '§ 8 – Satzungsänderungen',
  '§ 9 – Organisation der Treffen',
  '§ 10 – Strafenkatalog',
  '§ 11 – Auflösung des Vereins',
  '§ 12 – Inkrafttreten',
];

describe('Verfassung page', () => {
  it('preserves the existing content and appends the complete constitution', () => {
    renderWithProviders(<ConstitutionPage />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Verfassung' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Rollen – Saison 2' })
    ).toBeInTheDocument();
    expect(screen.getByText('Präsident – Martin')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Die Abstimmung über den Termin wird vor Mitte des vorherigen Monats in der WhatsApp-Gruppe gepostet.'
      )
    ).toBeInTheDocument();

    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Verfassung „Nine to Shine“',
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Einleitung' })
    ).toBeInTheDocument();

    fullConstitutionHeadings.forEach((heading) => {
      expect(
        screen.getByRole('heading', { level: 3, name: heading })
      ).toBeInTheDocument();
    });

    expect(
      screen.getByRole('heading', { level: 4, name: 'Rollen und Pflichten:' })
    ).toBeInTheDocument();
    expect(screen.getByText('Präsident:')).toHaveProperty(
      'tagName',
      'STRONG'
    );
    expect(
      screen.getByText(/Hüter des Zusammenhalts und Schlichter/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/am \[Datum\], feierlich beschlossen/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Möge der Geist von Frohsinn, Freundschaft und Männerehre unseren Bund stets leiten.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole('table', { name: 'Strafenkatalog' })
    ).toBeInTheDocument();
  });
});
