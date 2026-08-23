import React, { useState, useContext } from 'react';
import { Calendar, Download, FileSpreadsheet, FileText, Printer } from 'lucide-react';
import { StoreContext } from '../context/StoreContext';
import { AuthContext } from '../context/AuthContext';
import { formatCurrency, formatPercentage } from '../utils/formatters';
import { downloadCsv } from '../utils/csv';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const SALES_PERIODS = [
  { value: 'today', label: 'Hoje' },
  { value: 'yesterday', label: 'Ontem' },
  { value: 'this_week', label: 'Esta semana' },
  { value: 'last_week', label: 'Semana passada' },
  { value: 'this_month', label: 'Este mes' },
  { value: 'last_month', label: 'Mes passado' },
  { value: 'this_year', label: 'Este ano' },
  { value: 'last_year', label: 'Ano passado' },
  { value: 'all', label: 'Todas as vendas' },
  { value: 'custom', label: 'Periodo personalizado' },
];

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const formatDateTime = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleString('pt-MZ', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
};

const buildSellerRanking = (sales = []) => Array.from(
  sales.reduce((acc, sale) => {
    const key = sale.sellerName || 'Sem vendedor';
    const current = acc.get(key) || { name: key, sales: 0, units: 0, revenue: 0 };
    current.sales += 1;
    current.units += (sale.items || []).reduce((sum, item) => sum + item.quantity, 0);
    current.revenue += Number(sale.totalRevenue) || 0;
    acc.set(key, current);
    return acc;
  }, new Map()).values()
).sort((a, b) => b.revenue - a.revenue || b.sales - a.sales || b.units - a.units);

