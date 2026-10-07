import React from 'react';
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import PunishmentTable from './PunishmentTable';
import { punishmentRules } from './punishment-data';

describe('PunishmentTable', () => {
  it('renders every rule in order with its amount and remark', () => {
    renderWithProviders(<PunishmentTable />);

    const list = screen.getByRole('list', { name: 'Strafenkatalog' });
    const items = within(list).getAllByRole('listitem');

    expect(items).toHaveLength(9);

    punishmentRules.forEach((punishment, index) => {
      const item = within(items[index]);

      expect(item.getByText(punishment.vergehen)).toBeInTheDocument();
      expect(item.getByText(`${punishment.betrag} €`)).toBeInTheDocument();
      if (punishment.bemerkung) {
        expect(item.getByText(punishment.bemerkung)).toBeInTheDocument();
      }
    });
  });

  it('keeps the explanations attached to both zero-euro rules', () => {
    renderWithProviders(<PunishmentTable />);

    const items = within(
      screen.getByRole('list', { name: 'Strafenkatalog' })
    ).getAllByRole('listitem');
    const specialOccurrence = items.find((item) =>
      within(item).queryByText('Besondere Vorkommnisse')
    );
    const overduePenalty = items.find((item) =>
      within(item).queryByText('Strafen nicht in der Frist zahlen')
    );

    expect(specialOccurrence).toBeDefined();
    expect(overduePenalty).toBeDefined();
    expect(specialOccurrence).toHaveTextContent('0 €');
    expect(specialOccurrence).toHaveTextContent('Betrag entscheidet die Gruppe');
    expect(overduePenalty).toHaveTextContent('0 €');
    expect(overduePenalty).toHaveTextContent('Verdoppelung der Strafe');
  });
});
