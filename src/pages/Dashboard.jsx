import React, { useCallback, useState, useEffect, useContext } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell 
} from 'recharts';
import { TrendingUp, AlertCircle, Target, DollarSign, Package, Shield, Warehouse, ArrowRightLeft, Users, HeartHandshake, ShieldCheck, RefreshCw, Trophy } from 'lucide-react';
import { formatCurrency, formatPercentage } from '../utils/formatters';
import { StoreContext } from '../context/StoreContext';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';

const COLORS = ['#6B8E7E', '#E8DCCB', '#2E2E2E', '#F7F5F2'];
const SELLER_RANKING_PERIODS = [
  { key: 'today', labelKey: 'today' },
  { key: 'this_week', labelKey: 'thisWeek' },
  { key: 'this_month', labelKey: 'thisMonth' },
  { key: 'this_year', labelKey: 'thisYear' },
];

export const Dashboard = ({ setActivePage }) => {
  const { settings } = useContext(StoreContext);
  const { token, logout, user } = useContext(AuthContext);
  const { translate } = useContext(LanguageContext);
  const [kpis, setKpis] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [sellerRankings, setSellerRankings] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const canSeeFinancials = user?.role === 'admin' || user?.role === 'manager';
  const canSeeAlerts = ['admin', 'manager', 'stock_manager', 'production_manager', 'viewer'].includes(user?.role);

  const loadAnalytics = useCallback(async () => {
    setIsRefreshing(true);
    const fetchOptions = {
      cache: 'no-store',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cache-Control': 'no-cache',
      }
    };
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
    const stamp = Date.now();

    const sellerRankingRequest = canSeeFinancials
      ? Promise.all(SELLER_RANKING_PERIODS.map(async (period) => {
          const response = await fetch(`${apiBase}/api/analytics/seller-ranking?period=${period.key}&_=${stamp}`, fetchOptions);
          if (response.status === 401) logout();
          if (!response.ok) return [period.key, []];
          return [period.key, await response.json()];
        })).then((entries) => Object.fromEntries(entries))
      : Promise.resolve({});

    const requests = [
      canSeeFinancials
        ? fetch(`${apiBase}/api/analytics/kpis?_=${stamp}`, fetchOptions).then(r => { if(r.status===401) logout(); return r.json()})
        : Promise.resolve(null),
      canSeeAlerts
        ? fetch(`${apiBase}/api/analytics/alerts?_=${stamp}`, fetchOptions).then(r => { if(r.status===401) logout(); return r.json()})
        : Promise.resolve(null),
      sellerRankingRequest
    ];

    return Promise.all(requests).then(([kpiData, alertsData, sellerRankingData]) => {
      setKpis(kpiData);
      setAlerts(alertsData);
      setSellerRankings(sellerRankingData || {});
      setLastUpdated(new Date());
    }).catch(err => console.error("Could not fetch analytics", err))
      .finally(() => setIsRefreshing(false));
  }, [canSeeAlerts, canSeeFinancials, logout, token]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  if ((canSeeFinancials && !kpis) || (canSeeAlerts && !alerts)) return <div style={{ padding: '2rem' }}>{translate('loadingBi')}</div>;

  const invPieData = Object.keys(kpis?.inventoryBreakdown || {}).map(key => ({
    name: key,
    value: kpis.inventoryBreakdown[key]
  })).filter(d => d.value > 0);
  const monthlySellerRanking = sellerRankings.this_month || [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ marginBottom: 0 }}>{translate('executiveDashboard')}</h1>
          {lastUpdated && (
            <p className="page-subtitle" style={{ marginTop: '0.25rem' }}>
              {translate('dashboardLastUpdated', { time: lastUpdated.toLocaleTimeString() })}
            </p>
          )}
        </div>
        <button className="btn btn-secondary" type="button" onClick={loadAnalytics} disabled={isRefreshing}>
          <RefreshCw size={16} className={isRefreshing ? 'spin-icon' : ''} />
          {translate('refreshDashboard')}
        </button>
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

      {canSeeFinancials && (
        <div className="stats-grid" style={{ marginBottom: '2rem' }}>
          <div className="stat-card" role="button" onClick={() => setActivePage ? setActivePage('Inventory') : null}>
            <div className="stat-label">Warehouses</div>
            <div className="stat-value">{kpis.activeWarehouseCount || 0}/{kpis.warehouseCount || 0}</div>
            <div className="stat-trend"><Warehouse size={16} /> {kpis.totalWarehouseUnits || 0} units across locations</div>
          </div>
          <div className="stat-card" role="button" onClick={() => setActivePage ? setActivePage('Inventory') : null}>
            <div className="stat-label">Stock In Transit</div>
            <div className="stat-value">{kpis.inTransitTransferCount || 0}</div>
            <div className="stat-trend"><ArrowRightLeft size={16} /> {kpis.transferUnitsInTransit || 0} units moving</div>
          </div>
          <div className="stat-card" role="button" onClick={() => setActivePage ? setActivePage('Human Resources') : null}>
            <div className="stat-label">HR Pending Payments</div>
            <div className="stat-value">{formatCurrency(kpis.pendingPaymentsValue || 0, settings)}</div>
            <div className="stat-trend"><Users size={16} /> {kpis.activeEmployees || 0} active workers</div>
          </div>
          <div className="stat-card" role="button" onClick={() => setActivePage ? setActivePage('Human Resources') : null}>
            <div className="stat-label">Goals & Deadlines</div>
            <div className="stat-value">{kpis.openGoals || 0}</div>
            <div className="stat-trend"><Target size={16} /> {kpis.overdueGoals || 0} overdue goals</div>
          </div>
          <div className="stat-card" role="button" onClick={() => setActivePage ? setActivePage('Customers') : null}>
            <div className="stat-label">Loyalty Customers</div>
            <div className="stat-value">{kpis.loyaltyCustomerCount || 0}</div>
            <div className="stat-trend"><HeartHandshake size={16} /> {kpis.loyaltyPointsIssued || 0} points currently issued</div>
          </div>
          <div className="stat-card" role="button" onClick={() => setActivePage ? setActivePage('Sellers & Resellers') : null}>
            <div className="stat-label">Commercial Partners</div>
            <div className="stat-value">{kpis.activeCommercialPartners || 0}</div>
            <div className="stat-trend"><DollarSign size={16} /> {formatCurrency(kpis.commissionPayable || 0, settings)} commissions</div>
          </div>
          <div className="stat-card" role="button" onClick={() => setActivePage ? setActivePage('Audit Logs') : null}>
            <div className="stat-label">Audit Events Today</div>
            <div className="stat-value">{kpis.auditEventsToday || 0}</div>
            <div className="stat-trend"><ShieldCheck size={16} /> User actions tracked</div>
          </div>
        </div>
      )}

      {canSeeFinancials && (
        <section className="seller-ranking-section" aria-labelledby="seller-ranking-title">
          <div className="seller-ranking-header">
            <div>
              <h2 id="seller-ranking-title">
                <Trophy size={20} />
                {translate('bestSellers')}
              </h2>
              <p>{translate('bestSellersHint')}</p>
            </div>
            <button className="btn btn-secondary" type="button" onClick={() => setActivePage ? setActivePage('Sales / POS') : null}>
              <DollarSign size={16} />
              {translate('openSales')}
            </button>
          </div>

          <div className="seller-ranking-periods">
            {SELLER_RANKING_PERIODS.map((period) => {
              const leader = sellerRankings[period.key]?.[0];
              return (
                <div className="seller-ranking-period" key={period.key}>
                  <span>{translate(period.labelKey)}</span>
                  {leader ? (
                    <>
                      <strong>{leader.sellerName || translate('unassignedSeller')}</strong>
                      <b>{formatCurrency(leader.netPaid || 0, settings)}</b>
                      <small>
                        {leader.sales || 0} {translate('sales').toLowerCase()} - {leader.units || 0} {translate('units').toLowerCase()} - {formatCurrency(leader.averageTicket || 0, settings)} {translate('avgTicket')}
                      </small>
                    </>
                  ) : (
                    <>
                      <strong>{translate('noSellerSales')}</strong>
                      <b>{formatCurrency(0, settings)}</b>
                      <small>{translate('noSellerSalesHint')}</small>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <div className="seller-ranking-table-wrap">
            <h3>{translate('monthlySellerRanking')}</h3>
            {monthlySellerRanking.length > 0 ? (
              <div className="table-container seller-ranking-table">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>{translate('seller')}</th>
                      <th>{translate('netSales')}</th>
                      <th>{translate('sales')}</th>
                      <th>{translate('units')}</th>
                      <th>{translate('avgTicket')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlySellerRanking.slice(0, 5).map((seller, index) => (
                      <tr key={seller.sellerId || seller.sellerName || index}>
                        <td>{index + 1}</td>
                        <td>{seller.sellerName || translate('unassignedSeller')}</td>
                        <td>{formatCurrency(seller.netPaid || 0, settings)}</td>
                        <td>{seller.sales || 0}</td>
                        <td>{seller.units || 0}</td>
                        <td>{formatCurrency(seller.averageTicket || 0, settings)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="seller-ranking-empty">{translate('noSellerSalesHint')}</p>
            )}
          </div>
        </section>
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

          <div className="card">
            <h3 style={{ marginBottom: '1.5rem', fontWeight: '600' }}>Warehouse Value</h3>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={kpis.warehouseValueBreakdown || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartsTooltip formatter={(value) => formatCurrency(value, settings)} />
                  <Bar dataKey="value" fill="#6B8E7E" name="Inventory Value" />
                </BarChart>
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

            <div 
              role="button"
              onClick={() => setActivePage ? setActivePage('Inventory') : null}
              style={{ backgroundColor: 'rgba(107, 142, 126, 0.08)', padding: '1.5rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
            >
              <h4 style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Transfers In Transit</h4>
              <p style={{ fontSize: '2rem', fontWeight: 700, margin: '0.5rem 0' }}>{alerts.inTransitTransferCount || 0}</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-charcoal-light)' }}>{alerts.inTransitUnits || 0} units waiting for reception.</p>
            </div>

            <div 
              role="button"
              onClick={() => setActivePage ? setActivePage('Human Resources') : null}
              style={{ backgroundColor: 'rgba(46, 46, 46, 0.05)', padding: '1.5rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
            >
              <h4 style={{ color: 'var(--color-charcoal)', fontWeight: 600 }}>Pending Payments</h4>
              <p style={{ fontSize: '2rem', fontWeight: 700, margin: '0.5rem 0' }}>{alerts.pendingPaymentCount || 0}</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-charcoal-light)' }}>{formatCurrency(alerts.pendingPaymentValue || 0, settings)} pending.</p>
            </div>

            <div 
              role="button"
              onClick={() => setActivePage ? setActivePage('Human Resources') : null}
              style={{ backgroundColor: 'rgba(217, 83, 79, 0.05)', padding: '1.5rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
            >
              <h4 style={{ color: 'var(--color-danger)', fontWeight: 600 }}>Overdue Goals</h4>
              <p style={{ fontSize: '2rem', fontWeight: 700, margin: '0.5rem 0' }}>{alerts.overdueGoals || 0}</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-charcoal-light)' }}>Targets and deadlines need review.</p>
            </div>
          </div>
        </div>
      )}

      {canSeeFinancials && kpis.recentActivity?.length > 0 && (
        <div className="card" style={{ marginTop: '2rem' }}>
          <h3 style={{ marginBottom: '1rem', fontWeight: 600 }}>Recent System Activity</h3>
          <div className="table-container">
            <table>
              <thead><tr><th>Date</th><th>User</th><th>Action</th><th>Module</th></tr></thead>
              <tbody>
                {kpis.recentActivity.map((log) => (
                  <tr key={log.id}>
                    <td>{new Date(log.createdAt).toLocaleString()}</td>
                    <td>{log.userName || log.userEmail || 'System'}</td>
                    <td>{log.method} {log.path}</td>
                    <td><span className="badge badge-primary">{log.entityType || '-'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
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
