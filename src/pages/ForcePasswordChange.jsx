import React, { useContext, useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound, LogOut, ShieldCheck } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const ForcePasswordChange = () => {
  const { token, user, logout, updateSession } = useContext(AuthContext);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (newPassword.length < 6) {
      setErrorMsg('A nova password deve ter pelo menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('A confirmacao da nova password nao coincide.');
      return;
    }
    if (currentPassword === newPassword) {
      setErrorMsg('A nova password deve ser diferente da password temporaria.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Nao foi possivel alterar a password.');
      }

      setSuccessMsg('Password alterada com sucesso. A abrir a app...');
      updateSession(data.access_token, data.user);
    } catch (error) {
      setErrorMsg(error.message || 'Nao foi possivel alterar a password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="password-gate-shell">
      <section className="password-gate-card">
        <img src="/logo.png" alt="Soul2Soul" />
        <span className="store-kicker"><ShieldCheck size={16} /> Seguranca da conta</span>
        <h1>Precisa alterar a password</h1>
        <p>
          Ola, {user?.fullName || 'utilizador'}. Esta conta esta com uma password temporaria.
          Para continuar a usar a app, defina uma password nova.
        </p>

        {errorMsg && <div className="login-alert"><AlertCircle size={18} /> {errorMsg}</div>}
        {successMsg && <div className="inline-alert inline-alert-success"><CheckCircle2 size={18} /> {successMsg}</div>}

        <form className="password-gate-form" onSubmit={handleSubmit}>
          <label className="field-label" htmlFor="current-password">Password atual/temporaria</label>
          <div className="input-shell">
            <KeyRound size={18} />
            <input
              id="current-password"
              type={showPasswords ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </div>

          <label className="field-label" htmlFor="new-password">Nova password</label>
          <div className="input-shell">
            <KeyRound size={18} />
            <input
              id="new-password"
              type={showPasswords ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </div>

          <label className="field-label" htmlFor="confirm-password">Confirmar nova password</label>
          <div className="input-shell">
            <KeyRound size={18} />
            <input
              id="confirm-password"
              type={showPasswords ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
            <button className="password-eye" type="button" onClick={() => setShowPasswords((value) => !value)} aria-label="Mostrar passwords">
              {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <button className="btn btn-primary login-submit" type="submit" disabled={submitting}>
            {submitting ? 'A guardar...' : 'Alterar password e continuar'}
          </button>
          <button className="btn btn-ghost" type="button" onClick={logout}>
            <LogOut size={18} /> Sair
          </button>
        </form>
      </section>
    </main>
  );
};
