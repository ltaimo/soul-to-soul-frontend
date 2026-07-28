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
  Download,
  Edit,
  FilterX,
  Plus,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Upload,
  Warehouse,
  X,
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { downloadCsv, parseCsv } from '../utils/csv';

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
    updateWarehouse,
    updateWarehouseStatus,
    setWarehouseMinStock,
    importWarehouseStock,
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
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingWarehouseId, setEditingWarehouseId] = useState(null);
  const [receiveForm, setReceiveForm] = useState({ productId: '', warehouseId: '', quantity: '', landedCost: '' });
  const [adjustForm, setAdjustForm] = useState({ productId: '', warehouseId: '', quantity: '', reference: '' });
  const [warehouseForm, setWarehouseForm] = useState({ name: '', code: '', type: 'Warehouse', address: '', notes: '', status: 'Active' });
  const [transferForm, setTransferForm] = useState({
    sourceWarehouseId: '',
    destinationWarehouseId: '',
    items: [{ productId: '', quantity: '' }],
    notes: '',
  });
  const [importForm, setImportForm] = useState({ warehouseId: '', mode: 'set', rows: [], fileName: '' });
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
  const transferStockFor = (productId) => warehouseStock.find(
    (row) => row.productId === Number(productId) && row.warehouseId === Number(transferForm.sourceWarehouseId),
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

  const openWarehouseModal = (warehouse = null) => {
    setErrorMsg('');
    setSuccessMsg('');
    if (warehouse) {
      setEditingWarehouseId(warehouse.id);
      setWarehouseForm({
        name: warehouse.name || '',
        code: warehouse.code || '',
        type: warehouse.type || 'Warehouse',
        address: warehouse.address || '',
        notes: warehouse.notes || '',
        status: warehouse.status || 'Active',
      });
    } else {
      setEditingWarehouseId(null);
      setWarehouseForm({ name: '', code: '', type: 'Warehouse', address: '', notes: '', status: 'Active' });
    }
    setShowWarehouseModal(true);
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
    const result = editingWarehouseId
      ? await updateWarehouse(editingWarehouseId, warehouseForm)
      : await createWarehouse(warehouseForm);
    setSubmitting(false);
    if (!result?.success) return setErrorMsg(result?.error || 'Could not create warehouse.');
    setWarehouseForm({ name: '', code: '', type: 'Warehouse', address: '', notes: '', status: 'Active' });
    setEditingWarehouseId(null);
    setSuccessMsg(editingWarehouseId ? 'Warehouse updated successfully.' : 'Warehouse created successfully.');
    setShowWarehouseModal(false);
  };

  const toggleWarehouseStatus = async (warehouse) => {
    setErrorMsg('');
    setSuccessMsg('');
    const nextStatus = warehouse.status === 'Active' ? 'Inactive' : 'Active';
    const result = await updateWarehouseStatus(warehouse.id, nextStatus);
    if (!result?.success) return setErrorMsg(result?.error || 'Could not update warehouse status.');
    setSuccessMsg(`Warehouse marked as ${nextStatus}.`);
  };

  const updateMinStock = async (row) => {
    const value = window.prompt(`Minimum stock for ${row.product?.name} in ${row.warehouse?.name}`, String(row.minStock ?? 0));
    if (value === null) return;
    const minStock = Number(value);
    if (!Number.isInteger(minStock) || minStock < 0) {
      setErrorMsg('Minimum stock must be a positive whole number or zero.');
      return;
    }
    const result = await setWarehouseMinStock(row.warehouseId, row.productId, minStock);
    if (!result?.success) return setErrorMsg(result?.error || 'Could not update minimum stock.');
    setSuccessMsg('Minimum stock updated.');
  };

  const submitTransfer = async (event) => {
    event.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    const sourceWarehouseId = Number(transferForm.sourceWarehouseId);
    const destinationWarehouseId = Number(transferForm.destinationWarehouseId);
    const items = transferForm.items
      .map((item) => ({ productId: Number(item.productId), quantity: Number(item.quantity) }))
      .filter((item) => item.productId || item.quantity);
    if (!sourceWarehouseId || !destinationWarehouseId || items.length === 0) {
      setErrorMsg('Select source, destination, and at least one product.');
      return;
    }
    if (sourceWarehouseId === destinationWarehouseId) return setErrorMsg('Source and destination must be different.');
    for (const item of items) {
      if (!item.productId || item.quantity <= 0 || !Number.isInteger(item.quantity)) {
        setErrorMsg('Every transfer line needs a product and a positive whole quantity.');
        return;
      }
      const sourceStock = transferStockFor(item.productId);
      if ((sourceStock?.quantity || 0) < item.quantity) {
        setErrorMsg(`Not enough stock for ${sourceStock?.product?.name || 'selected product'}. Available: ${sourceStock?.quantity || 0}.`);
        return;
      }
    }

    setSubmitting(true);
    const result = await createStockTransfer({
      sourceWarehouseId,
      destinationWarehouseId,
      notes: transferForm.notes,
      items,
    });
    setSubmitting(false);
    if (!result?.success) return setErrorMsg(result?.error || 'Could not create transfer.');
    setTransferForm({ sourceWarehouseId: '', destinationWarehouseId: '', items: [{ productId: '', quantity: '' }], notes: '' });
    setSuccessMsg('Transfer created. Stock is now in transit.');
    setShowTransferModal(false);
  };

  const updateTransferItem = (index, patch) => {
    setTransferForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
    }));
  };

  const addTransferItem = () => {
    setTransferForm((current) => ({ ...current, items: [...current.items, { productId: '', quantity: '' }] }));
  };

  const selectAllTransferItems = () => {
    const sourceWarehouseId = Number(transferForm.sourceWarehouseId);
    if (!sourceWarehouseId) {
      setErrorMsg('Select the origin warehouse first.');
      return;
    }
    const rows = warehouseStock
      .filter((row) => row.warehouseId === sourceWarehouseId && row.quantity > 0)
      .map((row) => ({ productId: String(row.productId), quantity: String(row.quantity) }));
    if (!rows.length) {
      setErrorMsg('No available stock found in the selected origin warehouse.');
      return;
    }
    setErrorMsg('');
    setTransferForm((current) => ({ ...current, items: rows }));
  };

  const removeTransferItem = (index) => {
    setTransferForm((current) => ({
      ...current,
      items: current.items.length === 1
        ? [{ productId: '', quantity: '' }]
        : current.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const transferUnits = (transfer) => transfer.items?.reduce((acc, item) => acc + item.quantity, 0) || 0;

  const exportWarehouseStock = (warehouseId = warehouseFilter) => {
    const rows = warehouseStock
      .filter((row) => warehouseId === 'all' || !warehouseId || row.warehouseId === Number(warehouseId))
      .map((row) => ({
        'Warehouse Code': row.warehouse?.code || '',
        'Warehouse Name': row.warehouse?.name || '',
        SKU: row.product?.sku || '',
        'Product Name': row.product?.name || '',
        Category: row.product?.category || '',
        Type: row.product?.type || '',
        Unit: row.product?.unit || 'pcs',
        Quantity: row.quantity,
        'Min Stock': row.minStock,
        'Unit Cost': row.product?.costPrice || 0,
        'Selling Price': row.product?.sellingPrice || 0,
      }));
    if (!rows.length) {
      setErrorMsg('No stock rows available to export.');
      return;
    }
    downloadCsv(rows, `Soul2Soul_Warehouse_Stock_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const openImportModal = () => {
    setErrorMsg('');
    setSuccessMsg('');
    setImportForm({ warehouseId: String(defaultWarehouseId || ''), mode: 'set', rows: [], fileName: '' });
    setShowImportModal(true);
  };

  const parseImportFile = async (file) => {
    if (!file) return;
    const rawRows = parseCsv(await file.text());
    const rows = rawRows.map((row) => ({
      sku: row.SKU || row.sku || '',
      name: row['Product Name'] || row.Name || row.name || '',
      category: row.Category || row.category || 'General',
      type: row.Type || row.type || 'Finished Good',
      unit: row.Unit || row.unit || 'pcs',
      quantity: Number(row.Quantity ?? row.quantity ?? row.Stock ?? 0),
      minStock: Number(row['Min Stock'] ?? row.minStock ?? row.Minimum ?? 0),
      costPrice: Number(row['Unit Cost'] ?? row.Cost ?? row.costPrice ?? 0),
      sellingPrice: Number(row['Selling Price'] ?? row.Price ?? row.sellingPrice ?? 0),
      status: row.Status || row.status || 'Active',
    })).filter((row) => row.sku || row.name);
    setImportForm((current) => ({ ...current, fileName: file.name, rows }));
  };

  const submitImport = async (event) => {
    event.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (!importForm.warehouseId) return setErrorMsg('Select the warehouse for this import.');
    if (!importForm.rows.length) return setErrorMsg('Choose an Excel or CSV file with stock rows.');

    setSubmitting(true);
    const result = await importWarehouseStock({
      warehouseId: Number(importForm.warehouseId),
      mode: importForm.mode,
      rows: importForm.rows,
    });
    setSubmitting(false);
    if (!result.success) return setErrorMsg(result.error || 'Could not import stock.');
    setSuccessMsg(`Import completed: ${result.summary.createdProducts} created, ${result.summary.updatedProducts} updated, ${result.summary.adjustedRows} stock rows adjusted.`);
    setShowImportModal(false);
  };

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
            <button className="btn btn-ghost" onClick={() => exportWarehouseStock()}><Download size={18} /> Export</button>
            <button className="btn btn-ghost" onClick={openImportModal}><Upload size={18} /> Import</button>
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
                        <button className="btn btn-ghost compact-btn" onClick={() => updateMinStock(row)}>Min</button>
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
            {canManageInventory && <button className="btn btn-primary" onClick={() => openWarehouseModal()}><Plus size={18} /> New warehouse</button>}
          </div>
          <div className="table-container">
            <table>
              <thead><tr><th>Code</th><th>Name</th><th>Type</th><th>Status</th><th>Products</th><th>Default</th>{canManageInventory && <th>Actions</th>}</tr></thead>
              <tbody>
                {warehouses.map((warehouse) => (
                  <tr key={warehouse.id}>
                    <td>{warehouse.code}</td>
                    <td><strong>{warehouse.name}</strong><span className="table-muted">{warehouse.address || warehouse.notes || '-'}</span></td>
                    <td>{warehouse.type}</td>
                    <td><span className={`badge ${warehouse.status === 'Active' ? 'badge-success' : 'badge-danger'}`}>{warehouse.status}</span></td>
                    <td>{warehouse._count?.stocks || 0}</td>
                    <td>{warehouse.isDefault ? 'Yes' : '-'}</td>
                    {canManageInventory && (
                      <td>
                        <div className="row-actions">
                          <button className="btn btn-ghost compact-btn" onClick={() => openWarehouseModal(warehouse)} title="Edit warehouse">
                            <Edit size={16} />
                          </button>
                          {!warehouse.isDefault && (
                            <button className="btn btn-ghost compact-btn" onClick={() => toggleWarehouseStatus(warehouse)} title="Change status">
                              {warehouse.status === 'Active' ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                            </button>
                          )}
                        </div>
                      </td>
                    )}
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
        <InventoryModal title={editingWarehouseId ? 'Edit warehouse' : 'New warehouse'} subtitle="Create or update a shop, warehouse, or storage location." onClose={() => setShowWarehouseModal(false)}>
          <form onSubmit={submitWarehouse}>
            <div className="receive-grid">
              <TextField label="Name" value={warehouseForm.name} onChange={(value) => setWarehouseForm({ ...warehouseForm, name: value })} required />
              <TextField label="Code" value={warehouseForm.code} onChange={(value) => setWarehouseForm({ ...warehouseForm, code: value })} placeholder="Optional" disabled={!!editingWarehouseId} />
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
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-input" value={warehouseForm.status} onChange={(event) => setWarehouseForm({ ...warehouseForm, status: event.target.value })}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            <TextField label="Notes" value={warehouseForm.notes} onChange={(value) => setWarehouseForm({ ...warehouseForm, notes: value })} />
            <ModalActions submitting={submitting} submitLabel={editingWarehouseId ? 'Save warehouse' : 'Create warehouse'} onCancel={() => setShowWarehouseModal(false)} />
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
            <div className="section-heading" style={{ marginTop: '1rem' }}>
              <h3>Products to transfer</h3>
              <div className="row-actions">
                <button type="button" className="btn btn-secondary" onClick={selectAllTransferItems}>Select all from origin</button>
                <button type="button" className="btn btn-secondary" onClick={addTransferItem}><Plus size={18} /> Add product</button>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {transferForm.items.map((item, index) => {
                const sourceStock = transferStockFor(item.productId);
                return (
                  <div className="receive-grid" key={`transfer-line-${index}`} style={{ alignItems: 'end' }}>
                    <div className="form-group">
                      <label className="form-label">Product</label>
                      <select className="form-input" value={item.productId} onChange={(event) => updateTransferItem(index, { productId: event.target.value })} required>
                        <option value="">Select product</option>
                        {products.map((product) => <option key={product.id} value={product.id}>{product.sku} | {product.name}</option>)}
                      </select>
                      <span className="table-muted">Available in origin: {sourceStock?.quantity ?? 0}</span>
                    </div>
                    <NumberField label="Quantity" value={item.quantity} onChange={(value) => updateTransferItem(index, { quantity: value })} min="1" />
                    <button type="button" className="btn btn-ghost compact-btn" onClick={() => removeTransferItem(index)} title="Remove line">
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
            <TextField label="Notes" value={transferForm.notes} onChange={(value) => setTransferForm({ ...transferForm, notes: value })} />
            <div className="receive-preview">
              <div>
                <span>Lines</span>
                <strong>{transferForm.items.filter((item) => item.productId && Number(item.quantity) > 0).length}</strong>
              </div>
              <div>
                <span>Total units</span>
                <strong>{transferForm.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)}</strong>
              </div>
            </div>
            <ModalActions submitting={submitting} submitLabel="Create Transfer" onCancel={() => setShowTransferModal(false)} />
          </form>
        </InventoryModal>
      )}

      {showImportModal && (
        <InventoryModal title="Import warehouse stock" subtitle="Upload Excel or CSV to create/update products and set or add stock in one warehouse." onClose={() => setShowImportModal(false)}>
          <form onSubmit={submitImport}>
            <div className="receive-grid">
              <WarehouseSelect label="Warehouse to update" warehouses={activeWarehouses} value={importForm.warehouseId} onChange={(value) => setImportForm({ ...importForm, warehouseId: value })} />
              <div className="form-group">
                <label className="form-label">Import mode</label>
                <select className="form-input" value={importForm.mode} onChange={(event) => setImportForm({ ...importForm, mode: event.target.value })}>
                  <option value="set">Set stock to file quantity</option>
                  <option value="add">Add file quantity to current stock</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Excel / CSV file</label>
              <input
                className="form-input"
                type="file"
                accept=".csv"
                onChange={(event) => parseImportFile(event.target.files?.[0])}
                required
              />
              <span className="table-muted">Columns accepted: SKU, Product Name, Category, Type, Unit, Quantity, Min Stock, Unit Cost, Selling Price.</span>
            </div>
            <div className="receive-preview">
              <div><span>File</span><strong>{importForm.fileName || '-'}</strong></div>
              <div><span>Rows detected</span><strong>{importForm.rows.length}</strong></div>
              <div><span>Valid rows</span><strong>{importForm.rows.filter((row) => row.sku && row.name && Number.isInteger(row.quantity) && row.quantity >= 0).length}</strong></div>
            </div>
            {importForm.rows.length > 0 && (
              <div className="table-container" style={{ maxHeight: 260 }}>
                <table>
                  <thead><tr><th>SKU</th><th>Product</th><th>Qty</th><th>Cost</th><th>Min</th></tr></thead>
                  <tbody>
                    {importForm.rows.slice(0, 8).map((row, index) => (
                      <tr key={`${row.sku}-${index}`}>
                        <td>{row.sku}</td>
                        <td>{row.name}</td>
                        <td>{row.quantity}</td>
                        <td>{row.costPrice}</td>
                        <td>{row.minStock}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <ModalActions submitting={submitting} submitLabel="Import Stock" onCancel={() => setShowImportModal(false)} />
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
