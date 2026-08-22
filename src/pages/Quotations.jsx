import React, { useContext, useMemo, useState } from 'react';
import {
  CheckCircle2,
  FileText,
  Mail,
  Minus,
  Plus,
  Printer,
  Save,
  Search,
  Send,
  Trash2,
} from 'lucide-react';
import { StoreContext } from '../context/StoreContext';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import { formatCurrency } from '../utils/formatters';

const STORAGE_KEY = 'soul_quotations';

const buildQuotationNumber = () => {
  const date = new Date();
  return `COT-${date.getFullYear()}-${String(Date.now()).slice(-5)}`;
};

const createQuoteMetadata = () => ({
  id: crypto.randomUUID ? crypto.randomUUID() : buildQuotationNumber(),
  number: buildQuotationNumber(),
  createdAt: new Date().toISOString(),
});

const readStoredQuotations = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
};

const getCompanyInfo = (settings) => ({
  name: settings?.companyName || 'Soul2Soul',
  location: settings?.companyAddress || 'Baía Mall, Maputo',
  nuit: settings?.companyNuit || settings?.companyTaxId || '401112650',
  email: settings?.companyEmail || 'comercial@soul2soulmz.com',
  phone: settings?.companyPhone || settings?.companyWhatsApp || '847521748',
});

