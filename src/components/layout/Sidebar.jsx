import React, { useContext } from 'react';
import { LayoutDashboard, Box, Package, ShoppingCart, Users, RefreshCw, ReceiptText, FileSpreadsheet, Settings, Shield, LogOut, HeartHandshake, X } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { LanguageContext } from '../../context/LanguageContext';
import { canAccessPage, getRoleProfile } from '../../config/roles';

export const Sidebar = ({ activePage, setActivePage, mobileOpen = false, closeMobile }) => {
  const { user, logout } = useContext(AuthContext);
  const { language, setLanguage, t } = useContext(LanguageContext);

  const baseMenuItems = [
    { id: 'Dashboard', name: t.dashboard, icon: <LayoutDashboard size={20} /> },
    { id: 'Products', name: t.products, icon: <Box size={20} /> },
    { id: 'Inventory', name: t.inventory, icon: <Package size={20} /> },
    { id: 'Purchasing', name: t.purchasing, icon: <ShoppingCart size={20} /> },
    { id: 'Suppliers', name: t.suppliers, icon: <Users size={20} /> },
    { id: 'Customers', name: t.customers, icon: <HeartHandshake size={20} /> },
    { id: 'Human Resources', name: t.humanResources, icon: <Users size={20} /> },
    { id: 'Production', name: t.production, icon: <RefreshCw size={20} /> },
    { id: 'Sales / POS', name: t.salesPos, icon: <ReceiptText size={20} /> },
    { id: 'Reporting', name: t.reporting, icon: <FileSpreadsheet size={20} /> }
  ];

  const adminMenuItems = [
    { id: 'User Administration', name: t.users, icon: <Shield size={20} /> },
    { id: 'Settings', name: t.settings, icon: <Settings size={20} /> },
  ];

  const menuItems = user?.role === 'admin' 
    ? [...baseMenuItems, ...adminMenuItems] 
    : baseMenuItems.filter((item) => canAccessPage(user?.role, item.id));
  const roleProfile = getRoleProfile(user?.role);

  return (
    <>
      <button
        className={`sidebar-backdrop ${mobileOpen ? 'is-open' : ''}`}
        type="button"
        aria-label="Close navigation"
        onClick={closeMobile}
      />
      <aside className={`app-sidebar ${mobileOpen ? 'is-open' : ''}`}>
      <div className="sidebar-header">
        <button className="sidebar-close" type="button" onClick={closeMobile} aria-label="Close navigation">
          <X size={20} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.6rem' }}>
          <img className="sidebar-logo" src="/logo.png" alt="Soul to Soul" />
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-charcoal-light)', textAlign: 'center' }}>{t.inventorySystem}</p>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.75rem' }}>
          <select className="language-select" value={language} onChange={(event) => setLanguage(event.target.value)} aria-label="Language">
            <option value="en">EN</option>
            <option value="pt">PT</option>
          </select>
        </div>
      </div>
      <nav className="sidebar-nav">
        {menuItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActivePage(item.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              width: '100%', padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-sm)',
              color: activePage === item.id ? 'var(--color-primary)' : 'var(--color-charcoal-light)',
              backgroundColor: activePage === item.id ? 'rgba(107, 142, 126, 0.1)' : 'transparent',
              fontWeight: activePage === item.id ? '600' : '500',
              textAlign: 'left'
            }}
          >
            {item.icon}
            {item.name}
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-charcoal)' }}>{user?.fullName}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-charcoal-light)' }}>{roleProfile.label}</span>
        </div>
        <button className="btn btn-ghost" style={{ padding: '0.5rem' }} onClick={logout} title={t.logout}>
          <LogOut size={18} />
        </button>
      </div>
      </aside>
    </>
  );
};
