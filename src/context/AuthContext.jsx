import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('soul_token');
    const storedUser = localStorage.getItem('soul_user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse user session", e);
      }
    }
    setLoading(false);
  }, []);

  const login = (accessToken, userData) => {
    localStorage.setItem('soul_token', accessToken);
    localStorage.setItem('soul_user', JSON.stringify(userData));
    setToken(accessToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('soul_token');
    localStorage.removeItem('soul_user');
    setToken(null);
    setUser(null);
  };

  if (loading) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading Session...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
