import React, { createContext, useState, useEffect } from 'react';

export const StoreContext = createContext();

export const StoreProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    try {
      const [prodRes, suppRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/inventory/products`),
        fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/inventory/suppliers`)
      ]);
      const prods = await prodRes.json();
      const supps = await suppRes.json();
      setProducts(prods);
      setSuppliers(supps);
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
    // Determine if product has a supplier internally assigned
    const prod = products.find(p => p.id === productId);
    const supplierId = prod ? prod.supplierId : undefined;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/inventory/receive`, {
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
        // Optimistically or deterministically update products
        // We will just refetch to guarantee the source of truth is synced
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

  if (loading) return <div style={{padding: '2rem'}}>Loading Data from Database...</div>;

  return (
    <StoreContext.Provider value={{
      products,
      suppliers, 
      totalInventoryValue,
      getMargin,
      receiveGoods,
      calculateProjectedWAC
    }}>
      {children}
    </StoreContext.Provider>
  );
};