export const Quotations = () => {
  const { products, customers, commercialPartners, settings } = useContext(StoreContext);
  const { user } = useContext(AuthContext);
  const { language } = useContext(LanguageContext);
  const [quotes, setQuotes] = useState(readStoredQuotations);
  const [query, setQuery] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerNuit, setCustomerNuit] = useState('');
  const [partnerId, setPartnerId] = useState('');
  const [validDays, setValidDays] = useState(7);
  const [discount, setDiscount] = useState(0);
  const [includeVat, setIncludeVat] = useState(false);
  const [notes, setNotes] = useState('Entrega sujeita a confirmação de stock. Pagamento conforme acordo com o cliente.');
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('Rascunho');
  const [successMsg, setSuccessMsg] = useState('');

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
    return source.slice(0, 8);
  }, [query, saleableProducts]);

  const activeCustomers = customers.filter((customer) => customer.status !== 'Inactive');
  const activePartners = commercialPartners.filter((partner) => partner.status !== 'Inactive');
  const selectedCustomer = activeCustomers.find((customer) => customer.id === Number(customerId));
  const selectedPartner = activePartners.find((partner) => partner.id === Number(partnerId));
  const companyInfo = getCompanyInfo(settings);

  const quoteLines = useMemo(() => {
    return items.map((line) => {
      const product = products.find((item) => item.id === line.productId);
      const quantity = Number(line.quantity) || 1;
      const unitPrice = Number(line.unitPrice ?? product?.sellingPrice ?? 0);
      const unitCost = Number(product?.costPrice || 0);
      return {
        ...line,
        product,
        quantity,
        unitPrice,
        unitCost,
        total: unitPrice * quantity,
        costTotal: unitCost * quantity,
      };
    });
  }, [items, products]);

  const totals = quoteLines.reduce(
    (acc, line) => ({
      subtotal: acc.subtotal + line.total,
      cost: acc.cost + line.costTotal,
      units: acc.units + line.quantity,
    }),
    { subtotal: 0, cost: 0, units: 0 }
  );
  const discountAmount = Math.min(totals.subtotal, Number(discount) || 0);
  const taxableTotal = Math.max(0, totals.subtotal - discountAmount);
  const vatRate = 0.16;
  const vatAmount = includeVat ? taxableTotal * vatRate : 0;
  const total = taxableTotal + vatAmount;
  const margin = taxableTotal > 0 ? ((taxableTotal - totals.cost) / taxableTotal) * 100 : 0;

  const addProduct = (product) => {
    setItems((current) => {
      const existing = current.find((line) => line.productId === product.id);
      if (existing) {
        return current.map((line) =>
          line.productId === product.id ? { ...line, quantity: line.quantity + 1 } : line
        );
      }
      return [...current, { productId: product.id, quantity: 1, unitPrice: product.sellingPrice }];
    });
  };

  const updateLine = (productId, patch) => {
    setItems((current) =>
      current.map((line) => (line.productId === productId ? { ...line, ...patch } : line))
    );
  };

  const removeLine = (productId) => {
    setItems((current) => current.filter((line) => line.productId !== productId));
  };

  const handleCustomerChange = (value) => {
    setCustomerId(value);
    const customer = activeCustomers.find((item) => item.id === Number(value));
    if (customer) {
      setCustomerName(customer.fullName);
      setCustomerPhone(customer.phone || '');
      setCustomerEmail(customer.email || '');
      setCustomerNuit('');
    }
  };

  const buildQuote = (nextStatus = status, metadata) => ({
    id: metadata.id,
    number: metadata.number,
    createdAt: metadata.createdAt,
    status: nextStatus,
    validDays: Number(validDays) || 7,
    customerName: selectedCustomer?.fullName || customerName || 'Cliente de Balcão',
    customerPhone: selectedCustomer?.phone || customerPhone,
    customerEmail: selectedCustomer?.email || customerEmail,
    customerNuit,
    partnerName: selectedPartner?.name || '',
    sellerName: user?.fullName || user?.email || '',
    notes,
    discount: discountAmount,
    subtotal: totals.subtotal,
    taxableTotal,
    includeVat,
    vatRate,
    vatAmount,
    total,
    margin,
    items: quoteLines.map((line) => ({
      name: line.product?.name || 'Produto',
      sku: line.product?.sku || '',
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      total: line.total,
    })),
  });

  const persistQuote = (nextStatus = status) => {
    if (quoteLines.length === 0) return null;
    const quote = buildQuote(nextStatus, createQuoteMetadata());
    const nextQuotes = [quote, ...quotes].slice(0, 25);
    setQuotes(nextQuotes);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextQuotes));
    setStatus(nextStatus);
    setSuccessMsg(`Cotação ${quote.number} guardada como ${nextStatus}.`);
    return quote;
  };

  const printQuote = (sourceQuote) => {
    const quote = {
      ...sourceQuote,
      customerNuit: sourceQuote.customerNuit || '',
      taxableTotal: sourceQuote.taxableTotal ?? Math.max(0, (sourceQuote.subtotal || 0) - (sourceQuote.discount || 0)),
      includeVat: Boolean(sourceQuote.includeVat),
      vatAmount: sourceQuote.vatAmount || 0,
    };
    const expiry = new Date(quote.createdAt);
    expiry.setDate(expiry.getDate() + quote.validDays);
    const logoUrl = `${window.location.origin}/logo.png`;
    const signatureCode = `S2S-${String(quote.number).replaceAll('-', '')}-${new Date(quote.createdAt).getTime().toString(36).toUpperCase()}`;
    const itemRows = quote.items.map((item) => `
      <tr>
        <td><strong>${item.name}</strong><span>${item.sku || ''}</span></td>
        <td>${item.quantity}</td>
        <td>${formatCurrency(item.unitPrice, settings)}</td>
        <td>${formatCurrency(item.total, settings)}</td>
      </tr>
    `).join('');
    const win = window.open('', '_blank', 'width=860,height=960');
    win.document.write(`
      <html>
        <head>
          <title>${quote.number}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #2E2E2E; padding: 28px; }
            header { display: grid; grid-template-columns: 178px 1fr; gap: 18px; align-items: stretch; border-bottom: 2px solid #6B8E7E; padding-bottom: 14px; }
            .brand { width: 154px; padding: 10px; background: #fff; border: 1px solid #E8E5DF; border-radius: 10px; text-align: center; }
            .brand img { width: 124px; margin: 0 auto 6px; }
            .brand strong, .brand span { display: block; }
            .brand strong { color: #3F5F51; font-size: 12px; }
            .brand span { color: #5A5A5A; font-size: 9.5px; line-height: 1.28; margin-top: 2px; }
            .document-head { display: grid; grid-template-columns: 0.86fr 1.08fr 0.78fr; gap: 10px; }
            h1 { margin: 0; color: #3F5F51; font-size: 17px; text-transform: uppercase; letter-spacing: 0.04em; text-align: center; }
            .muted, td span { color: #5A5A5A; font-size: 11px; display: block; margin-top: 3px; }
            .document-card { border: 1px solid #E8E5DF; border-radius: 10px; padding: 10px; background: #fff; }
            .document-card h2 { margin: 0 0 8px; color: #3F5F51; font-size: 17px; text-align: center; text-transform: uppercase; letter-spacing: 0.04em; }
            .info-grid { display: grid; gap: 5px; }
            .info-line { display: grid; grid-template-columns: 64px 1fr; gap: 7px; font-size: 11.5px; }
            .info-line span { color: #5A5A5A; }
            .info-line strong { color: #2E2E2E; }
            .price-card { display: grid; align-content: center; text-align: center; background: #FBF7EF; border-color: rgba(107, 142, 126, 0.32); }
            .price-card h2 { margin-bottom: 6px; }
            .price-card strong { color: #3F5F51; font-size: 19px; line-height: 1.1; }
            .price-card small { display: block; margin-top: 5px; color: #5A5A5A; font-size: 10.5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border-bottom: 1px solid #E8E5DF; padding: 10px 11px; text-align: left; }
            th { background: #FBF7EF; color: #5A5A5A; font-size: 12px; text-transform: uppercase; }
            td:nth-child(2), td:nth-child(3), td:nth-child(4), th:nth-child(2), th:nth-child(3), th:nth-child(4) { text-align: right; }
            .totals { width: 300px; margin-left: auto; margin-top: 16px; }
            .totals div { display: flex; justify-content: space-between; padding: 6px 0; font-size: 12.5px; }
            .grand { color: #3F5F51; font-size: 18px !important; font-weight: 700; border-top: 2px solid #6B8E7E; margin-top: 2px; padding-top: 9px !important; }
            .notes { margin-top: 22px; padding: 13px; background: #FBF7EF; border-radius: 10px; font-size: 12px; }
            .signature { display: grid; grid-template-columns: 1fr auto; gap: 16px; align-items: end; margin-top: 22px; padding-top: 15px; border-top: 1px solid #E8E5DF; }
            .signature-box { min-width: 240px; padding: 12px; border: 1px solid #6B8E7E; border-radius: 10px; text-align: center; }
            .signature-box strong { display: block; color: #3F5F51; font-size: 13px; }
            .signature-box span { display: block; margin-top: 6px; color: #5A5A5A; font-size: 11px; letter-spacing: 0.04em; }
            .actions { margin-top: 20px; }
            button { padding: 12px 18px; border: 0; border-radius: 8px; background: #6B8E7E; color: #fff; font-weight: 700; }
            @media print { button { display: none; } body { padding: 0; } }
          </style>
        </head>
        <body>
          <header>
            <div class="brand">
              <img src="${logoUrl}" alt="Soul2Soul" />
              <strong>${companyInfo.name}</strong>
              <span>NUIT: ${companyInfo.nuit}</span>
              <span>${companyInfo.location}</span>
              <span>${companyInfo.email}</span>
              <span>${companyInfo.phone}</span>
            </div>
            <div class="document-head">
              <div class="document-card">
                <h1>Cotação</h1>
                <div class="info-grid">
                  <div class="info-line"><span>Número</span><strong>${quote.number}</strong></div>
                  <div class="info-line"><span>Emitida</span><strong>${new Date(quote.createdAt).toLocaleDateString()}</strong></div>
                  <div class="info-line"><span>Validade</span><strong>${expiry.toLocaleDateString()}</strong></div>
                  <div class="info-line"><span>Estado</span><strong>${quote.status}</strong></div>
                </div>
              </div>
              <div class="document-card">
                <h2>Cliente</h2>
                <div class="info-grid">
                  <div class="info-line"><span>Nome</span><strong>${quote.customerName}</strong></div>
                  <div class="info-line"><span>NUIT</span><strong>${quote.customerNuit || '-'}</strong></div>
                  <div class="info-line"><span>Contacto</span><strong>${quote.customerPhone || '-'}</strong></div>
                  <div class="info-line"><span>Email</span><strong>${quote.customerEmail || '-'}</strong></div>
                </div>
              </div>
              <div class="document-card price-card">
                <h2>Total</h2>
                <strong>${formatCurrency(quote.total, settings)}</strong>
                <small>${quote.includeVat ? 'Inclui IVA de 16%' : 'IVA não aplicado'}</small>
              </div>
            </div>
          </header>
          <table>
            <thead><tr><th>Produto</th><th>Qtd.</th><th>Preço</th><th>Total</th></tr></thead>
            <tbody>${itemRows}</tbody>
          </table>
          <section class="totals">
            <div><span>Subtotal</span><strong>${formatCurrency(quote.subtotal, settings)}</strong></div>
            <div><span>Desconto</span><strong>-${formatCurrency(quote.discount, settings)}</strong></div>
            <div><span>Base tributável</span><strong>${formatCurrency(quote.taxableTotal, settings)}</strong></div>
            <div><span>IVA 16%</span><strong>${quote.includeVat ? formatCurrency(quote.vatAmount, settings) : 'Não aplicado'}</strong></div>
            <div class="grand"><span>Total</span><strong>${formatCurrency(quote.total, settings)}</strong></div>
          </section>
          <section class="notes"><strong>Notas e condições</strong><p>${quote.notes || 'Sem notas adicionais.'}</p></section>
          <section class="signature">
            <p class="muted">Documento gerado automaticamente pelo Sistema de Gestão Soul2Soul. Esta assinatura digital identifica a cotação emitida pelo sistema e deve acompanhar qualquer versão impressa ou PDF.</p>
            <div class="signature-box">
              <strong>Assinatura digital do sistema</strong>
              <span>${signatureCode}</span>
            </div>
          </section>
          <div class="actions"><button onclick="window.print()">Imprimir / Guardar PDF</button></div>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
  };

  const saveAndPrint = () => {
    const quote = persistQuote('Enviada') || buildQuote('Enviada', createQuoteMetadata());
    printQuote(quote);
  };

  const sendEmail = () => {
    const quote = persistQuote('Enviada') || buildQuote('Enviada', createQuoteMetadata());
    const subject = encodeURIComponent(`Cotação Soul2Soul ${quote.number}`);
    const body = encodeURIComponent([
      `Olá ${quote.customerName},`,
      '',
      `Segue a cotação ${quote.number}.`,
      `Total: ${formatCurrency(quote.total, settings)}`,
      `Validade: ${quote.validDays} dias`,
      '',
      quote.notes,
    ].join('\n'));
    const mailto = `mailto:${encodeURIComponent(quote.customerEmail || '')}?subject=${subject}&body=${body}`;
    window.open(mailto, '_self');
  };

  return (
    <div>
      <div className="quotation-hero">
        <div className="quotation-brand-card" aria-label="Soul2Soul">
          <img src="/logo.png" alt="Soul2Soul" />
          <strong>{companyInfo.name}</strong>
          <span>NUIT: {companyInfo.nuit}</span>
          <span>{companyInfo.location}</span>
          <span>{companyInfo.email}</span>
          <span>{companyInfo.phone}</span>
        </div>
        <div>
          <span className="quotation-kicker">Soul2Soul Comercial</span>
          <h1>Cotações</h1>
          <p>Prepare propostas comerciais com validade, desconto, margem prevista e PDF com branding.</p>
        </div>
        <div className="quotation-hero-total">
          <span>Total da cotação</span>
          <strong>{formatCurrency(total, settings)}</strong>
          <small>{margin.toFixed(1)}% margem prevista</small>
        </div>
      </div>

      {successMsg && <div className="inline-alert inline-alert-success"><CheckCircle2 size={18} /> {successMsg}</div>}

      <div className="quotation-layout">
        <section className="card quotation-builder">
          <div className="section-heading">
            <div>
              <h3>Nova cotação</h3>
              <span>Cotação com estado, validade e seguimento</span>
            </div>
            <span className="badge badge-warning">{status}</span>
          </div>

          <div className="quotation-form-grid">
            <div className="form-group">
              <label className="form-label">Cliente</label>
              <select className="form-input" value={customerId} onChange={(event) => handleCustomerChange(event.target.value)}>
                <option value="">Cliente manual / balcão</option>
                {activeCustomers.map((customer) => (
                  <option key={customer.id} value={customer.id}>{customer.fullName}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Revendedor / vendedor</label>
              <select className="form-input" value={partnerId} onChange={(event) => setPartnerId(event.target.value)}>
                <option value="">Soul2Soul direto - {user?.fullName || user?.email}</option>
                {activePartners.map((partner) => (
                  <option key={partner.id} value={partner.id}>{partner.name} | {partner.type}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Nome do cliente</label>
              <input className="form-input" value={customerName} onChange={(event) => setCustomerName(event.target.value)} disabled={!!selectedCustomer} />
            </div>
            <div className="form-group">
              <label className="form-label">Contacto</label>
              <input className="form-input" value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} disabled={!!selectedCustomer} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} disabled={!!selectedCustomer} />
            </div>
            <div className="form-group">
              <label className="form-label">NUIT do cliente</label>
              <input className="form-input" value={customerNuit} onChange={(event) => setCustomerNuit(event.target.value)} placeholder="Opcional" />
            </div>
            <div className="form-group">
              <label className="form-label">Validade</label>
              <select className="form-input" value={validDays} onChange={(event) => setValidDays(event.target.value)}>
                <option value="7">7 dias</option>
                <option value="15">15 dias</option>
                <option value="30">30 dias</option>
              </select>
            </div>
          </div>

          <div className="quotation-products">
            <div className="search-input">
              <Search size={18} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar produto ou SKU" />
            </div>
            <div className="quotation-pick-list">
              {filteredProducts.map((product) => (
                <button type="button" key={product.id} onClick={() => addProduct(product)}>
                  <span>
                    <strong>{product.name}</strong>
                    <small>{product.sku} · {product.category}</small>
                  </span>
                  <strong>{formatCurrency(product.sellingPrice, settings)}</strong>
                </button>
              ))}
            </div>
          </div>

          <div className="quotation-lines">
            {quoteLines.length === 0 ? (
              <div className="empty-cart">Selecione produtos para iniciar a cotação.</div>
            ) : quoteLines.map((line) => (
              <div className="quotation-line" key={line.productId}>
                <div>
                  <strong>{line.product?.name || 'Produto'}</strong>
                  <span>{line.product?.sku || ''}</span>
                </div>
                <div className="cart-qty">
                  <button type="button" onClick={() => updateLine(line.productId, { quantity: Math.max(1, line.quantity - 1) })}><Minus size={14} /></button>
                  <input type="number" min="1" value={line.quantity} onChange={(event) => updateLine(line.productId, { quantity: Math.max(1, Number(event.target.value) || 1) })} />
                  <button type="button" onClick={() => updateLine(line.productId, { quantity: line.quantity + 1 })}><Plus size={14} /></button>
                </div>
                <input className="form-input quotation-price-input" type="number" min="0" step="0.01" value={line.unitPrice} onChange={(event) => updateLine(line.productId, { unitPrice: Number(event.target.value) || 0 })} />
                <strong>{formatCurrency(line.total, settings)}</strong>
                <button className="icon-danger" type="button" onClick={() => removeLine(line.productId)}><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
        </section>

        <aside className="quotation-side">
          <section className="card quotation-summary-card">
            <div className="section-heading">
              <h3>Resumo</h3>
              <FileText size={20} />
            </div>
            <div className="quotation-total-row"><span>Unidades</span><strong>{totals.units}</strong></div>
            <div className="quotation-total-row"><span>Subtotal</span><strong>{formatCurrency(totals.subtotal, settings)}</strong></div>
            <div className="form-group">
              <label className="form-label">Desconto comercial</label>
              <input className="form-input" type="number" min="0" step="0.01" value={discount} onChange={(event) => setDiscount(event.target.value)} />
            </div>
            <label className="quotation-tax-toggle">
              <input type="checkbox" checked={includeVat} onChange={(event) => setIncludeVat(event.target.checked)} />
              <span>
                <strong>Aplicar IVA 16%</strong>
                <small>Opcional para cotações que exigem imposto discriminado.</small>
              </span>
            </label>
            <div className="quotation-total-row"><span>Margem prevista</span><strong>{margin.toFixed(1)}%</strong></div>
            <div className="quotation-total-row"><span>IVA 16%</span><strong>{includeVat ? formatCurrency(vatAmount, settings) : 'Não aplicado'}</strong></div>
            <div className="quotation-grand-total"><span>Total</span><strong>{formatCurrency(total, settings)}</strong></div>
            <div className="form-group">
              <label className="form-label">Notas e condições</label>
              <textarea className="form-input" rows="4" value={notes} onChange={(event) => setNotes(event.target.value)} />
            </div>
            <div className="quotation-actions">
              <button className="btn btn-secondary" type="button" disabled={quoteLines.length === 0} onClick={() => persistQuote('Rascunho')}><Save size={18} /> Guardar</button>
              <button className="btn btn-primary" type="button" disabled={quoteLines.length === 0} onClick={saveAndPrint}><Printer size={18} /> Gerar PDF</button>
              <button className="btn btn-secondary" type="button" disabled={quoteLines.length === 0} onClick={sendEmail}><Mail size={18} /> Email</button>
              <button className="btn btn-primary" type="button" disabled={quoteLines.length === 0} onClick={() => persistQuote('Aprovada')}><Send size={18} /> Aprovar</button>
            </div>
          </section>

          <section className="card quotation-history-card">
            <div className="section-heading">
              <h3>Histórico</h3>
              <span>{quotes.length} registos</span>
            </div>
            <div className="quotation-history-list">
              {quotes.length === 0 ? (
                <p className="muted-text">Ainda não existem cotações guardadas neste dispositivo.</p>
              ) : quotes.map((quote) => (
                <button type="button" key={quote.id} onClick={() => printQuote(quote)}>
                  <span>
                    <strong>{quote.number}</strong>
                    <small>{quote.customerName} · {new Date(quote.createdAt).toLocaleDateString(language === 'pt' ? 'pt-PT' : 'en-US')}</small>
                  </span>
                  <span>
                    <strong>{formatCurrency(quote.total, settings)}</strong>
                    <small>{quote.status}</small>
                  </span>
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};
