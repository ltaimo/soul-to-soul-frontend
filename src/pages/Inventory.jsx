import React, { useContext } from 'react';
import { StoreContext } from '../context/StoreContext';
import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';

export const Inventory = () => {
  const { products } = useContext(StoreContext);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Stock & Inventory</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-secondary">
            <ArrowDownToLine size={18} /> Receive Stock
          </button>
          <button className="btn btn-ghost">
            <ArrowUpFromLine size={18} /> Adjust Stock
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Unit Cost</th>
                <th>Qty on Hand</th>
                <th>Total Value</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {products.map(item => (
                <tr key={item.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{item.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-charcoal-light)' }}>{item.sku}</div>
                  </td>
                  <td>{item.category}</td>
                  <td>${item.costPrice.toFixed(2)}</td>
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
                    ${(item.costPrice * item.stock).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td>
                    <button className="btn btn-ghost" style={{ padding: '0.25rem 0.5rem' }}>View Log</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
