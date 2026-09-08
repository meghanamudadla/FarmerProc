import React, { useState } from 'react';
import { motion } from 'framer-motion';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { CENTERS, getDistrictName } from '../data/mockData';

const pendingCenters = [
  { id: 'c13', name: 'Nellore Agri Hub', district: 'd4', submittedBy: 'Collector, Nellore', submittedAt: '2026-09-06', docsVerified: true, capacityVerified: false },
  { id: 'c14', name: 'Warangal Grain Point', district: 'd3', submittedBy: 'Collector, Warangal', submittedAt: '2026-09-07', docsVerified: false, capacityVerified: false },
];

export default function CenterManagement() {
  const { canControl, canConfigure } = useAuth();
  const [centers, setCenters] = useState(CENTERS);
  const [pending] = useState(pendingCenters);

  const toggleCenterStatus = (id) => {
    setCenters(prev => prev.map(c =>
      c.id === id ? { ...c, status: c.status === 'offline' ? 'normal' : 'offline' } : c
    ));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary">⚙️ Center Management</h1>
        <p className="text-xs text-text-muted mt-0.5">Approve new centers, activate/deactivate, manage operations</p>
      </div>

      {/* Pending Approval */}
      {canConfigure && (
        <div className="bg-bg-card border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">📋 Pending Approval ({pending.length})</h3>
          <div className="space-y-3">
            {pending.map(c => (
              <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-bg-primary border border-gray-800">
                <div>
                  <div className="text-sm font-medium text-text-primary">{c.name}</div>
                  <div className="text-xs text-text-muted mt-0.5">
                    {getDistrictName(c.district)} • Submitted by {c.submittedBy} on {c.submittedAt}
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${c.docsVerified ? 'bg-status-normal/15 text-status-normal' : 'bg-status-busy/15 text-status-busy'}`}>
                      {c.docsVerified ? '✓ Docs Verified' : '⏳ Docs Pending'}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${c.capacityVerified ? 'bg-status-normal/15 text-status-normal' : 'bg-status-busy/15 text-status-busy'}`}>
                      {c.capacityVerified ? '✓ Capacity Verified' : '⏳ Capacity Pending'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="text-xs px-3 py-1.5 rounded-lg bg-status-normal/15 text-status-normal border border-status-normal/30 hover:bg-status-normal/25">Approve</button>
                  <button className="text-xs px-3 py-1.5 rounded-lg bg-severity-critical/15 text-severity-critical border border-severity-critical/30 hover:bg-severity-critical/25">Reject</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Centers */}
      <div className="bg-bg-card border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-4">🏢 Active Centers ({centers.length})</h3>
        <div className="space-y-2">
          {centers.map(c => (
            <div key={c.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-bg-hover transition-colors">
              <div className="flex items-center gap-3">
                <StatusBadge status={c.status} />
                <div>
                  <div className="text-sm text-text-primary">{c.name}</div>
                  <div className="text-xs text-text-muted">{getDistrictName(c.district)} • Staff: {c.staffOnDuty} • Crops: {c.crops.join(', ')}</div>
                </div>
              </div>
              {canControl && (
                <button
                  onClick={() => toggleCenterStatus(c.id)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                    c.status === 'offline'
                      ? 'bg-status-normal/15 text-status-normal border-status-normal/30 hover:bg-status-normal/25'
                      : 'bg-severity-critical/15 text-severity-critical border-severity-critical/30 hover:bg-severity-critical/25'
                  }`}
                >
                  {c.status === 'offline' ? 'Activate' : 'Deactivate'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
