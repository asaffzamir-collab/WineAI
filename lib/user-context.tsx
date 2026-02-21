'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

export type Gender = 'male' | 'female' | 'non-binary' | 'prefer-not-to-say';

interface UserContextValue {
  gender: Gender;
  displayName: string | null;
  profileCompleted: boolean;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const UserContext = createContext<UserContextValue>({
  gender: 'male',
  displayName: null,
  profileCompleted: false,
  isLoading: true,
  refresh: async () => {},
});

export function useUser() {
  return useContext(UserContext);
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [gender, setGender] = useState<Gender>('male');
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [profileCompleted, setProfileCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/me', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      const g = data.gender as Gender | null;
      if (g && g !== 'prefer-not-to-say' && g !== 'non-binary') {
        setGender(g);
      } else {
        setGender('male');
      }
      setDisplayName(data.displayName ?? null);
      setProfileCompleted(data.profileCompleted ?? false);
    } catch {
      // keep defaults
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <UserContext.Provider value={{ gender, displayName, profileCompleted, isLoading, refresh }}>
      {children}
    </UserContext.Provider>
  );
}
