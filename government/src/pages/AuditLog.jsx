import React, { useState } from 'react';
import DataTable from '../components/DataTable';
import { AUDIT_LOG } from '../data/mockData';

const ACTION_ICONS = {
  threshold_change: '⚙️', center_deactivate: '🔴', alert_acknowledge: '🔔', auto_escalation: '📢',
  farmer_flag: '🚩', redirect_bookings: '🔄', grievance_assign: '📋', crop_config: '🌾',
  center_approve: '✅', user_role_change: '👤',
};

export default function AuditLog() {
  const [typeFilter, setTypeFilter] = useState('all');

  const types = [...new Set(AUDIT_LOG.map(a => a.action))];
  const data = typeFilter === 'all' ? AUDIT_LOG : AUDIT_LOG.filter(a => a.action === typeFilter);

  const columns = [
    { key: 'timestamp', header: 'Timestamp', accessor: 'timestamp', render: (v) => (
      <span className="font-tabular text-xs">{new Date(v).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
    )},
    { key: 'action', header: 'Action', accessor: 'action', render: (v) => (
      <span className="flex items-center gap-1.5 text-xs">
        <span>{ACTION_ICONS[v] || '📝'}</span>
        <span className="font-medium text-accent-blue">{v.replace(/_/g, ' ')}</span>
      </span>
    )},
    { key: 'user', header: 'User', accessor: 'user', render: (v) => <span className="font-medium">{v}</span> },
    { key: 'role', header: 'Role', accessor: 'role', render: (v) => (
      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
        v === 'State Admin' ? 'bg-accent-purple/15 text-accent-purple' :
        v === 'System' ? 'bg-gray-700 text-text-secondary' :
        'bg-accent-blue/15 text-accent-blue'
      }`}>{v}</span>
    )},
    { key: 'description', header: 'Description', accessor: 'description' },
    { key: 'target', header: 'Target', accessor: 'target', render: (v) => <span className="text-xs text-text-muted">{v}</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">🔒 Audit Log</h1>
          <p className="text-xs text-text-muted mt-0.5">Immutable record of every administrative action</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <span className="w-2 h-2 rounded-full bg-status-normal" />
          {AUDIT_LOG.length} entries recorded
        </div>
      </div>

      <div className="flex items-center gap-3">
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="bg-bg-card border border-gray-700 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue">
          <option value="all">All Actions</option>
          {types.map(t => <option key={t} value={t}>{ACTION_ICONS[t] || '📝'} {t.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      <DataTable columns={columns} data={data} pageSize={10} />
    </div>
  );
}
