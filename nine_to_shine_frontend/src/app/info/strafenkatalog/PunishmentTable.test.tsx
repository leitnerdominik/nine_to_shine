import React from 'react';
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import PunishmentTable from './PunishmentTable';
import { punishmentRules } from './punishment-data';

describe('PunishmentTable', () => {
  it('renders every punishment with all three columns', () => {
    renderWithProviders(<PunishmentTable />);

    const table = screen.getByRole('table', { name: 'Strafenkatalog' });
    const rows = within(table).getAllByRole('row');

    expect(rows).toHaveLength(punishmentRules.length + 1);
    expect(within(rows[0]).getAllByRole('columnheader')).toHaveLength(3);
    expect(within(rows[0]).getByText('Vergehen')).toBeInTheDocument();
    expect(within(rows[0]).getByText('Betrag')).toBeInTheDocument();
    expect(within(rows[0]).getByText('Bemerkung')).toBeInTheDocument();

    punishmentRules.forEach((punishment, index) => {
      const cells = within(rows[index + 1]).getAllByRole('cell');

      expect(cells).toHaveLength(3);
      expect(cells[0]).toHaveTextContent(punishment.vergehen);
      expect(cells[1]).toHaveTextContent(`${punishment.betrag} €`);
      expect(cells[2]).toHaveTextContent(punishment.bemerkung);
    });
  });
});
