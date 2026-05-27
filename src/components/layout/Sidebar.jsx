import React, { useContext } from 'react';
import { LayoutDashboard, Box, Package, ShoppingCart, Users, RefreshCw, ReceiptText, FileSpreadsheet, Settings, Shield, LogOut, HeartHandshake } from 'lucide-react';
import { StoreContext } from '../../context/StoreContext';
import { AuthContext } from '../../context/AuthContext';
import { LanguageContext } from '../../context/LanguageContext';
import { canAccessPage, getRoleProfile } from '../../config/roles';

export const Sidebar = ({ activePage, setActivePage }) => {
  const { settings } = useContext(StoreContext);
  const { user, logout } = useContext(AuthContext);
  const { language, setLanguage, t } = useContext(LanguageContext);

  const baseMenuItems = [
    { id: 'Dashboard', name: t.dashboard, icon: <LayoutDashboard size={20} /> },
    { id: 'Products', name: t.products, icon: <Box size={20} /> },
    { id: 'Inventory', name: t.inventory, icon: <Package size={20} /> },
    { id: 'Purchasing', name: t.purchasing, icon: <ShoppingCart size={20} /> },
    { id: 'Suppliers', name: t.suppliers, icon: <Users size={20} /> },
    { id: 'Customers', name: t.customers, icon: <HeartHandshake size={20} /> },
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
    <aside style={{ width: '260px', backgroundColor: 'var(--color-surface)', borderRight: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '1.5rem 1.25rem', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.6rem' }}>
          <img src="/logo.png" alt="Soul to Soul" style={{ width: "150px", maxHeight: "120px", objectFit: "contain" }} />
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-charcoal-light)', textAlign: 'center' }}>{t.inventorySystem}</p>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.75rem' }}>
          <select className="language-select" value={language} onChange={(event) => setLanguage(event.target.value)} aria-label="Language">
            <option value="en">EN</option>
            <option value="pt">PT</option>
          </select>
        </div>
      </div>
      <nav style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1, overflowY: 'auto' }}>
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
      <div style={{ padding: '1.5rem', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-charcoal)' }}>{user?.fullName}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-charcoal-light)' }}>{roleProfile.label}</span>
        </div>
        <button className="btn btn-ghost" style={{ padding: '0.5rem' }} onClick={logout} title={t.logout}>
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
};
