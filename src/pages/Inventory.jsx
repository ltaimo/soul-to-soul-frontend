import React, { useContext, useMemo, useState } from 'react';
import { StoreContext } from '../context/StoreContext';
import { LanguageContext } from '../context/LanguageContext';
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, CheckCircle2, FilterX, X } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

export const Inventory = ({ activeFilter }) => {
  const { products, settings, receiveGoods, adjustStock } = useContext(StoreContext);
  const { t } = useContext(LanguageContext);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [receiveForm, setReceiveForm] = useState({
    productId: '',
    quantity: '',
    landedCost: '',
  });
  const [adjustForm, setAdjustForm] = useState({
    productId: '',
    quantity: '',
    reference: '',
  });
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const filteredProducts = useMemo(() => {
    if (!activeFilter) return products;
    switch (activeFilter) {
      case 'stock_out':
        return products.filter(p => p.stock === 0);
      case 'low_stock':
        return products.filter(p => p.stock > 0 && p.stock <= p.minStock);
      case 'expiring':
        // V1 mock: assume items with stock > 0 and arbitrary ID or properties are near expiry
        return products.filter(p => p.stock > 0);
      default:
        return products;
    }
  }, [products, activeFilter]);

  const filterLabels = {
    'stock_out': 'Zero-Bound Stock',
    'low_stock': 'Low Stock',
    'expiring': 'Near Expiry (Batches)'
  };

  const selectedProduct = products.find((product) => product.id === Number(receiveForm.productId));
  const selectedAdjustProduct = products.find((product) => product.id === Number(adjustForm.productId));

  const openReceiveModal = (product = null) => {
    setErrorMsg('');
    setSuccessMsg('');
    setReceiveForm({
      productId: product?.id ? String(product.id) : '',
      quantity: '',
      landedCost: product?.costPrice ? String(product.costPrice) : '',
    });
    setShowReceiveModal(true);
  };

  const openAdjustModal = (product = null) => {
    setErrorMsg('');
    setSuccessMsg('');
    setAdjustForm({
      productId: product?.id ? String(product.id) : '',
      quantity: '',
      reference: '',
    });
    setShowAdjustModal(true);
  };

  const handleReceiveSubmit = async (event) => {
    event.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const productId = Number(receiveForm.productId);
    const quantity = Number(receiveForm.quantity);
    const landedCost = Number(receiveForm.landedCost);

    if (!productId || quantity <= 0 || landedCost <= 0) {
      setErrorMsg('Select a product, quantity, and valid landed cost.');
      return;
    }

    setSubmitting(true);
    try {
      await receiveGoods(productId, quantity, landedCost);
      setSuccessMsg('Stock received successfully.');
      setReceiveForm({ productId: '', quantity: '', landedCost: '' });
      setTimeout(() => {
        setShowReceiveModal(false);
        setSuccessMsg('');
      }, 900);
    } catch (error) {
      setErrorMsg(error.message || 'Could not receive stock.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdjustSubmit = async (event) => {
    event.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const productId = Number(adjustForm.productId);
    const quantity = Number(adjustForm.quantity);

    if (!productId || quantity === 0) {
      setErrorMsg('Select a product and enter a non-zero adjustment quantity.');
      return;
    }

    if (selectedAdjustProduct && selectedAdjustProduct.stock + quantity < 0) {
      setErrorMsg(`Adjustment cannot make stock negative. Current stock is ${selectedAdjustProduct.stock}.`);
      return;
    }

    setSubmitting(true);
    try {
      const result = await adjustStock(productId, quantity, adjustForm.reference || 'Manual stock adjustment');
      if (!result.success) throw new Error(result.error);
      setSuccessMsg('Stock adjusted successfully.');
      setAdjustForm({ productId: '', quantity: '', reference: '' });
      setTimeout(() => {
        setShowAdjustModal(false);
        setSuccessMsg('');
      }, 900);
    } catch (error) {
      setErrorMsg(error.message || 'Could not adjust stock.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: '0.25rem' }}>{t.stockInventory}</h1>
          {activeFilter && (
            <p style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.875rem', color: 'var(--color-primary)', backgroundColor: 'rgba(107, 142, 126, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
              <FilterX size={14} /> Filtered View: {filterLabels[activeFilter] || activeFilter}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-secondary" onClick={() => openReceiveModal()}>
            <ArrowDownToLine size={18} /> {t.receiveStock}
          </button>
          <button className="btn btn-ghost" onClick={() => openAdjustModal()}>
            <ArrowUpFromLine size={18} /> {t.adjustStock}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>{t.product}</th>
                <th>{t.category}</th>
                <th>{t.unitCost}</th>
                <th>{t.qtyOnHand}</th>
                <th>{t.totalValue}</th>
                <th>{t.action}</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(item => (
                <tr key={item.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{item.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-charcoal-light)' }}>{item.sku}</div>
                  </td>
                  <td>{item.category}</td>
                  <td>{formatCurrency(item.costPrice, settings)}</td>
                  <td>
                    <span 
                      style={{ 
                        fontWeight: 600, 
                        color: item.stock < 20 ? 'var(--color-danger)' : 'var(--color-success)',
                        background: item.stock < 20 ? 'rgba(217, 83, 79, 0.1)' : 'rgba(92, 184, 92, 0.1)',
                        padding: '0.2rem 0.5rem',
                        borderRadius: 'var(--radius-sm)'
                      }}>
                      {item.stock}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    {formatCurrency(item.costPrice * item.stock, settings)}
                  </td>
                  <td>
                    <button className="btn btn-ghost" style={{ padding: '0.25rem 0.5rem' }} onClick={() => openReceiveModal(item)}>{t.receive}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredProducts.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-charcoal-light)' }}>
              {t.noProducts}
            </div>
          )}
        </div>
      </div>

      {showReceiveModal && (
        <div className="modal-backdrop">
          <div className="modal-card receive-modal">
            <div className="modal-header">
              <div>
                <h2>{t.receiveStock}</h2>
                <p>Add physical stock and update weighted average cost.</p>
              </div>
              <button className="icon-button" onClick={() => setShowReceiveModal(false)} type="button">
                <X size={18} />
              </button>
            </div>

            {successMsg && (
              <div className="inline-alert inline-alert-success">
                <CheckCircle2 size={18} /> {successMsg}
              </div>
            )}

            {errorMsg && (
              <div className="inline-alert inline-alert-danger">
                <AlertTriangle size={18} /> {errorMsg}
              </div>
            )}

            <form onSubmit={handleReceiveSubmit}>
              <div className="form-group">
                <label className="form-label">Product</label>
                <select
                  className="form-input"
                  value={receiveForm.productId}
                  onChange={(event) => {
                    const product = products.find((item) => item.id === Number(event.target.value));
                    setReceiveForm({
                      ...receiveForm,
                      productId: event.target.value,
                      landedCost: product?.costPrice ? String(product.costPrice) : receiveForm.landedCost,
                    });
                  }}
                  required
                >
                  <option value="">Select product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.sku} | {product.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="receive-grid">
                <div className="form-group">
                  <label className="form-label">Quantity Received</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    value={receiveForm.quantity}
                    onChange={(event) => setReceiveForm({ ...receiveForm, quantity: event.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Landed Cost / Unit</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    className="form-input"
                    value={receiveForm.landedCost}
                    onChange={(event) => setReceiveForm({ ...receiveForm, landedCost: event.target.value })}
                    required
                  />
                </div>
              </div>

              {selectedProduct && (
                <div className="receive-preview">
                  <div>
                    <span>Current stock</span>
                    <strong>{selectedProduct.stock}</strong>
                  </div>
                  <div>
                    <span>Current cost</span>
                    <strong>{formatCurrency(selectedProduct.costPrice, settings)}</strong>
                  </div>
                  <div>
                    <span>New stock</span>
                    <strong>{selectedProduct.stock + (Number(receiveForm.quantity) || 0)}</strong>
                  </div>
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowReceiveModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Receiving...' : 'Confirm Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAdjustModal && (
        <div className="modal-backdrop">
          <div className="modal-card receive-modal">
            <div className="modal-header">
              <div>
                <h2>{t.adjustStock}</h2>
                <p>Correct stock counts after physical verification.</p>
              </div>
              <button className="icon-button" onClick={() => setShowAdjustModal(false)} type="button">
                <X size={18} />
              </button>
            </div>

            {successMsg && (
              <div className="inline-alert inline-alert-success">
                <CheckCircle2 size={18} /> {successMsg}
              </div>
            )}

            {errorMsg && (
              <div className="inline-alert inline-alert-danger">
                <AlertTriangle size={18} /> {errorMsg}
              </div>
            )}

            <form onSubmit={handleAdjustSubmit}>
              <div className="form-group">
                <label className="form-label">Product</label>
                <select
                  className="form-input"
                  value={adjustForm.productId}
                  onChange={(event) => setAdjustForm({ ...adjustForm, productId: event.target.value })}
                  required
                >
                  <option value="">Select product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.sku} | {product.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Adjustment Quantity</label>
                <input
                  type="number"
                  className="form-input"
                  value={adjustForm.quantity}
                  onChange={(event) => setAdjustForm({ ...adjustForm, quantity: event.target.value })}
                  placeholder="Use negative numbers to reduce stock"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Reason / Reference</label>
                <input
                  className="form-input"
                  value={adjustForm.reference}
                  onChange={(event) => setAdjustForm({ ...adjustForm, reference: event.target.value })}
                  placeholder="e.g. Physical count correction"
                />
              </div>

              {selectedAdjustProduct && (
                <div className="receive-preview">
                  <div>
                    <span>Current stock</span>
                    <strong>{selectedAdjustProduct.stock}</strong>
                  </div>
                  <div>
                    <span>Adjustment</span>
                    <strong>{Number(adjustForm.quantity) || 0}</strong>
                  </div>
                  <div>
                    <span>New stock</span>
                    <strong>{selectedAdjustProduct.stock + (Number(adjustForm.quantity) || 0)}</strong>
                  </div>
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowAdjustModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Adjusting...' : 'Confirm Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
