import React, { useState, useContext } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { StoreContext } from '../context/StoreContext';
import { AuthContext } from '../context/AuthContext';
import { formatCurrency, formatPercentage } from '../utils/formatters';
import { downloadCsv } from '../utils/csv';

export const Reports = () => {
  const { settings } = useContext(StoreContext);
  const { token, logout } = useContext(AuthContext);
  const [downloading, setDownloading] = useState(false);

  const downloadExcel = async (reportType) => {
    setDownloading(true);
    try {
      // For V1, we'll fetch the core API endpoints and transform them into flat Excel sheets
      const fetchOptions = { headers: { 'Authorization': `Bearer ${token}` } };
      let data = [];
      let filename = `${reportType}_Report.csv`;

      if (reportType === 'Sales') {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/sales`, fetchOptions);
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
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/inventory/products`, fetchOptions);
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
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/inventory/warehouse-stock`, fetchOptions);
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
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/inventory/transfers`, fetchOptions);
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
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/hr/payments`, fetchOptions);
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
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/commercial-partners`, fetchOptions);
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

      if (reportType === 'Audit Logs') {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/audit-logs?take=500`, fetchOptions);
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

  return (
    <div>
      <h1 className="page-title">Export & Intelligence Reports</h1>
      
      <div className="reports-grid">
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
