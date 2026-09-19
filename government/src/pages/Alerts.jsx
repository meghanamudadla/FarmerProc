import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { SeverityBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { getAllGrievances, updateGrievance } from '../api/api';

// Maps this page's UI status flow to the backend's GrievanceUpdate statuses
const UI_TO_BACKEND_STATUS = {
  new: 'ASSIGNED',
  acknowledged: 'UNDER_REVIEW',
  in_progress: 'RESOLVED',
};
const BACKEND_TO_UI_STATUS = {
  SUBMITTED: 'new',
  ASSIGNED: 'acknowledged',
  UNDER_REVIEW: 'in_progress',
  RESOLVED: 'resolved',
  REJECTED: 'resolved',
  REOPENED: 'new',
};

const STATUS_FLOW = ['new', 'acknowledged', 'in_progress', 'resolved'];
const STATUS_LABELS = { new: 'New', acknowledged: 'Acknowledged', in_progress: 'In Progress', resolved: 'Resolved' };

export default function Alerts() {
  const { canControl, user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [advancingId, setAdvancingId] = useState(null);
  const [error, setError] = useState(null);
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    getAllGrievances()
      .then((data) => {
        if (Array.isArray(data)) {
          const liveAlerts = data.map((g) => ({
            id: g.complaint_id || `ALT-G${g.id}`,
            complaintId: g.complaint_id,
            type: g.category?.toLowerCase().includes('payment') ? 'payment_delay' : 'grievance',
            severity: (g.urgency === 'HIGH' || g.urgency === 'CRITICAL') ? 'critical' : 'warning',
            title: `Farmer Grievance: ${(g.category || '').replace(/_/g, ' ')} (${g.complaint_id})`,
            description: g.description,
            status: BACKEND_TO_UI_STATUS[g.status] || 'new',
            createdAt: g.created_at || new Date().toISOString(),
            acknowledgedBy: g.assigned_officer || null,
            resolvedAt: null,
          }));
          setAlerts(liveAlerts);
        }
      })
      .catch(() => setError('Failed to load grievances'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let data = [...alerts];
    if (severityFilter !== 'all') data = data.filter(a => a.severity === severityFilter);
    if (statusFilter !== 'all') data = data.filter(a => a.status === statusFilter);
    return data.sort((a, b) => {
      const sev = { critical: 0, warning: 1, info: 2 };
      return (sev[a.severity] || 3) - (sev[b.severity] || 3);
    });
  }, [alerts, severityFilter, statusFilter]);

  const handleAdvanceStatus = async (alert) => {
    const currentIdx = STATUS_FLOW.indexOf(alert.status);
    if (currentIdx >= STATUS_FLOW.length - 1) return;

    const backendStatus = UI_TO_BACKEND_STATUS[alert.status];
    if (!backendStatus) return;

    setAdvancingId(alert.id);
    setError(null);

    try {
      const patchData = { status: backendStatus };
      // Set assigned_officer on first acknowledge
      if (alert.status === 'new' && user?.name) {
        patchData.assigned_officer = user.name;
      }

      await updateGrievance(alert.complaintId, patchData);

      // Update local state only after backend confirms
      setAlerts(prev => prev.map(a => {
        if (a.id !== alert.id) return a;
        return {
          ...a,
          status: STATUS_FLOW[currentIdx + 1],
          acknowledgedBy: a.acknowledgedBy || user?.name,
        };
      }));
    } catch (err) {
      setError(`Failed to update ${alert.id}: ${err.message}`);
    } finally {
      setAdvancingId(null);
    }
  };

  const countBySeverity = (sev) => alerts.filter(a => a.severity === sev && a.status !== 'resolved').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">🚨 Alerts & Exceptions</h1>
          <p className="text-xs text-text-muted mt-0.5">Grievance-derived alerts from farmer complaints</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="bg-severity-critical/15 text-severity-critical px-2 py-1 rounded-lg font-semibold">{countBySeverity('critical')} Critical</span>
            <span className="bg-severity-warning/15 text-severity-warning px-2 py-1 rounded-lg font-semibold">{countBySeverity('warning')} Warning</span>
          </div>
          {loading && <span className="text-xs text-text-muted animate-pulse">Loading...</span>}
        </div>
      </div>

      {error && (
        <div className="bg-severity-critical/10 border border-severity-critical/30 rounded-lg px-4 py-3 text-sm text-severity-critical">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}
          className="bg-bg-card border border-gray-700 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue">
          <option value="all">All Severities</option>
          <option value="critical">🔴 Critical</option>
          <option value="warning">🟡 Warning</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-bg-card border border-gray-700 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue">
          <option value="all">All Statuses</option>
          {STATUS_FLOW.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
      </div>

      {/* Alert cards */}
      <div className="space-y-3">
        {filtered.map((alert, i) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className={`bg-bg-card border rounded-xl p-4 ${
              alert.severity === 'critical' && alert.status !== 'resolved'
                ? 'border-severity-critical/40 shadow-md shadow-severity-critical/5'
                : 'border-gray-800'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <span className="text-xl mt-0.5">{alert.type === 'payment_delay' ? '💰' : '⚠️'}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <SeverityBadge severity={alert.severity} />
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      alert.status === 'new' ? 'bg-gray-700 text-gray-300' :
                      alert.status === 'acknowledged' ? 'bg-accent-blue/15 text-accent-blue' :
                      alert.status === 'in_progress' ? 'bg-status-busy/15 text-status-busy' :
                      'bg-status-normal/15 text-status-normal'
                    }`}>{STATUS_LABELS[alert.status]}</span>
                    <span className="text-[10px] text-text-muted">{alert.id}</span>
                  </div>
                  <h3 className="text-sm font-medium text-text-primary">{alert.title}</h3>
                  <p className="text-xs text-text-secondary mt-1">{alert.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-[11px] text-text-muted">
                    <span>📍 All Centres</span>
                    <span>🕐 {new Date(alert.createdAt).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}</span>
                    {alert.acknowledgedBy && <span>👤 {alert.acknowledgedBy}</span>}
                  </div>
                </div>
              </div>

              {canControl && alert.status !== 'resolved' && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleAdvanceStatus(alert)}
                  disabled={advancingId === alert.id}
                  className="text-xs px-3 py-1.5 rounded-lg bg-accent-blue/15 text-accent-blue border border-accent-blue/30 hover:bg-accent-blue/25 flex-shrink-0 disabled:opacity-50 disabled:cursor-wait"
                >
                  {advancingId === alert.id ? '...' : alert.status === 'new' ? 'Acknowledge' : alert.status === 'acknowledged' ? 'Start Work' : 'Resolve'}
                </motion.button>
              )}
            </div>
          </motion.div>
        ))}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-12 text-text-muted">No alerts matching filters</div>
        )}
      </div>
    </div>
  );
}
