'use client';

import theme from '@/theme';
import { ThemeProvider } from '@mui/material';
import { ReactNode } from 'react';

interface ClientThemenProviderProps {
  children: ReactNode;
}

export default function ClientThemenProvider({
  children,
}: ClientThemenProviderProps) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
