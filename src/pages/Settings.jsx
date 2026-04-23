import React, { useContext, useState, useEffect } from 'react';
import { StoreContext } from '../context/StoreContext';
import { Save, Building2, Coins } from 'lucide-react';

export const Settings = () => {
  const { settings, updateSettings } = useContext(StoreContext);
  const [formData, setFormData] = useState({
    companyName: '',
    companyLogo: '',
    defaultCurrency: 'MZN',
    currencySymbol: 'MT',
    decimalFormatting: 2
  });
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    if (settings) {
      setFormData({
        companyName: settings.companyName || '',
        companyLogo: settings.companyLogo || '',
        defaultCurrency: settings.defaultCurrency || 'MZN',
        currencySymbol: settings.currencySymbol || 'MT',
        decimalFormatting: settings.decimalFormatting ?? 2
      });
    }
  }, [settings]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMsg('');
    const result = await updateSettings(formData);
    if (result.success) {
      setStatusMsg('Settings successfully saved.');
    } else {
      setStatusMsg('Error: ' + result.error);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>System Settings</h1>
        <button className="btn btn-primary" onClick={handleSubmit}>
          <Save size={18} />
          Save Changes
        </button>
      </div>

      {statusMsg && (
        <div style={{ padding: '1rem', marginBottom: '2rem', backgroundColor: statusMsg.includes('Error') ? 'rgba(217,83,79,0.1)' : 'rgba(92,184,92,0.1)', color: statusMsg.includes('Error') ? 'var(--color-danger)' : 'var(--color-success)', borderRadius: '4px' }}>
          {statusMsg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '2rem' }}>
        <div className="card">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-bg)', paddingBottom: '0.5rem' }}>
            <Building2 size={20} className="text-primary" />
            Company Profile
          </h2>
          
          <div className="form-group">
            <label>Company Name</label>
            <input type="text" className="form-input" value={formData.companyName} onChange={e => setFormData({ ...formData, companyName: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Logo URL (Optional)</label>
            <input type="text" className="form-input" placeholder="https://..." value={formData.companyLogo} onChange={e => setFormData({ ...formData, companyLogo: e.target.value })} />
          </div>
        </div>

        <div className="card">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-bg)', paddingBottom: '0.5rem' }}>
            <Coins size={20} className="text-primary" />
            Financial Preferences
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Default Currency Code</label>
              <input type="text" className="form-input" placeholder="MZN" value={formData.defaultCurrency} onChange={e => setFormData({ ...formData, defaultCurrency: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Currency Symbol</label>
              <input type="text" className="form-input" placeholder="MT" value={formData.currencySymbol} onChange={e => setFormData({ ...formData, currencySymbol: e.target.value })} />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label>Decimal Formatting Places</label>
              <select className="form-input" value={formData.decimalFormatting} onChange={e => setFormData({ ...formData, decimalFormatting: Number(e.target.value) })}>
                <option value={0}>0 (e.g. MT 1500)</option>
                <option value={1}>1 (e.g. MT 1500.5)</option>
                <option value={2}>2 (e.g. MT 1500.50)</option>
              </select>
              <small style={{ display: 'block', marginTop: '0.5rem', color: 'var(--color-charcoal-light)' }}>
                This setting affects how financial data is physically displayed across metrics, spreadsheets, and tables. 
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
