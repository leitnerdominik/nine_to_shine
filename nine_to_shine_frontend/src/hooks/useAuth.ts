import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { getFirebaseAuth } from '../../firebase';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    try {
      unsubscribe = onAuthStateChanged(getFirebaseAuth(), (user) => {
        setUser(user ?? null);
        setLoading(false);
      });
    } catch {
      setUser(null);
      setLoading(false);
    }

    return () => unsubscribe?.();
  }, []);

  return { user, loading };
};
