import React, { useContext, useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { AtSign, CheckCircle2, Copy, CreditCard, Edit, Globe, Mail, MessageCircle, Phone, Plus, Printer, Search, Share2, ToggleLeft, ToggleRight, X } from 'lucide-react';
import { StoreContext } from '../context/StoreContext';
import { AuthContext } from '../context/AuthContext';

const initialCustomerForm = {
  fullName: '',
  phone: '',
  email: '',
  customerCode: '',
  loyaltyTier: 'Standard',
  discountPercent: 0,
  loyaltyPoints: 0,
  notes: '',
  status: 'Active',
};

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

const getCustomerCode = (customer) => customer.customerCode || `CUST-${String(customer.id).padStart(5, '0')}`;

export const Customers = () => {
  const { customers, createCustomer, updateCustomer, updateCustomerStatus, adjustCustomerPoints, settings } = useContext(StoreContext);
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
  const [cardCustomer, setCardCustomer] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [adjustment, setAdjustment] = useState({ customer: null, points: '', reason: '' });

  useEffect(() => {
    let active = true;
    const code = cardCustomer ? getCustomerCode(cardCustomer) : '';
    if (!code) {
      setQrDataUrl('');
      return;
    }

    QRCode.toDataURL(code, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 220,
      color: {
        dark: '#2E2E2E',
        light: '#FFFFFF',
      },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrDataUrl('');
      });

    return () => {
      active = false;
    };
  }, [cardCustomer]);

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
      customerCode: customer.customerCode || '',
      loyaltyTier: customer.loyaltyTier || 'Standard',
      discountPercent: customer.discountPercent || 0,
      loyaltyPoints: customer.loyaltyPoints || 0,
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

  const submitAdjustment = async (event) => {
    event.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    const result = await adjustCustomerPoints(adjustment.customer.id, {
      points: Number(adjustment.points),
      reason: adjustment.reason,
      idempotencyKey: `manual-${adjustment.customer.id}-${Date.now()}`,
    });
    if (!result.success) {
      setErrorMsg(result.error || 'Could not adjust points.');
      return;
    }
    setAdjustment({ customer: null, points: '', reason: '' });
    setSuccessMsg('Point adjustment recorded.');
  };

  const copyCustomerCode = async (customer) => {
    const code = getCustomerCode(customer);
    try {
      await navigator.clipboard.writeText(code);
      setSuccessMsg(`Customer code ${code} copied.`);
    } catch {
      setErrorMsg('Could not copy customer code.');
    }
  };

  const printLoyaltyCard = () => {
    if (!cardCustomer) return;
    const code = getCustomerCode(cardCustomer);
    const company = getCompanyCardInfo(settings);
    const safe = (value) => escapeHtml(value);
    const pill = (label, value) => value ? `<div class="pill"><span>${safe(label)}</span><strong>${safe(value)}</strong></div>` : '';
    const socialRows = [
      pill('IG', company.instagram),
      pill('FB', company.facebook),
      pill('TT', company.tiktok),
      pill('WEB', company.website),
    ].filter(Boolean).join('');
    const contactRows = [
      pill('TEL', company.phone),
      pill('WA', company.whatsapp),
      pill('MAIL', company.email),
      pill('SHOP', company.address),
    ].filter(Boolean).join('');
    const win = window.open('', '_blank', 'width=520,height=720');
    win.document.write(`
      <html>
        <head>
          <title>${safe(company.name)} Loyalty Card - ${safe(code)}</title>
          <style>
            @page { size: A4; margin: 12mm; }
            * { box-sizing: border-box; }
            body { font-family: Georgia, 'Times New Roman', serif; background: #F7F3EA; padding: 20px; color: #332116; }
            .sheet { display: grid; gap: 12mm; justify-content: center; }
            .print-note { text-align: center; margin: 0 0 18px; color: #5A5A5A; }
            .card-side { width: 85.6mm; height: 54mm; border-radius: 4mm; overflow: hidden; position: relative; box-shadow: 0 14px 34px rgba(45, 30, 18, .18); page-break-inside: avoid; border: .45mm solid #6F7722; }
            .card-side:before, .card-side:after { content: ""; position: absolute; border-radius: 999px; pointer-events: none; }
            .front { color: #332116; background:
              radial-gradient(circle at 15% 18%, rgba(229, 166, 44, .28) 0 10mm, transparent 11mm),
              radial-gradient(circle at 84% 82%, rgba(111, 119, 34, .20) 0 13mm, transparent 14mm),
              linear-gradient(145deg, #FFFDF7 0%, #F3E6C8 54%, #E7D2A9 100%);
              padding: 4.5mm; }
            .front:before { width: 54mm; height: 54mm; right: -22mm; top: -22mm; border: .6mm solid rgba(111, 119, 34, .28); }
            .front:after { width: 52mm; height: 22mm; left: -14mm; bottom: -9mm; border-top: .7mm solid rgba(125, 73, 31, .38); transform: rotate(-8deg); }
            .back { background:
              linear-gradient(90deg, rgba(111, 119, 34, .12), transparent 32%),
              linear-gradient(145deg, #FFFDF7 0%, #F8F0DC 100%);
              color: #332116; padding: 4.5mm; border-color: #7D491F; }
            .back:before { width: 42mm; height: 42mm; right: -18mm; bottom: -18mm; border: .6mm solid rgba(125, 73, 31, .18); }
            .botanical { position: absolute; pointer-events: none; opacity: .55; }
            .stem { width: 24mm; height: .35mm; background: #6F7722; transform-origin: left center; }
            .leaf { position: absolute; width: 6mm; height: 2.8mm; background: linear-gradient(90deg, #879247, #46521F); border-radius: 100% 0 100% 0; transform-origin: left center; }
            .botanical-a { left: 3mm; top: 3mm; transform: rotate(-24deg); }
            .botanical-b { right: -1mm; bottom: 8mm; transform: rotate(148deg); }
            .botanical-c { right: 3mm; bottom: 3mm; transform: rotate(142deg); opacity: .46; }
            .leaf:nth-child(2) { left: 5mm; top: -2.1mm; transform: rotate(-28deg); }
            .leaf:nth-child(3) { left: 10mm; top: 1mm; transform: rotate(24deg); }
            .leaf:nth-child(4) { left: 15mm; top: -2mm; transform: rotate(-24deg); }
            .logo-wrap { width: 38mm; height: 20mm; display: grid; place-items: center; background: rgba(255,255,255,.72); border: .25mm solid rgba(111,119,34,.28); border-radius: 4mm; }
            .logo { max-width: 34mm; max-height: 17mm; object-fit: contain; mix-blend-mode: multiply; }
            .brand { position: absolute; top: 5mm; right: 5mm; width: 35mm; text-align: right; font-size: 7.5pt; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; color: #6F7722; }
            .subtitle { position: absolute; top: 13mm; right: 5mm; font-size: 5.8pt; color: #7D491F; text-transform: uppercase; letter-spacing: .14em; }
            .name { margin-top: 6.2mm; max-width: 49mm; font-size: 10pt; font-weight: 700; color: #332116; }
            .tier { margin-top: 1.2mm; max-width: 45mm; color: #6F7722; font-size: 6.6pt; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; }
            .qr { width: 22mm; height: 22mm; padding: 1.4mm; background: white; border: .35mm solid #7D491F; border-radius: 3.4mm; position: absolute; right: 5mm; bottom: 8mm; }
            .code { position: absolute; left: 5mm; bottom: 8mm; max-width: 47mm; color: #4B2A16; font-size: 9pt; font-weight: 800; letter-spacing: .12em; }
            .hint { position: absolute; left: 5mm; right: 5mm; bottom: 3.2mm; font-size: 5.5pt; color: #6B5B43; }
            .back-logo { width: 23mm; max-height: 11mm; object-fit: contain; mix-blend-mode: multiply; }
            .back h2 { position: absolute; top: 4.5mm; right: 4.5mm; margin: 0; max-width: 48mm; text-align: right; font-size: 8.5pt; color: #6F7722; letter-spacing: .12em; text-transform: uppercase; }
            .section-title { margin: 4mm 0 1.8mm; color: #7D491F; font-size: 5.7pt; font-weight: 800; letter-spacing: .18em; text-transform: uppercase; }
            .info { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5mm; font-size: 5.8pt; }
            .pill { min-height: 8mm; padding: 1.4mm 1.7mm; border-radius: 2.2mm; background: rgba(255,255,255,.64); border: .25mm solid rgba(111,119,34,.22); }
            .pill span { display: block; color: #6F7722; font-weight: 800; font-size: 5pt; letter-spacing: .12em; }
            .pill strong { display: block; margin-top: .7mm; font-weight: 700; overflow-wrap: anywhere; line-height: 1.15; }
            .small { position: absolute; left: 4.5mm; right: 4.5mm; bottom: 3.5mm; color: #6B5B43; font-size: 5.3pt; line-height: 1.32; border-top: .25mm solid rgba(125,73,31,.24); padding-top: 1.5mm; }
            button { width: 85.6mm; display: block; margin: 18px auto 0; padding: 12px; border: 0; border-radius: 12px; cursor: pointer; }
            @media print {
              body { background: white; padding: 0; }
              .print-note, button { display: none; }
              .card-side { box-shadow: none; break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <p class="print-note">Standard loyalty/PVC card size: 85.6mm x 54mm. Print front and back, then cut/laminate or send to PVC production.</p>
          <div class="sheet">
            <section class="card-side front">
              <div class="botanical botanical-a"><div class="stem"></div><i class="leaf"></i><i class="leaf"></i><i class="leaf"></i></div>
              <div class="botanical botanical-b"><div class="stem"></div><i class="leaf"></i><i class="leaf"></i><i class="leaf"></i></div>
              ${company.logo ? `<div class="logo-wrap"><img class="logo" src="${safe(company.logo)}" alt="${safe(company.name)}" /></div>` : ''}
              <div class="brand">${safe(company.name)}</div>
              <div class="subtitle">Loyalty Card</div>
              <div class="name">${safe(cardCustomer.fullName)}</div>
              <div class="tier">${safe(cardCustomer.loyaltyTier || 'Standard')} | ${Number(cardCustomer.loyaltyPoints || 0)} points</div>
              ${qrDataUrl ? `<img class="qr" src="${qrDataUrl}" alt="QR Code" />` : ''}
              <div class="code">${safe(code)}</div>
              <div class="hint">Scan or type this code at checkout to add or redeem points.</div>
            </section>
            <section class="card-side back">
              <div class="botanical botanical-c"><div class="stem"></div><i class="leaf"></i><i class="leaf"></i><i class="leaf"></i></div>
              ${company.logo ? `<img class="back-logo" src="${safe(company.logo)}" alt="${safe(company.name)}" />` : ''}
              <h2>${safe(company.name)}</h2>
              <div class="section-title">Contact</div>
              <div class="info">${contactRows || '<div class="pill"><span>CONTACT</span><strong>Update company contacts in Settings</strong></div>'}</div>
              <div class="section-title">Social</div>
              <div class="info">${socialRows || '<div class="pill"><span>SOCIAL</span><strong>Add social media in Settings</strong></div>'}</div>
              <div class="small">This loyalty card is personal. Present the QR code or customer ID during purchase to collect and redeem points.</div>
            </section>
          </div>
          <button onclick="window.print()">Print / Save PDF</button>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ marginBottom: '0.35rem' }}>Loyalty</h1>
          <p className="page-subtitle">Manage customer codes, points, discounts, WhatsApp contact and redemption readiness.</p>
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
                <th>Code</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Tier</th>
                <th>Points</th>
                <th>Residual</th>
                <th>Discount</th>
                <th>Sales</th>
                <th>Status</th>
                <th>WhatsApp</th>
                {canManageCustomers && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer) => (
                <tr key={customer.id}>
                  <td style={{ fontWeight: 600 }}>{customer.fullName}</td>
                  <td><span className="badge badge-primary">{customer.customerCode || `CUST-${String(customer.id).padStart(5, '0')}`}</span></td>
                  <td>{customer.phone || '-'}</td>
                  <td>{customer.email || '-'}</td>
                  <td><span className="badge badge-primary">{customer.loyaltyTier}</span></td>
                  <td style={{ fontWeight: 700 }}>{customer.loyaltyPoints || 0}</td>
                  <td>{((customer.loyaltyResidualCents || 0) / 100).toFixed(2)} MT</td>
                  <td>{customer.discountPercent || 0}%</td>
                  <td>{customer._count?.sales || 0}</td>
                  <td>
                    <span className={`badge ${customer.status === 'Active' ? 'badge-success' : 'badge-danger'}`}>
                      {customer.status}
                    </span>
                  </td>
                  <td>
                    {customer.phone ? (
                      <a
                        className="btn btn-ghost compact-btn"
                        href={whatsappHref(customer.phone, `Olá ${customer.fullName}, mensagem da Soul to Soul.`)}
                        target="_blank"
                        rel="noreferrer"
                        title="Send WhatsApp"
                      >
                        <MessageCircle size={16} />
                      </a>
                    ) : '-'}
                  </td>
                  {canManageCustomers && (
                    <td>
                      <div className="row-actions">
                        <button className="btn btn-ghost compact-btn" onClick={() => setCardCustomer(customer)} title="View loyalty card">
                          <CreditCard size={16} />
                        </button>
                        <button className="btn btn-ghost compact-btn" onClick={() => copyCustomerCode(customer)} title="Copy loyalty code">
                          <Copy size={16} />
                        </button>
                        <button className="btn btn-ghost compact-btn" onClick={() => openEdit(customer)} title="Edit customer">
                          <Edit size={16} />
                        </button>
                        <button className="btn btn-ghost compact-btn" onClick={() => setAdjustment({ customer, points: '', reason: '' })} title="Adjust points">
                          +/- pts
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
                  <td colSpan={canManageCustomers ? 12 : 11} style={{ textAlign: 'center', padding: '2rem' }}>
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
                <p>Set contact details, loyalty code, points and discount.</p>
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
                  <label className="form-label">Customer Code / QR Code Text</label>
                  <input className="form-input" placeholder="Auto-generated if empty" value={formData.customerCode} onChange={(event) => setFormData({ ...formData, customerCode: event.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Current Points</label>
                  <input type="number" min="0" className="form-input" value={formData.loyaltyPoints} disabled />
                  <small className="muted-text">Use audited administrative adjustment to change points.</small>
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

      {adjustment.customer && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <h2>Adjust Points</h2>
                <p>{adjustment.customer.fullName} | Balance: {adjustment.customer.loyaltyPoints || 0} pts | Value: {((adjustment.customer.loyaltyPoints || 0) * 10).toFixed(2)} MT</p>
              </div>
              <button className="icon-button" onClick={() => setAdjustment({ customer: null, points: '', reason: '' })}><X size={20} /></button>
            </div>
            <form onSubmit={submitAdjustment}>
              <div className="form-group">
                <label className="form-label">Points change</label>
                <input type="number" className="form-input" value={adjustment.points} onChange={(event) => setAdjustment({ ...adjustment, points: event.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Reason</label>
                <textarea className="form-input" rows="3" value={adjustment.reason} onChange={(event) => setAdjustment({ ...adjustment, reason: event.target.value })} required />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setAdjustment({ customer: null, points: '', reason: '' })}>Cancel</button>
                <button type="submit" className="btn btn-primary">Record Adjustment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {cardCustomer && (
        <div className="modal-backdrop">
          <div className="modal-card receipt-modal">
            <div className="modal-header">
              <div>
                <h2>Loyalty Card</h2>
                <p>{cardCustomer.fullName} | {getCustomerCode(cardCustomer)}</p>
              </div>
              <button className="icon-button" onClick={() => setCardCustomer(null)}><X size={20} /></button>
            </div>

            <div className="loyalty-card-preview-grid">
              <div className="loyalty-card-preview loyalty-card-preview-front">
                <div className="loyalty-leaf loyalty-leaf-a"></div>
                <div className="loyalty-leaf loyalty-leaf-b"></div>
                <img className="loyalty-card-logo" src={settings?.companyLogo || '/logo.png'} alt={settings?.companyName || 'Soul2Soul'} />
                <div className="loyalty-card-brand">{settings?.companyName || 'Soul2Soul'}</div>
                <div className="loyalty-card-subtitle">Natureza. Conexao. Equilibrio.</div>
                <div className="loyalty-card-title">Cartao de Fidelidade</div>
                <div className="loyalty-card-name">{cardCustomer.fullName}</div>
                <div className="loyalty-card-tier">{cardCustomer.loyaltyTier || 'Standard'} | {cardCustomer.loyaltyPoints || 0} points</div>
                {qrDataUrl ? <img className="loyalty-card-qr" src={qrDataUrl} alt="Customer QR code" /> : <div className="loyalty-card-qr-placeholder">Generating QR...</div>}
                <div className="loyalty-card-code">{getCustomerCode(cardCustomer)}</div>
                <div className="loyalty-card-hint">Scan or type this code at checkout.</div>
              </div>

              <div className="loyalty-card-preview loyalty-card-preview-back">
                <div className="loyalty-card-back-logo-row">
                  <img className="loyalty-card-back-logo" src={settings?.companyLogo || '/logo.png'} alt={settings?.companyName || 'Soul2Soul'} />
                  <strong>{settings?.companyName || 'Soul2Soul'}</strong>
                </div>
                <div className="loyalty-card-back-message">Obrigado por fazer parte da familia Soul2Soul.</div>
                <div className="loyalty-card-contact-preview">
                  {settings?.companyPhone && <span><Phone size={14} /> {settings.companyPhone}</span>}
                  {settings?.companyWhatsApp && <span><MessageCircle size={14} /> {settings.companyWhatsApp}</span>}
                  {settings?.companyEmail && <span><Mail size={14} /> {settings.companyEmail}</span>}
                  {settings?.companyWebsite && <span><Globe size={14} /> {settings.companyWebsite}</span>}
                  {settings?.instagramUrl && <span><AtSign size={14} /> {settings.instagramUrl}</span>}
                  {settings?.facebookUrl && <span><Share2 size={14} /> {settings.facebookUrl}</span>}
                  {settings?.tiktokUrl && <span><AtSign size={14} /> {settings.tiktokUrl}</span>}
                  {!settings?.companyPhone && !settings?.companyWhatsApp && !settings?.companyEmail && !settings?.companyWebsite && !settings?.instagramUrl && !settings?.facebookUrl && !settings?.tiktokUrl && (
                    <span>Add contacts and social media in Settings.</span>
                  )}
                </div>
              </div>
            </div>

            <div className="receipt-actions">
              <button className="btn btn-secondary" type="button" onClick={() => copyCustomerCode(cardCustomer)}><Copy size={18} /> Copy ID</button>
              <button className="btn btn-primary" type="button" onClick={printLoyaltyCard}><Printer size={18} /> Print Card</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const getCompanyCardInfo = (settings = {}) => ({
  name: settings.companyName || 'Soul2Soul',
  logo: settings.companyLogo || '/logo.png',
  phone: settings.companyPhone || '',
  whatsapp: settings.companyWhatsApp || '',
  email: settings.companyEmail || '',
  address: settings.companyAddress || '',
  website: settings.companyWebsite || '',
  instagram: settings.instagramUrl || '',
  facebook: settings.facebookUrl || '',
  tiktok: settings.tiktokUrl || '',
});

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');
