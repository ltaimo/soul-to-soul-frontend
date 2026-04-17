import React, { useState } from 'react';
import { StoreProvider } from './context/StoreContext';
import { Sidebar } from './components/layout/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Products } from './pages/Products';
import { Inventory } from './pages/Inventory';
import { Purchasing } from './pages/Purchasing';
import { Suppliers } from './pages/Suppliers';

import { Production } from './pages/Production';
import { SalesInsights } from './pages/SalesInsights';
import { Reports } from './pages/Reports';

function App() {
  const [activePage, setActivePage] = useState('Dashboard');

  const renderContent = () => {
    switch (activePage) {
      case 'Dashboard': return <Dashboard setActivePage={setActivePage} />;
      case 'Products': return <Products />;
      case 'Inventory': return <Inventory />;
      case 'Purchasing': return <Purchasing />;
      case 'Suppliers': return <Suppliers />;
      case 'Production': return <Production />;
      case 'Sales Insights': return <SalesInsights />;
      case 'Reporting': return <Reports />;
      default: return (
        <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'var(--color-charcoal-light)' }}>
          <h2 style={{ marginBottom: '1rem', color: 'var(--color-primary)' }}>{activePage}</h2>
          <p>This module is scheduled for future development.</p>
        </div>
      );
    }
  };

  return (
    <StoreProvider>
      <div className="app-layout">
        <Sidebar activePage={activePage} setActivePage={setActivePage} />
        <main className="main-content">
          {renderContent()}
        </main>
      </div>
    </StoreProvider>
  );
}

export default App;
