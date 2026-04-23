import React, { useState, useContext } from 'react';
import { StoreProvider } from './context/StoreContext';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { Sidebar } from './components/layout/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Products } from './pages/Products';
import { Inventory } from './pages/Inventory';
import { Purchasing } from './pages/Purchasing';
import { Suppliers } from './pages/Suppliers';
import { Production } from './pages/Production';
import { SalesInsights } from './pages/SalesInsights';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { Users } from './pages/Users';
import { Login } from './pages/Login';

function AppContent() {
  const { user } = useContext(AuthContext);
  const [activePage, setActivePage] = useState('Dashboard');
  const [activeFilter, setActiveFilter] = useState(null);

  const navigateTo = (page, filter = null) => {
    setActivePage(page);
    setActiveFilter(filter);
  };

  const renderContent = () => {
    switch (activePage) {
      case 'Dashboard': return <Dashboard setActivePage={navigateTo} />;
      case 'Products': return <Products activeFilter={activeFilter} />;
      case 'Inventory': return <Inventory activeFilter={activeFilter} />;
      case 'Purchasing': return <Purchasing activeFilter={activeFilter} />;
      case 'Suppliers': return <Suppliers activeFilter={activeFilter} />;
      case 'Production': return <Production activeFilter={activeFilter} />;
      case 'Sales Insights': return <SalesInsights activeFilter={activeFilter} />;
      case 'Reporting': return <Reports activeFilter={activeFilter} />;
      case 'User Administration': return <Users />;
      case 'Settings': return <Settings />;
      default: return (
        <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'var(--color-charcoal-light)' }}>
          <h2 style={{ marginBottom: '1rem', color: 'var(--color-primary)' }}>{activePage}</h2>
          <p>This module is scheduled for future development.</p>
        </div>
      );
    }
  };

  if (!user) {
    return <Login />;
  }

  return (
    <StoreProvider>
      <div className="app-layout">
        <Sidebar activePage={activePage} setActivePage={navigateTo} />
        <main className="main-content">
          {renderContent()}
        </main>
      </div>
    </StoreProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
