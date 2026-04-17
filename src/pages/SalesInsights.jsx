import React, { useState, useEffect, useContext } from 'react';
import { StoreContext } from '../context/StoreContext';
import { ShoppingBag, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const SalesInsights = () => {
  const { products } = useContext(StoreContext);
  const [salesRecord, setSalesRecord] = useState([]);
  
  const [selectedProductId, setSelectedProductId] = useState('');
  const [sellQty, setSellQty] = useState('');
  const [customerName, setCustomerName] = useState('');
  
  const [successMsg, setSuccessMsg] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchSales = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/sales`);
      const data = await res.json();
      setSalesRecord(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  const selectedProduct = products.find(p => p.id === Number(selectedProductId));
  const quantity = Number(sellQty) || 0;
  
  // Real-time margin preview
  let projectedRevenue = 0;
  let projectedCOGS = 0;
  let projectedMargin = 0;
  let sufficientStock = true;

  if (selectedProduct) {
    projectedRevenue = selectedProduct.sellingPrice * quantity;
    projectedCOGS = selectedProduct.costPrice * quantity;
    if (projectedRevenue > 0) {
      projectedMargin = ((projectedRevenue - projectedCOGS) / projectedRevenue) * 100;
    }
    if (quantity > selectedProduct.stock) sufficientStock = false;
  }

  const handleSale = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!selectedProductId || quantity <= 0) return;

    if (!sufficientStock) {
      setErrorMsg(`Cannot process sale. Only ${selectedProduct.stock} units available.`);
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/sales/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName || 'Retail Customer',
          items: [{ productId: Number(selectedProductId), quantity }]
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setSuccessMsg(true);
        setTimeout(() => {
          setSuccessMsg(false);
          setSelectedProductId('');
          setSellQty('');
          setCustomerName('');
          window.location.reload(); // Quick sync for prototype
        }, 1500);
      } else {
        setErrorMsg(data.message || 'Failed to process sale.');
      }
    } catch (err) {
      setErrorMsg('Network error communicating with the backend.');
    }
  };

  return (
    <div>
      <h1 className="page-title">Sales Orders & Revenue Tracker</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '2rem' }}>
        
        {/* Outbound Sale Terminal */}
        <div className="card">
          <h3 style={{ marginBottom: '1.5rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingBag size={20} className="text-primary" /> New Outbound Sale
          </h3>
          
          {successMsg && (
            <div style={{ backgroundColor: 'rgba(92,184,92,0.15)', color: 'var(--color-success)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={20} /> Sale registered successfully!
            </div>
          )}

          {errorMsg && (
            <div style={{ backgroundColor: 'rgba(217,83,79,0.15)', color: 'var(--color-danger)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={20} /> {errorMsg}
            </div>
          )}

          <form onSubmit={handleSale}>
            <div className="form-group">
              <label className="form-label">Select Final Product</label>
              <select className="form-input" value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)} required>
                <option value="">-- Choose Product --</option>
                {products.filter(p => p.type === 'Finished' || p.sellingPrice > 0).map(p => (
                  <option key={p.id} value={p.id}>{p.sku} | {p.name} (${p.sellingPrice.toFixed(2)})</option>
                ))}
              </select>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Quantity Sold</label>
                <input type="number" className="form-input" min="1" value={sellQty} onChange={(e) => setSellQty(e.target.value)} required />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Customer Reference (Optional)</label>
              <input type="text" className="form-input" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="e.g. Sephora PO-991" />
            </div>

            {selectedProduct && (
              <div style={{ backgroundColor: sufficientStock ? 'rgba(107,142,126,0.05)' : 'rgba(217,83,79,0.05)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                  <span className="text-muted">Stock Availability:</span>
                  <span style={{ fontWeight: 600, color: sufficientStock ? 'var(--color-success)' : 'var(--color-danger)'}}>
                    {selectedProduct.stock} units
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                  <span className="text-muted">Est. Revenue:</span>
                  <span style={{ fontWeight: 600 }}>${projectedRevenue.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span className="text-muted">Gross Margin Return:</span>
                  <span style={{ fontWeight: 600, color: projectedMargin > 50 ? 'var(--color-success)' : 'var(--color-warning)' }}>
                    {projectedMargin.toFixed(1)}%
                  </span>
                </div>
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem', opacity: !sufficientStock ? 0.5 : 1 }} disabled={!sufficientStock}>
              Confirm Checkout & Lock COGS
            </button>
          </form>
        </div>

        {/* Ledger */}
        <div className="card">
          <h3 style={{ marginBottom: '1.5rem', fontWeight: '600' }}>Historical Sales Ledger</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Revenue</th>
                  <th>Locked COGS</th>
                  <th>Gross Margin</th>
                </tr>
              </thead>
              <tbody>
                {salesRecord.length === 0 ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-charcoal-light)' }}>No sales logged yet.</td></tr>
                ) : (
                  salesRecord.map((sale) => {
                    const d = new Date(sale.date);
                    const margin = sale.totalRevenue > 0 ? (((sale.totalRevenue - sale.totalCogs) / sale.totalRevenue) * 100) : 0;
                    return (
                      <tr key={sale.id}>
                        <td style={{ fontSize: '0.875rem' }}>{d.toLocaleDateString()} {d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                        <td style={{ fontWeight: 500 }}>{sale.customerName}</td>
                        <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>${sale.totalRevenue.toFixed(2)}</td>
                        <td style={{ color: 'var(--color-danger)' }}>${sale.totalCogs.toFixed(2)}</td>
                        <td>
                          <span className={`badge ${margin > 50 ? 'badge-success' : 'badge-warning'}`}>
                            {margin.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};
