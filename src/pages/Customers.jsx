import React, { useContext, useMemo, useState } from 'react';
import { CheckCircle2, Edit, Plus, Search, ToggleLeft, ToggleRight, X } from 'lucide-react';
import { StoreContext } from '../context/StoreContext';
import { AuthContext } from '../context/AuthContext';

const initialCustomerForm = {
  fullName: '',
  phone: '',
  email: '',
  loyaltyTier: 'Standard',
  discountPercent: 0,
  notes: '',
  status: 'Active',
};

export const Customers = () => {
  const { customers, createCustomer, updateCustomer, updateCustomerStatus } = useContext(StoreContext);
  const { user } = useContext(AuthContext);
  const canManageCustomers = ['admin', 'manager'].includes(user?.role);
  const canCreateCustomers = ['admin', 'manager', 'cashier', 'salesperson', 'staff'].includes(user?.role);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState(initialCustomerForm);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const filteredCustomers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return customers;
    return customers.filter((customer) =>
      `${customer.fullName} ${customer.phone || ''} ${customer.email || ''} ${customer.loyaltyTier || ''}`.toLowerCase().includes(query)
    );
  }, [customers, searchTerm]);

  const openCreate = () => {
    setFormData(initialCustomerForm);
    setEditId(null);
    setIsEditing(false);
    setErrorMsg('');
    setShowModal(true);
  };

  const openEdit = (customer) => {
    setFormData({
      fullName: customer.fullName,
      phone: customer.phone || '',
      email: customer.email || '',
      loyaltyTier: customer.loyaltyTier || 'Standard',
      discountPercent: customer.discountPercent || 0,
      notes: customer.notes || '',
      status: customer.status || 'Active',
    });
    setEditId(customer.id);
    setIsEditing(true);
    setErrorMsg('');
    setShowModal(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const result = isEditing
      ? await updateCustomer(editId, formData)
      : await createCustomer(formData);

    if (!result.success) {
      setErrorMsg(result.error || 'Could not save customer.');
      return;
    }

    setShowModal(false);
    setSuccessMsg(isEditing ? 'Customer updated.' : 'Customer created.');
  };

  const handleStatusToggle = async (customer) => {
    setErrorMsg('');
    setSuccessMsg('');
    const nextStatus = customer.status === 'Active' ? 'Inactive' : 'Active';
    const result = await updateCustomerStatus(customer.id, nextStatus);
    if (!result.success) {
      setErrorMsg(result.error || 'Could not update customer status.');
      return;
    }
    setSuccessMsg(`Customer marked as ${nextStatus}.`);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ marginBottom: '0.35rem' }}>Loyal Customers</h1>
          <p className="page-subtitle">Manage loyal customers, discounts, and purchase relationships.</p>
        </div>
        {canCreateCustomers && (
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={18} /> Add Customer
          </button>
        )}
      </div>

      {successMsg && <div className="inline-alert inline-alert-success"><CheckCircle2 size={18} /> {successMsg}</div>}
      {errorMsg && <div className="inline-alert inline-alert-danger">{errorMsg}</div>}

      <div className="card">
        <div className="search-input">
          <Search size={18} />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search customers by name, phone, email, or loyalty tier..."
          />
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Tier</th>
                <th>Discount</th>
                <th>Sales</th>
                <th>Status</th>
                {canManageCustomers && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer) => (
                <tr key={customer.id}>
                  <td style={{ fontWeight: 600 }}>{customer.fullName}</td>
                  <td>{customer.phone || '-'}</td>
                  <td>{customer.email || '-'}</td>
                  <td><span className="badge badge-primary">{customer.loyaltyTier}</span></td>
                  <td>{customer.discountPercent || 0}%</td>
                  <td>{customer._count?.sales || 0}</td>
                  <td>
                    <span className={`badge ${customer.status === 'Active' ? 'badge-success' : 'badge-danger'}`}>
                      {customer.status}
                    </span>
                  </td>
                  {canManageCustomers && (
                    <td>
                      <div className="row-actions">
                        <button className="btn btn-ghost compact-btn" onClick={() => openEdit(customer)} title="Edit customer">
                          <Edit size={16} />
                        </button>
                        <button className="btn btn-ghost compact-btn" onClick={() => handleStatusToggle(customer)} title="Change customer status">
                          {customer.status === 'Active' ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={canManageCustomers ? 8 : 7} style={{ textAlign: 'center', padding: '2rem' }}>
                    No customers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <h2>{isEditing ? 'Edit Customer' : 'Add Customer'}</h2>
                <p>Set contact details and loyalty discount.</p>
              </div>
              <button className="icon-button" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>

            {errorMsg && <div className="inline-alert inline-alert-danger">{errorMsg}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Customer Name *</label>
                <input className="form-input" required value={formData.fullName} onChange={(event) => setFormData({ ...formData, fullName: event.target.value })} />
              </div>

              <div className="receive-grid">
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" value={formData.phone} onChange={(event) => setFormData({ ...formData, phone: event.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input type="email" className="form-input" value={formData.email} onChange={(event) => setFormData({ ...formData, email: event.target.value })} />
                </div>
              </div>

              <div className="receive-grid">
                <div className="form-group">
                  <label className="form-label">Loyalty Tier</label>
                  <select className="form-input" value={formData.loyaltyTier} onChange={(event) => setFormData({ ...formData, loyaltyTier: event.target.value })}>
                    <option value="Standard">Standard</option>
                    <option value="Silver">Silver</option>
                    <option value="Gold">Gold</option>
                    <option value="VIP">VIP</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Discount %</label>
                  <input type="number" min="0" max="100" step="0.01" className="form-input" value={formData.discountPercent} onChange={(event) => setFormData({ ...formData, discountPercent: event.target.value })} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-input" rows="3" value={formData.notes} onChange={(event) => setFormData({ ...formData, notes: event.target.value })}></textarea>
              </div>

              {canManageCustomers && (
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-input" value={formData.status} onChange={(event) => setFormData({ ...formData, status: event.target.value })}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{isEditing ? 'Save Changes' : 'Create Customer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
