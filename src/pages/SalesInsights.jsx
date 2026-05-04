import React, { useContext, useEffect, useMemo, useState } from 'react';
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

export const SalesInsights = () => {
  const { products, settings, refreshData } = useContext(StoreContext);
  const { token, logout, user } = useContext(AuthContext);
  const { language, t } = useContext(LanguageContext);
  const [salesRecord, setSalesRecord] = useState([]);
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [lastReceipt, setLastReceipt] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchWithAuth = async (url, options = {}) => {
    const headers = { ...options.headers, Authorization: `Bearer ${token}` };
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
      logout();
      throw new Error('Session expired. Please log in again.');
    }
    return res;
  };

  const fetchSales = async () => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/sales`);
      setSalesRecord(await res.json());
    } catch (e) {
      setErrorMsg(e.message || 'Could not load sales history.');
    }
  };

  useEffect(() => {
    fetchSales();
  }, [token]);

  const saleableProducts = useMemo(() => {
    return products
      .filter((product) => product.status !== 'Inactive' && product.sellingPrice > 0)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  const filteredProducts = useMemo(() => {
    const term = query.trim().toLowerCase();
    const source = term
      ? saleableProducts.filter((product) =>
          `${product.sku} ${product.name} ${product.category}`.toLowerCase().includes(term)
        )
      : saleableProducts;

    return source.slice(0, 12);
  }, [query, saleableProducts]);

  const cartLines = useMemo(() => {
    return cart.map((line) => {
      const product = products.find((item) => item.id === line.productId);
      const available = product?.stock || 0;
      const revenue = (product?.sellingPrice || 0) * line.quantity;
      const cogs = (product?.costPrice || 0) * line.quantity;
      return {
        ...line,
        product,
        available,
        revenue,
        cogs,
        hasStockIssue: !product || line.quantity > available,
      };
    });
  }, [cart, products]);

  const totals = cartLines.reduce(
    (acc, line) => ({
      revenue: acc.revenue + line.revenue,
      cogs: acc.cogs + line.cogs,
      units: acc.units + line.quantity,
    }),
    { revenue: 0, cogs: 0, units: 0 }
  );

  const grossProfit = totals.revenue - totals.cogs;
  const margin = totals.revenue > 0 ? (grossProfit / totals.revenue) * 100 : 0;
  const hasStockIssue = cartLines.some((line) => line.hasStockIssue);
  const paidAmount = Number(amountPaid) || 0;
  const effectivePaidAmount = paymentMethod === 'Cash' ? paidAmount : totals.revenue;
  const changeGiven = Math.max(0, effectivePaidAmount - totals.revenue);
  const hasPaymentIssue = paymentMethod === 'Cash' && cart.length > 0 && paidAmount < totals.revenue;

  const addToCart = (product) => {
    setErrorMsg('');
    if (product.stock <= 0) {
      setErrorMsg(`${product.name} is out of stock.`);
      return;
    }

    setCart((current) => {
      const existing = current.find((line) => line.productId === product.id);
      if (existing) {
        return current.map((line) =>
          line.productId === product.id
            ? { ...line, quantity: Math.min(line.quantity + 1, product.stock) }
            : line
        );
      }
      return [...current, { productId: product.id, quantity: 1 }];
    });
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

  const buildReceiptText = (sale) => {
    if (!sale) return '';
    const lines = receiptLines(sale)
      .map((line) => `${line.quantity} x ${line.name} - ${formatCurrency(line.total, settings)}`)
      .join('\n');

    return [
      'Soul to Soul',
      `Receipt #${sale.id}`,
      `Date: ${new Date(sale.date).toLocaleString()}`,
      `${t.customer}: ${sale.customerName || t.retailCustomer}`,
      `${t.seller}: ${sale.sellerName || user?.fullName || user?.email || ''}`,
      '',
      lines,
      '',
      `Total: ${formatCurrency(sale.totalRevenue, settings)}`,
      `${t.paymentMethod}: ${sale.paymentMethod}`,
      `${t.amountPaid}: ${formatCurrency(sale.amountPaid, settings)}`,
      `${t.change}: ${formatCurrency(sale.changeGiven, settings)}`,
    ].join('\n');
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
            .muted { color: #5A5A5A; text-align: center; margin-top: 20px; }
            button { width: 100%; padding: 10px; margin-top: 18px; }
            @media print { button { display: none; } body { padding: 0; } }
          </style>
        </head>
        <body>
          <img src="/logo.png" alt="Soul to Soul" />
          <h1>Receipt #${sale.id}</h1>
          <p><strong>Date:</strong> ${new Date(sale.date).toLocaleString()}</p>
          <p><strong>${t.customer}:</strong> ${sale.customerName || t.retailCustomer}</p>
          <p><strong>${t.seller}:</strong> ${sale.sellerName || user?.fullName || user?.email || ''}</p>
          <table>
            <thead><tr><th>Item</th><th>Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Total</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="total"><span>Total</span><span>${formatCurrency(sale.totalRevenue, settings)}</span></div>
          <div class="total"><span>Paid</span><span>${formatCurrency(sale.amountPaid, settings)}</span></div>
          <div class="total"><span>Change</span><span>${formatCurrency(sale.changeGiven, settings)}</span></div>
          <p><strong>${t.paymentMethod}:</strong> ${sale.paymentMethod}</p>
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

  const handleSale = async (event) => {
    event.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (cart.length === 0) {
      setErrorMsg('Add at least one product to the cart.');
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

    setSubmitting(true);
    try {
      const response = await fetchWithAuth(`${API_BASE}/api/sales/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName || 'Retail Customer',
          customerEmail,
          paymentMethod,
          amountPaid: effectivePaidAmount,
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
      setCustomerName('');
      setCustomerEmail('');
      setAmountPaid('');
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
          <div className="search-input">
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.searchProducts} />
          </div>

          <div className="product-pick-list">
            {filteredProducts.map((product) => (
              <button type="button" key={product.id} className="product-pick-row" onClick={() => addToCart(product)}>
                <div>
                  <strong>{product.name}</strong>
                  <span>{product.sku} - {product.category}</span>
                </div>
                <div>
                  <strong>{formatCurrency(product.sellingPrice, settings)}</strong>
                  <span className={product.stock <= 0 ? 'stock-bad' : 'stock-good'}>{product.stock} in stock</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="card pos-cart">
          <div className="section-heading">
            <h3>{t.currentSale}</h3>
            <ReceiptText size={20} />
          </div>

          <form onSubmit={handleSale}>
            <div className="payment-grid">
              <div className="form-group">
                <label className="form-label">{t.customer}</label>
                <input className="form-input" value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder={t.retailCustomer} />
              </div>
              <div className="form-group">
                <label className="form-label">{t.customerEmail}</label>
                <input type="email" className="form-input" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} placeholder={t.receiptDraft} />
              </div>
            </div>
            <div className="seller-chip">{t.seller}: <strong>{user?.fullName || user?.email}</strong></div>

            <div className="cart-lines">
              {cartLines.length === 0 ? (
                <div className="empty-cart">{t.selectProducts}</div>
              ) : (
                cartLines.map((line) => (
                  <div className={`cart-line ${line.hasStockIssue ? 'cart-line-error' : ''}`} key={line.productId}>
                    <div className="cart-line-main">
                      <strong>{line.product?.name || 'Unknown product'}</strong>
                      <span>{formatCurrency(line.product?.sellingPrice || 0, settings)} - Available: {line.available}</span>
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
              <div><span>{t.revenue}</span><strong>{formatCurrency(totals.revenue, settings)}</strong></div>
              <div><span>{t.grossProfit}</span><strong>{formatCurrency(grossProfit, settings)}</strong></div>
              <div><span>{t.margin}</span><strong>{margin.toFixed(1)}%</strong></div>
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
                  <option value="Cash">Cash</option>
                  <option value="M-Pesa">M-Pesa</option>
                  <option value="E-Mola">E-Mola</option>
                  <option value="Card">Card</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{t.amountPaid}</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-input"
                  value={paymentMethod === 'Cash' ? amountPaid : totals.revenue.toFixed(settings?.decimalFormatting ?? 2)}
                  onChange={(event) => setAmountPaid(event.target.value)}
                  disabled={paymentMethod !== 'Cash'}
                />
              </div>
            </div>

            <div className={`change-box ${hasPaymentIssue ? 'change-box-error' : ''}`}>
              <span>{hasPaymentIssue ? t.remaining : t.change}</span>
              <strong>{formatCurrency(hasPaymentIssue ? totals.revenue - paidAmount : changeGiven, settings)}</strong>
            </div>

            <button className="btn btn-primary pos-submit" type="submit" disabled={submitting || cart.length === 0 || hasStockIssue || hasPaymentIssue}>
              {submitting ? t.processingSale : t.completeSale}
            </button>
          </form>
        </section>
      </div>

      <section className="card" style={{ marginTop: '2rem' }}>
        <div className="section-heading">
          <h3>{t.recentSales}</h3>
          <span>{salesRecord.length} {t.records}</span>
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
                <th>{t.paymentMethod}</th>
                <th>COGS</th>
                <th>{t.margin}</th>
                <th>{t.receipt}</th>
              </tr>
            </thead>
            <tbody>
              {salesRecord.length === 0 ? (
                <tr><td colSpan="9" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-charcoal-light)' }}>No sales logged yet.</td></tr>
              ) : (
                salesRecord.map((sale) => {
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
              {receiptLines(lastReceipt).map((line, index) => (
                <div className="receipt-line" key={`${line.name}-${index}`}>
                  <span>{line.quantity} x {line.name}</span>
                  <strong>{formatCurrency(line.total, settings)}</strong>
                </div>
              ))}
              <div className="receipt-total"><span>Total</span><strong>{formatCurrency(lastReceipt.totalRevenue, settings)}</strong></div>
              <div className="receipt-line"><span>{t.paymentMethod}: {lastReceipt.paymentMethod}</span><strong>{formatCurrency(lastReceipt.amountPaid, settings)}</strong></div>
              <div className="receipt-line"><span>{t.change}</span><strong>{formatCurrency(lastReceipt.changeGiven, settings)}</strong></div>
            </div>

            <div className="receipt-actions">
              <button className="btn btn-secondary" type="button" onClick={() => printReceipt(lastReceipt)}><Printer size={18} /> {t.print}</button>
              <button className="btn btn-secondary" type="button" onClick={() => printReceipt(lastReceipt)}><Download size={18} /> {t.pdf}</button>
              <button className="btn btn-primary" type="button" onClick={() => emailReceipt(lastReceipt)}><Mail size={18} /> {t.emailDraft}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
