import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { getAllProcurements, getCenters, getAllFarmers, getPaymentsSummary } from '../api/api';
import { CENTERS, FARMERS, PAYMENTS } from '../data/mockData';

const REPORT_TYPES = [
  { id: 'daily', name: 'Daily Summary', icon: '📊', desc: 'All centers — arrivals, completions, rejections, payments' },
  { id: 'district', name: 'District Report', icon: '🏢', desc: 'Per-district aggregation of procurement and payments' },
  { id: 'crop', name: 'Crop-wise Report', icon: '🌾', desc: 'Procurement volume, MSP paid, rejection rates by crop' },
  { id: 'center', name: 'Center Performance', icon: '📈', desc: 'Queue efficiency, processing speed, storage utilization per center' },
  { id: 'payment', name: 'Payment Report', icon: '💰', desc: 'Disbursement status, reconciliation, delayed payments' },
  { id: 'farmer', name: 'Farmer Report', icon: '👨‍🌾', desc: 'Farmer registrations, bookings, no-shows, flagged accounts' },
];

const SCHEDULED = [
  { id: 's1', report: 'Daily Summary', frequency: 'Daily 8:00 AM', recipients: 'state-admin@gov.in, dist-karnal@gov.in', status: 'active' },
  { id: 's2', report: 'District Report', frequency: 'Weekly (Mon 9:00 AM)', recipients: 'hq-analytics@gov.in', status: 'active' },
];

export default function Reports() {
  const [selectedReport, setSelectedReport] = useState(null);
  const [dateFrom, setDateFrom] = useState('2026-09-01');
  const [dateTo, setDateTo] = useState('2026-09-08');
  const [exporting, setExporting] = useState(false);

  const downloadCSV = (filename, dataRows) => {
    if (!dataRows || dataRows.length === 0) return;
    const headers = Object.keys(dataRows[0]);
    const csvContent = [
      headers.join(','),
      ...dataRows.map(row => headers.map(h => {
        let val = row[h];
        if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val ?? '';
      }).join(','))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleGenerate = async (format) => {
    if (!selectedReport) return;
    setExporting(true);

    try {
      if (format === 'PDF') {
        window.print();
        setExporting(false);
        return;
      }

      let rows = [];
      const reportId = selectedReport.id;

      if (reportId === 'farmer') {
        try {
          const live = await getAllFarmers();
          rows = (Array.isArray(live) && live.length > 0) ? live : FARMERS;
        } catch {
          rows = FARMERS;
        }
      } else if (reportId === 'payment') {
        try {
          const live = await getPaymentsSummary();
          rows = (Array.isArray(live) && live.length > 0) ? live : PAYMENTS;
        } catch {
          rows = PAYMENTS;
        }
      } else if (reportId === 'center' || reportId === 'district') {
        try {
          const live = await getCenters();
          rows = (Array.isArray(live) && live.length > 0) ? live : CENTERS;
        } catch {
          rows = CENTERS;
        }
      } else {
        try {
          const live = await getAllProcurements();
          rows = (Array.isArray(live) && live.length > 0) ? live : [
            { date: dateFrom, crop: 'Paddy', arrivals: 140, completed: 135, total_disbursed_inr: 420000 },
            { date: dateTo, crop: 'Wheat', arrivals: 95, completed: 92, total_disbursed_inr: 285000 },
          ];
        } catch {
          rows = [
            { date: dateFrom, crop: 'Paddy', arrivals: 140, completed: 135, total_disbursed_inr: 420000 },
            { date: dateTo, crop: 'Wheat', arrivals: 95, completed: 92, total_disbursed_inr: 285000 },
          ];
        }
      }

      const fileExtension = format === 'Excel' ? 'csv' : 'csv';
      downloadCSV(`FarmerProc_${selectedReport.name.replace(/\s+/g, '_')}_${dateFrom}_to_${dateTo}.${fileExtension}`, rows);
    } catch (e) {
      console.error('Export failed:', e);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary">📄 Reports</h1>
        <p className="text-xs text-text-muted mt-0.5">Generate, export, and schedule procurement reports</p>
      </div>

      {/* Report types */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {REPORT_TYPES.map(r => (
          <motion.button
            key={r.id}
            whileHover={{ scale: 1.02 }}
            onClick={() => setSelectedReport(r)}
            className={`text-left p-4 rounded-xl border transition-all ${
              selectedReport?.id === r.id
                ? 'bg-accent-blue/10 border-accent-blue/40 ring-1 ring-accent-blue/20'
                : 'bg-bg-card border-gray-800 hover:bg-bg-hover hover:border-gray-700'
            }`}
          >
            <span className="text-xl">{r.icon}</span>
            <div className="text-sm font-medium text-text-primary mt-2">{r.name}</div>
            <div className="text-xs text-text-muted mt-0.5">{r.desc}</div>
          </motion.button>
        ))}
      </div>

      {/* Generator */}
      {selectedReport && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-bg-card border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Generate: {selectedReport.name}</h3>
          <div className="flex items-end gap-4 flex-wrap">
            <div>
              <label className="text-xs text-text-muted block mb-1">From</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="bg-bg-primary border border-gray-700 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue" />
            </div>
            <div>
              <label className="text-xs text-text-muted block mb-1">To</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="bg-bg-primary border border-gray-700 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue" />
            </div>
            <button disabled={exporting} onClick={() => handleGenerate('PDF')} className="bg-accent-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent-blue/80 disabled:opacity-50">📥 PDF</button>
            <button disabled={exporting} onClick={() => handleGenerate('CSV')} className="bg-accent-emerald/15 text-accent-emerald border border-accent-emerald/30 px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent-emerald/25 disabled:opacity-50">📥 CSV</button>
            <button disabled={exporting} onClick={() => handleGenerate('Excel')} className="bg-accent-purple/15 text-accent-purple border border-accent-purple/30 px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent-purple/25 disabled:opacity-50">📥 Excel</button>
          </div>
        </motion.div>
      )}

      {/* Scheduled reports */}
      <div className="bg-bg-card border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-4">📆 Scheduled Reports</h3>
        <div className="space-y-2">
          {SCHEDULED.map(s => (
            <div key={s.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-bg-hover transition-colors">
              <div>
                <div className="text-sm text-text-primary">{s.report}</div>
                <div className="text-xs text-text-muted">{s.frequency} → {s.recipients}</div>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-status-normal/15 text-status-normal font-semibold">{s.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
