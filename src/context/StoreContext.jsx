import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from './AuthContext';
import { buildNotifications } from '../utils/notifications';

export const StoreContext = createContext();

const calculatePayrollTotals = (payments = []) => payments.reduce(
  (acc, payment) => ({
    gross: acc.gross + (Number(payment.amount) || 0),
    paid: acc.paid + (payment.status === 'Paid' ? Number(payment.amount) || 0 : 0),
    pending: acc.pending + (payment.status === 'Paid' ? 0 : Number(payment.amount) || 0),
    paidCount: acc.paidCount + (payment.status === 'Paid' ? 1 : 0),
    pendingCount: acc.pendingCount + (payment.status === 'Paid' ? 0 : 1),
  }),
  { gross: 0, paid: 0, pending: 0, paidCount: 0, pendingCount: 0 }
);

const updateHrSummaryPaymentTotals = (summary, previousPayments, updatedPayment) => {
  const nextPayments = previousPayments.map((payment) => payment.id === updatedPayment.id ? updatedPayment : payment);
  const pendingPayments = nextPayments
    .filter((payment) => payment.status === 'Pending')
    .reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
  const paidPayments = nextPayments
    .filter((payment) => payment.status === 'Paid')
    .reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
  return { ...summary, pendingPayments, paidPayments };
};

