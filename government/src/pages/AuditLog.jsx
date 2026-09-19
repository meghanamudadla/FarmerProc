import React, { useState, useEffect } from 'react';
import DataTable from '../components/DataTable';
import { apiRequest } from '../api/api';

const ACTION_ICONS = {
  BOOKING_CREATED: '📝', CHECK_IN: '✅', MISSED_WINDOW: '❌', 
  SWAP_OFFERED: '🔄', SWAP_ACCEPTED: '🤝', SWAP_DECLINED: '⛔', 
  RESCHEDULED: '📅', COUNTER_ASSIGNED: '🎯', SERVICE_STARTED: '▶️', 
  SERVICE_COMPLETED: '🏁', BOOKING_CANCELLED: '🚫'
};

export default function AuditLog() {
  const [typeFilter, setTypeFilter] = useState('all');
  const [auditData, setAuditData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAuditLog() {
      try {
        const data = await apiRequest('/audit-log?limit=100');
        setAuditData(data || []);
      } catch (err) {
        console.error("Failed to load audit log:", err);
      } finally {
        setLoading(false);
      }
    }
    loadAuditLog();
  }, []);

  const types = [...new Set(auditData.map(a => a.event_type))];
  const data = typeFilter === 'all' ? auditData : auditData.filter(a => a.event_type === typeFilter);

  const columns = [
    { key: 'created_at', header: 'Timestamp', accessor: 'created_at', render: (v) => (
      <span className="font-tabular text-xs">
        {new Date(v).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
      </span>
    )},
    { key: 'event_type', header: 'Event Type', accessor: 'event_type', render: (v) => (
      <span className="flex items-center gap-1.5 text-xs">
        <span>{ACTION_ICONS[v] || '📝'}</span>
        <span className="font-medium text-accent-blue">{v?.replace(/_/g, ' ') || 'Unknown'}</span>
      </span>
    )},
    { key: 'actor', header: 'Actor', accessor: 'actor', render: (v) => <span className="font-medium text-xs">{v}</span> },
    { key: 'booking_id', header: 'Booking', accessor: 'booking_id', render: (v) => (
      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-accent-purple/15 text-accent-purple">
        {v ? `#${v}` : '—'}
      </span>
    )},
    { key: 'reason', header: 'Reason', accessor: 'reason', render: (v) => <span className="text-xs text-text-muted">{v || '—'}</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">🔒 Audit Log</h1>
          <p className="text-xs text-text-muted mt-0.5">Immutable record of every administrative action</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <span className={`w-2 h-2 rounded-full ${loading ? 'bg-status-warning animate-pulse' : 'bg-status-normal'}`} />
          {loading ? 'Loading...' : `${auditData.length} entries recorded`}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          disabled={loading}
          className="bg-bg-card border border-gray-700 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue">
          <option value="all">All Events</option>
          {types.map(t => <option key={t} value={t}>{ACTION_ICONS[t] || '📝'} {t?.replace(/_/g, ' ') || t}</option>)}
        </select>
      </div>

      <DataTable columns={columns} data={data} pageSize={10} />
    </div>
  );
}
