import React, { useState, useEffect, useContext } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell 
} from 'recharts';
import { TrendingUp, AlertCircle, Target, DollarSign, Package, Shield } from 'lucide-react';
import { formatCurrency, formatPercentage } from '../utils/formatters';
import { StoreContext } from '../context/StoreContext';
import { AuthContext } from '../context/AuthContext';

const COLORS = ['#6B8E7E', '#E8DCCB', '#2E2E2E', '#F7F5F2'];

export const Dashboard = ({ setActivePage }) => {
  const { settings } = useContext(StoreContext);
  const { token, logout, user } = useContext(AuthContext);
  const [kpis, setKpis] = useState(null);
  const [alerts, setAlerts] = useState(null);

  useEffect(() => {
    const fetchOptions = {
      headers: { 'Authorization': `Bearer ${token}` }
    };

    Promise.all([
      fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/analytics/kpis`, fetchOptions).then(r => { if(r.status===401) logout(); return r.json()}),
      fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/analytics/alerts`, fetchOptions).then(r => r.json())
    ]).then(([kpiData, alertsData]) => {
      setKpis(kpiData);
      setAlerts(alertsData);
    }).catch(err => console.error("Could not fetch analytics", err));
  }, [token, logout]);

  if (!kpis || !alerts) return <div style={{ padding: '2rem' }}>Loading BI Engine...</div>;

  const invPieData = Object.keys(kpis.inventoryBreakdown).map(key => ({
    name: key,
    value: kpis.inventoryBreakdown[key]
  })).filter(d => d.value > 0);

  const canSeeFinancials = role === 'Admin' || role === 'Manager';
  const canSeeAlerts = role === 'Admin' || role === 'Manager' || role === 'Inventory Staff';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Executive Dashboard</h1>
        
        {/* Role Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: 'var(--color-primary)', color: 'white', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <Shield size={18} />
          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Simulate View Role:</span>
          <select value={role} onChange={e => setRole(e.target.value)} style={{ border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(0,0,0,0.1)', color: 'white', fontWeight: 600, padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer', outline: 'none' }}>
            <option value="Admin" style={{color: 'black'}}>Admin</option>
            <option value="Manager" style={{color: 'black'}}>Manager</option>
            <option value="Inventory Staff" style={{color: 'black'}}>Inventory Staff</option>
            <option value="Viewer" style={{color: 'black'}}>Viewer (Read-Only)</option>
          </select>
        </div>
      </div>

      {canSeeFinancials && (
        <div className="stats-grid" style={{ marginBottom: '2rem' }}>
          <div className="stat-card">
            <div className="stat-label">Total Inventory Value</div>
            <div className="stat-value">{formatCurrency(kpis.totalInventoryValue, settings)}</div>
            <div className="stat-trend trend-up">
              <TrendingUp size={16} /> Based on exact WAC
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-label">Gross Profit (Ledger)</div>
            <div className="stat-value" style={{ color: 'var(--color-success)' }}>{formatCurrency(kpis.totalGrossProfit, settings)}</div>
            <div className="stat-trend">
              <DollarSign size={16} /> Tracked across {kpis.salesTrend.length} sales days
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Avg Profit Margin</div>
            <div className="stat-value">{formatPercentage(kpis.avgProfitMargin, settings)}</div>
            <div className="stat-trend">
              <Target size={16} /> Against strict Outbound COGS
            </div>
          </div>
        </div>
      )}

      {/* BI Charts Layer */}
      {canSeeFinancials && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
          <div className="card">
            <h3 style={{ marginBottom: '1.5rem', fontWeight: '600' }}>Sales vs COGS Trend</h3>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <LineChart data={kpis.salesTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <RechartsTooltip formatter={(value) => formatCurrency(value, settings)} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#6B8E7E" strokeWidth={3} name="Total Revenue" />
                  <Line type="monotone" dataKey="cogs" stroke="#D9534F" strokeWidth={3} name="Cost of Goods (COGS)" />
                  <Line type="monotone" dataKey="profit" stroke="#F0AD4E" strokeWidth={2} name="Gross Profit" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: '1.5rem', fontWeight: '600' }}>Inventory Value Setup</h3>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={invPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {invPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value) => formatCurrency(value, settings)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Operational Intelligence Alerts */}
      {canSeeAlerts && (
        <div className="card">
          <h3 style={{ marginBottom: '1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={20} className="text-danger" /> Operational Intelligence
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            <div 
              role="button"
              onClick={() => setActivePage ? setActivePage('Inventory', 'stock_out') : null}
              style={{ backgroundColor: 'rgba(217, 83, 79, 0.05)', padding: '1.5rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'background 0.2s' }}
            >
              <h4 style={{ color: 'var(--color-danger)', fontWeight: 600 }}>Stock-Out Alerts</h4>
              <p style={{ fontSize: '2rem', fontWeight: 700, margin: '0.5rem 0' }}>{alerts.stockOutCount}</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-charcoal-light)' }}>Click to review zero-bound inventory.</p>
            </div>

            <div 
              role="button"
              onClick={() => setActivePage ? setActivePage('Inventory', 'low_stock') : null}
              style={{ backgroundColor: 'rgba(240, 173, 78, 0.05)', padding: '1.5rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'background 0.2s' }}
            >
              <h4 style={{ color: 'var(--color-warning)', fontWeight: 600 }}>Low Stock Warnings</h4>
              <p style={{ fontSize: '2rem', fontWeight: 700, margin: '0.5rem 0' }}>{alerts.lowStockCount}</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-charcoal-light)' }}>Click to view items under threshold.</p>
            </div>

            <div 
              role="button"
              onClick={() => setActivePage ? setActivePage('Inventory', 'expiring') : null}
              style={{ backgroundColor: 'rgba(91, 192, 222, 0.05)', padding: '1.5rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'background 0.2s' }}
            >
              <h4 style={{ color: '#5bc0de', fontWeight: 600 }}>Expiring Soon (30d)</h4>
              <p style={{ fontSize: '2rem', fontWeight: 700, margin: '0.5rem 0' }}>{alerts.expiringCount}</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-charcoal-light)' }}>Tracked via batch history.</p>
            </div>
          </div>
        </div>
      )}

      {!canSeeFinancials && !canSeeAlerts && (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--color-charcoal-light)' }}>
          <Shield size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
          <h3>Access Restricted</h3>
          <p>Your simulated role '{role}' does not have permission to view the executive dashboard panels.</p>
        </div>
      )}
    </div>
  );
};
