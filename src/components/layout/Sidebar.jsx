import React, { useContext } from 'react';
import { LayoutDashboard, Box, Package, ShoppingCart, Users, RefreshCw, BarChart2, FileSpreadsheet, Settings, Shield, LogOut } from 'lucide-react';
import { StoreContext } from '../../context/StoreContext';
import { AuthContext } from '../../context/AuthContext';
import logo from '../../assets/logo.png';

export const Sidebar = ({ activePage, setActivePage }) => {
  const { settings } = useContext(StoreContext);
  const { user, logout } = useContext(AuthContext);

  const baseMenuItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Products', icon: <Box size={20} /> },
    { name: 'Inventory', icon: <Package size={20} /> },
    { name: 'Purchasing', icon: <ShoppingCart size={20} /> },
    { name: 'Suppliers', icon: <Users size={20} /> },
    { name: 'Production', icon: <RefreshCw size={20} /> },
    { name: 'Sales Insights', icon: <BarChart2 size={20} /> },
    { name: 'Reporting', icon: <FileSpreadsheet size={20} /> }
  ];

  const adminMenuItems = [
    { name: 'User Administration', icon: <Shield size={20} /> },
    { name: 'Settings', icon: <Settings size={20} /> },
  ];

  const menuItems = user?.role === 'admin' 
    ? [...baseMenuItems, ...adminMenuItems] 
    : baseMenuItems;

  return (
    <aside style={{ width: '260px', backgroundColor: 'var(--color-surface)', borderRight: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '2rem 1.5rem', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', marginBottom: '0.25rem' }}>
          <img src={logo} alt="Soul to Soul" style={{ height: "50px", objectFit: "contain" }} />
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-charcoal-light)', marginTop: '0.25rem' }}>Inventory System</p>
      </div>
      <nav style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1, overflowY: 'auto' }}>
        {menuItems.map(item => (
          <button
            key={item.name}
            onClick={() => setActivePage(item.name)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              width: '100%', padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-sm)',
              color: activePage === item.name ? 'var(--color-primary)' : 'var(--color-charcoal-light)',
              backgroundColor: activePage === item.name ? 'rgba(107, 142, 126, 0.1)' : 'transparent',
              fontWeight: activePage === item.name ? '600' : '500',
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
          <span style={{ fontSize: '0.75rem', color: 'var(--color-charcoal-light)', textTransform: 'capitalize' }}>{user?.role}</span>
        </div>
        <button className="btn btn-ghost" style={{ padding: '0.5rem' }} onClick={logout} title="Logout">
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
};
