import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { getCenters, updateCenterStatus } from '../api/api';

export default function CenterManagement() {
  const { canControl } = useAuth();
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getCenters()
      .then((data) => {
        if (Array.isArray(data)) {
          setCenters(data);
        }
      })
      .catch((err) => setError('Failed to load centers'))
      .finally(() => setLoading(false));
  }, []);

  const toggleCenterStatus = async (center) => {
    const newStatus = center.status === 'offline' ? 'normal' : 'offline';
    setTogglingId(center.id);
    setError(null);
    try {
      const updated = await updateCenterStatus(center.id, newStatus);
      setCenters(prev => prev.map(c =>
        c.id === center.id ? { ...c, status: updated.status } : c
      ));
    } catch (err) {
      setError(`Failed to update ${center.name}: ${err.message}`);
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary">⚙️ Center Management</h1>
        <p className="text-xs text-text-muted mt-0.5">Activate or deactivate procurement centers</p>
      </div>

      {error && (
        <div className="bg-severity-critical/10 border border-severity-critical/30 rounded-lg px-4 py-3 text-sm text-severity-critical">
          {error}
        </div>
      )}

      {/* Centers */}
      <div className="bg-bg-card border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-4">
          🏢 Centers ({centers.length})
          {loading && <span className="ml-2 text-xs text-text-muted animate-pulse">Loading...</span>}
        </h3>
        <div className="space-y-2">
          {centers.map(c => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-bg-hover transition-colors"
            >
              <div className="flex items-center gap-3">
                <StatusBadge status={c.status || 'normal'} />
                <div>
                  <div className="text-sm text-text-primary">{c.name}</div>
                  <div className="text-xs text-text-muted">
                    {c.district || '—'} • Capacity: {c.capacity}
                  </div>
                </div>
              </div>
              {canControl && (
                <button
                  onClick={() => toggleCenterStatus(c)}
                  disabled={togglingId === c.id}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-wait ${
                    c.status === 'offline'
                      ? 'bg-status-normal/15 text-status-normal border-status-normal/30 hover:bg-status-normal/25'
                      : 'bg-severity-critical/15 text-severity-critical border-severity-critical/30 hover:bg-severity-critical/25'
                  }`}
                >
                  {togglingId === c.id ? '...' : c.status === 'offline' ? 'Activate' : 'Deactivate'}
                </button>
              )}
            </motion.div>
          ))}
          {!loading && centers.length === 0 && (
            <div className="text-center text-sm text-text-muted py-8">No centers found in the database.</div>
          )}
        </div>
      </div>
    </div>
  );
}
