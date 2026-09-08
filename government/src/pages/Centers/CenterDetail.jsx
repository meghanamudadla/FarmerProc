import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from 'recharts';
import { motion } from 'framer-motion';
import StatusBadge from '../../components/StatusBadge';
import ChartBlock from '../../components/ChartBlock';
import { useAuth } from '../../context/AuthContext';
import { CENTERS, getDistrictName } from '../../data/mockData';

const mockQueueData = [
  { token: 'T-301', farmer: 'Raman K.', crop: 'Paddy', stage: 'WEIGHING', wait: '25m' },
  { token: 'T-302', farmer: 'Satya V.', crop: 'Wheat', stage: 'QUALITY_CHECK', wait: '42m' },
  { token: 'T-303', farmer: 'Deepa R.', crop: 'Paddy', stage: 'WAITING', wait: '10m' },
  { token: 'T-304', farmer: 'Mohan L.', crop: 'Cotton', stage: 'WAITING', wait: '5m' },
  { token: 'T-305', farmer: 'Gita P.', crop: 'Groundnut', stage: 'PAYMENT', wait: '55m' },
];

const mockHistory = [
  { day: 'Mon', arrivals: 120, processed: 115 },
  { day: 'Tue', arrivals: 145, processed: 138 },
  { day: 'Wed', arrivals: 132, processed: 128 },
  { day: 'Thu', arrivals: 168, processed: 155 },
  { day: 'Fri', arrivals: 189, processed: 175 },
  { day: 'Sat', arrivals: 155, processed: 148 },
  { day: 'Sun', arrivals: 98, processed: 95 },
];

const mockStorage = [
  { day: 'Mon', percent: 45 }, { day: 'Tue', percent: 52 }, { day: 'Wed', percent: 58 },
  { day: 'Thu', percent: 65 }, { day: 'Fri', percent: 72 }, { day: 'Sat', percent: 78 }, { day: 'Sun', percent: 82 },
];

const stageColors = {
  WAITING: 'text-status-busy', WEIGHING: 'text-accent-blue', QUALITY_CHECK: 'text-accent-purple',
  PAYMENT: 'text-accent-emerald', ACCEPTED: 'text-status-normal', REJECTED: 'text-severity-critical',
};

export default function CenterDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canControl } = useAuth();
  const center = CENTERS.find(c => c.id === id);

  if (!center) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-text-muted">Center not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/centers')} className="text-text-muted hover:text-text-primary text-sm">← Back</button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-text-primary">{center.name}</h1>
              <StatusBadge status={center.status} size="lg" />
            </div>
            <p className="text-xs text-text-muted mt-0.5">{getDistrictName(center.district)} • {center.crops.join(', ')}</p>
          </div>
        </div>
        {canControl && center.status !== 'offline' && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-accent-blue/15 text-accent-blue border border-accent-blue/30 px-4 py-2 rounded-xl text-sm font-medium hover:bg-accent-blue/25 transition-colors"
          >
            🔄 Redirect New Bookings
          </motion.button>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Queue Length', value: center.queueLength, icon: '⏳' },
          { label: 'Wait Time', value: `${center.expectedWait}m`, icon: '⏱️' },
          { label: 'Capacity', value: `${center.capacityPercent}%`, icon: '📊' },
          { label: 'Staff on Duty', value: center.staffOnDuty, icon: '👥' },
          { label: 'Storage', value: `${center.storagePercent}%`, icon: '🏗️' },
        ].map(stat => (
          <div key={stat.label} className="bg-bg-card border border-gray-800 rounded-xl p-3">
            <div className="text-xs text-text-muted">{stat.icon} {stat.label}</div>
            <div className="font-tabular text-lg font-bold text-text-primary mt-1">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Queue + Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Live Queue */}
        <div className="bg-bg-card border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">📋 Live Queue</h3>
          <div className="space-y-2">
            {mockQueueData.map(q => (
              <div key={q.token} className="flex items-center justify-between py-2 border-b border-gray-800/50 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="font-tabular text-xs text-accent-blue font-bold">{q.token}</span>
                  <span className="text-sm text-text-primary">{q.farmer}</span>
                  <span className="text-xs text-text-muted">{q.crop}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold ${stageColors[q.stage] || 'text-text-muted'}`}>{q.stage.replace('_', ' ')}</span>
                  <span className="font-tabular text-xs text-text-muted">{q.wait}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Performance chart */}
        <ChartBlock title="Weekly Performance" subtitle="Arrivals vs processed">
          <BarChart data={mockHistory}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#1e293b' }} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#1e293b' }} />
            <Tooltip contentStyle={{ background: '#1a2236', border: '1px solid #374151', borderRadius: 8, fontSize: 12, color: '#f1f5f9' }} />
            <Bar dataKey="arrivals" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Arrivals" />
            <Bar dataKey="processed" fill="#22c55e" radius={[4, 4, 0, 0]} name="Processed" />
          </BarChart>
        </ChartBlock>
      </div>

      {/* Storage trend */}
      <ChartBlock title="Storage Trend" subtitle="7-day capacity utilization">
        <LineChart data={mockStorage}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#1e293b' }} />
          <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#1e293b' }} domain={[0, 100]} />
          <Tooltip contentStyle={{ background: '#1a2236', border: '1px solid #374151', borderRadius: 8, fontSize: 12, color: '#f1f5f9' }} />
          <Line type="monotone" dataKey="percent" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 4 }} name="Storage %" />
        </LineChart>
      </ChartBlock>
    </div>
  );
}
