import { useState, useCallback, useEffect } from 'react';
import type { SastriaUser } from '@/types';
import { authLogin } from '@/lib/api';

export function useAuth() {
  const [user, setUser] = useState<SastriaUser | null>(() => {
    try {
      const stored = localStorage.getItem('sastria_user');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });

  const [jwt, setJwt] = useState<string | null>(() => localStorage.getItem('sastria_jwt'));
  const isAuthenticated = !!jwt && !!user;
  const isAdmin = user?.persona === 'GlobalAdmin' || user?.persona === 'Admin';
  const isGlobalAdmin = user?.persona === 'GlobalAdmin';

  const login = useCallback(async (email: string, password: string) => {
    const data = await authLogin(email, password);
    if (data.ok) {
      localStorage.setItem('sastria_jwt', data.token);
      localStorage.setItem('sastria_user', JSON.stringify(data.user));
      setJwt(data.token);
      setUser(data.user);
      return { ok: true };
    }
    return { ok: false, error: data.message || 'Login falhou' };
  }, []);

  const logout = useCallback(() => {
    localStorage.clear();
    setJwt(null);
    setUser(null);
  }, []);

  useEffect(() => {
    const handleStorage = () => {
      const t = localStorage.getItem('sastria_jwt');
      const u = localStorage.getItem('sastria_user');
      setJwt(t);
      try { setUser(u ? JSON.parse(u) : null); } catch { setUser(null); }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return { user, jwt, isAuthenticated, isAdmin, isGlobalAdmin, login, logout };
}
