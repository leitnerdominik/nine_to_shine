import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test/test-utils';
import PageTitle from './PageTitle';

describe('PageTitle', () => {
  it('renders a semantic title and decorative accent', () => {
    const { container } = renderWithProviders(<PageTitle title="Rangliste" />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Rangliste' })
    ).toBeInTheDocument();
    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
  });

  it('renders the optional subtitle when provided', () => {
    renderWithProviders(
      <PageTitle
        title="Finanzen"
        subtitle="Behalte deine Finanzen im Überblick."
      />
    );

    expect(
      screen.getByText('Behalte deine Finanzen im Überblick.')
    ).toBeInTheDocument();
  });
});