export const StoreProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [warehouseStock, setWarehouseStock] = useState([]);
  const [stockTransfers, setStockTransfers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [sales, setSales] = useState([]);
  const [commercialPartners, setCommercialPartners] = useState([]);
  const [fundRequests, setFundRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [hrPayments, setHrPayments] = useState([]);
  const [payrollSheet, setPayrollSheet] = useState(null);
  const [workGoals, setWorkGoals] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [hrSummary, setHrSummary] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [settings, setSettings] = useState({
    companyName: 'Soul2Soul',
    companyPhone: '',
    companyWhatsApp: '',
    companyEmail: '',
    companyAddress: '',
    companyWebsite: '',
    instagramUrl: '',
    facebookUrl: '',
    tiktokUrl: '',
    defaultCurrency: 'MZN',
    currencySymbol: 'MT',
    decimalFormatting: 2,
    hrPaymentTypesOptions: ['Salary', 'Rent', 'Advance', 'Bonus', 'Transport', 'Utilities', 'Commission', 'Other'].map((label) => ({ label, active: true })),
    paymentMethodsOptions: ['Cash', 'M-Pesa', 'E-Mola', 'Card', 'Bank Transfer'].map((label) => ({ label, active: true })),
    warehouseTypesOptions: ['Warehouse', 'Shop', 'Storage', 'Transit'].map((label) => ({ label, active: true })),
    productCategoriesOptions: ['Skincare', 'Haircare', 'Beard Care', 'Raw Material', 'Packaging'].map((label) => ({ label, active: true })),
    productTypesOptions: ['Finished Good', 'Raw Material', 'Packaging'].map((label) => ({ label, active: true })),
    productUnitsOptions: ['pcs', 'kg', 'g', 'l', 'ml', 'box'].map((label) => ({ label, active: true })),
    attendanceStatusesOptions: ['Present', 'Absent', 'Late', 'Half Day', 'Leave'].map((label) => ({ label, active: true })),
    payFrequenciesOptions: ['Monthly', 'Weekly', 'Daily', 'Hourly'].map((label) => ({ label, active: true })),
    hrRolesOptions: ['Manager', 'Cashier', 'Salesperson', 'Stock Manager', 'Production Assistant', 'Administrator'].map((label) => ({ label, active: true })),
    hrDepartmentsOptions: ['Sales', 'Store', 'Warehouse', 'Production', 'Administration', 'Finance'].map((label) => ({ label, active: true })),
    hrPaymentTypesList: ['Salary', 'Rent', 'Advance', 'Bonus', 'Transport', 'Utilities', 'Commission', 'Other'],
    paymentMethodsList: ['Cash', 'M-Pesa', 'E-Mola', 'Card', 'Bank Transfer'],
    warehouseTypesList: ['Warehouse', 'Shop', 'Storage', 'Transit'],
    productCategoriesList: ['Skincare', 'Haircare', 'Beard Care', 'Raw Material', 'Packaging'],
    productTypesList: ['Finished Good', 'Raw Material', 'Packaging'],
    productUnitsList: ['pcs', 'kg', 'g', 'l', 'ml', 'box'],
    attendanceStatusesList: ['Present', 'Absent', 'Late', 'Half Day', 'Leave'],
    payFrequenciesList: ['Monthly', 'Weekly', 'Daily', 'Hourly'],
    hrRolesList: ['Manager', 'Cashier', 'Salesperson', 'Stock Manager', 'Production Assistant', 'Administrator'],
    hrDepartmentsList: ['Sales', 'Store', 'Warehouse', 'Production', 'Administration', 'Finance']
  });
  const [loading, setLoading] = useState(true);
  const { token, logout, user } = useContext(AuthContext);
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
  const canAccessHr = ['admin', 'manager'].includes(user?.role);
  const canAccessAudit = ['admin', 'manager'].includes(user?.role);
  const canAccessSales = ['admin', 'manager', 'cashier', 'salesperson', 'staff'].includes(user?.role);

  const fetchWithAuth = useCallback(async (url, options = {}) => {
    const headers = { ...options.headers };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
      logout();
      throw new Error("Session expired. Please log in again.");
    }
    return res;
  }, [token, logout]);

  const fetchSales = useCallback(async () => {
    if (!canAccessSales) {
      setSales([]);
      return [];
    }

    const salesRes = await fetchWithAuth(`${apiBaseUrl}/api/sales`);
    const saleRows = await salesRes.json();
    setSales(saleRows);
    return saleRows;
  }, [apiBaseUrl, canAccessSales, fetchWithAuth]);

  const fetchItems = useCallback(async () => {
    try {
      const [prodRes, suppRes, warehousesRes, warehouseStockRes, transfersRes, customersRes, commercialPartnersRes, settingsRes, fundRequestsRes] = await Promise.all([
        fetchWithAuth(`${apiBaseUrl}/api/products`),
        fetchWithAuth(`${apiBaseUrl}/api/inventory/suppliers`),
        fetchWithAuth(`${apiBaseUrl}/api/inventory/warehouses`),
        fetchWithAuth(`${apiBaseUrl}/api/inventory/warehouse-stock`),
        fetchWithAuth(`${apiBaseUrl}/api/inventory/transfers`),
        fetchWithAuth(`${apiBaseUrl}/api/customers`),
        fetchWithAuth(`${apiBaseUrl}/api/commercial-partners`),
        fetchWithAuth(`${apiBaseUrl}/api/settings`),
        fetchWithAuth(`${apiBaseUrl}/api/fund-requests`)
      ]);
      const prods = await prodRes.json();
      const supps = await suppRes.json();
      const whs = await warehousesRes.json();
      const whStock = await warehouseStockRes.json();
      const transfers = await transfersRes.json();
      const custs = await customersRes.json();
      const partners = await commercialPartnersRes.json();
      const stngs = await settingsRes.json();
      const funds = await fundRequestsRes.json();
      
      setProducts(prods);
      setSuppliers(supps);
      setWarehouses(whs);
      setWarehouseStock(whStock);
      setStockTransfers(transfers);
      setCustomers(custs);
      setCommercialPartners(partners);
      setSettings(stngs);
      setFundRequests(funds);

      await fetchSales();

      if (canAccessHr) {
        const currentMonth = new Date().toISOString().slice(0, 7);
        const [employeesRes, paymentsRes, attendanceRes, summaryRes, payrollRes, goalsRes] = await Promise.all([
          fetchWithAuth(`${apiBaseUrl}/api/hr/employees`),
          fetchWithAuth(`${apiBaseUrl}/api/hr/payments`),
          fetchWithAuth(`${apiBaseUrl}/api/hr/attendance?month=${encodeURIComponent(currentMonth)}`),
          fetchWithAuth(`${apiBaseUrl}/api/hr/summary`),
          fetchWithAuth(`${apiBaseUrl}/api/hr/payroll`),
          fetchWithAuth(`${apiBaseUrl}/api/hr/goals`)
        ]);
        setEmployees(await employeesRes.json());
        setHrPayments(await paymentsRes.json());
        setAttendanceRecords(await attendanceRes.json());
        setHrSummary(await summaryRes.json());
        setPayrollSheet(await payrollRes.json());
        setWorkGoals(await goalsRes.json());
      } else {
        setEmployees([]);
        setHrPayments([]);
        setAttendanceRecords([]);
        setHrSummary(null);
        setPayrollSheet(null);
        setWorkGoals([]);
      }

      if (canAccessAudit) {
        const auditRes = await fetchWithAuth(`${apiBaseUrl}/api/audit-logs?take=200`);
        setAuditLogs(await auditRes.json());
      } else {
        setAuditLogs([]);
      }
    } catch (e) {
      console.error("Failed to fetch initial data", e);
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, canAccessAudit, canAccessHr, fetchSales, fetchWithAuth]);

  const refreshInBackground = useCallback(() => {
    fetchItems().catch((error) => console.error('Failed to reconcile data after local update', error));
  }, [fetchItems]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    if (!user || !canAccessSales) return undefined;
    const intervalId = window.setInterval(() => {
      fetchSales().catch((error) => console.error('Failed to refresh sales notifications', error));
    }, 30000);
    return () => window.clearInterval(intervalId);
  }, [canAccessSales, fetchSales, user]);

  const totalInventoryValue = products.reduce((acc, p) => acc + (p.costPrice * p.stock), 0);
  
  const getMargin = (cost, selling) => {
    if (!selling || selling <= 0) return 0;
    return (((selling - cost) / selling) * 100).toFixed(1);
  };

  const notifications = buildNotifications({
    user,
    fundRequests,
    warehouseStock,
    stockTransfers,
    sales,
    hrPayments,
    workGoals,
  });

  const receiveGoods = async (productId, receivedQty, landedCost, selectedSupplierId, warehouseId) => {
    const prod = products.find(p => p.id === productId);
    const supplierId = selectedSupplierId || (prod ? prod.supplierId : undefined);

    try {
      const response = await fetchWithAuth(`${apiBaseUrl}/api/inventory/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          quantity: receivedQty,
          landedCost: landedCost,
          supplierId,
          warehouseId
        })
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to receive goods');
      }
      await fetchItems();
      return { success: true, data };
    } catch (e) {
      console.error("Failed to receive goods via API", e);
      return { success: false, error: e.message || 'Failed to receive goods' };
    }
  };

  const adjustStock = async (productId, quantity, reference, warehouseId) => {
    try {
      const response = await fetchWithAuth(`${apiBaseUrl}/api/inventory/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          quantity,
          reference,
          warehouseId
        })
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to adjust stock');
      }
      await fetchItems();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message || 'Failed to adjust stock' };
    }
  };

  const createWarehouse = async (data) => {
    try {
      const response = await fetchWithAuth(`${apiBaseUrl}/api/inventory/warehouses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw result;
      await fetchItems();
      return { success: true, warehouse: result.warehouse };
    } catch (e) {
      return { success: false, error: e.message || 'Failed to create warehouse' };
    }
  };

  const updateWarehouse = async (id, data) => {
    try {
      const response = await fetchWithAuth(`${apiBaseUrl}/api/inventory/warehouses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw result;
      await fetchItems();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message || 'Failed to update warehouse' };
    }
  };

  const updateWarehouseStatus = async (id, status) => {
    try {
      const response = await fetchWithAuth(`${apiBaseUrl}/api/inventory/warehouses/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw result;
      await fetchItems();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message || 'Failed to update warehouse status' };
    }
  };

  const setWarehouseMinStock = async (warehouseId, productId, minStock) => {
    try {
      const response = await fetchWithAuth(`${apiBaseUrl}/api/inventory/warehouses/${warehouseId}/products/${productId}/min-stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minStock })
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw result;
      await fetchItems();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message || 'Failed to update minimum stock' };
    }
  };

  const importWarehouseStock = async (data) => {
    try {
      const response = await fetchWithAuth(`${apiBaseUrl}/api/inventory/warehouse-stock/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw result;
      await fetchItems();
      return { success: true, summary: result.summary };
    } catch (e) {
      return { success: false, error: e.message || 'Failed to import warehouse stock' };
    }
  };

  const createStockTransfer = async (data) => {
    try {
      const response = await fetchWithAuth(`${apiBaseUrl}/api/inventory/transfers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw result;
      await fetchItems();
      return { success: true, transfer: result.transfer };
    } catch (e) {
      return { success: false, error: e.message || 'Failed to create stock transfer' };
    }
  };

  const confirmStockTransfer = async (id) => {
    try {
      const response = await fetchWithAuth(`${apiBaseUrl}/api/inventory/transfers/${id}/receive`, { method: 'PATCH' });
      const result = await response.json();
      if (!response.ok || !result.success) throw result;
      await fetchItems();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message || 'Failed to confirm stock transfer' };
    }
  };

  const cancelStockTransfer = async (id) => {
    try {
      const response = await fetchWithAuth(`${apiBaseUrl}/api/inventory/transfers/${id}/cancel`, { method: 'PATCH' });
      const result = await response.json();
      if (!response.ok || !result.success) throw result;
      await fetchItems();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message || 'Failed to cancel stock transfer' };
    }
  };

  const calculateProjectedWAC = (currentQty, currentCost, receivedQty, landedCost) => {
    const totalQty = currentQty + receivedQty;
    if (totalQty === 0) return 0;
    return ((currentQty * currentCost) + (receivedQty * landedCost)) / totalQty;
  };

  const createProduct = async (data) => {
    try {
      const response = await fetchWithAuth(`${apiBaseUrl}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw await response.json();
      await fetchItems();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message || e.error || 'Failed to create product' };
    }
  };

  const updateProduct = async (id, data) => {
    try {
      const response = await fetchWithAuth(`${apiBaseUrl}/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw await response.json();
      await fetchItems();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message || 'Failed to update product' };
    }
  };

  const deactivateProduct = async (id) => {
    try {
      const response = await fetchWithAuth(`${apiBaseUrl}/api/products/${id}/deactivate`, {
        method: 'PATCH',
      });
      if (!response.ok) throw await response.json();
      await fetchItems();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message || 'Failed to deactivate product' };
    }
  };

  const createSupplier = async (data) => {
    try {
      const response = await fetchWithAuth(`${apiBaseUrl}/api/inventory/suppliers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw result;
      await fetchItems();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message || 'Failed to create supplier' };
    }
  };

  const updateSupplier = async (id, data) => {
    try {
      const response = await fetchWithAuth(`${apiBaseUrl}/api/inventory/suppliers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw result;
      await fetchItems();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message || 'Failed to update supplier' };
    }
  };

  const updateSupplierStatus = async (id, status) => {
    try {
      const response = await fetchWithAuth(`${apiBaseUrl}/api/inventory/suppliers/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw result;
      await fetchItems();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message || 'Failed to update supplier status' };
    }
  };

  const createCustomer = async (data) => {
    try {
      const response = await fetchWithAuth(`${apiBaseUrl}/api/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw result;
      await fetchItems();
      return { success: true, customer: result.customer };
    } catch (e) {
      return { success: false, error: e.message || 'Failed to create customer' };
    }
  };

  const updateCustomer = async (id, data) => {
    try {
      const response = await fetchWithAuth(`${apiBaseUrl}/api/customers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw result;
      await fetchItems();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message || 'Failed to update customer' };
    }
  };

  const updateCustomerStatus = async (id, status) => {
    try {
      const response = await fetchWithAuth(`${apiBaseUrl}/api/customers/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw result;
      await fetchItems();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message || 'Failed to update customer status' };
    }
  };

  const adjustCustomerPoints = async (id, data) => {
    try {
      const response = await fetchWithAuth(`${apiBaseUrl}/api/customers/${id}/points/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw result;
      await fetchItems();
      return { success: true, movement: result.movement };
    } catch (e) {
      return { success: false, error: e.message || 'Failed to adjust customer points' };
    }
  };

  const createCommercialPartner = async (data) => {
    try {
      const response = await fetchWithAuth(`${apiBaseUrl}/api/commercial-partners`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw result;
      await fetchItems();
      return { success: true, partner: result.partner };
    } catch (e) {
      return { success: false, error: e.message || 'Failed to create seller/reseller' };
    }
  };

  const updateCommercialPartner = async (id, data) => {
    try {
      const response = await fetchWithAuth(`${apiBaseUrl}/api/commercial-partners/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw result;
      await fetchItems();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message || 'Failed to update seller/reseller' };
    }
  };

  const updateCommercialPartnerStatus = async (id, status) => {
    try {
      const response = await fetchWithAuth(`${apiBaseUrl}/api/commercial-partners/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw result;
      await fetchItems();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message || 'Failed to update seller/reseller status' };
    }
  };

  const updateSettings = async (data) => {
    try {
      const response = await fetchWithAuth(`${apiBaseUrl}/api/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw await response.json();
      await fetchItems();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message || 'Failed to update settings' };
    }
  };

  const createFundRequest = async (data) => {
    try {
      const response = await fetchWithAuth(`${apiBaseUrl}/api/fund-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw result;
      await fetchItems();
      return { success: true, request: result.request };
    } catch (e) {
      return { success: false, error: e.message || 'Failed to create fund request' };
    }
  };

  const updateFundRequestStatus = async (id, data) => {
    try {
      const response = await fetchWithAuth(`${apiBaseUrl}/api/fund-requests/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw result;
      await fetchItems();
      return { success: true, request: result.request };
    } catch (e) {
      return { success: false, error: e.message || 'Failed to update fund request' };
    }
  };

  const cancelFundRequest = async (id) => {
    try {
      const response = await fetchWithAuth(`${apiBaseUrl}/api/fund-requests/${id}/cancel`, {
        method: 'PATCH'
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw result;
      await fetchItems();
      return { success: true, request: result.request };
    } catch (e) {
      return { success: false, error: e.message || 'Failed to cancel fund request' };
    }
  };

  const fetchResetPreview = useCallback(async () => {
    try {
      const response = await fetchWithAuth(`${apiBaseUrl}/api/admin-tools/reset-preview`);
      const result = await response.json();
      if (!response.ok) throw result;
      return { success: true, preview: result };
    } catch (e) {
      return { success: false, error: e.message || 'Failed to load reset preview' };
    }
  }, [apiBaseUrl, fetchWithAuth]);

  const generateSecurityCode = async (data) => {
    try {
      const response = await fetchWithAuth(`${apiBaseUrl}/api/admin-tools/security-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw result;
      return { success: true, ...result };
    } catch (e) {
      return { success: false, error: e.message || 'Failed to generate security code' };
    }
  };

  const executeCriticalReset = async (data) => {
    try {
      const response = await fetchWithAuth(`${apiBaseUrl}/api/admin-tools/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw result;
      await fetchItems();
      return { success: true, ...result };
    } catch (e) {
      return { success: false, error: e.message || 'Failed to execute reset' };
    }
  };

  const fetchAuditLogs = async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });
      const query = params.toString() ? `?${params.toString()}` : '?take=200';
      const response = await fetchWithAuth(`${apiBaseUrl}/api/audit-logs${query}`);
      if (!response.ok) throw await response.json();
      const logs = await response.json();
      setAuditLogs(logs);
      return { success: true, logs };
    } catch (e) {
      return { success: false, error: e.message || 'Failed to fetch audit logs' };
    }
  };

  const createEmployee = async (data) => {
    try {
      const response = await fetchWithAuth(`${apiBaseUrl}/api/hr/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw result;
      setEmployees((current) => [result.employee, ...current].sort((a, b) => a.fullName.localeCompare(b.fullName)));
      refreshInBackground();
      return { success: true, employee: result.employee };
    } catch (e) {
      return { success: false, error: e.message || 'Failed to create employee' };
    }
  };

  const updateEmployee = async (id, data) => {
    try {
      const response = await fetchWithAuth(`${apiBaseUrl}/api/hr/employees/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw result;
      setEmployees((current) => current.map((employee) => employee.id === id ? result.employee : employee));
      refreshInBackground();
      return { success: true, employee: result.employee };
    } catch (e) {
      return { success: false, error: e.message || 'Failed to update employee' };
    }
  };

  const updateEmployeeStatus = async (id, status) => {
    try {
      const response = await fetchWithAuth(`${apiBaseUrl}/api/hr/employees/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw result;
      setEmployees((current) => current.map((employee) => employee.id === id ? result.employee : employee));
      refreshInBackground();
      return { success: true, employee: result.employee };
    } catch (e) {
      return { success: false, error: e.message || 'Failed to update employee status' };
    }
  };

  const createHrPayment = async (data) => {
    try {
      const response = await fetchWithAuth(`${apiBaseUrl}/api/hr/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw result;
      const createdPayments = result.payments || [result.payment].filter(Boolean);
      setHrPayments((current) => [...createdPayments, ...current]);
      setPayrollSheet((current) => current ? {
        ...current,
        payments: [
          ...createdPayments.filter((payment) => payment.payrollMonth === current.month && payment.type === 'Salary'),
          ...(current.payments || []),
        ],
      } : current);
      refreshInBackground();
      return { success: true, payment: result.payment, payments: createdPayments };
    } catch (e) {
      return { success: false, error: e.message || 'Failed to create payment' };
    }
  };

  const updateHrPaymentStatus = async (id, data) => {
    try {
      const response = await fetchWithAuth(`${apiBaseUrl}/api/hr/payments/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw result;
      setHrPayments((current) => current.map((payment) => payment.id === id ? result.payment : payment));
      setPayrollSheet((current) => current ? {
        ...current,
        payments: (current.payments || []).map((payment) => payment.id === id ? result.payment : payment),
        totals: calculatePayrollTotals((current.payments || []).map((payment) => payment.id === id ? result.payment : payment)),
      } : current);
      setHrSummary((current) => current ? updateHrSummaryPaymentTotals(current, hrPayments, result.payment) : current);
      return { success: true, payment: result.payment };
    } catch (e) {
      return { success: false, error: e.message || 'Failed to update payment' };
    }
  };

  const upsertAttendance = async (data) => {
    try {
      const response = await fetchWithAuth(`${apiBaseUrl}/api/hr/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw result;
      setAttendanceRecords((current) => {
        const next = current.filter((record) => record.id !== result.attendance.id && !(record.employeeId === result.attendance.employeeId && record.date?.slice(0, 10) === result.attendance.date?.slice(0, 10)));
        return [result.attendance, ...next];
      });
      return { success: true, attendance: result.attendance };
    } catch (e) {
      return { success: false, error: e.message || 'Failed to save attendance' };
    }
  };

  const fetchPayroll = async (month) => {
    try {
      const suffix = month ? `?month=${encodeURIComponent(month)}` : '';
      const response = await fetchWithAuth(`${apiBaseUrl}/api/hr/payroll${suffix}`);
      if (!response.ok) throw await response.json();
      const sheet = await response.json();
      setPayrollSheet(sheet);
      return { success: true, sheet };
    } catch (e) {
      return { success: false, error: e.message || 'Failed to fetch payroll' };
    }
  };

  const fetchAttendance = async (month) => {
    try {
      const suffix = month ? `?month=${encodeURIComponent(month)}` : '';
      const response = await fetchWithAuth(`${apiBaseUrl}/api/hr/attendance${suffix}`);
      if (!response.ok) throw await response.json();
      const records = await response.json();
      setAttendanceRecords(records);
      return { success: true, records };
    } catch (e) {
      return { success: false, error: e.message || 'Failed to fetch attendance' };
    }
  };

  const createWorkGoal = async (data) => {
    try {
      const response = await fetchWithAuth(`${apiBaseUrl}/api/hr/goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw result;
      setWorkGoals((current) => [result.goal, ...current].slice(0, 200));
      refreshInBackground();
      return { success: true, goal: result.goal };
    } catch (e) {
      return { success: false, error: e.message || 'Failed to create goal' };
    }
  };

  const updateWorkGoal = async (id, data) => {
    try {
      const response = await fetchWithAuth(`${apiBaseUrl}/api/hr/goals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw result;
      setWorkGoals((current) => current.map((goal) => goal.id === id ? result.goal : goal));
      refreshInBackground();
      return { success: true, goal: result.goal };
    } catch (e) {
      return { success: false, error: e.message || 'Failed to update goal' };
    }
  };

  if (loading) return <div style={{padding: '2rem'}}>Loading Data from Database...</div>;

  return (
    <StoreContext.Provider value={{
      products,
      suppliers, 
      warehouses,
      warehouseStock,
      stockTransfers,
      customers,
      sales,
      commercialPartners,
      fundRequests,
      notifications,
      employees,
      hrPayments,
      payrollSheet,
      workGoals,
      attendanceRecords,
      hrSummary,
      auditLogs,
      settings,
      totalInventoryValue,
      getMargin,
      receiveGoods,
      adjustStock,
      createWarehouse,
      updateWarehouse,
      updateWarehouseStatus,
      setWarehouseMinStock,
      importWarehouseStock,
      createStockTransfer,
      confirmStockTransfer,
      cancelStockTransfer,
      calculateProjectedWAC,
      createProduct,
      updateProduct,
      deactivateProduct,
      createSupplier,
      updateSupplier,
      updateSupplierStatus,
      createCustomer,
      updateCustomer,
      updateCustomerStatus,
      adjustCustomerPoints,
      createCommercialPartner,
      updateCommercialPartner,
      updateCommercialPartnerStatus,
      createFundRequest,
      updateFundRequestStatus,
      cancelFundRequest,
      createEmployee,
      updateEmployee,
      updateEmployeeStatus,
      createHrPayment,
      updateHrPaymentStatus,
      upsertAttendance,
      fetchAttendance,
      fetchPayroll,
      createWorkGoal,
      updateWorkGoal,
      updateSettings,
      fetchResetPreview,
      generateSecurityCode,
      executeCriticalReset,
      fetchAuditLogs,
      refreshData: fetchItems,
      refreshSales: fetchSales
    }}>
      {children}
    </StoreContext.Provider>
  );
};
