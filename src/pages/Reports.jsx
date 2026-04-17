import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Download, FileSpreadsheet } from 'lucide-react';

export const Reports = () => {
  const [downloading, setDownloading] = useState(false);

  const downloadExcel = async (reportType) => {
    setDownloading(true);
    try {
      // For V1, we'll fetch the core API endpoints and transform them into flat Excel sheets
      let data = [];
      let filename = `${reportType}_Report.xlsx`;

      if (reportType === 'Sales') {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/sales`);
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
            'Total Revenue': `$${s.totalRevenue.toFixed(2)}`,
            'Total COGS': `$${s.totalCogs.toFixed(2)}`,
            'Gross Profit': `$${(s.totalRevenue - s.totalCogs).toFixed(2)}`,
            'Gross Margin %': (((s.totalRevenue - s.totalCogs) / s.totalRevenue) * 100).toFixed(1) + '%'
          };
        });

        // Summation Row
        data.push({});
        data.push({
          'Sale ID': 'TOTALS',
          'Total Revenue': `$${sumRev.toFixed(2)}`,
          'Total COGS': `$${sumCogs.toFixed(2)}`,
          'Gross Profit': `$${(sumRev - sumCogs).toFixed(2)}`,
          'Gross Margin %': sumRev > 0 ? (((sumRev - sumCogs) / sumRev) * 100).toFixed(1) + '%' : '0%'
        });
      }

      if (reportType === 'Inventory') {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/inventory/products`);
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
            'Unit Cost (WAC)': `$${p.costPrice.toFixed(2)}`,
            'Total Inventory Value': `$${val.toFixed(2)}`
          };
        });

        // Summation Row
        data.push({});
        data.push({
          'SKU': 'TOTAL VALUATION',
          'Total Inventory Value': `$${totalVal.toFixed(2)}`
        });
      }

      if (data.length === 0) {
        alert("No data available for this report.");
        setDownloading(false);
        return;
      }

      // Generate the XLSX via SheetJS
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, reportType);
      
      XLSX.writeFile(workbook, filename);
    } catch (e) {
      console.error(e);
      alert("Failed to export report.");
    }
    setDownloading(false);
  };

  return (
    <div>
      <h1 className="page-title">Export & Intelligence Reports</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div className="card">
          <h3 style={{ marginBottom: '1.5rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileSpreadsheet className="text-primary" size={24} /> Generate Excel (.xlsx) Reports
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
              <span style={{ fontWeight: 600 }}>Inventory Valuation & Location Map</span>
              <Download size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
