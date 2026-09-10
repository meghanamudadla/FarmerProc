import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { motion } from 'framer-motion';
import StatCard from '../components/StatCard';
import ChartBlock from '../components/ChartBlock';
import StatusBadge from '../components/StatusBadge';
import { useNotifications } from '../context/NotificationContext';
import { computeKPIs, HOURLY_TODAY, CENTERS, ALERTS } from '../data/mockData';
import { getProcurementAnalytics, getCenters, getAllGrievances } from '../api/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const { events } = useNotifications();
  const kpis = computeKPIs();
  const [liveAnalytics, setLiveAnalytics] = useState(null);
  const [liveGrievanceAlerts, setLiveGrievanceAlerts] = useState([]);
  const [centersCount, setCentersCount] = useState(null);

  useEffect(() => {
    getProcurementAnalytics()
      .then((data) => setLiveAnalytics(data))
      .catch((e) => console.log('Using baseline KPI data'));

    getCenters()
      .then((centers) => {
        if (Array.isArray(centers) && centers.length > 0) {
          setCentersCount(centers.length);
        }
      })
      .catch((e) => console.log('Using baseline centers count'));

    getAllGrievances()
      .then((grievances) => {
        if (Array.isArray(grievances) && grievances.length > 0) {
          const highAlerts = grievances
            .filter((g) => (g.urgency === 'HIGH' || g.urgency === 'CRITICAL') && g.status !== 'RESOLVED')
            .map((g) => ({
              id: g.complaint_id,
              title: `Grievance (${g.complaint_id}): ${g.description.slice(0, 70)}...`,
              severity: 'critical',
              status: 'new'
            }));
          setLiveGrievanceAlerts(highAlerts);
        }
      })
      .catch((e) => console.log('Using baseline alerts in dashboard'));
  }, []);

  const kpiCards = [
    { ...kpis.totalFarmers, value: liveAnalytics?.total_farmers ?? kpis.totalFarmers.value, icon: '👨‍🌾' },
    { ...kpis.totalCenters, value: liveAnalytics?.total_centers ?? (centersCount || kpis.totalCenters.value), icon: '🏢' },
    { ...kpis.todayArrivals, value: liveAnalytics?.today_arrivals ?? kpis.todayArrivals.value, icon: '📥' },
    { ...kpis.todayCompleted, value: liveAnalytics?.today_completed ?? kpis.todayCompleted.value, icon: '✅' },
    { ...kpis.totalQuantity, value: liveAnalytics?.total_procured_quintals ?? kpis.totalQuantity.value, icon: '📦', suffix: ' qtl' },
    { ...kpis.totalPayments, value: liveAnalytics?.total_disbursed_inr ? liveAnalytics.total_disbursed_inr.toLocaleString('en-IN') : kpis.totalPayments.value, icon: '💰', prefix: '₹' },
    { ...kpis.activeQueues, value: liveAnalytics?.active_queues ?? kpis.activeQueues.value, icon: '⏳' },
    { ...kpis.pendingIssues, value: liveAnalytics?.pending_issues ?? kpis.pendingIssues.value, icon: '⚠️' },
  ];

  const statusSummary = [
    { status: 'normal', count: (centersCount || kpis.normal.value) },
    { status: 'busy', count: CENTERS.filter(c => c.status === 'busy').length },
    { status: 'congested', count: kpis.congested.value },
    { status: 'offline', count: kpis.offline.value },
  ];

  const criticalAlerts = [
    ...liveGrievanceAlerts,
    ...ALERTS.filter(a => a.severity === 'critical' && a.status !== 'resolved')
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Command Dashboard</h1>
          <p className="text-xs text-text-muted mt-0.5">Real-time procurement overview — {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="flex items-center gap-4">
          {statusSummary.map(s => (
            <div key={s.status} className="flex items-center gap-1.5 text-xs">
              <StatusBadge status={s.status} />
              <span className="font-tabular font-bold text-text-primary">{s.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpiCards.map((kpi, i) => (
          <StatCard key={kpi.label} label={kpi.label} value={kpi.value} change={kpi.change} icon={kpi.icon} prefix={kpi.prefix} suffix={kpi.suffix} delay={i} />
        ))}
      </div>

      {/* Critical alerts banner */}
      {criticalAlerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-severity-critical/10 border border-severity-critical/30 rounded-xl p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-severity-critical font-semibold text-sm">🚨 {criticalAlerts.length} Critical Alert{criticalAlerts.length > 1 ? 's' : ''}</span>
          </div>
          <div className="space-y-1.5">
            {criticalAlerts.map(a => (
              <div key={a.id} className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer hover:text-text-primary" onClick={() => navigate('/alerts')}>
                <span className="w-1.5 h-1.5 rounded-full bg-severity-critical animate-pulse-dot" />
                {a.title}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Hourly trend chart */}
        <div className="lg:col-span-2">
          <ChartBlock title="Today's Arrival vs Completion" subtitle="Hourly breakdown">
            <AreaChart data={HOURLY_TODAY}>
              <defs>
                <linearGradient id="gArrivals" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="hour" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#1e293b' }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#1e293b' }} />
              <Tooltip contentStyle={{ background: '#1a2236', border: '1px solid #374151', borderRadius: 8, fontSize: 12, color: '#f1f5f9' }} />
              <Area type="monotone" dataKey="arrivals" stroke="#3b82f6" fill="url(#gArrivals)" strokeWidth={2} name="Arrivals" />
              <Area type="monotone" dataKey="completed" stroke="#22c55e" fill="url(#gCompleted)" strokeWidth={2} name="Completed" />
            </AreaChart>
          </ChartBlock>
        </div>

        {/* Live pulse strip */}
        <div className="bg-bg-card border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-status-normal animate-pulse-dot" />
            <h3 className="text-sm font-semibold text-text-primary">Live Pulse</h3>
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {events.slice(0, 8).map((ev, i) => (
              <motion.div
                key={ev.id}
                initial={i === 0 ? { opacity: 0, x: -10 } : {}}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-start gap-2 text-xs"
              >
                <span className="text-base flex-shrink-0 mt-0.5">{ev.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-text-secondary leading-relaxed">{ev.message}</p>
                  <p className="text-text-muted text-[10px] mt-0.5">{ev.time}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'View All Centers', path: '/centers', icon: '🏢' },
          { label: 'Open Map', path: '/map', icon: '🗺️' },
          { label: 'View Alerts', path: '/alerts', icon: '🚨' },
          { label: 'Analytics', path: '/analytics', icon: '📈' },
        ].map(link => (
          <motion.button
            key={link.path}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(link.path)}
            className="bg-bg-card border border-gray-800 rounded-xl p-3 flex items-center gap-3 hover:border-gray-700 hover:bg-bg-hover transition-all text-left"
          >
            <span className="text-xl">{link.icon}</span>
            <span className="text-sm text-text-secondary">{link.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
