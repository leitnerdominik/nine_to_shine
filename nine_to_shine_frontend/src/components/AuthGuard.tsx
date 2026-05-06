'use client';

import React, { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import LoadingSkeleton from './LoadingSkeleton';
import { usePathname, useRouter } from 'next/navigation';
import { routes, unprotectedRoutes } from '@/common/routes';
import Layout from './Layout';

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isRouteUnprotected = unprotectedRoutes.includes(pathname);

  useEffect(() => {
    if (!loading && !user && !isRouteUnprotected) {
      router.push(routes.login); // Redirect to login if not authenticated
    }
  }, [user, loading, isRouteUnprotected, router]);

  // Prevent rendering any content while checking authentication
  if (loading || (!isRouteUnprotected && !user)) {
    return (
      <Layout>
        <LoadingSkeleton />
      </Layout>
    );
  }

  return <>{children}</>;
};

export default AuthGuard;
