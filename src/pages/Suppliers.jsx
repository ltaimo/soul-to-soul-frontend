import React, { useContext, useMemo, useState } from 'react';
import { StoreContext } from '../context/StoreContext';
import { CheckCircle2, Edit, Plus, Search, ToggleLeft, ToggleRight, X } from 'lucide-react';

const initialSupplierForm = {
  name: '',
  category: '',
  leadTime: '',
  status: 'Active',
};

export const Suppliers = () => {
  const { suppliers, createSupplier, updateSupplier, updateSupplierStatus } = useContext(StoreContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState(initialSupplierForm);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const filteredSuppliers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return suppliers;
    return suppliers.filter((supplier) =>
      supplier.name.toLowerCase().includes(query) ||
      supplier.category.toLowerCase().includes(query) ||
      supplier.leadTime.toLowerCase().includes(query)
    );
  }, [suppliers, searchTerm]);

  const openCreate = () => {
    setFormData(initialSupplierForm);
    setEditId(null);
    setIsEditing(false);
    setErrorMsg('');
    setShowModal(true);
  };

  const openEdit = (supplier) => {
    setFormData({
      name: supplier.name,
      category: supplier.category || '',
      leadTime: supplier.leadTime || '',
      status: supplier.status || 'Active',
    });
    setEditId(supplier.id);
    setIsEditing(true);
    setErrorMsg('');
    setShowModal(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const payload = {
      ...formData,
      category: formData.category || 'General',
      leadTime: formData.leadTime || 'Not set',
    };

    const result = isEditing
      ? await updateSupplier(editId, payload)
      : await createSupplier(payload);

    if (!result.success) {
      setErrorMsg(result.error || 'Could not save supplier.');
      return;
    }

    setShowModal(false);
    setSuccessMsg(isEditing ? 'Supplier updated.' : 'Supplier created.');
  };

  const handleStatusToggle = async (supplier) => {
    setErrorMsg('');
    setSuccessMsg('');
    const nextStatus = supplier.status === 'Active' ? 'Inactive' : 'Active';
    const result = await updateSupplierStatus(supplier.id, nextStatus);
    if (!result.success) {
      setErrorMsg(result.error || 'Could not update supplier status.');
      return;
    }
    setSuccessMsg(`Supplier marked as ${nextStatus}.`);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ marginBottom: '0.35rem' }}>Suppliers Directory</h1>
          <p className="page-subtitle">Manage vendor records used by products and stock receiving.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={18} /> Add Supplier
        </button>
      </div>

      {successMsg && (
        <div className="inline-alert inline-alert-success">
          <CheckCircle2 size={18} /> {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="inline-alert inline-alert-danger">
          {errorMsg}
        </div>
      )}

      <div className="card">
        <div className="search-input">
          <Search size={18} />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search suppliers by name, category, or lead time..."
          />
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Supplier Name</th>
                <th>Category Focus</th>
                <th>Standard Lead Time</th>
                <th>Products</th>
                <th>Purchases</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSuppliers.map((supplier) => (
                <tr key={supplier.id}>
                  <td style={{ fontWeight: 600 }}>{supplier.name}</td>
                  <td><span className="badge badge-primary">{supplier.category}</span></td>
                  <td>{supplier.leadTime}</td>
                  <td>{supplier._count?.products || 0}</td>
                  <td>{supplier._count?.purchases || 0}</td>
                  <td>
                    <span className={`badge ${supplier.status === 'Active' ? 'badge-success' : 'badge-danger'}`}>
                      {supplier.status}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="btn btn-ghost compact-btn" onClick={() => openEdit(supplier)} title="Edit supplier">
                        <Edit size={16} />
                      </button>
                      <button
                        className="btn btn-ghost compact-btn"
                        onClick={() => handleStatusToggle(supplier)}
                        title={supplier.status === 'Active' ? 'Deactivate supplier' : 'Reactivate supplier'}
                      >
                        {supplier.status === 'Active' ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredSuppliers.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                    No suppliers found.
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
                <h2>{isEditing ? 'Edit Supplier' : 'Add Supplier'}</h2>
                <p>Keep supplier details simple and practical for purchasing.</p>
              </div>
              <button className="icon-button" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>

            {errorMsg && (
              <div className="inline-alert inline-alert-danger">{errorMsg}</div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Supplier Name *</label>
                <input
                  className="form-input"
                  required
                  value={formData.name}
                  onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                />
              </div>

              <div className="receive-grid">
                <div className="form-group">
                  <label className="form-label">Category Focus</label>
                  <input
                    className="form-input"
                    placeholder="Oils, Packaging, Ingredients..."
                    value={formData.category}
                    onChange={(event) => setFormData({ ...formData, category: event.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Standard Lead Time</label>
                  <input
                    className="form-input"
                    placeholder="e.g. 7 days"
                    value={formData.leadTime}
                    onChange={(event) => setFormData({ ...formData, leadTime: event.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  className="form-input"
                  value={formData.status}
                  onChange={(event) => setFormData({ ...formData, status: event.target.value })}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{isEditing ? 'Save Changes' : 'Create Supplier'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
