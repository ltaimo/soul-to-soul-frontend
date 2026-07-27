import React, { useState, useContext } from 'react';
import { StoreContext } from '../context/StoreContext';
import { AlertTriangle, ArrowDownToLine, CheckCircle2 } from 'lucide-react';

export const Purchasing = () => {
  const { products, suppliers, warehouses, receiveGoods, calculateProjectedWAC, getMargin } = useContext(StoreContext);
  
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [receivedQty, setReceivedQty] = useState('');
  const [landedCost, setLandedCost] = useState('');
  const [successMsg, setSuccessMsg] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedProduct = products.find(p => p.id === Number(selectedProductId));
  const activeWarehouses = warehouses.filter((warehouse) => warehouse.status !== 'Inactive');
  const defaultWarehouseId = activeWarehouses.find((warehouse) => warehouse.isDefault)?.id || activeWarehouses[0]?.id || '';
  
  const handleReceive = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!selectedProductId || !receivedQty || !landedCost || !(selectedWarehouseId || defaultWarehouseId)) return;

    setSubmitting(true);
    const result = await receiveGoods(
      Number(selectedProductId),
      Number(receivedQty),
      Number(landedCost),
      selectedSupplierId ? Number(selectedSupplierId) : undefined,
      Number(selectedWarehouseId || defaultWarehouseId)
    );
    setSubmitting(false);

    if (!result.success) {
      setErrorMsg(result.error || 'Could not receive stock.');
      return;
    }

    setSuccessMsg(true);
    setTimeout(() => {
      setSuccessMsg(false);
      setSelectedProductId('');
      setSelectedSupplierId('');
      setSelectedWarehouseId('');
      setReceivedQty('');
      setLandedCost('');
    }, 2500);
  };

  // Projections
  const rQty = Number(receivedQty) || 0;
  const lCost = Number(landedCost) || 0;
  const currentQty = selectedProduct ? selectedProduct.stock : 0;
  const currentCost = selectedProduct ? selectedProduct.costPrice : 0;
  
  const projectedWac = selectedProduct ? calculateProjectedWAC(currentQty, currentCost, rQty, lCost) : 0;
  const projectedMargin = selectedProduct ? getMargin(projectedWac, selectedProduct.sellingPrice) : 0;

  return (
    <div>
      <h1 className="page-title">Receive Goods (Purchasing)</h1>
      
      <div className="purchasing-grid">
        {/* Entry Form */}
        <div className="card">
          <h3 style={{ marginBottom: '1.5rem', fontWeight: '600' }}>Inbound Shipment Entry</h3>
          
          {successMsg && (
            <div style={{ backgroundColor: 'rgba(92, 184, 92, 0.15)', color: 'var(--color-success)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={20} /> Inventory updated and WAC recalculated successfully!
            </div>
          )}

          {errorMsg && (
            <div className="inline-alert inline-alert-danger">
              <AlertTriangle size={18} /> {errorMsg}
            </div>
          )}

          <form onSubmit={handleReceive}>
            <div className="form-group">
              <label className="form-label">Select Product / Material</label>
              <select 
                className="form-input" 
                value={selectedProductId} 
                onChange={(e) => setSelectedProductId(e.target.value)}
                required
              >
                <option value="">-- Select Item --</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.sku} | {p.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Supplier</label>
              <select
                className="form-input"
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
              >
                <option value="">Use product supplier / no supplier</option>
                {suppliers.filter((supplier) => supplier.status !== 'Inactive').map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Destination Warehouse</label>
              <select
                className="form-input"
                value={selectedWarehouseId || defaultWarehouseId}
                onChange={(e) => setSelectedWarehouseId(e.target.value)}
                required
              >
                <option value="">-- Select Warehouse --</option>
                {activeWarehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                ))}
              </select>
            </div>
            
            <div className="form-grid-2">
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Quantity Received</label>
                <input 
                  type="number" 
                  className="form-input" 
                  min="1"
                  value={receivedQty}
                  onChange={(e) => setReceivedQty(e.target.value)}
                  placeholder="e.g. 100"
                  required
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Landed Unit Cost ($)</label>
                <input 
                  type="number" 
                  step="0.01"
                  min="0"
                  className="form-input" 
                  value={landedCost}
                  onChange={(e) => setLandedCost(e.target.value)}
                  placeholder="e.g. 14.50"
                  required
                />
              </div>
            </div>

            <div style={{ marginTop: '2rem' }}>
              <button type="submit" className="btn btn-primary" disabled={submitting} style={{ width: '100%', fontSize: '1rem', padding: '1rem' }}>
                <ArrowDownToLine size={20} /> {submitting ? 'Receiving...' : 'Confirm Receipt & Update Ledger'}
              </button>
            </div>
          </form>
        </div>

        {/* Side Panel: Projections */}
        <div className="side-panel">
          <h3 style={{ marginBottom: '1.5rem', fontWeight: '600', color: 'var(--color-primary)' }}>Impact Projections</h3>
          
          <div style={{ flex: 1 }}>
            {selectedProduct ? (
              <>
                <div className="stat-row">
                  <span className="stat-label">Current Stock</span>
                  <span className="stat-value">{currentQty} units</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Current WAC</span>
                  <span className="stat-value">${currentCost.toFixed(2)}</span>
                </div>
                
                <div style={{ margin: '1.5rem 0', borderBottom: '1px dashed var(--color-border)' }}></div>
                
                <div className="stat-row">
                  <span className="stat-label">Received Quantity</span>
                  <span className="stat-value" style={{ color: 'var(--color-primary)' }}>+{rQty} units</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Landed Unit Cost</span>
                  <span className="stat-value">${lCost.toFixed(2)}</span>
                </div>

                <div style={{ margin: '1.5rem 0', borderBottom: '1px dashed var(--color-border)' }}></div>

                <div className="stat-row" style={{ backgroundColor: 'var(--color-bg)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '0.5rem' }}>
                  <span className="stat-label" style={{ color: 'var(--color-charcoal)' }}>Projected New WAC</span>
                  <span className="stat-value" style={{ color: projectedWac > currentCost ? 'var(--color-danger)' : 'var(--color-success)'}}>${projectedWac.toFixed(2)}</span>
                </div>
                
                <div className="stat-row" style={{ backgroundColor: 'var(--color-bg)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                  <span className="stat-label" style={{ color: 'var(--color-charcoal)' }}>Projected Gross Margin</span>
                  <span className="stat-value" style={{ color: projectedMargin >= 60 ? 'var(--color-success)' : 'var(--color-warning)' }}>
                    {selectedProduct.sellingPrice > 0 ? `${projectedMargin}%` : 'N/A'}
                  </span>
                </div>
                {selectedProduct.sellingPrice > 0 && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-charcoal-light)', marginTop: '0.75rem', textAlign: 'right' }}>
                    Based on selling price: <strong>${selectedProduct.sellingPrice.toFixed(2)}</strong>
                  </p>
                )}
              </>
            ) : (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--color-charcoal-light)' }}>
                <p>Select a product to view the projected impact on cost and margins.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
