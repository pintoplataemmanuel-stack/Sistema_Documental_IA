import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) return;
    // Valida el token al recargar pidiendo el perfil
    api
      .get('/auth/profile')
      .then((profile) => {
        setUser(profile);
        localStorage.setItem(USER_KEY, JSON.stringify(profile));
      })
      .catch(() => logout());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function persist(tokenValue, userValue) {
    localStorage.setItem(TOKEN_KEY, tokenValue);
    localStorage.setItem(USER_KEY, JSON.stringify(userValue));
    setToken(tokenValue);
    setUser(userValue);
    setError(null);
  }

  async function login(credentials) {
    setLoading(true);
    setError(null);
    try {
      const data = await api.post('/auth/login', credentials);
      persist(data.token, { _id: data._id, name: data.name, email: data.email, role: data.role });
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function register(credentials) {
    setLoading(true);
    setError(null);
    try {
      const data = await api.post('/auth/register', credentials);
      persist(data.token, { _id: data._id, name: data.name, email: data.email, role: data.role });
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
    setError(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, error, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}

export default AuthContext;