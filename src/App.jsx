import React, { Suspense, lazy, useContext, useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
import { StoreProvider } from './context/StoreContext';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { LanguageProvider, LanguageContext } from './context/LanguageContext';
import { Sidebar } from './components/layout/Sidebar';
import { Login } from './pages/Login';
import { canAccessPage, getRoleProfile } from './config/roles';

const Dashboard = lazy(() => import('./pages/Dashboard').then((module) => ({ default: module.Dashboard })));
const Products = lazy(() => import('./pages/Products').then((module) => ({ default: module.Products })));
const Inventory = lazy(() => import('./pages/Inventory').then((module) => ({ default: module.Inventory })));
const Purchasing = lazy(() => import('./pages/Purchasing').then((module) => ({ default: module.Purchasing })));
const Suppliers = lazy(() => import('./pages/Suppliers').then((module) => ({ default: module.Suppliers })));
const Customers = lazy(() => import('./pages/Customers').then((module) => ({ default: module.Customers })));
const CommercialPartners = lazy(() => import('./pages/CommercialPartners').then((module) => ({ default: module.CommercialPartners })));
const FundRequests = lazy(() => import('./pages/FundRequests').then((module) => ({ default: module.FundRequests })));
const Notifications = lazy(() => import('./pages/Notifications').then((module) => ({ default: module.Notifications })));
const HumanResources = lazy(() => import('./pages/HumanResources').then((module) => ({ default: module.HumanResources })));
const Production = lazy(() => import('./pages/Production').then((module) => ({ default: module.Production })));
const SalesInsights = lazy(() => import('./pages/SalesInsights').then((module) => ({ default: module.SalesInsights })));
const Reports = lazy(() => import('./pages/Reports').then((module) => ({ default: module.Reports })));
const AuditLogs = lazy(() => import('./pages/AuditLogs').then((module) => ({ default: module.AuditLogs })));
const Settings = lazy(() => import('./pages/Settings').then((module) => ({ default: module.Settings })));
const Users = lazy(() => import('./pages/Users').then((module) => ({ default: module.Users })));
const HelpCenter = lazy(() => import('./pages/HelpCenter').then((module) => ({ default: module.HelpCenter })));
const OnlineStore = lazy(() => import('./pages/OnlineStore').then((module) => ({ default: module.OnlineStore })));

const PageLoading = () => (
  <div className="card page-loading" role="status" aria-live="polite">
    <div className="loading-orb" />
    <div>
      <strong>Loading module</strong>
      <span>Preparing Soul2Soul workspace...</span>
    </div>
  </div>
);

function AppContent() {
  const { user } = useContext(AuthContext);
  const { language } = useContext(LanguageContext);
  const publicStoreHosts = new Set(['soul2soulmz.com', 'www.soul2soulmz.com']);
  const isPublicStore =
    window.location.pathname.startsWith('/shop') ||
    (publicStoreHosts.has(window.location.hostname) && window.location.pathname === '/');
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
      case 'Fund Requests':
        return <FundRequests />;
      case 'Notifications':
        return <Notifications setActivePage={navigateTo} />;
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

  if (isPublicStore) {
    return (
      <Suspense fallback={<PageLoading />}>
        <OnlineStore />
      </Suspense>
    );
  }

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
            <Suspense fallback={<PageLoading />}>
              {renderContent()}
            </Suspense>
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
