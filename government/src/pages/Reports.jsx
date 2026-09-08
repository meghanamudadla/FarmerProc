import React, { useState } from 'react';
import { motion } from 'framer-motion';

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

  const handleGenerate = (format) => {
    alert(`Generating ${selectedReport?.name} (${format}) for ${dateFrom} to ${dateTo}`);
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
            <button onClick={() => handleGenerate('PDF')} className="bg-accent-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent-blue/80">📥 PDF</button>
            <button onClick={() => handleGenerate('CSV')} className="bg-accent-emerald/15 text-accent-emerald border border-accent-emerald/30 px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent-emerald/25">📥 CSV</button>
            <button onClick={() => handleGenerate('Excel')} className="bg-accent-purple/15 text-accent-purple border border-accent-purple/30 px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent-purple/25">📥 Excel</button>
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
