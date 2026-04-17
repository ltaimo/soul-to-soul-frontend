import React, { useContext } from 'react';
import { StoreContext } from '../context/StoreContext';
import { Plus, ExternalLink } from 'lucide-react';

export const Suppliers = () => {
  const { suppliers } = useContext(StoreContext);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Suppliers Directory</h1>
        <button className="btn btn-primary">
          <Plus size={18} /> Add Supplier
        </button>
      </div>
      
      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Supplier Name</th>
                <th>Category focus</th>
                <th>Standard Lead Time</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map(s => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td><span className="badge badge-primary">{s.category}</span></td>
                  <td>{s.leadTime}</td>
                  <td><span className={`badge ${s.status === 'Active' ? 'badge-success' : 'badge-danger'}`}>{s.status}</span></td>
                  <td>
                    <button className="btn btn-ghost" style={{ padding: '0.2rem 0.5rem' }}>View Profile <ExternalLink size={14} style={{marginLeft: '0.25rem'}} /></button>
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
