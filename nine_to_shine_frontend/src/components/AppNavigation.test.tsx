import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/test-utils';
import AppNavigation, { type NavigationUser } from './AppNavigation';

const mocks = vi.hoisted(() => ({
  pathname: '/',
  push: vi.fn(),
  signOut: vi.fn(),
  enqueueSnackbar: vi.fn(),
  auth: { name: 'firebase-auth' },
}));

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock('firebase/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/auth')>();
  return { ...actual, signOut: mocks.signOut };
});

vi.mock('notistack', async (importOriginal) => {
  const actual = await importOriginal<typeof import('notistack')>();
  return { ...actual, enqueueSnackbar: mocks.enqueueSnackbar };
});

vi.mock('../../firebase', () => ({
  getFirebaseAuth: () => mocks.auth,
}));

const user: NavigationUser = {
  displayName: 'Dominik Leitner',
  email: 'dominik@example.com',
};

describe('AppNavigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pathname = '/';
    mocks.signOut.mockResolvedValue(undefined);
  });

  it('exposes all primary destinations and keeps admin in the account menu', async () => {
    const interaction = userEvent.setup();
    renderWithProviders(<AppNavigation user={user} />);

    const desktopNavigation = screen.getByRole('navigation', {
      name: 'Hauptnavigation',
    });
    const mobileNavigation = screen.getByRole('navigation', {
      name: 'Mobile Hauptnavigation',
    });

    const expectedLinks = [
      ['Übersicht', '/'],
      ['Rangliste', '/rankings'],
      ['Organisieren', '/organizer-duties'],
      ['Finanzen', '/finance'],
      ['Informationen', '/info'],
    ];

    for (const [name, href] of expectedLinks) {
      expect(within(desktopNavigation).getByRole('link', { name })).toHaveAttribute(
        'href',
        href
      );
      expect(within(mobileNavigation).getByRole('link', { name })).toHaveAttribute(
        'href',
        href
      );
    }

    expect(screen.getByText('DL')).toBeInTheDocument();
    await interaction.click(
      screen.getByRole('button', { name: 'Benutzermenü öffnen' })
    );

    expect(
      screen.getByRole('menuitem', { name: 'Admin' })
    ).toHaveAttribute('href', '/admincenter');
  });

  it('marks nested routes as active in both navigation variants', () => {
    mocks.pathname = '/finance/games/42';
    renderWithProviders(<AppNavigation user={user} />);

    const desktopNavigation = screen.getByRole('navigation', {
      name: 'Hauptnavigation',
    });
    const mobileNavigation = screen.getByRole('navigation', {
      name: 'Mobile Hauptnavigation',
    });

    expect(
      within(desktopNavigation).getByRole('link', { name: 'Finanzen' })
    ).toHaveAttribute('aria-current', 'page');
    expect(
      within(mobileNavigation).getByRole('link', { name: 'Finanzen' })
    ).toHaveAttribute('aria-current', 'page');
    expect(
      within(desktopNavigation).getByRole('link', { name: 'Übersicht' })
    ).not.toHaveAttribute('aria-current');
  });

  it('signs out from the account menu and returns to login', async () => {
    const interaction = userEvent.setup();
    renderWithProviders(<AppNavigation user={user} />);

    await interaction.click(
      screen.getByRole('button', { name: 'Benutzermenü öffnen' })
    );
    await interaction.click(screen.getByRole('menuitem', { name: 'Logout' }));

    await waitFor(() => expect(mocks.signOut).toHaveBeenCalledWith(mocks.auth));
    expect(mocks.push).toHaveBeenCalledWith('/login');
  });

  it('reports logout failures without navigating away', async () => {
    const interaction = userEvent.setup();
    mocks.signOut.mockRejectedValue(new Error('Logout fehlgeschlagen'));
    renderWithProviders(<AppNavigation user={user} />);

    await interaction.click(
      screen.getByRole('button', { name: 'Benutzermenü öffnen' })
    );
    await interaction.click(screen.getByRole('menuitem', { name: 'Logout' }));

    await waitFor(() =>
      expect(mocks.enqueueSnackbar).toHaveBeenCalledWith(
        'Logout fehlgeschlagen',
        { variant: 'error' }
      )
    );
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it('shows only the brand when no user is authenticated', () => {
    renderWithProviders(<AppNavigation user={null} />);

    const brandLink = screen.getByRole('link', { name: 'Zur Übersicht' });
    const brandLogo = brandLink.querySelector('img');

    expect(brandLink).toHaveAttribute('href', '/');
    expect(brandLogo).toBeVisible();
    expect(brandLogo).toHaveAttribute('alt', '');
    expect(
      screen.queryByRole('navigation', { name: 'Hauptnavigation' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('navigation', { name: 'Mobile Hauptnavigation' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Benutzermenü öffnen' })
    ).not.toBeInTheDocument();
  });

  it.each([
    [{ displayName: null, email: 'max.mustermann@example.com' }, 'MM'],
    [{ displayName: null, email: null }, '?'],
  ] satisfies Array<[NavigationUser, string]>)(
    'derives accessible account initials from available user data',
    (navigationUser, expectedInitials) => {
      renderWithProviders(<AppNavigation user={navigationUser} />);

      expect(screen.getByText(expectedInitials)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Benutzermenü öffnen' })
      ).toBeInTheDocument();
    }
  );

  it('opens and closes the account menu from the keyboard', async () => {
    const interaction = userEvent.setup();
    renderWithProviders(<AppNavigation user={user} />);

    const accountButton = screen.getByRole('button', {
      name: 'Benutzermenü öffnen',
    });
    accountButton.focus();
    await interaction.keyboard('{Enter}');

    expect(
      screen.getByRole('menu', { name: 'Benutzeraktionen' })
    ).toBeInTheDocument();

    await interaction.keyboard('{Escape}');
    await waitFor(() =>
      expect(
        screen.queryByRole('menu', { name: 'Benutzeraktionen' })
      ).not.toBeInTheDocument()
    );
    expect(accountButton).toHaveFocus();
  });
});