export const Reports = () => {
  const { settings } = useContext(StoreContext);
  const { token, logout } = useContext(AuthContext);
  const [downloading, setDownloading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [salesPeriod, setSalesPeriod] = useState('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const downloadExcel = async (reportType) => {
    setDownloading(true);
    try {
      // For V1, we'll fetch the core API endpoints and transform them into flat Excel sheets
      const fetchOptions = { headers: { 'Authorization': `Bearer ${token}` } };
      let data = [];
      let filename = `${reportType}_Report.csv`;

      if (reportType === 'Sales') {
        const res = await fetch(`${API_BASE}/api/sales`, fetchOptions);
        if (res.status === 401) return logout();
        const raw = await res.json();
        
        let sumRev = 0;
        let sumCogs = 0;

        data = raw.map(s => {
          sumRev += s.totalRevenue;
          sumCogs += s.totalCogs;
          return {
            'Sale ID': s.id,
            'Date': new Date(s.date).toISOString().split('T')[0],
            'Customer': s.customerName || 'Retail',
            'Channel': s.channel,
            'Order Reference': s.orderReference || '',
            'Fulfillment Status': s.fulfillmentStatus || 'Delivered',
            'Warehouse': s.warehouseName || s.warehouse?.name || '',
            'Seller / Reseller': s.sellerName || '',
            'Seller Type': s.sellerType || '',
            'Commission': formatCurrency(s.commissionAmount || 0, settings),
            'Total Revenue': formatCurrency(s.totalRevenue, settings),
            'Total COGS': formatCurrency(s.totalCogs, settings),
            'Gross Profit': formatCurrency(s.totalRevenue - s.totalCogs, settings),
            'Gross Margin %': formatPercentage(s.totalRevenue > 0 ? ((s.totalRevenue - s.totalCogs) / s.totalRevenue) * 100 : 0, settings)
          };
        });

        // Summation Row
        data.push({});
        data.push({
          'Sale ID': 'TOTALS',
          'Date': '',
          'Customer': '',
          'Channel': '',
          'Order Reference': '',
          'Fulfillment Status': '',
          'Warehouse': '',
          'Seller / Reseller': '',
          'Seller Type': '',
          'Commission': '',
          'Total Revenue': formatCurrency(sumRev, settings),
          'Total COGS': formatCurrency(sumCogs, settings),
          'Gross Profit': formatCurrency(sumRev - sumCogs, settings),
          'Gross Margin %': formatPercentage(sumRev > 0 ? ((sumRev - sumCogs) / sumRev) * 100 : 0, settings)
        });
      }

      if (reportType === 'Inventory') {
        const res = await fetch(`${API_BASE}/api/inventory/products`, fetchOptions);
        if (res.status === 401) return logout();
        const raw = await res.json();
        let totalVal = 0;

        data = raw.map(p => {
          const val = p.stock * p.costPrice;
          totalVal += val;
          return {
            'SKU': p.sku,
            'Product Name': p.name,
            'Category': p.category,
            'Type': p.type,
            'Current Stock': p.stock,
            'Unit Cost (WAC)': formatCurrency(p.costPrice, settings),
            'Total Inventory Value': formatCurrency(val, settings)
          };
        });

        // Summation Row
        data.push({});
        data.push({
          'SKU': 'TOTAL VALUATION',
          'Product Name': '',
          'Category': '',
          'Type': '',
          'Current Stock': '',
          'Unit Cost (WAC)': '',
          'Total Inventory Value': formatCurrency(totalVal, settings)
        });
      }

      if (reportType === 'Warehouse Inventory') {
        const res = await fetch(`${API_BASE}/api/inventory/warehouse-stock`, fetchOptions);
        if (res.status === 401) return logout();
        const raw = await res.json();
        let totalVal = 0;

        data = raw.map(row => {
          const val = row.quantity * row.product.costPrice;
          totalVal += val;
          return {
            'Warehouse': row.warehouse.name,
            'Warehouse Type': row.warehouse.type,
            'SKU': row.product.sku,
            'Product Name': row.product.name,
            'Category': row.product.category,
            'Current Stock': row.quantity,
            'Minimum Stock': row.minStock,
            'Difference': row.quantity - row.minStock,
            'Status': row.stockStatus,
            'Unit Cost (WAC)': formatCurrency(row.product.costPrice, settings),
            'Inventory Value': formatCurrency(val, settings)
          };
        });

        data.push({});
        data.push({
          'Warehouse': 'TOTAL VALUATION',
          'Warehouse Type': '',
          'SKU': '',
          'Product Name': '',
          'Category': '',
          'Current Stock': '',
          'Minimum Stock': '',
          'Difference': '',
          'Status': '',
          'Unit Cost (WAC)': '',
          'Inventory Value': formatCurrency(totalVal, settings)
        });
      }

      if (reportType === 'Stock Transfers') {
        const res = await fetch(`${API_BASE}/api/inventory/transfers`, fetchOptions);
        if (res.status === 401) return logout();
        const raw = await res.json();
        data = raw.flatMap((transfer) => (
          transfer.items?.map((item) => ({
            'Transfer Number': transfer.transferNumber,
            'Created Date': new Date(transfer.createdAt).toISOString().split('T')[0],
            'Origin': transfer.sourceWarehouse?.name || '',
            'Destination': transfer.destinationWarehouse?.name || '',
            'Status': transfer.status,
            'Requested By': transfer.requestedByName || '',
            'Confirmed By': transfer.confirmedByName || '',
            'Product SKU': item.product?.sku || '',
            'Product Name': item.product?.name || '',
            'Quantity': item.quantity,
            'Unit Cost': formatCurrency(item.unitCost || 0, settings),
            'Line Value': formatCurrency((item.unitCost || 0) * item.quantity, settings),
            'Notes': transfer.notes || '',
          })) || []
        ));
      }

      if (reportType === 'HR Payments') {
        const res = await fetch(`${API_BASE}/api/hr/payments`, fetchOptions);
        if (res.status === 401) return logout();
        const raw = await res.json();
        data = raw.map((payment) => ({
          'Description': payment.description,
          'Type': payment.type,
          'Worker': payment.employee?.fullName || '',
          'Amount': formatCurrency(payment.amount, settings),
          'Periodicity': payment.periodicity || 'One-time',
          'Due Date': payment.dueDate ? new Date(payment.dueDate).toISOString().split('T')[0] : '',
          'Next Due Date': payment.nextDueDate ? new Date(payment.nextDueDate).toISOString().split('T')[0] : '',
          'Method': payment.method || '',
          'Status': payment.status,
          'Notes': payment.notes || '',
        }));
      }

      if (reportType === 'Sellers & Resellers') {
        const res = await fetch(`${API_BASE}/api/commercial-partners`, fetchOptions);
        if (res.status === 401) return logout();
        const raw = await res.json();
        data = raw.map((partner) => ({
          'Name': partner.name,
          'Type': partner.type,
          'Phone': partner.phone || '',
          'Email': partner.email || '',
          'Commission Rate %': partner.commissionRate || 0,
          'Sales Count': partner._count?.sales || 0,
          'Status': partner.status,
          'Notes': partner.notes || '',
        }));
      }

      if (reportType === 'Fund Requests') {
        const res = await fetch(`${API_BASE}/api/fund-requests`, fetchOptions);
        if (res.status === 401) return logout();
        const raw = await res.json();
        data = raw.map((request) => ({
          'Request Number': request.requestNumber,
          'Created Date': new Date(request.createdAt).toISOString().split('T')[0],
          'Requester': request.requesterName,
          'Role': request.requesterRole || '',
          'Department': request.department || '',
          'Category': request.category,
          'Title': request.title,
          'Amount': formatCurrency(request.amount, settings),
          'Needed By': request.neededBy ? new Date(request.neededBy).toISOString().split('T')[0] : '',
          'Priority': request.priority,
          'Payment Method': request.paymentMethod || '',
          'Payee': request.payeeName || '',
          'Payee Phone': request.payeePhone || '',
          'Status': request.status,
          'Reviewed By': request.reviewedByName || '',
          'Review Notes': request.reviewNotes || '',
        }));
      }

      if (reportType === 'Audit Logs') {
        const res = await fetch(`${API_BASE}/api/audit-logs?take=500`, fetchOptions);
        if (res.status === 401) return logout();
        const raw = await res.json();
        data = raw.map((log) => ({
          'Date': new Date(log.createdAt).toLocaleString(),
          'User': log.userName || log.userEmail || 'System',
          'Role': log.userRole || '',
          'Method': log.method,
          'Path': log.path,
          'Module': log.entityType || '',
          'IP Address': log.ipAddress || '',
          'Machine': log.machine || '',
          'Status Code': log.statusCode || '',
          'User Agent': log.userAgent || '',
          'Metadata': log.metadata || '',
        }));
      }

      if (data.length === 0) {
        alert("No data available for this report.");
        setDownloading(false);
        return;
      }

      downloadCsv(data, filename);
    } catch (e) {
      console.error(e);
      alert("Failed to export report.");
    }
    setDownloading(false);
  };

  const generateSalesPdf = async () => {
    if (salesPeriod === 'custom' && (!customStart || !customEnd)) {
      alert('Escolha a data inicial e final para gerar o PDF.');
      return;
    }

    setPdfLoading(true);
    try {
      const params = new URLSearchParams({ period: salesPeriod, _: String(Date.now()) });
      if (salesPeriod === 'custom') {
        params.set('start', customStart);
        params.set('end', customEnd);
      }

      const res = await fetch(`${API_BASE}/api/sales/report?${params.toString()}`, {
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache',
        },
      });
      if (res.status === 401) return logout();
      if (!res.ok) throw new Error('Failed to load sales report.');

      const report = await res.json();
      const selectedPeriod = SALES_PERIODS.find((period) => period.value === salesPeriod);
      const periodLabel = selectedPeriod?.label || 'Periodo';
      const rangeLabel = report.period?.from && report.period?.to
        ? `${formatDateTime(report.period.from)} - ${formatDateTime(report.period.to)}`
        : 'Todas as vendas registadas';
      const rows = report.sales || [];
      const summary = report.summary || {};
      const sellerRanking = buildSellerRanking(rows);
      const topSeller = sellerRanking[0];
      const sellerRows = sellerRanking.map((seller, index) => `
        <tr class="${index === 0 ? 'top-seller-row' : ''}">
          <td>${index + 1}</td>
          <td>${escapeHtml(seller.name)}</td>
          <td class="num">${formatCurrency(seller.revenue, settings)}</td>
          <td class="num">${seller.sales}</td>
          <td class="num">${seller.units}</td>
          <td>${index === 0 ? 'Mais vendeu no periodo' : ''}</td>
        </tr>
      `).join('');

      const saleRows = rows.map((sale) => {
        const items = (sale.items || []).map((item) => {
          const productName = item.product?.name || `Produto #${item.productId}`;
          const lineTotal = item.lineTotalCents ? item.lineTotalCents / 100 : (item.unitSellingPrice || 0) * item.quantity;
          return `${escapeHtml(productName)} (${item.quantity} x ${formatCurrency(item.unitSellingPrice || 0, settings)} = ${formatCurrency(lineTotal, settings)})`;
        }).join('<br>');
        const payments = (sale.payments || []).map((payment) =>
          `${escapeHtml(payment.method)}: ${formatCurrency((payment.amountCents || 0) / 100, settings)}`
        ).join('<br>');

        return `
          <tr>
            <td>#${sale.id}</td>
            <td>${escapeHtml(formatDateTime(sale.date))}</td>
            <td>${escapeHtml(sale.customerName || 'Cliente Balcao')}</td>
            <td>${escapeHtml(sale.sellerName || 'Sem vendedor')}</td>
            <td>${escapeHtml(sale.warehouseName || sale.warehouse?.name || '')}</td>
            <td>${escapeHtml(sale.channel || '')}</td>
            <td>${items || '-'}</td>
            <td>${payments || escapeHtml(sale.paymentMethod || '')}</td>
            <td>${escapeHtml(sale.status || sale.paymentStatus || '')}</td>
            <td class="num">${formatCurrency(sale.totalRevenue || 0, settings)}</td>
          </tr>
        `;
      }).join('');

      const html = `
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Relatorio de vendas - ${escapeHtml(periodLabel)}</title>
            <style>
              @page { size: A4 landscape; margin: 12mm; }
              * { box-sizing: border-box; }
              body { font-family: Arial, sans-serif; color: #222; margin: 0; }
              header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid #6B8E7E; padding-bottom: 12px; margin-bottom: 16px; }
              h1 { margin: 0 0 6px; font-size: 22px; }
              p { margin: 0; color: #666; font-size: 12px; }
              .summary { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; margin-bottom: 16px; }
              .metric { border: 1px solid #ddd; border-radius: 6px; padding: 8px; }
              .metric span { display: block; color: #666; font-size: 10px; text-transform: uppercase; }
              .metric strong { display: block; margin-top: 4px; font-size: 14px; }
              .top-seller { display: grid; grid-template-columns: 1.2fr 2fr; gap: 12px; margin-bottom: 16px; }
              .top-seller-card { border: 2px solid #6B8E7E; border-radius: 8px; padding: 10px; background: #f7faf5; }
              .top-seller-card span { display: block; color: #50685d; font-size: 10px; text-transform: uppercase; font-weight: 700; }
              .top-seller-card strong { display: block; margin: 5px 0; color: #2f5748; font-size: 18px; }
              .seller-table { margin-bottom: 16px; }
              table { width: 100%; border-collapse: collapse; font-size: 10px; }
              th { background: #f3f0ea; color: #333; text-align: left; }
              th, td { border-bottom: 1px solid #ddd; padding: 6px; vertical-align: top; }
              .num { text-align: right; white-space: nowrap; }
              .top-seller-row td { background: #eef5ef; font-weight: 700; }
              .actions { position: sticky; top: 0; display: flex; justify-content: flex-end; gap: 8px; padding: 10px 0; background: white; }
              button { border: 0; border-radius: 6px; padding: 8px 12px; background: #6B8E7E; color: white; cursor: pointer; }
              @media print { .actions { display: none; } }
            </style>
          </head>
          <body>
            <div class="actions"><button onclick="window.print()">Imprimir / Guardar PDF</button></div>
            <header>
              <div>
                <h1>Relatorio de vendas</h1>
                <p>${escapeHtml(periodLabel)} | ${escapeHtml(rangeLabel)}</p>
              </div>
              <div>
                <p>Soul2Soul</p>
                <p>Gerado em ${escapeHtml(formatDateTime(new Date()))}</p>
              </div>
            </header>
            <section class="summary">
              <div class="metric"><span>Vendas</span><strong>${summary.saleCount || 0}</strong></div>
              <div class="metric"><span>Vendas pagas</span><strong>${summary.paidSaleCount || 0}</strong></div>
              <div class="metric"><span>Unidades</span><strong>${summary.units || 0}</strong></div>
              <div class="metric"><span>Receita</span><strong>${formatCurrency(summary.totalRevenue || 0, settings)}</strong></div>
              <div class="metric"><span>Lucro bruto</span><strong>${formatCurrency(summary.grossProfit || 0, settings)}</strong></div>
              <div class="metric"><span>Ticket medio</span><strong>${formatCurrency(summary.averageTicket || 0, settings)}</strong></div>
            </section>
            <section class="top-seller">
              <div class="top-seller-card">
                <span>Vendedor destaque</span>
                <strong>${topSeller ? escapeHtml(topSeller.name) : 'Sem vendas'}</strong>
                <p>${topSeller ? `${formatCurrency(topSeller.revenue, settings)} em ${topSeller.sales} vendas e ${topSeller.units} unidades.` : 'Sem vendas no periodo selecionado.'}</p>
              </div>
              <table class="seller-table">
                <thead>
                  <tr><th>#</th><th>Vendedor</th><th class="num">Vendas liquidas</th><th class="num">Qtd. vendas</th><th class="num">Unidades</th><th>Destaque</th></tr>
                </thead>
                <tbody>${sellerRows || '<tr><td colspan="6">Sem ranking de vendedores.</td></tr>'}</tbody>
              </table>
            </section>
            <table>
              <thead>
                <tr>
                  <th>Venda</th>
                  <th>Data</th>
                  <th>Cliente</th>
                  <th>Vendedor</th>
                  <th>Armazem</th>
                  <th>Canal</th>
                  <th>Produtos</th>
                  <th>Pagamentos</th>
                  <th>Status</th>
                  <th class="num">Total</th>
                </tr>
              </thead>
              <tbody>
                ${saleRows || '<tr><td colspan="10">Sem vendas no periodo selecionado.</td></tr>'}
              </tbody>
            </table>
          </body>
        </html>
      `;

      const printWindow = window.open('', '_blank', 'width=1200,height=800');
      if (!printWindow) {
        alert('Permita pop-ups para abrir o PDF.');
        return;
      }
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 500);
    } catch (e) {
      console.error(e);
      alert('Nao foi possivel gerar o PDF de vendas.');
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div>
      <h1 className="page-title">Export & Intelligence Reports</h1>
      
      <div className="reports-grid">
        <div className="card">
          <h3 style={{ marginBottom: '1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText className="text-primary" size={24} /> PDF de vendas por periodo
          </h3>
          <p style={{ color: 'var(--color-charcoal-light)', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
            Gere um PDF com resumo e lista completa das vendas do dia, semana, mes, ano ou todo o historico.
          </p>

          <div className="sales-pdf-controls">
            <label>
              <span><Calendar size={15} /> Periodo</span>
              <select value={salesPeriod} onChange={(event) => setSalesPeriod(event.target.value)}>
                {SALES_PERIODS.map((period) => (
                  <option key={period.value} value={period.value}>{period.label}</option>
                ))}
              </select>
            </label>
            {salesPeriod === 'custom' && (
              <>
                <label>
                  <span>Data inicial</span>
                  <input type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} />
                </label>
                <label>
                  <span>Data final</span>
                  <input type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} />
                </label>
              </>
            )}
            <button className="btn btn-primary" type="button" onClick={generateSalesPdf} disabled={pdfLoading}>
              <Printer size={18} />
              {pdfLoading ? 'A gerar...' : 'Gerar PDF'}
            </button>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '1.5rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileSpreadsheet className="text-primary" size={24} /> Generate Excel-compatible CSV Reports
          </h3>
          <p style={{ color: 'var(--color-charcoal-light)', marginBottom: '2rem', fontSize: '0.875rem' }}>
            Download live data ledgers directly into Microsoft Excel formatting for external processing and tax preparation.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <button className="btn" onClick={() => downloadExcel('Sales')} disabled={downloading} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem' }}>
              <span style={{ fontWeight: 600 }}>Sales Range & Profitability Report</span>
              <Download size={18} />
            </button>

            <button className="btn" onClick={() => downloadExcel('Inventory')} disabled={downloading} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem' }}>
              <span style={{ fontWeight: 600 }}>Consolidated Inventory Valuation</span>
              <Download size={18} />
            </button>

            <button className="btn" onClick={() => downloadExcel('Warehouse Inventory')} disabled={downloading} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem' }}>
              <span style={{ fontWeight: 600 }}>Warehouse Inventory & Location Map</span>
              <Download size={18} />
            </button>

            <button className="btn" onClick={() => downloadExcel('Stock Transfers')} disabled={downloading} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem' }}>
              <span style={{ fontWeight: 600 }}>Stock Transfers & In-Transit Report</span>
              <Download size={18} />
            </button>

            <button className="btn" onClick={() => downloadExcel('HR Payments')} disabled={downloading} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem' }}>
              <span style={{ fontWeight: 600 }}>HR Payments & Periodicity Report</span>
              <Download size={18} />
            </button>

            <button className="btn" onClick={() => downloadExcel('Sellers & Resellers')} disabled={downloading} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem' }}>
              <span style={{ fontWeight: 600 }}>Sellers, Resellers & Commissions Report</span>
              <Download size={18} />
            </button>

            <button className="btn" onClick={() => downloadExcel('Fund Requests')} disabled={downloading} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem' }}>
              <span style={{ fontWeight: 600 }}>Fund Requests Approval Report</span>
              <Download size={18} />
            </button>

            <button className="btn" onClick={() => downloadExcel('Audit Logs')} disabled={downloading} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem' }}>
              <span style={{ fontWeight: 600 }}>Audit Logs Report</span>
              <Download size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
