import AuthGuard from '@/components/AuthGuard';
import ClientSnackbarProvider from '@/components/ClientSnackbarProvider';
import ClientThemenProvider from '@/components/ClientThemenProvider';
import HealthCheckPoller from '@/components/HealthCheckPoller';

export const metadata = {
  title: 'nine to shine',
  description: 'this group has a name now :)',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body>
        <ClientThemenProvider>
          <ClientSnackbarProvider>
            <HealthCheckPoller />
            <AuthGuard>{children}</AuthGuard>
          </ClientSnackbarProvider>
        </ClientThemenProvider>
      </body>
    </html>
  );
}
