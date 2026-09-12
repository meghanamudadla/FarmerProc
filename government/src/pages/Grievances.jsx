import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { GRIEVANCES, CENTERS } from '../data/mockData';
import { getAllGrievances, updateGrievance } from '../api/api';

const STATUS_FLOW = ['new', 'assigned', 'in_progress', 'resolved'];
const STATUS_LABELS = { new: 'New', assigned: 'Assigned', in_progress: 'In Progress', resolved: 'Resolved' };
const CATEGORY_ICONS = { payment_dispute: '💰', unfair_rejection: '❌', staff_misconduct: '👤', long_wait: '⏱️' };
const PRIORITY_STYLES = {
  critical: 'bg-severity-critical/15 text-severity-critical',
  high: 'bg-severity-warning/15 text-severity-warning',
  medium: 'bg-accent-blue/15 text-accent-blue',
  low: 'bg-gray-700/50 text-text-secondary',
};

export default function Grievances() {
  const { canControl } = useAuth();
  const [grievances, setGrievances] = useState(GRIEVANCES);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    getAllGrievances()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const liveGrievances = data.map((g) => {
            const rawStatus = (g.status || 'new').toLowerCase();
            let mappedStatus = 'new';
            if (rawStatus === 'assigned') mappedStatus = 'assigned';
            else if (rawStatus === 'under_review' || rawStatus === 'in_progress') mappedStatus = 'in_progress';
            else if (rawStatus === 'resolved') mappedStatus = 'resolved';

            return {
              id: g.complaint_id || `CMP-${g.id}`,
              isLive: true,
              rawComplaintId: g.complaint_id,
              farmerName: `Farmer #${g.farmer_id}`,
              title: g.description ? `${g.category.replace('_', ' ').toUpperCase()}: ${g.description.slice(0, 45)}...` : `${g.category} Issue`,
              description: g.description || 'No description provided.',
              category: g.category.toLowerCase().includes('payment') ? 'payment_dispute' : g.category.toLowerCase().includes('reject') ? 'unfair_rejection' : 'long_wait',
              priority: (g.urgency && ['critical', 'high', 'medium', 'low'].includes(g.urgency.toLowerCase())) ? g.urgency.toLowerCase() : 'medium',
              status: mappedStatus,
              slaDeadline: new Date(Date.now() + 2 * 86400000).toISOString(),
              centerId: 'c1',
              assignedTo: g.assigned_officer || (g.assigned_department ? `${g.assigned_department} Desk` : null),
            };
          });
          setGrievances([...liveGrievances, ...GRIEVANCES]);
        }
      })
      .catch((err) => console.log('Using baseline grievances data'));
  }, []);

  const filtered = filter === 'all' ? grievances : grievances.filter(g => g.status === filter);

  const BACKEND_STATUS = { assigned: 'ASSIGNED', in_progress: 'UNDER_REVIEW', resolved: 'RESOLVED' };

  const handleAdvance = async (grievance) => {
    const idx = STATUS_FLOW.indexOf(grievance.status);
    if (idx >= STATUS_FLOW.length - 1) return;
    const nextStatus = STATUS_FLOW[idx + 1];

    if (grievance.isLive && grievance.rawComplaintId) {
      try {
        await updateGrievance(grievance.rawComplaintId, { status: BACKEND_STATUS[nextStatus] });
      } catch (err) {
        console.error('Failed to update grievance on server:', err.message);
        return;
      }
    }

    setGrievances(prev => prev.map(g => (g.id === grievance.id ? { ...g, status: nextStatus } : g)));
  };

  const getSLAStatus = (deadline) => {
    const now = new Date();
    const dl = new Date(deadline);
    const hoursLeft = (dl - now) / (1000 * 60 * 60);
    if (hoursLeft < 0) return { text: 'OVERDUE', color: 'text-severity-critical' };
    if (hoursLeft < 24) return { text: `${Math.round(hoursLeft)}h left`, color: 'text-severity-warning' };
    return { text: `${Math.round(hoursLeft / 24)}d left`, color: 'text-text-muted' };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">📋 Grievances</h1>
          <p className="text-xs text-text-muted mt-0.5">Farmer complaints and resolution tracking</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="bg-severity-critical/15 text-severity-critical px-2 py-1 rounded-lg font-semibold">{grievances.filter(g => g.status !== 'resolved').length} Open</span>
          <span className="bg-status-normal/15 text-status-normal px-2 py-1 rounded-lg font-semibold">{grievances.filter(g => g.status === 'resolved').length} Resolved</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {['all', ...STATUS_FLOW].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === s ? 'bg-accent-blue text-white' : 'bg-bg-card text-text-secondary border border-gray-700 hover:bg-bg-hover'}`}>
            {s === 'all' ? 'All' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((g, i) => {
          const center = CENTERS.find(c => c.id === g.centerId);
          const sla = getSLAStatus(g.slaDeadline);
          return (
            <motion.div key={g.id} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:i*0.03}}
              className="bg-bg-card border border-gray-800 rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <span className="text-xl mt-0.5">{CATEGORY_ICONS[g.category] || '📋'}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${PRIORITY_STYLES[g.priority]}`}>{g.priority}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        g.status === 'new' ? 'bg-gray-700 text-gray-300' :
                        g.status === 'assigned' ? 'bg-accent-blue/15 text-accent-blue' :
                        g.status === 'in_progress' ? 'bg-status-busy/15 text-status-busy' :
                        'bg-status-normal/15 text-status-normal'
                      }`}>{STATUS_LABELS[g.status]}</span>
                      <span className={`text-[10px] font-semibold ${sla.color}`}>⏱ {sla.text}</span>
                      <span className="text-[10px] text-text-muted">{g.id}</span>
                    </div>
                    <h3 className="text-sm font-medium text-text-primary">{g.title}</h3>
                    <p className="text-xs text-text-secondary mt-1">{g.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-[11px] text-text-muted">
                      <span>👨‍🌾 {g.farmerName}</span>
                      {center && <span>📍 {center.name}</span>}
                      {g.assignedTo && <span>👤 {g.assignedTo}</span>}
                    </div>
                  </div>
                </div>
                {canControl && g.status !== 'resolved' && (
                  <button onClick={() => handleAdvance(g)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-accent-blue/15 text-accent-blue border border-accent-blue/30 hover:bg-accent-blue/25 flex-shrink-0">
                    {g.status === 'new' ? 'Assign' : g.status === 'assigned' ? 'Start Work' : 'Resolve'}
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
        {filtered.length === 0 && <div className="text-center py-12 text-text-muted">No grievances matching filter</div>}
      </div>
    </div>
  );
}
