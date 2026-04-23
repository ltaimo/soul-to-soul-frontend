import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Plus, X, Edit, UserCheck, UserX, Shield, ShieldAlert, KeyRound } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const initialFormData = {
  fullName: '',
  email: '',
  password: '',
  role: 'staff',
  status: 'active'
};

export const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [editId, setEditId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const { token, logout } = useContext(AuthContext);

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
    setShowModal(true);
  };

  const openEdit = (user) => {
    setFormData({
      fullName: user.fullName,
      email: user.email,
      password: '', // Hidden by default, only supplied if changing
      role: user.role,
      status: user.status
    });
    setEditId(user.id);
    setIsEditing(true);
    setErrorMsg('');
    setShowModal(true);
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
        alert(`Error: ${data.message || 'Failed to update user status'}`);
        return;
      }
      fetchUsers();
    } catch (e) {
      alert("Failed to connect to the server.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

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
    } catch (e) {
      setErrorMsg(e.message || 'Failed to save user.');
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading Users...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>User Administration</h1>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={18} />
          New User
        </button>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email / Username</th>
                <th>Role</th>
                <th>Status</th>
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
                    {user.email}
                  </td>
                  <td>
                    <span className="badge" style={{ 
                      backgroundColor: user.role === 'admin' ? 'rgba(217, 83, 79, 0.1)' : 'var(--color-bg)',
                      color: user.role === 'admin' ? 'var(--color-danger)' : 'inherit'
                    }}>
                      {user.role === 'admin' ? <ShieldAlert size={12} style={{marginRight: '4px'}} /> : null}
                      {user.role}
                    </span>
                  </td>
                  <td>
                    <span className={user.status === 'active' ? 'badge badge-success' : 'badge badge-warning'}>
                      {user.status}
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
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>No users found. System may need to be initialized.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, 
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="card" style={{ width: '450px' }}>
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
                  <label>Full Name *</label>
                  <input type="text" className="form-input" required value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
                </div>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Email Address *</label>
                  <input type="email" className="form-input" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} disabled={isEditing} />
                  {isEditing && <small style={{ color: 'var(--color-charcoal-light)' }}>Email identifiers cannot be reassigned natively after creation.</small>}
                </div>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>{isEditing ? 'New Password (Optional)' : 'Secure Password *'}</label>
                  <div style={{ position: 'relative' }}>
                    <KeyRound size={16} style={{ position: 'absolute', top: '10px', left: '10px', color: 'var(--color-charcoal-light)' }} />
                    <input type={isEditing ? 'password' : 'text'} className="form-input" style={{ paddingLeft: '34px' }} placeholder={isEditing ? "Leave blank to keep unchanged" : "min. 6 characters"} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>System Role</label>
                  <select className="form-input" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                    <option value="admin">Administrator</option>
                    <option value="manager">Manager</option>
                    <option value="staff">Staff</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
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
