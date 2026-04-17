import React from 'react';
import { LayoutDashboard, Box, Package, ShoppingCart, Users, RefreshCw, BarChart2, FileSpreadsheet } from 'lucide-react';

export const Sidebar = ({ activePage, setActivePage }) => {
  const menuItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Products', icon: <Box size={20} /> },
    { name: 'Inventory', icon: <Package size={20} /> },
    { name: 'Purchasing', icon: <ShoppingCart size={20} /> },
    { name: 'Suppliers', icon: <Users size={20} /> },
    { name: 'Production', icon: <RefreshCw size={20} /> },
    { name: 'Sales Insights', icon: <BarChart2 size={20} /> },
    { name: 'Reporting', icon: <FileSpreadsheet size={20} /> },
  ];

  return (
    <aside style={{ width: '260px', backgroundColor: 'var(--color-surface)', borderRight: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '2rem 1.5rem', borderBottom: '1px solid var(--color-border)' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--color-primary)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src="/logo.png" alt="Soul to Soul Logo" style={{ width: 24, height: 24, borderRadius: '4px', objectFit: 'cover' }} />
          Soul to Soul
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-charcoal-light)', marginTop: '0.25rem', paddingLeft: '20px' }}>Inventory System</p>
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
      <div style={{ padding: '1.5rem', borderTop: '1px solid var(--color-border)' }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--color-charcoal-light)', textAlign: 'center' }}>
          Simulated UI Preview
        </div>
      </div>
    </aside>
  );
};
