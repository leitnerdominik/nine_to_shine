'use client';

import { SnackbarProvider } from 'notistack';
import { ReactNode } from 'react';

interface ClientSnackbarProviderProps {
    children: ReactNode;
}

export default function ClientSnackbarProvider({
    children,
}: ClientSnackbarProviderProps) {
    return <SnackbarProvider maxSnack={3}>{children}</SnackbarProvider>;
}
