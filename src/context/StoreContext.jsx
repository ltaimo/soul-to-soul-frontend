import React, { createContext, useState, useEffect, useContext } from 'react';
import { AuthContext } from './AuthContext';

export const StoreContext = createContext();

export const StoreProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [settings, setSettings] = useState({
    companyName: 'Soul to Soul ERP',
    defaultCurrency: 'MZN',
    currencySymbol: 'MT',
    decimalFormatting: 2
  });
  const [loading, setLoading] = useState(true);
  const { token, logout } = useContext(AuthContext);

  const fetchWithAuth = async (url, options = {}) => {
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
  };

  const fetchItems = async () => {
    try {
      const [prodRes, suppRes, settingsRes] = await Promise.all([
        fetchWithAuth(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/products`),
        fetchWithAuth(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/inventory/suppliers`),
        fetchWithAuth(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/settings`)
      ]);
      const prods = await prodRes.json();
      const supps = await suppRes.json();
      const stngs = await settingsRes.json();
      
      setProducts(prods);
      setSuppliers(supps);
      setSettings(stngs);
    } catch (e) {
      console.error("Failed to fetch initial data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const totalInventoryValue = products.reduce((acc, p) => acc + (p.costPrice * p.stock), 0);
  
  const getMargin = (cost, selling) => {
    if (!selling || selling <= 0) return 0;
    return (((selling - cost) / selling) * 100).toFixed(1);
  };

  const receiveGoods = async (productId, receivedQty, landedCost) => {
    const prod = products.find(p => p.id === productId);
    const supplierId = prod ? prod.supplierId : undefined;

    try {
      const response = await fetchWithAuth(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/inventory/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          quantity: receivedQty,
          landedCost: landedCost,
          supplierId
        })
      });
      const data = await response.json();
      if (data.success) {
        await fetchItems();
      }
    } catch (e) {
      console.error("Failed to receive goods via API", e);
    }
  };

  const calculateProjectedWAC = (currentQty, currentCost, receivedQty, landedCost) => {
    const totalQty = currentQty + receivedQty;
    if (totalQty === 0) return 0;
    return ((currentQty * currentCost) + (receivedQty * landedCost)) / totalQty;
  };

  const createProduct = async (data) => {
    try {
      const response = await fetchWithAuth(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/products`, {
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
      const response = await fetchWithAuth(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/products/${id}`, {
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
      const response = await fetchWithAuth(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/products/${id}/deactivate`, {
        method: 'PATCH',
      });
      if (!response.ok) throw await response.json();
      await fetchItems();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message || 'Failed to deactivate product' };
    }
  };

  const updateSettings = async (data) => {
    try {
      const response = await fetchWithAuth(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/settings`, {
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

  if (loading) return <div style={{padding: '2rem'}}>Loading Data from Database...</div>;

  return (
    <StoreContext.Provider value={{
      products,
      suppliers, 
      settings,
      totalInventoryValue,
      getMargin,
      receiveGoods,
      calculateProjectedWAC,
      createProduct,
      updateProduct,
      deactivateProduct,
      updateSettings
    }}>
      {children}
    </StoreContext.Provider>
  );
};
