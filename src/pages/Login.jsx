import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import { AlertCircle, ArrowRight, Eye, EyeOff, LockKeyhole, Mail, Moon, Sun } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const Login = () => {
  const { login, theme, setTheme } = useContext(AuthContext);
  const { language, setLanguage, t } = useContext(LanguageContext);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Invalid email or password');
      }

      login(data.access_token, data.user);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-shell">
      <section className="login-form-panel" aria-label="Sign in">
        <div className="login-card">
          <img className="login-logo" src="/logo.png" alt="Soul to Soul" />
          <select className="language-select login-language" value={language} onChange={(event) => setLanguage(event.target.value)} aria-label="Language">
            <option value="en">EN</option>
            <option value="pt">PT</option>
          </select>
          <button
            className="theme-toggle login-theme-toggle"
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>

          {errorMsg && (
            <div className="login-alert" role="alert">
              <AlertCircle size={18} />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <label className="field-label" htmlFor="identifier">{t.loginIdentifier}</label>
            <div className="input-shell">
              <Mail size={18} />
              <input
                id="identifier"
                type="text"
                autoComplete="username"
                required
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                disabled={loading}
                placeholder="admin@soultosoul.local / admin / +258..."
              />
            </div>

            <label className="field-label" htmlFor="password">{t.password}</label>
            <div className="input-shell">
              <LockKeyhole size={18} />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={loading}
                placeholder="Enter your password"
              />
              <button className="password-eye" type="button" onClick={() => setShowPassword((value) => !value)} aria-label="Show password">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <button type="submit" className="btn btn-primary login-submit" disabled={loading}>
              <span>{loading ? t.authenticating : t.signInSecurely}</span>
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <p className="login-footnote">System by Layton Taimo. All rights reserved.</p>
        </div>
      </section>
    </main>
  );
};
