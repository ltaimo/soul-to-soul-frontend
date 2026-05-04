import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import { AlertCircle, ArrowRight, LockKeyhole, Mail } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const Login = () => {
  const { login } = useContext(AuthContext);
  const { language, setLanguage, t } = useContext(LanguageContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
        body: JSON.stringify({ email, password })
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

          {errorMsg && (
            <div className="login-alert" role="alert">
              <AlertCircle size={18} />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <label className="field-label" htmlFor="email">{t.emailAddress}</label>
            <div className="input-shell">
              <Mail size={18} />
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={loading}
                placeholder="admin@soultosoul.local"
              />
            </div>

            <label className="field-label" htmlFor="password">{t.password}</label>
            <div className="input-shell">
              <LockKeyhole size={18} />
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={loading}
                placeholder="Enter your password"
              />
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
