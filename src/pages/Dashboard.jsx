import React, { useState, useEffect, useContext } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell 
} from 'recharts';
import { TrendingUp, AlertCircle, Target, DollarSign, Package, Shield } from 'lucide-react';
import { formatCurrency, formatPercentage } from '../utils/formatters';
import { StoreContext } from '../context/StoreContext';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';

const COLORS = ['#6B8E7E', '#E8DCCB', '#2E2E2E', '#F7F5F2'];

export const Dashboard = ({ setActivePage }) => {
  const { settings } = useContext(StoreContext);
  const { token, logout, user } = useContext(AuthContext);
  const { translate } = useContext(LanguageContext);
  const [kpis, setKpis] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const canSeeFinancials = user?.role === 'admin' || user?.role === 'manager';
  const canSeeAlerts = ['admin', 'manager', 'stock_manager', 'production_manager', 'viewer'].includes(user?.role);

  useEffect(() => {
    const fetchOptions = {
      headers: { 'Authorization': `Bearer ${token}` }
    };

    const requests = [
      canSeeFinancials
        ? fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/analytics/kpis`, fetchOptions).then(r => { if(r.status===401) logout(); return r.json()})
        : Promise.resolve(null),
      canSeeAlerts
        ? fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/analytics/alerts`, fetchOptions).then(r => { if(r.status===401) logout(); return r.json()})
        : Promise.resolve(null)
    ];

    Promise.all(requests).then(([kpiData, alertsData]) => {
      setKpis(kpiData);
      setAlerts(alertsData);
    }).catch(err => console.error("Could not fetch analytics", err));
  }, [token, logout, canSeeFinancials, canSeeAlerts]);

  if ((canSeeFinancials && !kpis) || (canSeeAlerts && !alerts)) return <div style={{ padding: '2rem' }}>{translate('loadingBi')}</div>;

  const invPieData = Object.keys(kpis?.inventoryBreakdown || {}).map(key => ({
    name: key,
    value: kpis.inventoryBreakdown[key]
  })).filter(d => d.value > 0);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title" style={{ marginBottom: 0 }}>{translate('executiveDashboard')}</h1>
      </div>

      {canSeeFinancials && (
        <div className="stats-grid" style={{ marginBottom: '2rem' }}>
          <div className="stat-card">
            <div className="stat-label">{translate('totalInventoryValue')}</div>
            <div className="stat-value">{formatCurrency(kpis.totalInventoryValue, settings)}</div>
            <div className="stat-trend trend-up">
              <TrendingUp size={16} /> {translate('basedOnExactWac')}
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-label">{translate('grossProfitLedger')}</div>
            <div className="stat-value" style={{ color: 'var(--color-success)' }}>{formatCurrency(kpis.totalGrossProfit, settings)}</div>
            <div className="stat-trend">
              <DollarSign size={16} /> {translate('trackedAcrossSalesDays', { count: kpis.salesTrend.length })}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">{translate('avgProfitMargin')}</div>
            <div className="stat-value">{formatPercentage(kpis.avgProfitMargin, settings)}</div>
            <div className="stat-trend">
              <Target size={16} /> {translate('againstStrictCogs')}
            </div>
          </div>
        </div>
      )}

      {/* BI Charts Layer */}
      {canSeeFinancials && (
        <div className="dashboard-chart-grid">
          <div className="card">
            <h3 style={{ marginBottom: '1.5rem', fontWeight: '600' }}>{translate('salesVsCogsTrend')}</h3>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <LineChart data={kpis.salesTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <RechartsTooltip formatter={(value) => formatCurrency(value, settings)} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#6B8E7E" strokeWidth={3} name={translate('totalRevenue')} />
                  <Line type="monotone" dataKey="cogs" stroke="#D9534F" strokeWidth={3} name={translate('costOfGoods')} />
                  <Line type="monotone" dataKey="profit" stroke="#F0AD4E" strokeWidth={2} name={translate('grossProfit')} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: '1.5rem', fontWeight: '600' }}>{translate('inventoryValueSetup')}</h3>
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
            <AlertCircle size={20} className="text-danger" /> {translate('operationalIntelligence')}
          </h3>
          
          <div className="dashboard-alert-grid">
            <div 
              role="button"
              onClick={() => setActivePage ? setActivePage('Inventory', 'stock_out') : null}
              style={{ backgroundColor: 'rgba(217, 83, 79, 0.05)', padding: '1.5rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'background 0.2s' }}
            >
              <h4 style={{ color: 'var(--color-danger)', fontWeight: 600 }}>{translate('stockOutAlerts')}</h4>
              <p style={{ fontSize: '2rem', fontWeight: 700, margin: '0.5rem 0' }}>{alerts.stockOutCount}</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-charcoal-light)' }}>{translate('reviewZeroBound')}</p>
            </div>

            <div 
              role="button"
              onClick={() => setActivePage ? setActivePage('Inventory', 'low_stock') : null}
              style={{ backgroundColor: 'rgba(240, 173, 78, 0.05)', padding: '1.5rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'background 0.2s' }}
            >
              <h4 style={{ color: 'var(--color-warning)', fontWeight: 600 }}>{translate('lowStockWarnings')}</h4>
              <p style={{ fontSize: '2rem', fontWeight: 700, margin: '0.5rem 0' }}>{alerts.lowStockCount}</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-charcoal-light)' }}>{translate('viewUnderThreshold')}</p>
            </div>

            <div 
              style={{ backgroundColor: 'rgba(91, 192, 222, 0.05)', padding: '1.5rem', borderRadius: 'var(--radius-sm)' }}
            >
              <h4 style={{ color: '#5bc0de', fontWeight: 600 }}>{translate('expiringSoon')}</h4>
              <p style={{ fontSize: '2rem', fontWeight: 700, margin: '0.5rem 0' }}>{alerts.expiringCount}</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-charcoal-light)' }}>{translate('trackedViaBatch')}</p>
            </div>
          </div>
        </div>
      )}

      {!canSeeFinancials && !canSeeAlerts && (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--color-charcoal-light)' }}>
          <Shield size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
          <h3>{translate('accessRestricted')}</h3>
          <p>{translate('dashboardRestricted', { role: user?.role })}</p>
        </div>
      )}
    </div>
  );
};
