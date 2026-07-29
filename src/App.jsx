import React, { useContext, useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
import { StoreProvider } from './context/StoreContext';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { LanguageProvider, LanguageContext } from './context/LanguageContext';
import { Sidebar } from './components/layout/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Products } from './pages/Products';
import { Inventory } from './pages/Inventory';
import { Purchasing } from './pages/Purchasing';
import { Suppliers } from './pages/Suppliers';
import { Customers } from './pages/Customers';
import { CommercialPartners } from './pages/CommercialPartners';
import { HumanResources } from './pages/HumanResources';
import { Production } from './pages/Production';
import { SalesInsights } from './pages/SalesInsights';
import { Reports } from './pages/Reports';
import { AuditLogs } from './pages/AuditLogs';
import { Settings } from './pages/Settings';
import { Users } from './pages/Users';
import { HelpCenter } from './pages/HelpCenter';
import { Login } from './pages/Login';
import { canAccessPage, getRoleProfile } from './config/roles';

function AppContent() {
  const { user } = useContext(AuthContext);
  const { language } = useContext(LanguageContext);
  const [activePage, setActivePage] = useState('Dashboard');
  const [activeFilter, setActiveFilter] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigateTo = (page, filter = null) => {
    setActivePage(page);
    setActiveFilter(filter);
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    if (user && !canAccessPage(user.role, activePage)) {
      setActivePage(getRoleProfile(user.role).pages[0] || 'Dashboard');
      setActiveFilter(null);
    }
  }, [user, activePage]);

  const renderContent = () => {
    if (!canAccessPage(user?.role, activePage)) {
      return (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <h2 style={{ color: 'var(--color-primary)', marginBottom: '0.75rem' }}>
            {language === 'pt' ? 'Acesso restrito' : 'Access restricted'}
          </h2>
          <p className="page-subtitle">
            {language === 'pt'
              ? 'O teu perfil nao tem permissao para abrir este modulo.'
              : 'Your profile does not have permission to open this module.'}
          </p>
        </div>
      );
    }

    switch (activePage) {
      case 'Dashboard':
        return <Dashboard setActivePage={navigateTo} />;
      case 'Products':
        return <Products activeFilter={activeFilter} />;
      case 'Inventory':
        return <Inventory activeFilter={activeFilter} />;
      case 'Purchasing':
        return <Purchasing activeFilter={activeFilter} />;
      case 'Suppliers':
        return <Suppliers activeFilter={activeFilter} />;
      case 'Customers':
        return <Customers activeFilter={activeFilter} />;
      case 'Sellers & Resellers':
        return <CommercialPartners />;
      case 'Human Resources':
        return <HumanResources />;
      case 'Production':
        return <Production activeFilter={activeFilter} />;
      case 'Sales / POS':
        return <SalesInsights activeFilter={activeFilter} />;
      case 'Reporting':
        return <Reports activeFilter={activeFilter} />;
      case 'Audit Logs':
        return <AuditLogs />;
      case 'User Administration':
        return <Users />;
      case 'Settings':
        return <Settings />;
      case 'Help':
        return <HelpCenter />;
      default:
        return (
          <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'var(--color-charcoal-light)' }}>
            <h2 style={{ marginBottom: '1rem', color: 'var(--color-primary)' }}>{activePage}</h2>
            <p>{language === 'pt' ? 'Este modulo esta previsto para desenvolvimento futuro.' : 'This module is scheduled for future development.'}</p>
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
        <Sidebar
          activePage={activePage}
          setActivePage={navigateTo}
          mobileOpen={mobileMenuOpen}
          closeMobile={() => setMobileMenuOpen(false)}
        />
        <div className="app-workspace">
          <header className="mobile-app-bar">
            <button
              className="mobile-menu-button"
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={22} />
            </button>
            <div>
              <strong>{activePage}</strong>
              <span>Soul2Soul</span>
            </div>
          </header>
          <main className="main-content">
            {renderContent()}
          </main>
        </div>
      </div>
    </StoreProvider>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
