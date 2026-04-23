import React, { useContext, useMemo } from 'react';
import { StoreContext } from '../context/StoreContext';
import { ArrowDownToLine, ArrowUpFromLine, FilterX } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

export const Inventory = ({ activeFilter }) => {
  const { products, settings } = useContext(StoreContext);

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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: '0.25rem' }}>Stock & Inventory</h1>
          {activeFilter && (
            <p style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.875rem', color: 'var(--color-primary)', backgroundColor: 'rgba(107, 142, 126, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
              <FilterX size={14} /> Filtered View: {filterLabels[activeFilter] || activeFilter}
            </p>
          )}
        </div>
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
                    <button className="btn btn-ghost" style={{ padding: '0.25rem 0.5rem' }}>View Log</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredProducts.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-charcoal-light)' }}>
              No products found matching the current filter.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
