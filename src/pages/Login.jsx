import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { ShieldCheck } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const Login = () => {
  const { login } = useContext(AuthContext);
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
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-bg)' }}>
      <div className="card" style={{ width: '400px', padding: '3rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img src="/logo.png" alt="Soul to Soul Logo" style={{ width: 64, height: 64, borderRadius: '8px', objectFit: 'cover', marginBottom: '1rem' }} />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--color-primary)' }}>Soul to Soul ERP</h1>
          <p style={{ color: 'var(--color-charcoal-light)', fontSize: '0.875rem', marginTop: '0.25rem' }}>Secure Administrator Login</p>
        </div>

        {errorMsg && (
          <div style={{ width: '100%', backgroundColor: 'rgba(217,83,79,0.1)', color: 'var(--color-danger)', padding: '0.75rem', borderRadius: '4px', marginBottom: '1.5rem', textAlign: 'center', fontSize: '0.875rem' }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <div className="form-group">
            <label style={{ fontSize: '0.875rem' }}>Email Address</label>
            <input 
              type="email" 
              className="form-input" 
              required 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              disabled={loading}
            />
          </div>
          <div className="form-group" style={{ marginBottom: '2rem' }}>
            <label style={{ fontSize: '0.875rem' }}>Password</label>
            <input 
              type="password" 
              className="form-input" 
              required 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              disabled={loading}
            />
          </div>
          
          <button type="submit" className="btn btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: '0.75rem' }} disabled={loading}>
            {loading ? 'Authenticating...' : <><ShieldCheck size={18} /> Authenticate</>}
          </button>
        </form>
      </div>
    </div>
  );
};
