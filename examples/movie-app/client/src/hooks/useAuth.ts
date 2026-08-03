import { useState, useCallback } from 'react';
import type { User } from '../App';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

  const api = useCallback(async (path: string, options?: RequestInit) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(path, { ...options, headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }, [token]);

  const checkAuth = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api('/api/auth/me');
      setUser(data.user);
    } catch {
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
    }
  }, [token, api]);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const data = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      }).then(r => r.json());

      if (data.error) return false;

      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser(data.user);
      return true;
    } catch {
      return false;
    }
  };

  const register = async (username: string, email: string, password: string): Promise<boolean> => {
    try {
      const data = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      }).then(r => r.json());

      if (data.error) return false;

      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser(data.user);
      return true;
    } catch {
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return { user, token, login, register, logout, checkAuth };
}
