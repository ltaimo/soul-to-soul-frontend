import React, { useContext, useMemo, useState } from 'react';
import { StoreContext } from '../context/StoreContext';
import { LanguageContext } from '../context/LanguageContext';
import { AuthContext } from '../context/AuthContext';
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowRightLeft,
  ArrowUpFromLine,
  CheckCircle2,
  FilterX,
  Plus,
  Warehouse,
  X,
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

export const Inventory = ({ activeFilter }) => {
  const {
    products,
    warehouses,
    warehouseStock,
    stockTransfers,
    settings,
    receiveGoods,
    adjustStock,
    createWarehouse,
    createStockTransfer,
    confirmStockTransfer,
    cancelStockTransfer,
  } = useContext(StoreContext);
  const { t } = useContext(LanguageContext);
  const { user } = useContext(AuthContext);
  const canManageInventory = ['admin', 'manager', 'stock_manager'].includes(user?.role);
  const activeWarehouses = warehouses.filter((warehouse) => warehouse.status !== 'Inactive');
  const defaultWarehouseId = activeWarehouses.find((warehouse) => warehouse.isDefault)?.id || activeWarehouses[0]?.id || '';
  const warehouseTypes = settings?.warehouseTypesList?.length ? settings.warehouseTypesList : ['Warehouse', 'Shop', 'Storage', 'Transit'];

  const [tab, setTab] = useState('stock');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showWarehouseModal, setShowWarehouseModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [receiveForm, setReceiveForm] = useState({ productId: '', warehouseId: '', quantity: '', landedCost: '' });
  const [adjustForm, setAdjustForm] = useState({ productId: '', warehouseId: '', quantity: '', reference: '' });
  const [warehouseForm, setWarehouseForm] = useState({ name: '', code: '', type: 'Warehouse', address: '', notes: '' });
  const [transferForm, setTransferForm] = useState({
    sourceWarehouseId: '',
    destinationWarehouseId: '',
    productId: '',
    quantity: '',
    notes: '',
  });
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const filterLabels = {
    stock_out: 'Zero-Bound Stock',
    low_stock: 'Low Stock',
    expiring: 'Near Expiry (Batches)',
  };

  const stockRows = useMemo(() => {
    const rows = warehouseStock.filter((row) => warehouseFilter === 'all' || row.warehouseId === Number(warehouseFilter));

    if (!activeFilter) return rows;
    if (activeFilter === 'stock_out') return rows.filter((row) => row.quantity === 0);
    if (activeFilter === 'low_stock') return rows.filter((row) => row.quantity > 0 && row.quantity <= row.minStock);
    if (activeFilter === 'expiring') return rows.filter((row) => row.quantity > 0);
    return rows;
  }, [warehouseStock, warehouseFilter, activeFilter]);

  const selectedProduct = products.find((product) => product.id === Number(receiveForm.productId));
  const selectedAdjustProduct = products.find((product) => product.id === Number(adjustForm.productId));
  const selectedAdjustStock = warehouseStock.find(
    (row) => row.productId === Number(adjustForm.productId) && row.warehouseId === Number(adjustForm.warehouseId || defaultWarehouseId),
  );
  const selectedTransferStock = warehouseStock.find(
    (row) => row.productId === Number(transferForm.productId) && row.warehouseId === Number(transferForm.sourceWarehouseId),
  );

  const openReceiveModal = (rowOrProduct = null) => {
    const product = rowOrProduct?.product || rowOrProduct;
    setErrorMsg('');
    setSuccessMsg('');
    setReceiveForm({
      productId: product?.id ? String(product.id) : '',
      warehouseId: rowOrProduct?.warehouseId ? String(rowOrProduct.warehouseId) : String(defaultWarehouseId || ''),
      quantity: '',
      landedCost: product?.costPrice ? String(product.costPrice) : '',
    });
    setShowReceiveModal(true);
  };

  const openAdjustModal = (rowOrProduct = null) => {
    const product = rowOrProduct?.product || rowOrProduct;
    setErrorMsg('');
    setSuccessMsg('');
    setAdjustForm({
      productId: product?.id ? String(product.id) : '',
      warehouseId: rowOrProduct?.warehouseId ? String(rowOrProduct.warehouseId) : String(defaultWarehouseId || ''),
      quantity: '',
      reference: '',
    });
    setShowAdjustModal(true);
  };

  const submitReceive = async (event) => {
    event.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    const productId = Number(receiveForm.productId);
    const quantity = Number(receiveForm.quantity);
    const landedCost = Number(receiveForm.landedCost);
    const warehouseId = Number(receiveForm.warehouseId);
    if (!productId || !warehouseId || quantity <= 0 || landedCost <= 0) {
      setErrorMsg('Select product, destination warehouse, quantity, and valid landed cost.');
      return;
    }

    setSubmitting(true);
    const result = await receiveGoods(productId, quantity, landedCost, undefined, warehouseId);
    setSubmitting(false);
    if (!result?.success) return setErrorMsg(result?.error || 'Could not receive stock.');
    setSuccessMsg('Stock received successfully.');
    setShowReceiveModal(false);
  };

  const submitAdjust = async (event) => {
    event.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    const productId = Number(adjustForm.productId);
    const quantity = Number(adjustForm.quantity);
    const warehouseId = Number(adjustForm.warehouseId);
    if (!productId || !warehouseId || quantity === 0) {
      setErrorMsg('Select product, warehouse, and enter a non-zero adjustment.');
      return;
    }
    if (selectedAdjustStock && selectedAdjustStock.quantity + quantity < 0) {
      setErrorMsg(`Adjustment cannot make warehouse stock negative. Current stock is ${selectedAdjustStock.quantity}.`);
      return;
    }

    setSubmitting(true);
    const result = await adjustStock(productId, quantity, adjustForm.reference || 'Manual stock adjustment', warehouseId);
    setSubmitting(false);
    if (!result?.success) return setErrorMsg(result?.error || 'Could not adjust stock.');
    setSuccessMsg('Stock adjusted successfully.');
    setShowAdjustModal(false);
  };

  const submitWarehouse = async (event) => {
    event.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (!warehouseForm.name.trim()) return setErrorMsg('Warehouse name is required.');

    setSubmitting(true);
    const result = await createWarehouse(warehouseForm);
    setSubmitting(false);
    if (!result?.success) return setErrorMsg(result?.error || 'Could not create warehouse.');
    setWarehouseForm({ name: '', code: '', type: 'Warehouse', address: '', notes: '' });
    setSuccessMsg('Warehouse created successfully.');
    setShowWarehouseModal(false);
  };

  const submitTransfer = async (event) => {
    event.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    const sourceWarehouseId = Number(transferForm.sourceWarehouseId);
    const destinationWarehouseId = Number(transferForm.destinationWarehouseId);
    const productId = Number(transferForm.productId);
    const quantity = Number(transferForm.quantity);
    if (!sourceWarehouseId || !destinationWarehouseId || !productId || quantity <= 0) {
      setErrorMsg('Select source, destination, product, and a positive quantity.');
      return;
    }
    if (sourceWarehouseId === destinationWarehouseId) return setErrorMsg('Source and destination must be different.');
    if (selectedTransferStock && selectedTransferStock.quantity < quantity) {
      setErrorMsg(`Not enough stock in source warehouse. Available: ${selectedTransferStock.quantity}.`);
      return;
    }

    setSubmitting(true);
    const result = await createStockTransfer({
      sourceWarehouseId,
      destinationWarehouseId,
      notes: transferForm.notes,
      items: [{ productId, quantity }],
    });
    setSubmitting(false);
    if (!result?.success) return setErrorMsg(result?.error || 'Could not create transfer.');
    setTransferForm({ sourceWarehouseId: '', destinationWarehouseId: '', productId: '', quantity: '', notes: '' });
    setSuccessMsg('Transfer created. Stock is now in transit.');
    setShowTransferModal(false);
  };

  const transferUnits = (transfer) => transfer.items?.reduce((acc, item) => acc + item.quantity, 0) || 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ marginBottom: '0.25rem' }}>{t.stockInventory}</h1>
          {activeFilter && (
            <p style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.875rem', color: 'var(--color-primary)', backgroundColor: 'rgba(107, 142, 126, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
              <FilterX size={14} /> Filtered View: {filterLabels[activeFilter] || activeFilter}
            </p>
          )}
        </div>
        {canManageInventory && (
          <div className="page-actions">
            <button className="btn btn-secondary" onClick={() => openReceiveModal()}><ArrowDownToLine size={18} /> {t.receiveStock}</button>
            <button className="btn btn-ghost" onClick={() => openAdjustModal()}><ArrowUpFromLine size={18} /> {t.adjustStock}</button>
            <button className="btn btn-primary" onClick={() => setShowTransferModal(true)}><ArrowRightLeft size={18} /> Transfer</button>
          </div>
        )}
      </div>

      {successMsg && <div className="inline-alert inline-alert-success"><CheckCircle2 size={18} /> {successMsg}</div>}
      {errorMsg && <div className="inline-alert inline-alert-danger"><AlertTriangle size={18} /> {errorMsg}</div>}

      <div className="hr-tabs">
        <button className={tab === 'stock' ? 'active' : ''} onClick={() => setTab('stock')}>Stock by Warehouse</button>
        <button className={tab === 'warehouses' ? 'active' : ''} onClick={() => setTab('warehouses')}>Warehouses</button>
        <button className={tab === 'transfers' ? 'active' : ''} onClick={() => setTab('transfers')}>Transfers</button>
      </div>

      {tab === 'stock' && (
        <div className="card">
          <div className="section-heading">
            <h3>Available stock per location</h3>
            <select className="form-input toolbar-select" value={warehouseFilter} onChange={(event) => setWarehouseFilter(event.target.value)}>
              <option value="all">All warehouses</option>
              {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
            </select>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Warehouse</th>
                  <th>{t.product}</th>
                  <th>{t.category}</th>
                  <th>{t.qtyOnHand}</th>
                  <th>Minimum</th>
                  <th>{t.totalValue}</th>
                  <th>Status</th>
                  {canManageInventory && <th>{t.action}</th>}
                </tr>
              </thead>
              <tbody>
                {stockRows.map((row) => (
                  <tr key={`${row.warehouseId}-${row.productId}`}>
                    <td><strong>{row.warehouse?.name}</strong><span className="table-muted">{row.warehouse?.type}</span></td>
                    <td><strong>{row.product?.name}</strong><span className="table-muted">{row.product?.sku}</span></td>
                    <td>{row.product?.category}</td>
                    <td><span className={row.quantity <= row.minStock ? 'badge badge-warning' : 'badge badge-success'}>{row.quantity}</span></td>
                    <td>{row.minStock}</td>
                    <td>{formatCurrency((row.product?.costPrice || 0) * row.quantity, settings)}</td>
                    <td>{row.stockStatus}</td>
                    {canManageInventory && (
                      <td className="row-actions">
                        <button className="btn btn-ghost compact-btn" onClick={() => openReceiveModal(row)}>Receive</button>
                        <button className="btn btn-ghost compact-btn" onClick={() => openAdjustModal(row)}>Adjust</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {stockRows.length === 0 && <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-charcoal-light)' }}>{t.noProducts}</div>}
          </div>
        </div>
      )}

      {tab === 'warehouses' && (
        <div className="card">
          <div className="section-heading">
            <h3>Storage locations</h3>
            {canManageInventory && <button className="btn btn-primary" onClick={() => setShowWarehouseModal(true)}><Plus size={18} /> New warehouse</button>}
          </div>
          <div className="table-container">
            <table>
              <thead><tr><th>Code</th><th>Name</th><th>Type</th><th>Status</th><th>Products</th><th>Default</th></tr></thead>
              <tbody>
                {warehouses.map((warehouse) => (
                  <tr key={warehouse.id}>
                    <td>{warehouse.code}</td>
                    <td><strong>{warehouse.name}</strong><span className="table-muted">{warehouse.address || warehouse.notes || '-'}</span></td>
                    <td>{warehouse.type}</td>
                    <td><span className={`badge ${warehouse.status === 'Active' ? 'badge-success' : 'badge-danger'}`}>{warehouse.status}</span></td>
                    <td>{warehouse._count?.stocks || 0}</td>
                    <td>{warehouse.isDefault ? 'Yes' : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'transfers' && (
        <div className="card">
          <div className="section-heading">
            <h3>Transfer history and stock in transit</h3>
            {canManageInventory && <button className="btn btn-primary" onClick={() => setShowTransferModal(true)}><ArrowRightLeft size={18} /> New transfer</button>}
          </div>
          <div className="table-container">
            <table>
              <thead><tr><th>Transfer</th><th>Origin</th><th>Destination</th><th>Units</th><th>Status</th><th>Responsible</th><th>Date</th>{canManageInventory && <th>Action</th>}</tr></thead>
              <tbody>
                {stockTransfers.map((transfer) => (
                  <tr key={transfer.id}>
                    <td><strong>{transfer.transferNumber}</strong><span className="table-muted">{transfer.items?.map((item) => item.product?.name).join(', ')}</span></td>
                    <td>{transfer.sourceWarehouse?.name}</td>
                    <td>{transfer.destinationWarehouse?.name}</td>
                    <td>{transferUnits(transfer)}</td>
                    <td><span className={`badge ${transfer.status === 'Received' ? 'badge-success' : transfer.status === 'Cancelled' ? 'badge-danger' : 'badge-warning'}`}>{transfer.status}</span></td>
                    <td>{transfer.requestedByName || '-'}</td>
                    <td>{new Date(transfer.createdAt).toLocaleDateString()}</td>
                    {canManageInventory && (
                      <td className="row-actions">
                        {transfer.status === 'In Transit' ? (
                          <>
                            <button className="btn btn-ghost compact-btn" onClick={() => confirmStockTransfer(transfer.id)}>Receive</button>
                            <button className="btn btn-ghost compact-btn" onClick={() => cancelStockTransfer(transfer.id)}>Cancel</button>
                          </>
                        ) : '-'}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {stockTransfers.length === 0 && <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-charcoal-light)' }}>No transfers yet.</div>}
          </div>
        </div>
      )}

      {showReceiveModal && (
        <InventoryModal title={t.receiveStock} subtitle="Add stock into a specific warehouse." onClose={() => setShowReceiveModal(false)}>
          <form onSubmit={submitReceive}>
            <ProductWarehouseFields products={products} warehouses={activeWarehouses} form={receiveForm} setForm={setReceiveForm} />
            <div className="receive-grid">
              <NumberField label="Quantity Received" value={receiveForm.quantity} onChange={(value) => setReceiveForm({ ...receiveForm, quantity: value })} min="1" />
              <NumberField label="Landed Cost / Unit" value={receiveForm.landedCost} onChange={(value) => setReceiveForm({ ...receiveForm, landedCost: value })} min="0.01" step="0.01" />
            </div>
            {selectedProduct && <Preview cards={[['Current consolidated stock', selectedProduct.stock], ['Current cost', formatCurrency(selectedProduct.costPrice, settings)], ['New consolidated stock', selectedProduct.stock + (Number(receiveForm.quantity) || 0)]]} />}
            <ModalActions submitting={submitting} submitLabel="Confirm Receipt" onCancel={() => setShowReceiveModal(false)} />
          </form>
        </InventoryModal>
      )}

      {showAdjustModal && (
        <InventoryModal title={t.adjustStock} subtitle="Correct a physical count in one warehouse." onClose={() => setShowAdjustModal(false)}>
          <form onSubmit={submitAdjust}>
            <ProductWarehouseFields products={products} warehouses={activeWarehouses} form={adjustForm} setForm={setAdjustForm} />
            <NumberField label="Adjustment Quantity" value={adjustForm.quantity} onChange={(value) => setAdjustForm({ ...adjustForm, quantity: value })} placeholder="Use negative numbers to reduce stock" />
            <div className="form-group">
              <label className="form-label">Reason / Reference</label>
              <input className="form-input" value={adjustForm.reference} onChange={(event) => setAdjustForm({ ...adjustForm, reference: event.target.value })} placeholder="e.g. Physical count correction" />
            </div>
            {selectedAdjustProduct && <Preview cards={[['Warehouse stock', selectedAdjustStock?.quantity ?? 0], ['Adjustment', Number(adjustForm.quantity) || 0], ['New warehouse stock', (selectedAdjustStock?.quantity ?? 0) + (Number(adjustForm.quantity) || 0)]]} />}
            <ModalActions submitting={submitting} submitLabel="Confirm Adjustment" onCancel={() => setShowAdjustModal(false)} />
          </form>
        </InventoryModal>
      )}

      {showWarehouseModal && (
        <InventoryModal title="New warehouse" subtitle="Create a shop, warehouse, or storage location." onClose={() => setShowWarehouseModal(false)}>
          <form onSubmit={submitWarehouse}>
            <div className="receive-grid">
              <TextField label="Name" value={warehouseForm.name} onChange={(value) => setWarehouseForm({ ...warehouseForm, name: value })} required />
              <TextField label="Code" value={warehouseForm.code} onChange={(value) => setWarehouseForm({ ...warehouseForm, code: value })} placeholder="Optional" />
            </div>
            <div className="receive-grid">
              <div className="form-group">
                <label className="form-label">Type</label>
                <select className="form-input" value={warehouseForm.type} onChange={(event) => setWarehouseForm({ ...warehouseForm, type: event.target.value })}>
                  {warehouseTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>
              <TextField label="Address" value={warehouseForm.address} onChange={(value) => setWarehouseForm({ ...warehouseForm, address: value })} />
            </div>
            <TextField label="Notes" value={warehouseForm.notes} onChange={(value) => setWarehouseForm({ ...warehouseForm, notes: value })} />
            <ModalActions submitting={submitting} submitLabel="Create warehouse" onCancel={() => setShowWarehouseModal(false)} />
          </form>
        </InventoryModal>
      )}

      {showTransferModal && (
        <InventoryModal title="Transfer stock" subtitle="Move stock between warehouses and track it in transit." onClose={() => setShowTransferModal(false)}>
          <form onSubmit={submitTransfer}>
            <div className="receive-grid">
              <WarehouseSelect label="Origin" warehouses={activeWarehouses} value={transferForm.sourceWarehouseId} onChange={(value) => setTransferForm({ ...transferForm, sourceWarehouseId: value })} />
              <WarehouseSelect label="Destination" warehouses={activeWarehouses} value={transferForm.destinationWarehouseId} onChange={(value) => setTransferForm({ ...transferForm, destinationWarehouseId: value })} />
            </div>
            <div className="receive-grid">
              <div className="form-group">
                <label className="form-label">Product</label>
                <select className="form-input" value={transferForm.productId} onChange={(event) => setTransferForm({ ...transferForm, productId: event.target.value })} required>
                  <option value="">Select product</option>
                  {products.map((product) => <option key={product.id} value={product.id}>{product.sku} | {product.name}</option>)}
                </select>
              </div>
              <NumberField label="Quantity" value={transferForm.quantity} onChange={(value) => setTransferForm({ ...transferForm, quantity: value })} min="1" />
            </div>
            <TextField label="Notes" value={transferForm.notes} onChange={(value) => setTransferForm({ ...transferForm, notes: value })} />
            <Preview cards={[['Source available', selectedTransferStock?.quantity ?? 0], ['Moving', Number(transferForm.quantity) || 0], ['After dispatch', (selectedTransferStock?.quantity ?? 0) - (Number(transferForm.quantity) || 0)]]} />
            <ModalActions submitting={submitting} submitLabel="Create Transfer" onCancel={() => setShowTransferModal(false)} />
          </form>
        </InventoryModal>
      )}
    </div>
  );
};

const InventoryModal = ({ title, subtitle, onClose, children }) => (
  <div className="modal-backdrop">
    <div className="modal-card receive-modal">
      <div className="modal-header">
        <div><h2>{title}</h2><p>{subtitle}</p></div>
        <button className="icon-button" onClick={onClose} type="button"><X size={18} /></button>
      </div>
      {children}
    </div>
  </div>
);

const ProductWarehouseFields = ({ products, warehouses, form, setForm }) => (
  <>
    <div className="form-group">
      <label className="form-label">Product</label>
      <select className="form-input" value={form.productId} onChange={(event) => setForm({ ...form, productId: event.target.value })} required>
        <option value="">Select product</option>
        {products.map((product) => <option key={product.id} value={product.id}>{product.sku} | {product.name}</option>)}
      </select>
    </div>
    <WarehouseSelect warehouses={warehouses} value={form.warehouseId} onChange={(value) => setForm({ ...form, warehouseId: value })} />
  </>
);

const WarehouseSelect = ({ label = 'Warehouse', warehouses, value, onChange }) => (
  <div className="form-group">
    <label className="form-label">{label}</label>
    <select className="form-input" value={value} onChange={(event) => onChange(event.target.value)} required>
      <option value="">Select warehouse</option>
      {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
    </select>
  </div>
);

const NumberField = ({ label, value, onChange, ...props }) => (
  <div className="form-group">
    <label className="form-label">{label}</label>
    <input type="number" className="form-input" value={value} onChange={(event) => onChange(event.target.value)} required {...props} />
  </div>
);

const TextField = ({ label, value, onChange, ...props }) => (
  <div className="form-group">
    <label className="form-label">{label}</label>
    <input className="form-input" value={value} onChange={(event) => onChange(event.target.value)} {...props} />
  </div>
);

const Preview = ({ cards }) => (
  <div className="receive-preview">
    {cards.map(([label, value]) => (
      <div key={label}>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    ))}
  </div>
);

const ModalActions = ({ submitting, submitLabel, onCancel }) => (
  <div className="modal-actions">
    <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
    <button type="submit" className="btn btn-primary" disabled={submitting}>
      {submitting ? 'Saving...' : submitLabel}
    </button>
  </div>
);
