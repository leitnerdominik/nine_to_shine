'use client';

import { api } from '@/definitions/api';
import { useSnackbar } from 'notistack';
import { useEffect } from 'react';

const POLL_INTERVAL_MS = 60000; // 60 seconds

export default function HealthCheckPoller() {
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await api.get('/health');
        if (res.status !== 200) {
          enqueueSnackbar('Keine Verbindung zum Server', { variant: 'error' });
          console.error('Health check failed with status:', res.status);
        } else {
          console.log('Health check successful');
        }
      } catch (error) {
        enqueueSnackbar('Keine Verbindung zum Server', { variant: 'error' });
        console.error('Health check failed:', error);
      }
    };

    // Initial check
    checkHealth();

    const intervalId = setInterval(checkHealth, POLL_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [enqueueSnackbar]);

  return null;
}
