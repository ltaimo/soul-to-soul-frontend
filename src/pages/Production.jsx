import React, { useState, useEffect, useContext } from 'react';
import { StoreContext } from '../context/StoreContext';
import { PlayCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const Production = () => {
  const { products, receiveGoods } = useContext(StoreContext); // Assuming StoreContext still holds latest products
  const [selectedProductId, setSelectedProductId] = useState('');
  const [targetQuantity, setTargetQuantity] = useState('');
  const [bomDetails, setBomDetails] = useState([]);
  const [successMsg, setSuccessMsg] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const selectedProduct = products.find(p => p.id === Number(selectedProductId));

  useEffect(() => {
    if (selectedProductId) {
      fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/production/bom/${selectedProductId}`)
        .then(res => res.json())
        .then(data => setBomDetails(data))
        .catch(err => console.error(err));
    } else {
      setBomDetails([]);
    }
  }, [selectedProductId]);

  const handleProduction = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!selectedProductId || !targetQuantity) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/production/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          finishedGoodId: Number(selectedProductId),
          targetQuantity: Number(targetQuantity)
        })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setSuccessMsg(true);
        // Force context reload in next step
        setTimeout(() => {
          setSuccessMsg(false);
          setSelectedProductId('');
          setTargetQuantity('');
          window.location.reload(); // Quick sync since we rely on DB now
        }, 2500);
      } else {
        setErrorMsg(data.message || 'Failed to execute production run.');
      }
    } catch (err) {
      setErrorMsg('Network error communicating with the backend.');
    }
  };

  const qtyToMake = Number(targetQuantity) || 0;

  // Pre-flight check calculation
  let preFlightPass = true;
  let totalCalculatedCost = 0;

  if (selectedProduct) {
    totalCalculatedCost += (selectedProduct.laborCostPerUnit || 0) * qtyToMake;
    totalCalculatedCost += (selectedProduct.overheadCostPerUnit || 0) * qtyToMake;
  }

  const checklist = bomDetails.map(item => {
    const required = item.quantityRequired * qtyToMake;
    const available = item.component.stock;
    const pass = available >= required;
    if (!pass && qtyToMake > 0) preFlightPass = false;
    
    totalCalculatedCost += required * item.component.costPrice;

    return { ...item, required, available, pass };
  });

  return (
    <div>
      <h1 className="page-title">Manufacturing & Production Module</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
        {/* Entry Form */}
        <div className="card">
          <h3 style={{ marginBottom: '1.5rem', fontWeight: '600' }}>Production Run Config</h3>
          
          {successMsg && (
            <div style={{ backgroundColor: 'rgba(92, 184, 92, 0.15)', color: 'var(--color-success)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={20} /> Production Batch successful! Ledger updated automatically.
            </div>
          )}

          {errorMsg && (
            <div style={{ backgroundColor: 'rgba(217, 83, 79, 0.15)', color: 'var(--color-danger)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={20} /> {errorMsg}
            </div>
          )}

          <form onSubmit={handleProduction}>
            <div className="form-group">
              <label className="form-label">Select Finished Good Algorithm</label>
              <select 
                className="form-input" 
                value={selectedProductId} 
                onChange={(e) => setSelectedProductId(e.target.value)}
                required
              >
                <option value="">-- Select Recipe --</option>
                {products.filter(p => p.type === 'Finished').map(p => (
                  <option key={p.id} value={p.id}>{p.sku} | {p.name}</option>
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
                onChange={(e) => setTargetQuantity(e.target.value)}
                placeholder="e.g. 50"
                required
              />
            </div>

            <div style={{ marginTop: '2rem' }}>
              <button 
                type="submit" 
                className={preFlightPass && qtyToMake > 0 ? "btn btn-primary" : "btn"} 
                style={{ width: '100%', fontSize: '1rem', padding: '1rem', backgroundColor: preFlightPass && qtyToMake > 0 ? '' : 'var(--color-charcoal-light)' }}
                disabled={!preFlightPass || qtyToMake <= 0}
              >
                <PlayCircle size={20} /> Execute & Lock BOM Transaction
              </button>
            </div>
          </form>
        </div>

        {/* Side Panel: Pre-Flight */}
        <div className="side-panel">
          <h3 style={{ marginBottom: '1.5rem', fontWeight: '600', color: 'var(--color-primary)' }}>Pre-Flight Checklist</h3>
          
          <div style={{ flex: 1 }}>
            {selectedProduct && bomDetails.length > 0 ? (
              <>
                <p style={{ fontSize: '0.875rem', marginBottom: '1rem', color: 'var(--color-charcoal-light)' }}>
                  Live verification of required raw materials for {qtyToMake} units.
                </p>

                {checklist.map(item => (
                  <div key={item.id} className="stat-row" style={{ backgroundColor: item.pass ? 'rgba(92,184,92,0.05)' : 'rgba(217,83,79,0.05)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '0.5rem' }}>
                    
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span className="stat-label" style={{ fontWeight: 600, color: 'var(--color-charcoal)' }}>{item.component.name}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-charcoal-light)' }}>
                        In Stock: {item.available}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
                      <span className="stat-value" style={{ color: item.pass ? 'var(--color-success)' : 'var(--color-danger)' }}>
                        Needs {item.required}
                      </span>
                    </div>

                  </div>
                ))}

                <div style={{ margin: '1.5rem 0', borderBottom: '1px dashed var(--color-border)' }}></div>

                <div className="stat-row">
                  <span className="stat-label">Total Material Cost</span>
                  <span className="stat-value">${(totalCalculatedCost - ((selectedProduct.laborCostPerUnit + selectedProduct.overheadCostPerUnit)*qtyToMake)).toFixed(2)}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Labor & Overhead Cost</span>
                  <span className="stat-value">${((selectedProduct.laborCostPerUnit + selectedProduct.overheadCostPerUnit)*qtyToMake).toFixed(2)}</span>
                </div>
                
                <div className="stat-row" style={{ backgroundColor: 'var(--color-bg)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginTop: '0.5rem' }}>
                  <span className="stat-label" style={{ color: 'var(--color-charcoal)' }}>Projected COGS / Unit</span>
                  <span className="stat-value" style={{ color: 'var(--color-primary)'}}>
                    {qtyToMake > 0 ? `$${(totalCalculatedCost / qtyToMake).toFixed(2)}` : '$0.00'}
                  </span>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--color-charcoal-light)' }}>
                {selectedProductId ? <p>Loading BOM constraints...</p> : <p>Select a recipe to verify stock constraints.</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
