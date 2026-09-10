import React, { useState, useEffect } from 'react';
import DataTable from '../components/DataTable';
import { PAYMENTS } from '../data/mockData';
import { getPaymentsSummary } from '../api/api';

export default function Payments() {
  const [paymentsData, setPaymentsData] = useState(PAYMENTS);

  useEffect(() => {
    getPaymentsSummary()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          // If live backend has data, merge live records with baseline for full overview
          const liveCenterIds = new Set(data.map(d => d.centerName.toLowerCase()));
          const combined = [
            ...data,
            ...PAYMENTS.filter(p => !liveCenterIds.has(p.centerName.toLowerCase()))
          ];
          setPaymentsData(combined);
        }
      })
      .catch((err) => console.log('Using baseline payments data'));
  }, []);

  const totalValue = paymentsData.reduce((s, p) => s + (p.totalAmount || 0), 0);
  const totalPending = paymentsData.reduce((s, p) => s + (p.pendingPayments || 0), 0);
  const totalDelayed = paymentsData.reduce((s, p) => s + (p.delayedPayments || 0), 0);
  const unreconciled = paymentsData.filter(p => !p.reconciled).length;

  const formatCurrency = (v) => {
    if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)}Cr`;
    if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
    return `₹${v.toLocaleString('en-IN')}`;
  };

  const columns = [
    { key: 'centerName', header: 'Center', accessor: 'centerName', render: (v) => <span className="font-medium">{v}</span> },
    { key: 'totalProcuredQtl', header: 'Procured (qtl)', accessor: 'totalProcuredQtl', render: (v) => <span className="font-tabular">{(v || 0).toLocaleString()}</span> },
    { key: 'totalPaidQtl', header: 'Paid (qtl)', accessor: 'totalPaidQtl', render: (v) => <span className="font-tabular">{(v || 0).toLocaleString()}</span> },
    { key: 'totalAmount', header: 'Total Amount', accessor: 'totalAmount', render: (v) => <span className="font-tabular">{formatCurrency(v || 0)}</span> },
    { key: 'completedPayments', header: 'Completed', accessor: 'completedPayments', render: (v) => <span className="font-tabular text-status-normal">{v || 0}</span> },
    { key: 'pendingPayments', header: 'Pending', accessor: 'pendingPayments', render: (v) => <span className={`font-tabular font-semibold ${(v || 0) > 10 ? 'text-severity-critical' : (v || 0) > 0 ? 'text-severity-warning' : 'text-text-primary'}`}>{v || 0}</span> },
    { key: 'delayedPayments', header: 'Delayed', accessor: 'delayedPayments', render: (v) => <span className={`font-tabular font-semibold ${(v || 0) > 0 ? 'text-severity-critical' : 'text-text-primary'}`}>{v || 0}</span> },
    { key: 'reconciled', header: 'Reconciled', accessor: 'reconciled', render: (v, row) => {
      const mismatch = row.totalProcuredQtl !== row.totalPaidQtl;
      return (
        <div className="flex items-center gap-1.5">
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${v ? 'bg-status-normal/15 text-status-normal' : 'bg-severity-critical/15 text-severity-critical'}`}>
            {v ? '✓ OK' : '✗ Mismatch'}
          </span>
          {mismatch && <span className="text-[10px] text-severity-warning">Δ{Math.round((row.totalProcuredQtl || 0) - (row.totalPaidQtl || 0))}qtl</span>}
        </div>
      );
    }},
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary">💰 Payment Monitoring</h1>
        <p className="text-xs text-text-muted mt-0.5">Track payments, identify delays, and reconcile mismatches</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Disbursed', value: formatCurrency(totalValue), icon: '💰' },
          { label: 'Pending Payments', value: totalPending, icon: '⏳' },
          { label: 'Delayed (>24h)', value: totalDelayed, icon: '🚨', color: totalDelayed > 0 ? 'text-severity-critical' : '' },
          { label: 'Unreconciled Centers', value: unreconciled, icon: '⚠️', color: unreconciled > 0 ? 'text-severity-warning' : '' },
        ].map(s => (
          <div key={s.label} className="bg-bg-card border border-gray-800 rounded-xl p-3">
            <div className="text-xs text-text-muted">{s.icon} {s.label}</div>
            <div className={`font-tabular text-xl font-bold mt-1 ${s.color || 'text-text-primary'}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <DataTable columns={columns} data={paymentsData} pageSize={12} />
    </div>
  );
}
