import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { StoreContext } from '../context/StoreContext';
import { Plus, X, Edit, UserCheck, UserX, ShieldAlert, KeyRound, Phone, AtSign, CheckCircle2, AlertTriangle } from 'lucide-react';
import { ROLE_PROFILES, getRoleProfile } from '../config/roles';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const initialFormData = {
  fullName: '',
  email: '',
  username: '',
  phone: '',
  employeeId: '',
  password: '',
  role: 'salesperson',
  status: 'active',
  mustChangePassword: false
};

export const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [editId, setEditId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [toast, setToast] = useState(null);
  const [showReset, setShowReset] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const { token, logout } = useContext(AuthContext);
  const { employees } = useContext(StoreContext);
  const selectedRoleProfile = getRoleProfile(formData.role);

  const notify = (type, message) => {
    setToast({ type, message });
    window.clearTimeout(notify.timer);
    notify.timer = window.setTimeout(() => setToast(null), 4200);
  };

  const fetchWithAuth = async (url, options = {}) => {
    const headers = { ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) { logout(); throw new Error("Session Expired"); }
    return res;
  };

  const fetchUsers = async () => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/users`);
      const data = await res.json();
      setUsers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openCreate = () => {
    setFormData(initialFormData);
    setEditId(null);
    setIsEditing(false);
    setErrorMsg('');
    setShowReset(false);
    setResetPassword('');
    setShowModal(true);
  };

  const openEdit = (user) => {
    setFormData({
      fullName: user.fullName,
      email: user.email || '',
      username: user.username || '',
      phone: user.phone || '',
      employeeId: user.employeeId || '',
      password: '',
      role: user.role,
      status: user.status,
      mustChangePassword: Boolean(user.mustChangePassword)
    });
    setEditId(user.id);
    setIsEditing(true);
    setErrorMsg('');
    setShowReset(false);
    setResetPassword('');
    setShowModal(true);
  };

  const selectEmployee = (employeeId) => {
    const employee = employees.find((item) => String(item.id) === String(employeeId));
    setFormData((current) => ({
      ...current,
      employeeId,
      fullName: employee?.fullName || current.fullName,
      email: employee?.email || current.email,
      phone: employee?.phone || current.phone,
      username: current.username || (employee?.fullName || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '.')
        .replace(/^\.|\.$/g, ''),
    }));
  };

  const handleStatusToggle = async (id, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/users/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) {
        const data = await res.json();
        notify('error', data.message || 'Failed to update user status');
        return;
      }
      fetchUsers();
      notify('success', `User ${newStatus === 'active' ? 'reactivated' : 'deactivated'}.`);
    } catch {
      notify('error', 'Could not connect to the server. Check your internet/API connection.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.email && !formData.username && !formData.phone) {
      setErrorMsg('Add at least one login option: email, username, or phone.');
      return;
    }

    if (!isEditing && (!formData.password || formData.password.length < 6)) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    if (isEditing && formData.password && formData.password.length < 6) {
      setErrorMsg('Password must be at least 6 characters if you choose to change it.');
      return;
    }

    try {
      let res;
      if (isEditing) {
        res = await fetchWithAuth(`${API_BASE}/api/users/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        
        // Handle Role if changed, normally would split this to prevent partial failures, but we apply sequentially here.
        const targetUser = users.find(u => u.id === editId);
        if (res.ok && targetUser && targetUser.role !== formData.role) {
           const roleRes = await fetchWithAuth(`${API_BASE}/api/users/${editId}/role`, {
             method: 'PATCH',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ role: formData.role })
           });
           if (!roleRes.ok) throw await roleRes.json();
        }
      } else {
        res = await fetchWithAuth(`${API_BASE}/api/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      }

      const data = await res.json();
      if (!res.ok) throw data;

      setShowModal(false);
      fetchUsers();
      notify('success', isEditing ? 'User updated successfully.' : 'User created successfully.');
    } catch (e) {
      setErrorMsg(e.message || 'Failed to save user.');
      notify('error', e.message || 'Failed to save user.');
    }
  };

  const handleResetPassword = async () => {
    setErrorMsg('');
    if (!resetPassword || resetPassword.length < 6) {
      setErrorMsg('Temporary password must be at least 6 characters.');
      return;
    }
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/users/${editId}/reset-password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: resetPassword,
          mustChangePassword: formData.mustChangePassword,
        })
      });
      const data = await res.json();
      if (!res.ok) throw data;
      setResetPassword('');
      setShowReset(false);
      fetchUsers();
      notify('success', 'Password reset successfully.');
    } catch (e) {
      setErrorMsg(e.message || 'Could not reset password.');
      notify('error', e.message || 'Could not reset password.');
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading Users...</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title" style={{ marginBottom: 0 }}>User Administration</h1>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={18} />
          New User
        </button>
      </div>

      {toast && (
        <div className={`toast-popup ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`}>
          {toast.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          {toast.message}
        </div>
      )}

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Login IDs</th>
                <th>Role</th>
                <th>Status</th>
                <th>Password Rule</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} style={{ opacity: user.status === 'inactive' ? 0.6 : 1 }}>
                  <td style={{ fontWeight: 500 }}>
                    {user.fullName}
                  </td>
                  <td style={{ color: 'var(--color-charcoal-light)' }}>
                    <div className="user-id-stack">
                      {user.email && <span><AtSign size={13} /> {user.email}</span>}
                      {user.username && <span><AtSign size={13} /> {user.username}</span>}
                      {user.phone && <span><Phone size={13} /> {user.phone}</span>}
                    </div>
                  </td>
                  <td>
                    <span className="badge" style={{ 
                      backgroundColor: user.role === 'admin' ? 'rgba(217, 83, 79, 0.1)' : 'var(--color-bg)',
                      color: user.role === 'admin' ? 'var(--color-danger)' : 'inherit'
                    }}>
                      {user.role === 'admin' ? <ShieldAlert size={12} style={{marginRight: '4px'}} /> : null}
                      {getRoleProfile(user.role).label}
                    </span>
                  </td>
                  <td>
                    <span className={user.status === 'active' ? 'badge badge-success' : 'badge badge-warning'}>
                      {user.status}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${user.mustChangePassword ? 'badge-warning' : 'badge-success'}`}>
                      {user.mustChangePassword ? 'Must change' : 'Normal'}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.875rem' }}>
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                       <button className="btn btn-ghost" style={{ padding: '0.25rem 0.5rem' }} onClick={() => openEdit(user)}>
                         <Edit size={16} />
                       </button>
                       <button 
                         className="btn btn-ghost" 
                         style={{ padding: '0.25rem 0.5rem', color: user.status === 'active' ? 'var(--color-warning)' : 'var(--color-success)' }} 
                         onClick={() => handleStatusToggle(user.id, user.status)}
                         title={user.status === 'active' ? 'Deactivate User' : 'Reactivate User'}
                       >
                         {user.status === 'active' ? <UserX size={16} /> : <UserCheck size={16} />}
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>No users found. System may need to be initialized.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="legacy-modal-backdrop" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, 
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="card legacy-modal-card legacy-modal-card-sm">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{isEditing ? 'Edit User' : 'Create System User'}</h2>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>

            {errorMsg && (
              <div style={{ backgroundColor: 'rgba(217,83,79,0.1)', color: 'var(--color-danger)', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Use existing worker</label>
                  <select className="form-input" value={formData.employeeId} onChange={e => selectEmployee(e.target.value)}>
                    <option value="">Create manually</option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>{employee.fullName} {employee.phone ? `- ${employee.phone}` : ''}</option>
                    ))}
                  </select>
                  <small style={{ color: 'var(--color-charcoal-light)' }}>Selecting a worker fills name, phone and email when available.</small>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Full Name *</label>
                  <input type="text" className="form-input" required value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
                </div>
                
                <div className="form-grid-2">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Email Address</label>
                    <input type="email" className="form-input" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Username</label>
                    <input className="form-input" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} placeholder="ex: maria.baia" />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Phone Number</label>
                  <input className="form-input" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="+258 84..." />
                </div>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>{isEditing ? 'New Password (Optional)' : 'Secure Password *'}</label>
                  <div style={{ position: 'relative' }}>
                    <KeyRound size={16} style={{ position: 'absolute', top: '10px', left: '10px', color: 'var(--color-charcoal-light)' }} />
                    <input type={isEditing ? 'password' : 'text'} className="form-input" style={{ paddingLeft: '34px' }} placeholder={isEditing ? "Leave blank to keep unchanged" : "min. 6 characters"} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                  </div>
                </div>

                <label className="checkbox-line">
                  <input type="checkbox" checked={formData.mustChangePassword} onChange={e => setFormData({...formData, mustChangePassword: e.target.checked})} />
                  User must change password after login/reset
                </label>

                {isEditing && (
                  <div className="reset-password-box">
                    <button className="btn btn-secondary" type="button" onClick={() => setShowReset((value) => !value)}>
                      <KeyRound size={16} /> Reset Password
                    </button>
                    {showReset && (
                      <div className="form-grid-2" style={{ marginTop: '0.75rem' }}>
                        <input className="form-input" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} placeholder="Temporary password" />
                        <button className="btn btn-primary" type="button" onClick={handleResetPassword}>Apply Reset</button>
                      </div>
                    )}
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>User Profile / Access Level</label>
                  <select className="form-input" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                    {Object.entries(ROLE_PROFILES).filter(([role]) => role !== 'staff').map(([role, profile]) => (
                      <option key={role} value={role}>{profile.label}</option>
                    ))}
                  </select>
                </div>

                <div className="role-profile-card">
                  <strong>{selectedRoleProfile.label}</strong>
                  <p>{selectedRoleProfile.description}</p>
                  <div className="permission-chip-list">
                    {selectedRoleProfile.privileges.map((privilege) => (
                      <span key={privilege}>{privilege}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: '2rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{isEditing ? 'Save Changes' : 'Create User'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
