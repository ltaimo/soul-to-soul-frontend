import React, { useContext, useMemo, useState } from 'react';
import { CheckCircle2, Edit, MessageCircle, Plus, Search, ToggleLeft, ToggleRight, X } from 'lucide-react';
import { StoreContext } from '../context/StoreContext';

const initialPartnerForm = {
  name: '',
  type: 'Seller',
  phone: '',
  email: '',
  commissionRate: 0,
  agreementType: 'Direct Sale',
  pricePolicy: 'Standard',
  priceAdjustment: 0,
  paymentTerms: '',
  settlementCycle: 'On Sale',
  creditLimit: 0,
  defaultSaleChannel: 'Store',
  trackingEnabled: false,
  warehouseId: '',
  notes: '',
  status: 'Active',
};

const agreementTypes = ['Direct Sale', 'Consignment', 'Hybrid'];
const pricePolicies = ['Standard', 'Discount Percent', 'Fixed Margin', 'Fixed Price'];
const settlementCycles = ['On Sale', 'Weekly', 'Monthly', 'On Delivery'];
const saleChannels = ['Store', 'Online', 'Order', 'Reseller'];

const normalizeWhatsAppNumber = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 9 && digits.startsWith('8')) return `258${digits}`;
  return digits;
};

const whatsappHref = (phone, message) => {
  const number = normalizeWhatsAppNumber(phone);
  if (!number) return '';
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
};

