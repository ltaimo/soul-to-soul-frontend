import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Mail,
  Minus,
  Plus,
  Printer,
  ReceiptText,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { StoreContext } from '../context/StoreContext';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import { formatCurrency } from '../utils/formatters';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const EARN_RATE_MT = 200;
const REDEEM_RATE_MT = 10;

export const SalesInsights = ({ activeFilter }) => {
  const { products, customers, commercialPartners, warehouses, warehouseStock, sales, settings, refreshData } = useContext(StoreContext);
  const { token, logout, user } = useContext(AuthContext);
  const { language, t } = useContext(LanguageContext);
  const [salesRecord, setSalesRecord] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [cart, setCart] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerCodeSearch, setCustomerCodeSearch] = useState('');
  const [saveCustomer, setSaveCustomer] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [selectedCommercialPartnerId, setSelectedCommercialPartnerId] = useState('');
  const [saleChannel, setSaleChannel] = useState('Store');
  const [orderReference, setOrderReference] = useState('');
  const [fulfillmentStatus, setFulfillmentStatus] = useState('Delivered');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [directDiscount, setDirectDiscount] = useState('');
  const [directDiscountReason, setDirectDiscountReason] = useState('');
  const [pointsToRedeem, setPointsToRedeem] = useState('');
  const [lastReceipt, setLastReceipt] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const activeWarehouses = warehouses.filter((warehouse) => warehouse.status !== 'Inactive');
  const defaultWarehouseId = activeWarehouses.find((warehouse) => warehouse.isDefault)?.id || activeWarehouses[0]?.id || '';
  const fulfillmentWarehouseId = Number(selectedWarehouseId || defaultWarehouseId);
  const paymentMethods = settings?.paymentMethodsList?.length ? settings.paymentMethodsList : ['Cash', 'M-Pesa', 'E-Mola', 'Card', 'Bank Transfer'];
  const activeCommercialPartners = commercialPartners.filter((partner) => partner.status !== 'Inactive');
  const saleChannels = ['Store', 'Online', 'Order', 'Reseller'];
  const fulfillmentStatuses = ['Delivered', 'Pending', 'In Transit', 'Pickup'];

  const fetchWithAuth = useCallback(async (url, options = {}) => {
    const headers = { ...options.headers, Authorization: `Bearer ${token}` };
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
      logout();
      throw new Error('Session expired. Please log in again.');
    }
    return res;
  }, [logout, token]);

  const fetchSales = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/sales`);
      setSalesRecord(await res.json());
    } catch (e) {
      setErrorMsg(e.message || 'Could not load sales history.');
    }
  }, [fetchWithAuth]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  useEffect(() => {
    if (Array.isArray(sales)) {
      setSalesRecord(sales);
    }
  }, [sales]);

  const saleableProducts = useMemo(() => {
    return products
      .filter((product) => product.status !== 'Inactive' && product.sellingPrice > 0)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  const availableInWarehouse = useCallback((productId) => {
    const row = warehouseStock.find((stock) => stock.productId === productId && stock.warehouseId === fulfillmentWarehouseId);
    return row?.quantity ?? 0;
  }, [fulfillmentWarehouseId, warehouseStock]);

  const productOptionLabel = useCallback((product) => {
    if (!product) return '';
    return `${product.sku || `#${product.id}`} - ${product.name}`;
  }, []);

  const matchingProducts = useMemo(() => {
    const term = productSearch.trim().toLowerCase();
    if (!term) return [];

    return saleableProducts
      .filter((product) =>
        [
          product.sku,
          product.name,
          product.category,
          product.barcode,
          product.unit,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(term)
      )
      .slice(0, 20);
  }, [productSearch, saleableProducts]);

  const selectedProduct = saleableProducts.find((product) => product.id === Number(selectedProductId));

  const cartLines = useMemo(() => {
    return cart.map((line) => {
      const product = products.find((item) => item.id === line.productId);
      const available = product ? availableInWarehouse(product.id) : 0;
      const revenue = (product?.sellingPrice || 0) * line.quantity;
      const cogs = (product?.costPrice || 0) * line.quantity;
      const pointsEarned = (product?.loyaltyPointsEarned || 0) * line.quantity;
      const redemptionPointsCost = (product?.rewardEligible === false || product?.rewardActive === false)
        ? 0
        : ((product?.rewardPromoPoints || product?.redemptionPointsCost || Math.ceil((product?.sellingPrice || 0) / REDEEM_RATE_MT)) * line.quantity);
      return {
        ...line,
        product,
        available,
        revenue,
        cogs,
        pointsEarned,
        redemptionPointsCost,
        hasStockIssue: !product || line.quantity > available,
      };
    });
  }, [availableInWarehouse, cart, products]);

  const totals = cartLines.reduce(
    (acc, line) => ({
      revenue: acc.revenue + line.revenue,
      cogs: acc.cogs + line.cogs,
      units: acc.units + line.quantity,
      pointsEarned: acc.pointsEarned + line.pointsEarned,
      redemptionPointsCost: acc.redemptionPointsCost + line.redemptionPointsCost,
    }),
    { revenue: 0, cogs: 0, units: 0, pointsEarned: 0, redemptionPointsCost: 0 }
  );

  const selectedCustomer = customers.find((customer) => customer.id === Number(selectedCustomerId));
  const selectedCommercialPartner = activeCommercialPartners.find((partner) => partner.id === Number(selectedCommercialPartnerId));
  const loyaltyDiscountRate = selectedCustomer?.discountPercent ? selectedCustomer.discountPercent / 100 : 0;
  const discountAmount = totals.revenue * loyaltyDiscountRate;
  const directDiscountInput = Math.max(0, Number(directDiscount) || 0);
  const directDiscountAmount = Math.min(Math.max(0, totals.revenue - discountAmount), directDiscountInput);
  const requestedPoints = Math.max(0, Number(pointsToRedeem) || 0);
  const redeemablePoints = selectedCustomer ? Math.min(requestedPoints, selectedCustomer.loyaltyPoints || 0, totals.redemptionPointsCost || 0) : 0;
  const pointsValue = Math.min(Math.max(0, totals.revenue - discountAmount - directDiscountAmount), redeemablePoints * REDEEM_RATE_MT);
  const deliveryAmount = Math.max(0, Number(deliveryFee) || 0);
  const saleRevenue = Math.max(0, totals.revenue - discountAmount - directDiscountAmount - pointsValue);
  const grossProfit = saleRevenue - totals.cogs;
  const margin = saleRevenue > 0 ? (grossProfit / saleRevenue) * 100 : 0;
  const hasStockIssue = cartLines.some((line) => line.hasStockIssue);
  const paidAmount = Number(amountPaid) || 0;
  const payableTotal = saleRevenue + deliveryAmount;
  const effectivePaidAmount = paymentMethod === 'Cash' ? paidAmount : payableTotal;
  const changeGiven = Math.max(0, effectivePaidAmount - payableTotal);
  const projectedPointsEarned = selectedCustomer ? Math.floor(((selectedCustomer.loyaltyResidualCents || 0) / 100 + saleRevenue) / EARN_RATE_MT) : 0;
  const projectedResidual = selectedCustomer ? (((selectedCustomer.loyaltyResidualCents || 0) / 100 + saleRevenue) % EARN_RATE_MT) : 0;
  const hasPaymentIssue = paymentMethod === 'Cash' && cart.length > 0 && paidAmount < payableTotal;
  const hasPointsIssue = requestedPoints > 0 && (!selectedCustomer || totals.redemptionPointsCost <= 0 || redeemablePoints < requestedPoints);
  const hasDirectDiscountIssue = directDiscountInput > 0 && !directDiscountReason.trim();

  const displayedSales = useMemo(() => {
    if (activeFilter === 'online_orders') {
      return salesRecord.filter((sale) => sale.channel === 'Online');
    }
    return salesRecord;
  }, [activeFilter, salesRecord]);

  const handleCommercialPartnerChange = (partnerId) => {
    setSelectedCommercialPartnerId(partnerId);
    const partner = activeCommercialPartners.find((item) => item.id === Number(partnerId));
    if (!partner) {
      setSaleChannel('Store');
      return;
    }
    if (partner.defaultSaleChannel) {
      setSaleChannel(partner.defaultSaleChannel);
      setFulfillmentStatus(['Online', 'Order'].includes(partner.defaultSaleChannel) ? 'Pending' : 'Delivered');
    }
    if (partner.warehouseId && cart.length === 0) {
      setSelectedWarehouseId(String(partner.warehouseId));
    }
  };

  const findCustomerByCode = () => {
    const query = customerCodeSearch.trim().toLowerCase();
    if (!query) return;
    const customer = customers.find((item) =>
      [item.customerCode, item.phone, item.email, item.fullName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase() === query)
    );
    if (!customer) {
      setErrorMsg('Customer code not found.');
      return;
    }
    setSelectedCustomerId(String(customer.id));
    setCustomerName(customer.fullName);
    setCustomerEmail(customer.email || '');
    setCustomerPhone(customer.phone || '');
    setSaveCustomer(false);
    setErrorMsg('');
  };

  const addToCart = (product) => {
    setErrorMsg('');
    const available = availableInWarehouse(product.id);
    if (available <= 0) {
      setErrorMsg(`${product.name} is out of stock in the selected warehouse.`);
      return;
    }

    setCart((current) => {
      const existing = current.find((line) => line.productId === product.id);
      if (existing) {
        return current.map((line) =>
          line.productId === product.id
            ? { ...line, quantity: Math.min(line.quantity + 1, available) }
            : line
        );
      }
      return [...current, { productId: product.id, quantity: 1 }];
    });
    setProductSearch('');
    setSelectedProductId('');
  };

  const handleProductSearchChange = (value) => {
    setProductSearch(value);
    const selected = saleableProducts.find((product) => productOptionLabel(product) === value);
    setSelectedProductId(selected ? String(selected.id) : '');
  };

  const addSelectedProduct = () => {
    const product =
      selectedProduct ||
      matchingProducts[0] ||
      saleableProducts.find((item) => productOptionLabel(item).toLowerCase() === productSearch.trim().toLowerCase());

    if (!product) {
      setErrorMsg('Pesquise e selecione um produto para adicionar.');
      return;
    }

    addToCart(product);
  };

  const updateQty = (productId, quantity) => {
    const nextQty = Math.max(1, Number(quantity) || 1);
    setCart((current) =>
      current.map((line) => (line.productId === productId ? { ...line, quantity: nextQty } : line))
    );
  };

  const removeFromCart = (productId) => {
    setCart((current) => current.filter((line) => line.productId !== productId));
  };

  const receiptLines = (sale) => sale?.items?.map((item) => ({
    name: item.product?.name || `Product #${item.productId}`,
    quantity: item.quantity,
    price: item.unitSellingPrice,
    total: item.quantity * item.unitSellingPrice,
  })) || [];

  const directDiscountValue = (sale) => Math.max(0, Number(sale?.directDiscountCents || 0) / 100);

  const buildLoyaltyReceiptMessage = (sale) => {
    const earned = Number(sale?.pointsEarned) || 0;
    const redeemed = Number(sale?.pointsRedeemed) || 0;
    const customerNameText = sale?.customerName && sale.customerName !== t.retailCustomer
      ? `${sale.customerName}, `
      : '';
    const earnedLine = earned > 0
      ? `Parabens! ${customerNameText}com esta compra acumulou ${earned} ponto${earned === 1 ? '' : 's'}.`
      : `${customerNameText}continue a comprar na Soul2Soul para acumular pontos.`;
    const redeemedLine = redeemed > 0
      ? `Nesta compra usou ${redeemed} ponto${redeemed === 1 ? '' : 's'} no programa de fidelizacao.`
      : '';

    return [
      earnedLine,
      redeemedLine,
      'Compre mais vezes, acumule mais pontos e habilite-se a ganhar produtos mahala.',
    ].filter(Boolean).join('\n');
  };

  const buildReceiptText = (sale) => {
    if (!sale) return '';
    const lines = receiptLines(sale)
      .map((line) => `${line.quantity} x ${line.name} - ${formatCurrency(line.total, settings)}`)
      .join('\n');

    return [
      settings?.companyName || 'Soul2Soul',
      `Receipt #${sale.id}`,
      `Date: ${new Date(sale.date).toLocaleString()}`,
      `${t.customer}: ${sale.customerName || t.retailCustomer}`,
      `${t.seller}: ${sale.sellerName || user?.fullName || user?.email || ''}`,
      '',
      lines,
      '',
      directDiscountValue(sale) > 0 ? `Desconto: -${formatCurrency(directDiscountValue(sale), settings)}` : '',
      `Total: ${formatCurrency(sale.totalRevenue, settings)}`,
      `${t.paymentMethod}: ${sale.paymentMethod}`,
      `${t.amountPaid}: ${formatCurrency(sale.amountPaid, settings)}`,
      `${t.change}: ${formatCurrency(sale.changeGiven, settings)}`,
      '',
      buildLoyaltyReceiptMessage(sale),
    ].filter((line) => line !== '').join('\n');
  };

  const printReceipt = (sale) => {
    const rows = receiptLines(sale).map((line) => `
      <tr>
        <td>${line.name}</td>
        <td style="text-align:center">${line.quantity}</td>
        <td style="text-align:right">${formatCurrency(line.price, settings)}</td>
        <td style="text-align:right">${formatCurrency(line.total, settings)}</td>
      </tr>
    `).join('');
    const loyaltyMessage = buildLoyaltyReceiptMessage(sale)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
    const receiptDiscount = directDiscountValue(sale);
    const win = window.open('', '_blank', 'width=420,height=720');
    win.document.write(`
      <html>
        <head>
          <title>Receipt #${sale.id}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #2E2E2E; padding: 24px; }
            img { width: 180px; display: block; margin: 0 auto 12px; }
            h1 { font-size: 20px; text-align: center; margin: 0 0 4px; }
            p { margin: 4px 0; font-size: 13px; }
            table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
            th, td { border-bottom: 1px solid #E8E5DF; padding: 8px 0; }
            th { text-align: left; }
            .total { display: flex; justify-content: space-between; font-weight: 700; margin-top: 8px; }
            .loyalty-message { margin-top: 16px; border: 1px dashed #6B8E7E; border-radius: 8px; padding: 12px; background: #F7FAF6; color: #2E2E2E; font-size: 13px; line-height: 1.45; white-space: pre-line; }
            .whatsapp-ready { color: #4a6b5d; text-align: center; font-size: 11px; margin-top: 8px; }
            .muted { color: #5A5A5A; text-align: center; margin-top: 20px; }
            button { width: 100%; padding: 10px; margin-top: 18px; }
            @media print { button { display: none; } body { padding: 0; } }
          </style>
        </head>
        <body>
          <img src="/logo.png" alt="Soul to Soul" />
          <h1>${settings?.companyName || 'Soul2Soul'} - Receipt #${sale.id}</h1>
          <p><strong>Date:</strong> ${new Date(sale.date).toLocaleString()}</p>
          <p><strong>${t.customer}:</strong> ${sale.customerName || t.retailCustomer}</p>
          <p><strong>${t.seller}:</strong> ${sale.sellerName || user?.fullName || user?.email || ''}</p>
          <table>
            <thead><tr><th>Item</th><th>Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Total</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          ${receiptDiscount > 0 ? `<div class="total"><span>Desconto</span><span>-${formatCurrency(receiptDiscount, settings)}</span></div>` : ''}
          <div class="total"><span>Total</span><span>${formatCurrency(sale.totalRevenue, settings)}</span></div>
          <div class="total"><span>Paid</span><span>${formatCurrency(sale.amountPaid, settings)}</span></div>
          <div class="total"><span>Change</span><span>${formatCurrency(sale.changeGiven, settings)}</span></div>
          <p><strong>${t.paymentMethod}:</strong> ${sale.paymentMethod}</p>
          <div class="loyalty-message">${loyaltyMessage}</div>
          <p class="whatsapp-ready">Mensagem de fidelizacao preparada para envio automatico por WhatsApp.</p>
          <p class="muted">${language === 'pt' ? 'Obrigado por comprar na Soul to Soul.' : 'Thank you for shopping with Soul to Soul.'}</p>
          <button onclick="window.print()">Print / Save PDF</button>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
  };

  const emailReceipt = (sale) => {
    const subject = encodeURIComponent(`Soul to Soul Receipt #${sale.id}`);
    const body = encodeURIComponent(buildReceiptText(sale));
    const to = encodeURIComponent(sale.customerEmail || '');
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
  };

  const whatsappReceipt = (sale) => {
    const phone = String(sale.customerPhone || '').replace(/\D/g, '');
    const message = encodeURIComponent(buildReceiptText(sale));
    window.open(`https://wa.me/${phone ? phone : ''}?text=${message}`, '_blank');
  };

  const handleSale = async (event) => {
    event.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (cart.length === 0) {
      setErrorMsg('Add at least one product to the cart.');
      return;
    }
    if (!fulfillmentWarehouseId) {
      setErrorMsg('Select a warehouse before completing the sale.');
      return;
    }
    if (hasStockIssue) {
      setErrorMsg('Review cart quantities. One or more products exceed available stock.');
      return;
    }
    if (hasPaymentIssue) {
      setErrorMsg('Amount paid is lower than the sale total.');
      return;
    }
    if (hasPointsIssue) {
      setErrorMsg('Customer does not have enough points, or selected products are not configured for redemption.');
      return;
    }
    if (hasDirectDiscountIssue) {
      setErrorMsg('Justifique o desconto directo para controlo interno.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetchWithAuth(`${API_BASE}/api/sales/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomerId ? Number(selectedCustomerId) : undefined,
          customerName: selectedCustomer?.fullName || customerName || 'Retail Customer',
          customerEmail: selectedCustomer?.email || customerEmail,
          customerPhone: selectedCustomer?.phone || customerPhone,
          customerCode: selectedCustomer?.customerCode || customerCodeSearch,
          saveCustomer: saveCustomer && !selectedCustomerId,
          paymentMethod,
          amountPaid: effectivePaidAmount,
          deliveryFee: deliveryAmount,
          directDiscount: directDiscountAmount,
          directDiscountReason: directDiscountAmount > 0 ? directDiscountReason.trim() : undefined,
          pointsToRedeem: redeemablePoints,
          redeemPoints: redeemablePoints > 0,
          idempotencyKey: (window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random()}`),
          warehouseId: fulfillmentWarehouseId,
          commercialPartnerId: selectedCommercialPartnerId ? Number(selectedCommercialPartnerId) : undefined,
          channel: saleChannel,
          orderReference,
          fulfillmentStatus,
          items: cart.map((line) => ({ productId: line.productId, quantity: line.quantity })),
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to process sale.');
      }

      setSuccessMsg(`Sale #${data.saleId} completed.`);
      setLastReceipt(data.sale);
      setCart([]);
      setSelectedCustomerId('');
      setCustomerCodeSearch('');
      setSaveCustomer(false);
      setCustomerName('');
      setCustomerEmail('');
      setCustomerPhone('');
      setSelectedCommercialPartnerId('');
      setSaleChannel('Store');
      setOrderReference('');
      setFulfillmentStatus('Delivered');
      setAmountPaid('');
      setDeliveryFee('');
      setDirectDiscount('');
      setDirectDiscountReason('');
      setPointsToRedeem('');
      setSelectedWarehouseId('');
      await Promise.all([refreshData(), fetchSales()]);
    } catch (err) {
      setErrorMsg(err.message || 'Network error communicating with the backend.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="pos-header">
        <div>
          <h1 className="page-title" style={{ marginBottom: '0.25rem' }}>{t.salesPos}</h1>
          <p className="page-subtitle">{t.salesSubtitle}</p>
        </div>
      </div>

      {successMsg && <div className="inline-alert inline-alert-success"><CheckCircle2 size={18} /> {successMsg}</div>}
      {errorMsg && <div className="inline-alert inline-alert-danger"><AlertTriangle size={18} /> {errorMsg}</div>}

      <div className="pos-grid">
        <section className="card pos-products">
          <div className="section-heading">
            <h3>{t.products}</h3>
            <span>{saleableProducts.length} {t.productsCount}</span>
          </div>
          <div className="form-group">
            <label className="form-label">Fulfillment Warehouse</label>
            <select
              className="form-input"
              value={selectedWarehouseId || defaultWarehouseId}
              onChange={(event) => {
                setSelectedWarehouseId(event.target.value);
                setCart([]);
              }}
              required
            >
              <option value="">Select warehouse</option>
              {activeWarehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
              ))}
            </select>
          </div>
          <div className="search-input">
            <Search size={18} />
            <input
              value={productSearch}
              onChange={(event) => handleProductSearchChange(event.target.value)}
              placeholder="Pesquisar produto por nome, SKU ou codigo"
              list="sale-product-options"
            />
            <datalist id="sale-product-options">
              {matchingProducts.map((product) => (
                <option key={product.id} value={productOptionLabel(product)} />
              ))}
            </datalist>
          </div>
          <div className="product-select-panel">
            <select
              className="form-input"
              value={selectedProductId}
              onChange={(event) => {
                const product = saleableProducts.find((item) => item.id === Number(event.target.value));
                setSelectedProductId(event.target.value);
                setProductSearch(product ? productOptionLabel(product) : productSearch);
              }}
            >
              <option value="">
                {productSearch.trim() ? `${matchingProducts.length} produto(s) encontrados` : 'Pesquise para selecionar produto'}
              </option>
              {matchingProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {productOptionLabel(product)} | {formatCurrency(product.sellingPrice, settings)} | Stock {availableInWarehouse(product.id)}
                </option>
              ))}
            </select>
            {selectedProduct && (
              <div className="product-selection-summary">
                <div>
                  <strong>{selectedProduct.name}</strong>
                  <span>{selectedProduct.sku} - {selectedProduct.category}</span>
                </div>
                <div>
                  <strong>{formatCurrency(selectedProduct.sellingPrice, settings)}</strong>
                  <span className={availableInWarehouse(selectedProduct.id) <= 0 ? 'stock-bad' : 'stock-good'}>
                    {availableInWarehouse(selectedProduct.id)} no armazem selecionado
                  </span>
                </div>
              </div>
            )}
            <button type="button" className="btn btn-primary" onClick={addSelectedProduct} disabled={!productSearch.trim() && !selectedProduct}>
              <Plus size={18} /> Adicionar produto
            </button>
          </div>
        </section>

        <section className="card pos-cart">
          <div className="section-heading">
            <h3>{t.currentSale}</h3>
            <ReceiptText size={20} />
          </div>

          <form onSubmit={handleSale}>
            <div className="form-group">
              <label className="form-label">Loyal Customer</label>
              <select
                className="form-input"
                value={selectedCustomerId}
                onChange={(event) => {
                  const customer = customers.find((item) => item.id === Number(event.target.value));
                  setSelectedCustomerId(event.target.value);
                  if (customer) {
                    setCustomerName(customer.fullName);
                    setCustomerEmail(customer.email || '');
                    setCustomerPhone(customer.phone || '');
                    setSaveCustomer(false);
                  }
                }}
              >
                <option value="">Retail / new customer</option>
                {customers.filter((customer) => customer.status !== 'Inactive').map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.fullName} | {customer.customerCode || `CUST-${String(customer.id).padStart(5, '0')}`} | {customer.loyaltyPoints || 0} pts
                  </option>
                ))}
              </select>
            </div>

            <div className="payment-grid">
              <div className="form-group">
                <label className="form-label">Customer Code / QR</label>
                <input className="form-input" value={customerCodeSearch} onChange={(event) => setCustomerCodeSearch(event.target.value)} placeholder="Scan or type customer code" />
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'end' }}>
                <button type="button" className="btn btn-secondary" style={{ width: '100%' }} onClick={findCustomerByCode}>Find Customer</button>
              </div>
            </div>

            <div className="payment-grid">
              <div className="form-group">
                <label className="form-label">{t.customer}</label>
                <input className="form-input" value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder={t.retailCustomer} disabled={!!selectedCustomerId} />
              </div>
              <div className="form-group">
                <label className="form-label">{t.customerEmail}</label>
                <input type="email" className="form-input" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} placeholder={t.receiptDraft} disabled={!!selectedCustomerId} />
              </div>
            </div>
            <div className="payment-grid">
              <div className="form-group">
                <label className="form-label">Customer Phone</label>
                <input className="form-input" value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder="Optional" disabled={!!selectedCustomerId} />
              </div>
              <label className="customer-save-toggle">
                <input type="checkbox" checked={saveCustomer} onChange={(event) => setSaveCustomer(event.target.checked)} disabled={!!selectedCustomerId || !customerName} />
                Save as loyal customer
              </label>
            </div>
            {selectedCustomer && (
              <div className="seller-chip">
                Loyalty: <strong>{selectedCustomer.loyaltyTier}</strong>
                <span>{selectedCustomer.loyaltyPoints || 0} points available</span>
                {selectedCustomer.discountPercent > 0 && <span>{selectedCustomer.discountPercent}% discount applied</span>}
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Seller / Reseller</label>
              <select className="form-input" value={selectedCommercialPartnerId} onChange={(event) => handleCommercialPartnerChange(event.target.value)}>
                <option value="">Direct store sale - {user?.fullName || user?.email}</option>
                {activeCommercialPartners.map((partner) => (
                  <option key={partner.id} value={partner.id}>
                    {partner.name} | {partner.type} | {partner.agreementType || 'Direct Sale'} | {Number(partner.commissionRate || 0).toFixed(2)}%
                  </option>
                ))}
              </select>
            </div>
            <div className="payment-grid">
              <div className="form-group">
                <label className="form-label">Sale Channel</label>
                <select
                  className="form-input"
                  value={saleChannel}
                  onChange={(event) => {
                    setSaleChannel(event.target.value);
                    setFulfillmentStatus(['Online', 'Order'].includes(event.target.value) ? 'Pending' : 'Delivered');
                  }}
                >
                  {saleChannels.map((channel) => <option key={channel} value={channel}>{channel}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Fulfillment Status</label>
                <select className="form-input" value={fulfillmentStatus} onChange={(event) => setFulfillmentStatus(event.target.value)}>
                  {fulfillmentStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Order / Reseller Reference</label>
              <input
                className="form-input"
                value={orderReference}
                onChange={(event) => setOrderReference(event.target.value)}
                placeholder="Online order, reseller batch, invoice, or coordination code"
              />
            </div>
            <div className="seller-chip">
              {t.seller}: <strong>{selectedCommercialPartner?.name || user?.fullName || user?.email}</strong>
              {selectedCommercialPartner && <span>{selectedCommercialPartner.type} - {selectedCommercialPartner.agreementType || 'Direct Sale'} - {Number(selectedCommercialPartner.commissionRate || 0).toFixed(2)}% commission</span>}
            </div>
            {selectedCommercialPartner?.paymentTerms && <div className="seller-chip">Terms: <span>{selectedCommercialPartner.paymentTerms}</span></div>}
            <div className="seller-chip">Warehouse: <strong>{activeWarehouses.find((warehouse) => warehouse.id === fulfillmentWarehouseId)?.name || '-'}</strong></div>

            <div className="cart-lines">
              {cartLines.length === 0 ? (
                <div className="empty-cart">{t.selectProducts}</div>
              ) : (
                cartLines.map((line) => (
                  <div className={`cart-line ${line.hasStockIssue ? 'cart-line-error' : ''}`} key={line.productId}>
                    <div className="cart-line-main">
                      <strong>{line.product?.name || 'Unknown product'}</strong>
                      <span>{formatCurrency(line.product?.sellingPrice || 0, settings)} - Available: {line.available} - Redeem {line.redemptionPointsCost} pts</span>
                    </div>
                    <div className="cart-qty">
                      <button type="button" onClick={() => updateQty(line.productId, line.quantity - 1)}><Minus size={14} /></button>
                      <input type="number" min="1" value={line.quantity} onChange={(event) => updateQty(line.productId, event.target.value)} />
                      <button type="button" onClick={() => updateQty(line.productId, line.quantity + 1)}><Plus size={14} /></button>
                    </div>
                    <strong className="cart-line-total">{formatCurrency(line.revenue, settings)}</strong>
                    <button className="icon-danger" type="button" onClick={() => removeFromCart(line.productId)}><Trash2 size={16} /></button>
                  </div>
                ))
              )}
            </div>

            <div className="pos-summary">
              <div><span>{t.units}</span><strong>{totals.units}</strong></div>
              <div><span>{t.revenue}</span><strong>{formatCurrency(saleRevenue, settings)}</strong></div>
              <div><span>{t.grossProfit}</span><strong>{formatCurrency(grossProfit, settings)}</strong></div>
              <div><span>{t.margin}</span><strong>{margin.toFixed(1)}%</strong></div>
            </div>
            <div className={`change-box ${hasPointsIssue ? 'change-box-error' : ''}`}>
              <span>Loyalty summary</span>
              <strong>{redeemablePoints} pts used | {projectedPointsEarned} pts to earn</strong>
              <small>Residual after sale: {projectedResidual.toFixed(2)} MT. Points never apply to delivery.</small>
            </div>
            {discountAmount > 0 && (
              <div className="change-box">
                <span>Loyalty discount</span>
                <strong>-{formatCurrency(discountAmount, settings)}</strong>
              </div>
            )}
            {directDiscountAmount > 0 && (
              <div className={`change-box ${hasDirectDiscountIssue ? 'change-box-error' : ''}`}>
                <span>Desconto directo</span>
                <strong>-{formatCurrency(directDiscountAmount, settings)}</strong>
                <small>Justificacao guardada apenas para relatorios internos.</small>
              </div>
            )}

            <div className="payment-grid">
              <div className="form-group">
                <label className="form-label">Desconto directo</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-input"
                  value={directDiscount}
                  onChange={(event) => setDirectDiscount(event.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Justificacao interna</label>
                <input
                  className="form-input"
                  value={directDiscountReason}
                  onChange={(event) => setDirectDiscountReason(event.target.value)}
                  placeholder="Ex: autorizado pelo manager"
                  disabled={directDiscountInput <= 0}
                />
              </div>
            </div>

            <div className="payment-grid">
              <div className="form-group">
                <label className="form-label">Points to redeem</label>
                <input
                  type="number"
                  min="0"
                  max={selectedCustomer ? Math.min(selectedCustomer.loyaltyPoints || 0, totals.redemptionPointsCost || 0) : 0}
                  className="form-input"
                  value={pointsToRedeem}
                  onChange={(event) => setPointsToRedeem(event.target.value)}
                  disabled={!selectedCustomer}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Delivery Fee</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-input"
                  value={deliveryFee}
                  onChange={(event) => setDeliveryFee(event.target.value)}
                />
              </div>
            </div>

            <div className="payment-grid">
              <div className="form-group">
                <label className="form-label">{t.paymentMethod}</label>
                <select
                  className="form-input"
                  value={paymentMethod}
                  onChange={(event) => {
                    setPaymentMethod(event.target.value);
                  if (event.target.value !== 'Cash') setAmountPaid('');
                }}
              >
                {paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}
                <option value="Mixed">Points + Cash</option>
              </select>
              </div>
              <div className="form-group">
                <label className="form-label">{t.amountPaid}</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-input"
                  value={paymentMethod === 'Cash' ? amountPaid : payableTotal.toFixed(settings?.decimalFormatting ?? 2)}
                  onChange={(event) => setAmountPaid(event.target.value)}
                  disabled={paymentMethod !== 'Cash'}
                />
              </div>
            </div>

            <div className="change-box">
              <span>Before confirmation</span>
              <strong>{formatCurrency(payableTotal, settings)} to pay</strong>
              <small>Products: {formatCurrency(totals.revenue, settings)} | Loyalty discount: {formatCurrency(discountAmount, settings)} | Direct discount: {formatCurrency(directDiscountAmount, settings)} | Points: {redeemablePoints} ({formatCurrency(pointsValue, settings)}) | Delivery: {formatCurrency(deliveryAmount, settings)}</small>
            </div>

            <div className={`change-box ${hasPaymentIssue ? 'change-box-error' : ''}`}>
              <span>{hasPaymentIssue ? t.remaining : t.change}</span>
              <strong>{formatCurrency(hasPaymentIssue ? saleRevenue - paidAmount : changeGiven, settings)}</strong>
            </div>

            <button className="btn btn-primary pos-submit" type="submit" disabled={submitting || cart.length === 0 || hasStockIssue || hasPaymentIssue || hasPointsIssue || hasDirectDiscountIssue}>
              {submitting ? t.processingSale : t.completeSale}
            </button>
          </form>
        </section>
      </div>

      <section className="card" style={{ marginTop: '2rem' }}>
        <div className="section-heading">
          <div>
            <h3>{activeFilter === 'online_orders' ? 'Encomendas online' : t.recentSales}</h3>
            {activeFilter === 'online_orders' && <p className="muted-text">A mostrar apenas pedidos feitos na loja online.</p>}
          </div>
          <span>{displayedSales.length} {t.records}</span>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>{t.customer}</th>
                <th>{t.units}</th>
                <th>{t.revenue}</th>
                <th>{t.seller}</th>
                <th>Channel</th>
                <th>Status</th>
                <th>Commission</th>
                <th>Desconto directo</th>
                <th>Warehouse</th>
                <th>{t.paymentMethod}</th>
                <th>COGS</th>
                <th>{t.margin}</th>
                <th>{t.receipt}</th>
              </tr>
            </thead>
            <tbody>
              {displayedSales.length === 0 ? (
                <tr><td colSpan="14" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-charcoal-light)' }}>No sales logged yet.</td></tr>
              ) : (
                displayedSales.map((sale) => {
                  const saleDate = new Date(sale.date);
                  const saleMargin = sale.totalRevenue > 0 ? ((sale.totalRevenue - sale.totalCogs) / sale.totalRevenue) * 100 : 0;
                  const units = sale.items?.reduce((acc, item) => acc + item.quantity, 0) || 0;
                  return (
                    <tr key={sale.id}>
                      <td>{saleDate.toLocaleDateString()} {saleDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td>{sale.customerName}</td>
                      <td>{units}</td>
                      <td style={{ fontWeight: 600 }}>{formatCurrency(sale.totalRevenue, settings)}</td>
                      <td>{sale.sellerName || '-'}</td>
                      <td>{sale.channel || 'Store'}{sale.orderReference ? <span className="table-muted">{sale.orderReference}</span> : null}</td>
                      <td>{sale.fulfillmentStatus || 'Delivered'}</td>
                      <td>{sale.commissionAmount ? formatCurrency(sale.commissionAmount, settings) : '-'}</td>
                      <td>
                        {directDiscountValue(sale) > 0 ? formatCurrency(directDiscountValue(sale), settings) : '-'}
                        {sale.directDiscountReason ? <span className="table-muted">{sale.directDiscountReason}</span> : null}
                      </td>
                      <td>{sale.warehouseName || sale.warehouse?.name || '-'}</td>
                      <td>{sale.paymentMethod || 'Cash'}</td>
                      <td>{formatCurrency(sale.totalCogs, settings)}</td>
                      <td><span className={`badge ${saleMargin >= 40 ? 'badge-success' : 'badge-warning'}`}>{saleMargin.toFixed(1)}%</span></td>
                      <td><button className="btn btn-ghost" style={{ padding: '0.25rem 0.5rem' }} onClick={() => setLastReceipt(sale)}>{t.open}</button></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {lastReceipt && (
        <div className="modal-backdrop">
          <div className="modal-card receipt-modal">
            <div className="modal-header">
              <div>
                <h2>Receipt #{lastReceipt.id}</h2>
                <p>{new Date(lastReceipt.date).toLocaleString()}</p>
              </div>
              <button className="icon-button" onClick={() => setLastReceipt(null)} type="button"><X size={18} /></button>
            </div>

            <div className="receipt-preview">
              <img src="/logo.png" alt="Soul to Soul" />
              <div className="receipt-meta"><span>{t.customer}</span><strong>{lastReceipt.customerName || t.retailCustomer}</strong></div>
              <div className="receipt-meta"><span>{t.seller}</span><strong>{lastReceipt.sellerName || user?.fullName || user?.email}</strong></div>
              <div className="receipt-meta"><span>Channel</span><strong>{lastReceipt.channel || 'Store'}{lastReceipt.orderReference ? ` | ${lastReceipt.orderReference}` : ''}</strong></div>
              {receiptLines(lastReceipt).map((line, index) => (
                <div className="receipt-line" key={`${line.name}-${index}`}>
                  <span>{line.quantity} x {line.name}</span>
                  <strong>{formatCurrency(line.total, settings)}</strong>
                </div>
              ))}
              {directDiscountValue(lastReceipt) > 0 && (
                <div className="receipt-line">
                  <span>Desconto</span>
                  <strong>-{formatCurrency(directDiscountValue(lastReceipt), settings)}</strong>
                </div>
              )}
              <div className="receipt-total"><span>Total</span><strong>{formatCurrency(lastReceipt.totalRevenue, settings)}</strong></div>
              <div className="receipt-line"><span>{t.paymentMethod}: {lastReceipt.paymentMethod}</span><strong>{formatCurrency(lastReceipt.amountPaid, settings)}</strong></div>
              <div className="receipt-line"><span>{t.change}</span><strong>{formatCurrency(lastReceipt.changeGiven, settings)}</strong></div>
              <div className="receipt-loyalty-message">
                {buildLoyaltyReceiptMessage(lastReceipt)}
                <small>Pronto para envio automatico por WhatsApp.</small>
              </div>
            </div>

            <div className="receipt-actions">
              <button className="btn btn-secondary" type="button" onClick={() => printReceipt(lastReceipt)}><Printer size={18} /> {t.print}</button>
              <button className="btn btn-secondary" type="button" onClick={() => printReceipt(lastReceipt)}><Download size={18} /> {t.pdf}</button>
              <button className="btn btn-primary" type="button" onClick={() => emailReceipt(lastReceipt)}><Mail size={18} /> {t.emailDraft}</button>
              <button className="btn btn-secondary" type="button" onClick={() => whatsappReceipt(lastReceipt)}>WhatsApp</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
