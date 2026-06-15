import React from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { SnackbarProvider } from 'notistack';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from '@/theme';

function Providers({ children }: { children: React.ReactNode }) {
  return React.createElement(
    ThemeProvider,
    { theme },
    React.createElement(
      SnackbarProvider,
      null,
      React.createElement(
        React.Fragment,
        null,
        React.createElement(CssBaseline),
        children
      )
    )
  );
}

export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: Providers, ...options });
}

export * from '@testing-library/react';
