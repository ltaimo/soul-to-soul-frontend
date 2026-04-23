import React, { useContext, useState } from 'react';
import { StoreContext } from '../context/StoreContext';
import { Plus, X, Edit, Trash2 } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

const initialFormData = {
  name: '',
  sku: '',
  category: 'Skincare',
  type: 'Finished Good',
  unit: 'pcs',
  costPrice: '',
  sellingPrice: '',
  minStock: 0,
  initialStock: 0,
  status: 'Active',
  brand: '',
  description: '',
  barcode: ''
};

export const Products = () => {
  const { products, settings, getMargin, createProduct, updateProduct, deactivateProduct } = useContext(StoreContext);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [editId, setEditId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openCreate = () => {
    setFormData(initialFormData);
    setEditId(null);
    setIsEditing(false);
    setErrorMsg('');
    setShowModal(true);
  };

  const openEdit = (prod) => {
    setFormData({
      name: prod.name,
      sku: prod.sku,
      category: prod.category,
      type: prod.type,
      unit: prod.unit || 'pcs',
      costPrice: prod.costPrice,
      sellingPrice: prod.sellingPrice || '',
      minStock: prod.minStock || 0,
      initialStock: 0, // Cannot edit initial stock
      status: prod.status,
      brand: prod.brand || '',
      description: prod.description || '',
      barcode: prod.barcode || ''
    });
    setEditId(prod.id);
    setIsEditing(true);
    setErrorMsg('');
    setShowModal(true);
  };

  const handleDeactivate = async (id, currentStatus) => {
    if (currentStatus === 'Inactive') return;
    if (window.confirm('Are you sure you want to deactivate this product?')) {
      await deactivateProduct(id);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    // Frontend Validations
    if (!formData.name || !formData.sku || !formData.unit) {
      setErrorMsg('Name, SKU, and Unit are required.');
      return;
    }
    if (formData.initialStock > 0 && (!formData.costPrice || formData.costPrice <= 0)) {
      setErrorMsg('Cost Price is severely required when importing initial stock.');
      return;
    }
    if (formData.type === 'Finished Good' && (!formData.sellingPrice || formData.sellingPrice <= 0)) {
      setErrorMsg('Selling Price is correctly required for Finished Goods.');
      return;
    }

    let response;
    if (isEditing) {
      response = await updateProduct(editId, formData);
    } else {
      response = await createProduct(formData);
    }

    if (response.success) {
      setShowModal(false);
    } else {
      setErrorMsg(response.error || 'Failed to save product.');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Product Catalog</h1>
        <button className="btn btn-primary" onClick={openCreate}>
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
            <option>Packaging</option>
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(item => {
                const margin = getMargin(item.costPrice, item.sellingPrice);
                let marginColor = 'inherit';
                if (margin >= 60) marginColor = 'var(--color-success)';
                else if (margin > 0 && margin < 40) marginColor = 'var(--color-warning)';
                
                return (
                  <tr key={item.id} style={{ opacity: item.status === 'Inactive' ? 0.6 : 1 }}>
                    <td style={{ color: 'var(--color-charcoal-light)', fontSize: '0.8rem' }}>{item.sku}</td>
                    <td style={{ fontWeight: 500 }}>{item.name}</td>
                    <td>
                      <span className="badge" style={{ backgroundColor: 'var(--color-bg)' }}>{item.type}</span>
                    </td>
                    <td>{formatCurrency(item.costPrice, settings)}</td>
                    <td>{item.sellingPrice > 0 ? formatCurrency(item.sellingPrice, settings) : '-'}</td>
                    <td style={{ color: marginColor, fontWeight: margin > 0 ? 600 : 400 }}>
                      {margin > 0 ? `${margin}%` : 'N/A'}
                    </td>
                    <td>
                      <span className={item.status === 'Active' ? 'badge badge-success' : 'badge badge-danger'}>
                        {item.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                         <button className="btn btn-ghost" style={{ padding: '0.25rem 0.5rem' }} onClick={() => openEdit(item)}>
                           <Edit size={16} />
                         </button>
                         {item.status === 'Active' && (
                           <button className="btn btn-ghost" style={{ padding: '0.25rem 0.5rem', color: 'var(--color-danger)' }} onClick={() => handleDeactivate(item.id, item.status)}>
                             <Trash2 size={16} />
                           </button>
                         )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, 
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="card" style={{ width: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{isEditing ? 'Edit Product' : 'Create New Product'}</h2>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>

            {errorMsg && (
              <div style={{ backgroundColor: 'rgba(217,83,79,0.1)', color: 'var(--color-danger)', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Product Name *</label>
                  <input type="text" className="form-input" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>SKU / Code *</label>
                  <input type="text" className="form-input" required value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} disabled={isEditing} />
                </div>

                <div className="form-group">
                  <label>Type *</label>
                  <select className="form-input" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                    <option value="Finished Good">Finished Good</option>
                    <option value="Raw Material">Raw Material</option>
                    <option value="Packaging">Packaging</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Category *</label>
                  <input type="text" className="form-input" required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
                </div>

                <div className="form-group">
                  <label>Cost Price *</label>
                  <input type="number" step="0.01" className="form-input" required={formData.initialStock > 0} value={formData.costPrice} onChange={e => setFormData({...formData, costPrice: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Selling Price</label>
                  <input type="number" step="0.01" className="form-input" required={formData.type === 'Finished Good'} value={formData.sellingPrice} onChange={e => setFormData({...formData, sellingPrice: e.target.value})} />
                </div>

                <div className="form-group">
                  <label>Unit of Measure *</label>
                  <input type="text" className="form-input" placeholder="e.g. pcs, kg, ml" required value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Minimum Stock (Alert)</label>
                  <input type="number" className="form-input" value={formData.minStock} onChange={e => setFormData({...formData, minStock: e.target.value})} />
                </div>

                {!isEditing && (
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label>Initial Physical Stock (Optional)</label>
                    <input type="number" className="form-input" value={formData.initialStock} onChange={e => setFormData({...formData, initialStock: e.target.value})} />
                    <small style={{ color: 'var(--color-charcoal-light)', display: 'block', marginTop: '4px' }}>Creates an INITIAL_ADJUSTMENT ledger entry internally.</small>
                  </div>
                )}
                
                <h3 style={{ gridColumn: 'span 2', fontSize: '1rem', marginTop: '1rem', color: 'var(--color-charcoal-light)' }}>Optional Details</h3>
                
                <div className="form-group">
                  <label>Brand</label>
                  <input type="text" className="form-input" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>UPC / Barcode</label>
                  <input type="text" className="form-input" value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>Description</label>
                  <textarea className="form-input" rows="2" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{isEditing ? 'Save Changes' : 'Create Product'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
