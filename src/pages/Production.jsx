import React, { useContext, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, PlayCircle, Plus, Trash2 } from 'lucide-react';
import { StoreContext } from '../context/StoreContext';
import { AuthContext } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatters';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const Production = () => {
  const { products, settings, refreshData } = useContext(StoreContext);
  const { token, logout } = useContext(AuthContext);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [targetQuantity, setTargetQuantity] = useState('');
  const [bomDetails, setBomDetails] = useState([]);
  const [componentId, setComponentId] = useState('');
  const [quantityRequired, setQuantityRequired] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loadingBom, setLoadingBom] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const selectedProduct = products.find((product) => product.id === Number(selectedProductId));
  const qtyToMake = Number(targetQuantity) || 0;

  const fetchWithAuth = async (url, options = {}) => {
    const headers = { ...options.headers, Authorization: `Bearer ${token}` };
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
      logout();
      throw new Error('Session expired. Please log in again.');
    }
    return res;
  };

  const finishedGoods = useMemo(() => {
    return products
      .filter((product) => product.status !== 'Inactive' && (product.type === 'Finished Good' || product.type === 'Finished' || product.sellingPrice > 0))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  const componentProducts = useMemo(() => {
    return products
      .filter((product) => product.id !== Number(selectedProductId) && product.status !== 'Inactive')
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products, selectedProductId]);

  const fetchBom = async (productId) => {
    if (!productId) {
      setBomDetails([]);
      return;
    }
    setLoadingBom(true);
    setErrorMsg('');
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/production/bom/${productId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not load recipe.');
      setBomDetails(data);
    } catch (error) {
      setErrorMsg(error.message || 'Could not load recipe.');
      setBomDetails([]);
    } finally {
      setLoadingBom(false);
    }
  };

  useEffect(() => {
    fetchBom(selectedProductId);
  }, [selectedProductId]);

  const checklist = bomDetails.map((item) => {
    const required = item.quantityRequired * qtyToMake;
    const available = item.component.stock;
    const pass = qtyToMake > 0 ? available >= required : true;
    const cost = required * item.component.costPrice;
    return { ...item, required, available, pass, cost };
  });

  const preFlightPass = checklist.length > 0 && checklist.every((item) => item.pass);
  const materialCost = checklist.reduce((acc, item) => acc + item.cost, 0);
  const laborOverhead = selectedProduct
    ? ((selectedProduct.laborCostPerUnit || 0) + (selectedProduct.overheadCostPerUnit || 0)) * qtyToMake
    : 0;
  const totalCalculatedCost = materialCost + laborOverhead;

  const handleAddComponent = async (event) => {
    event.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!selectedProductId || !componentId || Number(quantityRequired) <= 0) {
      setErrorMsg('Select a finished good, component, and valid quantity required.');
      return;
    }

    try {
      const response = await fetchWithAuth(`${API_BASE}/api/production/bom`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          finishedGoodId: Number(selectedProductId),
          componentId: Number(componentId),
          quantityRequired: Number(quantityRequired),
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'Could not save recipe component.');
      setComponentId('');
      setQuantityRequired('');
      setSuccessMsg('Recipe component saved.');
      await fetchBom(selectedProductId);
    } catch (error) {
      setErrorMsg(error.message || 'Could not save recipe component.');
    }
  };

  const handleDeleteComponent = async (id) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const response = await fetchWithAuth(`${API_BASE}/api/production/bom/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'Could not remove component.');
      setSuccessMsg('Recipe component removed.');
      await fetchBom(selectedProductId);
    } catch (error) {
      setErrorMsg(error.message || 'Could not remove component.');
    }
  };

  const handleProduction = async (event) => {
    event.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!selectedProductId || qtyToMake <= 0) {
      setErrorMsg('Select a recipe and target quantity.');
      return;
    }
    if (bomDetails.length === 0) {
      setErrorMsg('Add at least one recipe component before running production.');
      return;
    }
    if (!preFlightPass) {
      setErrorMsg('Insufficient component stock for this production run.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetchWithAuth(`${API_BASE}/api/production/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          finishedGoodId: Number(selectedProductId),
          targetQuantity: qtyToMake,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'Failed to execute production run.');

      setSuccessMsg(`Production batch ${data.batchNumber} completed.`);
      setTargetQuantity('');
      await Promise.all([refreshData(), fetchBom(selectedProductId)]);
    } catch (error) {
      setErrorMsg(error.message || 'Network error communicating with the backend.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="page-title">Manufacturing & Production</h1>

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

      <div className="production-grid">
        <section className="card">
          <div className="section-heading">
            <h3>Production Run</h3>
            <span>{finishedGoods.length} finished goods</span>
          </div>

          <form onSubmit={handleProduction}>
            <div className="form-group">
              <label className="form-label">Finished Good</label>
              <select
                className="form-input"
                value={selectedProductId}
                onChange={(event) => setSelectedProductId(event.target.value)}
                required
              >
                <option value="">Select finished product</option>
                {finishedGoods.map((product) => (
                  <option key={product.id} value={product.id}>{product.sku} | {product.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Target Quantity to Manufacture</label>
              <input
                type="number"
                className="form-input"
                min="1"
                value={targetQuantity}
                onChange={(event) => setTargetQuantity(event.target.value)}
                placeholder="e.g. 50"
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary pos-submit"
              disabled={submitting || !preFlightPass || qtyToMake <= 0}
            >
              <PlayCircle size={20} /> {submitting ? 'Running Production...' : 'Execute Production'}
            </button>
          </form>
        </section>

        <section className="card">
          <div className="section-heading">
            <h3>Recipe / BOM</h3>
            <span>{bomDetails.length} components</span>
          </div>

          <form onSubmit={handleAddComponent} className="bom-form">
            <div className="form-group">
              <label className="form-label">Component</label>
              <select
                className="form-input"
                value={componentId}
                onChange={(event) => setComponentId(event.target.value)}
                disabled={!selectedProductId}
              >
                <option value="">Select component</option>
                {componentProducts.map((product) => (
                  <option key={product.id} value={product.id}>{product.sku} | {product.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Qty Required / Unit</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                className="form-input"
                value={quantityRequired}
                onChange={(event) => setQuantityRequired(event.target.value)}
                disabled={!selectedProductId}
              />
            </div>
            <button type="submit" className="btn btn-secondary" disabled={!selectedProductId}>
              <Plus size={18} /> Add / Update
            </button>
          </form>

          <div className="bom-list">
            {loadingBom ? (
              <div className="empty-cart">Loading recipe...</div>
            ) : bomDetails.length === 0 ? (
              <div className="empty-cart">No recipe components yet. Add components to enable production.</div>
            ) : (
              bomDetails.map((item) => (
                <div className="bom-row" key={item.id}>
                  <div>
                    <strong>{item.component.name}</strong>
                    <span>{item.quantityRequired} per unit - Stock: {item.component.stock}</span>
                  </div>
                  <button className="icon-danger" type="button" onClick={() => handleDeleteComponent(item.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="side-panel production-preflight">
          <h3 style={{ marginBottom: '1.5rem', fontWeight: '600', color: 'var(--color-primary)' }}>Pre-Flight Checklist</h3>
          {selectedProduct && bomDetails.length > 0 ? (
            <>
              <p style={{ fontSize: '0.875rem', marginBottom: '1rem', color: 'var(--color-charcoal-light)' }}>
                Required materials for {qtyToMake || 0} units of {selectedProduct.name}.
              </p>

              {checklist.map((item) => (
                <div key={item.id} className="stat-row" style={{ backgroundColor: item.pass ? 'rgba(92,184,92,0.05)' : 'rgba(217,83,79,0.05)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span className="stat-label" style={{ fontWeight: 600, color: 'var(--color-charcoal)' }}>{item.component.name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-charcoal-light)' }}>In Stock: {item.available}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
                    <span className="stat-value" style={{ color: item.pass ? 'var(--color-success)' : 'var(--color-danger)' }}>Needs {item.required}</span>
                  </div>
                </div>
              ))}

              <div style={{ margin: '1.5rem 0', borderBottom: '1px dashed var(--color-border)' }}></div>
              <div className="stat-row"><span className="stat-label">Material Cost</span><span className="stat-value">{formatCurrency(materialCost, settings)}</span></div>
              <div className="stat-row"><span className="stat-label">Labor & Overhead</span><span className="stat-value">{formatCurrency(laborOverhead, settings)}</span></div>
              <div className="stat-row" style={{ backgroundColor: 'var(--color-bg)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginTop: '0.5rem' }}>
                <span className="stat-label" style={{ color: 'var(--color-charcoal)' }}>Projected COGS / Unit</span>
                <span className="stat-value" style={{ color: 'var(--color-primary)' }}>
                  {qtyToMake > 0 ? formatCurrency(totalCalculatedCost / qtyToMake, settings) : formatCurrency(0, settings)}
                </span>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', minHeight: '220px', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--color-charcoal-light)' }}>
              {selectedProductId ? <p>Add recipe components to verify stock constraints.</p> : <p>Select a finished product to begin.</p>}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
