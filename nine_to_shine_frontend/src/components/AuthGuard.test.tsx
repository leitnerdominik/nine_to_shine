import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import AuthGuard from './AuthGuard';

const mocks = vi.hoisted(() => ({
  authState: {
    user: null as unknown,
    loading: false,
  },
  pathname: '/',
  push: vi.fn(),
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => mocks.authState,
}));

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({
    push: mocks.push,
  }),
}));

vi.mock('./Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

vi.mock('./LoadingSkeleton', () => ({
  default: () => React.createElement('div', null, 'Loading protected page'),
}));

describe('AuthGuard', () => {
  beforeEach(() => {
    mocks.authState = {
      user: null,
      loading: false,
    };
    mocks.pathname = '/admincenter';
    mocks.push.mockClear();
  });

  it('redirects unauthenticated users away from protected routes', async () => {
    renderWithProviders(
      React.createElement(
        AuthGuard,
        null,
        React.createElement('div', null, 'Protected content')
      )
    );

    expect(screen.getByText('Loading protected page')).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/login'));
  });

  it('renders protected content for authenticated users', () => {
    mocks.authState = {
      user: { uid: 'firebase-user' },
      loading: false,
    };

    renderWithProviders(
      React.createElement(
        AuthGuard,
        null,
        React.createElement('div', null, 'Protected content')
      )
    );

    expect(screen.getByText('Protected content')).toBeInTheDocument();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it('allows unauthenticated users on unprotected routes', () => {
    mocks.pathname = '/login';

    renderWithProviders(
      React.createElement(
        AuthGuard,
        null,
        React.createElement('div', null, 'Login form')
      )
    );

    expect(screen.getByText('Login form')).toBeInTheDocument();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it('keeps the loading skeleton while auth is resolving', () => {
    mocks.authState = {
      user: null,
      loading: true,
    };

    renderWithProviders(
      React.createElement(
        AuthGuard,
        null,
        React.createElement('div', null, 'Protected content')
      )
    );

    expect(screen.getByText('Loading protected page')).toBeInTheDocument();
    expect(mocks.push).not.toHaveBeenCalled();
  });
});
