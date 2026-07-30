export const ROLE_PROFILES = {
  admin: {
    label: 'Administrator',
    description: 'Full access to all modules, settings, users, and permissions.',
    pages: ['Dashboard', 'Notifications', 'Products', 'Inventory', 'Purchasing', 'Suppliers', 'Customers', 'Sellers & Resellers', 'Human Resources', 'Fund Requests', 'Production', 'Sales / POS', 'Reporting', 'Audit Logs', 'User Administration', 'Settings', 'Help'],
    privileges: ['Full system control', 'Manage users and roles', 'Manage settings', 'View financial reports'],
  },
  manager: {
    label: 'Manager',
    description: 'Operational manager with access to sales, stock, reports, and production.',
    pages: ['Dashboard', 'Notifications', 'Products', 'Inventory', 'Purchasing', 'Suppliers', 'Customers', 'Sellers & Resellers', 'Human Resources', 'Fund Requests', 'Production', 'Sales / POS', 'Reporting', 'Audit Logs', 'Settings', 'Help'],
    privileges: ['View dashboard and reports', 'Manage products', 'Receive and adjust stock', 'Run sales, HR, production, and settings'],
  },
  cashier: {
    label: 'Cashier',
    description: 'Point-of-sale access for checkout and receipt generation.',
    pages: ['Notifications', 'Customers', 'Sales / POS', 'Fund Requests', 'Help'],
    privileges: ['Create sales', 'Print or generate receipts', 'View recent sales'],
  },
  salesperson: {
    label: 'Salesperson',
    description: 'Sales desk profile with POS and product visibility.',
    pages: ['Notifications', 'Products', 'Customers', 'Sales / POS', 'Fund Requests', 'Help'],
    privileges: ['Create sales', 'View products and prices', 'Generate receipts'],
  },
  stock_manager: {
    label: 'Stock Manager',
    description: 'Inventory and supplier control without user administration.',
    pages: ['Dashboard', 'Notifications', 'Products', 'Inventory', 'Purchasing', 'Suppliers', 'Production', 'Fund Requests', 'Help'],
    privileges: ['Manage products', 'Receive and adjust stock', 'Manage suppliers', 'Prepare production recipes'],
  },
  production_manager: {
    label: 'Production Manager',
    description: 'Manufacturing profile for recipes and production runs.',
    pages: ['Notifications', 'Products', 'Inventory', 'Production', 'Fund Requests', 'Help'],
    privileges: ['View products and stock', 'Manage production recipes', 'Run production batches'],
  },
  viewer: {
    label: 'Viewer',
    description: 'Read-only access for basic review.',
    pages: ['Dashboard', 'Notifications', 'Products', 'Inventory', 'Customers', 'Fund Requests', 'Help'],
    privileges: ['View operational dashboards', 'View products and stock'],
  },
  staff: {
    label: 'Staff',
    description: 'Legacy staff profile with basic sales access.',
    pages: ['Notifications', 'Products', 'Customers', 'Sales / POS', 'Fund Requests', 'Help'],
    privileges: ['Create sales', 'View products and prices'],
  },
};

export const getRoleProfile = (role) => ROLE_PROFILES[role] || ROLE_PROFILES.viewer;

export const canAccessPage = (role, page) => getRoleProfile(role).pages.includes(page);