export const CommercialPartners = () => {
  const {
    commercialPartners,
    warehouses,
    createCommercialPartner,
    updateCommercialPartner,
    updateCommercialPartnerStatus,
  } = useContext(StoreContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState(initialPartnerForm);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const stats = useMemo(() => {
    const active = commercialPartners.filter((partner) => partner.status === 'Active');
    const commissionTotal = active.reduce((sum, partner) => sum + (Number(partner.commissionRate) || 0), 0);
    return {
      activeSellers: active.filter((partner) => partner.type === 'Seller').length,
      activeResellers: active.filter((partner) => partner.type === 'Reseller').length,
      consignmentPartners: active.filter((partner) => partner.agreementType === 'Consignment').length,
      averageCommission: active.length ? commissionTotal / active.length : 0,
    };
  }, [commercialPartners]);

  const filteredPartners = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return commercialPartners;
    return commercialPartners.filter((partner) =>
      `${partner.name} ${partner.type} ${partner.agreementType || ''} ${partner.phone || ''} ${partner.email || ''}`.toLowerCase().includes(query)
    );
  }, [commercialPartners, searchTerm]);

  const activeWarehouses = warehouses.filter((warehouse) => warehouse.status !== 'Inactive');

  const openCreate = () => {
    setFormData(initialPartnerForm);
    setEditId(null);
    setIsEditing(false);
    setErrorMsg('');
    setShowModal(true);
  };

  const openEdit = (partner) => {
    setFormData({
      name: partner.name || '',
      type: partner.type || 'Seller',
      phone: partner.phone || '',
      email: partner.email || '',
      commissionRate: partner.commissionRate || 0,
      agreementType: partner.agreementType || 'Direct Sale',
      pricePolicy: partner.pricePolicy || 'Standard',
      priceAdjustment: partner.priceAdjustment || 0,
      paymentTerms: partner.paymentTerms || '',
      settlementCycle: partner.settlementCycle || 'On Sale',
      creditLimit: partner.creditLimit || 0,
      defaultSaleChannel: partner.defaultSaleChannel || 'Store',
      trackingEnabled: Boolean(partner.trackingEnabled),
      warehouseId: partner.warehouseId || '',
      notes: partner.notes || '',
      status: partner.status || 'Active',
    });
    setEditId(partner.id);
    setIsEditing(true);
    setErrorMsg('');
    setShowModal(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const result = isEditing
      ? await updateCommercialPartner(editId, formData)
      : await createCommercialPartner(formData);

    if (!result.success) {
      setErrorMsg(result.error || 'Could not save seller/reseller.');
      return;
    }

    setShowModal(false);
    setSuccessMsg(isEditing ? 'Seller/reseller updated.' : 'Seller/reseller created.');
  };

  const handleStatusToggle = async (partner) => {
    setErrorMsg('');
    setSuccessMsg('');
    const nextStatus = partner.status === 'Active' ? 'Inactive' : 'Active';
    const result = await updateCommercialPartnerStatus(partner.id, nextStatus);
    if (!result.success) {
      setErrorMsg(result.error || 'Could not update status.');
      return;
    }
    setSuccessMsg(`${partner.name} marked as ${nextStatus}.`);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ marginBottom: '0.35rem' }}>Sellers & Resellers</h1>
          <p className="page-subtitle">Manage commercial partners, commissions, contacts and their link to POS sales.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={18} /> Add Partner
        </button>
      </div>

      {successMsg && <div className="inline-alert inline-alert-success"><CheckCircle2 size={18} /> {successMsg}</div>}
      {errorMsg && <div className="inline-alert inline-alert-danger">{errorMsg}</div>}

      <div className="stats-grid hr-stats-grid">
        <div className="stat-card">
          <div className="stat-label">Active Sellers</div>
          <div className="stat-value">{stats.activeSellers}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Resellers</div>
          <div className="stat-value">{stats.activeResellers}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Consignment Tracking</div>
          <div className="stat-value">{stats.consignmentPartners}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Average Commission</div>
          <div className="stat-value">{stats.averageCommission.toFixed(1)}%</div>
        </div>
      </div>

      <div className="card">
        <div className="search-input">
          <Search size={18} />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by name, type, phone, or email..."
          />
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Agreement</th>
                <th>Stock Location</th>
                <th>Commission</th>
                <th>Terms</th>
                <th>Sales</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPartners.map((partner) => (
                <tr key={partner.id}>
                  <td>
                    <strong>{partner.name}</strong>
                    <span className="table-muted">{partner.phone || partner.email || 'No contact'}{partner.email ? ` | ${partner.email}` : ''}</span>
                  </td>
                  <td><span className="badge badge-primary">{partner.type}</span></td>
                  <td>
                    {partner.agreementType || 'Direct Sale'}
                    <span className="table-muted">{partner.pricePolicy || 'Standard'}{Number(partner.priceAdjustment || 0) > 0 ? `: ${Number(partner.priceAdjustment).toFixed(2)}` : ''}</span>
                  </td>
                  <td>{partner.warehouse?.name || '-'}</td>
                  <td>{Number(partner.commissionRate || 0).toFixed(2)}%</td>
                  <td>
                    {partner.settlementCycle || 'On Sale'}
                    <span className="table-muted">{partner.trackingEnabled ? 'Tracking enabled' : 'No stock tracking'}</span>
                  </td>
                  <td>{partner._count?.sales || 0}</td>
                  <td>
                    <span className={`badge ${partner.status === 'Active' ? 'badge-success' : 'badge-danger'}`}>
                      {partner.status}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      {partner.phone && (
                        <a
                          className="btn btn-ghost compact-btn"
                          href={whatsappHref(partner.phone, `Bom dia ${partner.name}, mensagem da Soul2Soul.`)}
                          target="_blank"
                          rel="noreferrer"
                          title="Send WhatsApp"
                        >
                          <MessageCircle size={16} />
                        </a>
                      )}
                      <button className="btn btn-ghost compact-btn" onClick={() => openEdit(partner)} title="Edit partner">
                        <Edit size={16} />
                      </button>
                      <button
                        className="btn btn-ghost compact-btn"
                        onClick={() => handleStatusToggle(partner)}
                        title={partner.status === 'Active' ? 'Deactivate partner' : 'Reactivate partner'}
                      >
                        {partner.status === 'Active' ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPartners.length === 0 && (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '2rem' }}>No sellers or resellers found.</td>
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
                <h2>{isEditing ? 'Edit Partner' : 'Add Partner'}</h2>
                <p>Commission is applied automatically when this partner is selected during a sale.</p>
              </div>
              <button className="icon-button" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>

            {errorMsg && <div className="inline-alert inline-alert-danger">{errorMsg}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input
                  className="form-input"
                  required
                  value={formData.name}
                  onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                />
              </div>
              <div className="receive-grid">
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select
                    className="form-input"
                    value={formData.type}
                    onChange={(event) => setFormData({ ...formData, type: event.target.value })}
                  >
                    <option value="Seller">Seller</option>
                    <option value="Reseller">Reseller</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Commission Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    className="form-input"
                    value={formData.commissionRate}
                    onChange={(event) => setFormData({ ...formData, commissionRate: event.target.value })}
                  />
                </div>
              </div>
              <div className="receive-grid">
                <div className="form-group">
                  <label className="form-label">Agreement Type</label>
                  <select className="form-input" value={formData.agreementType} onChange={(event) => setFormData({ ...formData, agreementType: event.target.value })}>
                    {agreementTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                  <span className="field-help">Direct sale closes the deal immediately. Consignment keeps follow-up open until settlement.</span>
                </div>
                <div className="form-group">
                  <label className="form-label">Default Sale Channel</label>
                  <select className="form-input" value={formData.defaultSaleChannel} onChange={(event) => setFormData({ ...formData, defaultSaleChannel: event.target.value })}>
                    {saleChannels.map((channel) => <option key={channel} value={channel}>{channel}</option>)}
                  </select>
                </div>
              </div>
              <div className="receive-grid">
                <div className="form-group">
                  <label className="form-label">Price Policy</label>
                  <select className="form-input" value={formData.pricePolicy} onChange={(event) => setFormData({ ...formData, pricePolicy: event.target.value })}>
                    {pricePolicies.map((policy) => <option key={policy} value={policy}>{policy}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Policy Value</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="form-input"
                    value={formData.priceAdjustment}
                    onChange={(event) => setFormData({ ...formData, priceAdjustment: event.target.value })}
                    placeholder="Discount %, fixed margin, or fixed price value"
                  />
                </div>
              </div>
              <div className="receive-grid">
                <div className="form-group">
                  <label className="form-label">Settlement Cycle</label>
                  <select className="form-input" value={formData.settlementCycle} onChange={(event) => setFormData({ ...formData, settlementCycle: event.target.value })}>
                    {settlementCycles.map((cycle) => <option key={cycle} value={cycle}>{cycle}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Credit Limit</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="form-input"
                    value={formData.creditLimit}
                    onChange={(event) => setFormData({ ...formData, creditLimit: event.target.value })}
                  />
                </div>
              </div>
              <div className="receive-grid">
                <div className="form-group">
                  <label className="form-label">Assigned Stock Location</label>
                  <select className="form-input" value={formData.warehouseId} onChange={(event) => setFormData({ ...formData, warehouseId: event.target.value })}>
                    <option value="">Use selected sale warehouse</option>
                    {activeWarehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
                  </select>
                </div>
                <label className="customer-save-toggle" style={{ alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={formData.trackingEnabled}
                    onChange={(event) => setFormData({ ...formData, trackingEnabled: event.target.checked })}
                  />
                  Track reseller stock and settlements
                </label>
              </div>
              <div className="receive-grid">
                <div className="form-group">
                  <label className="form-label">Phone / WhatsApp</label>
                  <input className="form-input" value={formData.phone} onChange={(event) => setFormData({ ...formData, phone: event.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input type="email" className="form-input" value={formData.email} onChange={(event) => setFormData({ ...formData, email: event.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-input" value={formData.status} onChange={(event) => setFormData({ ...formData, status: event.target.value })}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-input" rows="3" value={formData.notes} onChange={(event) => setFormData({ ...formData, notes: event.target.value })}></textarea>
              </div>
              <div className="form-group">
                <label className="form-label">Payment / Coordination Terms</label>
                <textarea
                  className="form-input"
                  rows="3"
                  value={formData.paymentTerms}
                  onChange={(event) => setFormData({ ...formData, paymentTerms: event.target.value })}
                  placeholder="Example: reseller settles every Friday, returns unsold stock after 30 days..."
                ></textarea>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{isEditing ? 'Save Changes' : 'Create Partner'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
