import React, { useContext, useState } from 'react';
import { StoreContext } from '../context/StoreContext';
import { Plus } from 'lucide-react';

export const Products = () => {
  const { products, getMargin } = useContext(StoreContext);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Product Catalog</h1>
        <button className="btn btn-primary">
          <Plus size={18} />
          New Product
        </button>
      </div>

      <div className="card">
        <div style={{ display: 'flex', marginBottom: '1.5rem', gap: '1rem' }}>
          <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Search by product name or SKU..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select className="form-input" style={{ width: 'auto' }}>
            <option>All Categories</option>
            <option>Skincare</option>
            <option>Haircare</option>
            <option>Raw Material</option>
          </select>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Product Name</th>
                <th>Type</th>
                <th>Cost Price</th>
                <th>Selling Price</th>
                <th>Margin</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(item => {
                const margin = getMargin(item.costPrice, item.sellingPrice);
                // Highlight margins
                let marginColor = 'inherit';
                if (margin >= 60) marginColor = 'var(--color-success)';
                else if (margin > 0 && margin < 40) marginColor = 'var(--color-warning)';
                
                return (
                  <tr key={item.id}>
                    <td style={{ color: 'var(--color-charcoal-light)', fontSize: '0.8rem' }}>{item.sku}</td>
                    <td style={{ fontWeight: 500 }}>{item.name}</td>
                    <td>
                      <span className="badge" style={{ backgroundColor: 'var(--color-bg)' }}>{item.type}</span>
                    </td>
                    <td>${item.costPrice.toFixed(2)}</td>
                    <td>{item.sellingPrice > 0 ? `$${item.sellingPrice.toFixed(2)}` : '-'}</td>
                    <td style={{ color: marginColor, fontWeight: margin > 0 ? 600 : 400 }}>
                      {margin > 0 ? `${margin}%` : 'N/A'}
                    </td>
                    <td>
                      <span className={item.status === 'Active' ? 'badge badge-success' : 'badge badge-danger'}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
