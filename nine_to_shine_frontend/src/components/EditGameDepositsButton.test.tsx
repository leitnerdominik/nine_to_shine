import React from 'react';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import EditGameDepositsButton from './EditGameDepositsButton';

describe('EditGameDepositsButton', () => {
  it('links to deposit edit mode for the selected game', () => {
    renderWithProviders(<EditGameDepositsButton gameId={17} />);

    expect(screen.getByRole('link', { name: 'Bearbeiten' })).toHaveAttribute(
      'href',
      '/finance/deposit?editGameId=17'
    );
  });
});
