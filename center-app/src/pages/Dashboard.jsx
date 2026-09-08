import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQueue } from '../context/QueueContext';
import StatusBadge from '../components/StatusBadge';
import CapacityBar from '../components/CapacityBar';
import {
  Users,
  Clock,
  RefreshCw,
  CheckCircle2,
  Package,
  Layers,
  UserCheck,
  TrendingUp,
  Scale,
  CreditCard,
  ArrowRight,
  Sparkles,
  Building2,
  AlertCircle
} from 'lucide-react';
import './Dashboard.css';

export default function Dashboard() {
  const { tokens, centerInfo } = useQueue();

  const {
    name,
    status,
    total_capacity_bags,
    current_stock_bags,
    remaining_quota_bags,
    active_counters,
    available_staff,
    expected_wait_min,
  } = centerInfo;

  // Real-Time Queue Calculations
  const farmers_today = tokens.length;
  const waiting_today = tokens.filter((t) => t.stage === 'WAITING' || t.stage === 'ARRIVED').length;
  const processing_today = tokens.filter((t) => t.stage === 'WEIGHING' || t.stage === 'QUALITY_CHECK').length;
  const completed_today = tokens.filter((t) => t.stage === 'PAYMENT_COMPLETED').length;

  const accepted_count = tokens.filter(
    (t) => t.stage === 'ACCEPTED' || t.stage === 'PAYMENT_PROCESSING' || t.stage === 'PAYMENT_COMPLETED'
  ).length;
  const rejected_count = tokens.filter((t) => t.stage === 'REJECTED').length;

  const total_quintals_procured = tokens
    .filter((t) => t.stage === 'ACCEPTED' || t.stage === 'PAYMENT_PROCESSING' || t.stage === 'PAYMENT_COMPLETED')
    .reduce((sum, t) => sum + (t.weight_details?.accepted_quintals || 0), 0);

  const total_payout_amount = tokens
    .filter((t) => t.stage === 'PAYMENT_COMPLETED')
    .reduce((sum, t) => sum + (t.payment?.final_amount || 0), 0);

  return (
    <div className="dashboard-container">
      {/* Header & Live Operational Banner */}
      <motion.header 
        initial={{ opacity: 0, y: -10 }} 
        animate={{ opacity: 1, y: 0 }}
        className="dashboard-header-card"
      >
        <div className="header-info">
          <div className="header-badge">
            <Sparkles size={13} />
            <span>Procurement Center Staff Console</span>
          </div>
          <h1 className="header-title">{name}</h1>
        </div>
        <div className="header-pills">
          <StatusBadge status={status} />
          <div className="wait-pill">
            <Clock size={15} className="text-amber-500" />
            <span>Expected Wait: <strong className="font-mono">{expected_wait_min} min</strong></span>
          </div>
        </div>
      </motion.header>

      {/* Prominent Real-Time Metric Cards */}
      <section className="metrics-grid">
        <motion.div 
          whileHover={{ y: -3 }} 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.05 }}
          className="metric-card theme-blue"
        >
          <div className="metric-card-header">
            <span className="metric-title">Farmers Arrived</span>
            <div className="metric-icon-box blue">
              <Users size={20} />
            </div>
          </div>
          <div className="metric-card-body">
            <span className="metric-big-number font-mono">{farmers_today}</span>
            <span className="metric-subtext">Total registered center visits today</span>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -3 }} 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.1 }}
          className="metric-card theme-amber"
        >
          <div className="metric-card-header">
            <span className="metric-title">Waiting in Queue</span>
            <div className="metric-icon-box amber">
              <Clock size={20} />
            </div>
          </div>
          <div className="metric-card-body">
            <span className="metric-big-number font-mono">{waiting_today}</span>
            <span className="metric-subtext">Pending entry / token call</span>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -3 }} 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.15 }}
          className="metric-card theme-purple"
        >
          <div className="metric-card-header">
            <span className="metric-title">Currently Processing</span>
            <div className="metric-icon-box purple">
              <RefreshCw size={20} />
            </div>
          </div>
          <div className="metric-card-body">
            <span className="metric-big-number font-mono">{processing_today}</span>
            <span className="metric-subtext">At Weighing & Quality check</span>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -3 }} 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.2 }}
          className="metric-card theme-emerald"
        >
          <div className="metric-card-header">
            <span className="metric-title">Completed Payments</span>
            <div className="metric-icon-box emerald">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="metric-card-body">
            <span className="metric-big-number font-mono">{completed_today}</span>
            <span className="metric-subtext">Disbursed ({accepted_count} total accepted)</span>
          </div>
        </motion.div>
      </section>

      {/* Domain Totals Banner */}
      <motion.section 
        initial={{ opacity: 0, y: 15 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.25 }}
        className="dashboard-section-card domain-totals-card"
      >
        <div className="domain-totals-grid">
          <div className="d-total-item">
            <div className="d-total-header">
              <TrendingUp size={16} className="text-emerald-600" />
              <span className="d-total-label">Procured Volume Today</span>
            </div>
            <span className="d-total-val font-mono">{total_quintals_procured.toFixed(2)} <span className="unit">quintals</span></span>
            <span className="d-total-sub font-mono">({(total_quintals_procured * 100).toLocaleString()} kg net weighed)</span>
          </div>

          <div className="d-total-item">
            <div className="d-total-header">
              <CreditCard size={16} className="text-emerald-600" />
              <span className="d-total-label">Disbursed MSP Payout</span>
            </div>
            <span className="d-total-val payout-val font-mono">₹{total_payout_amount.toLocaleString()}</span>
            <span className="d-total-sub">Completed direct bank transfers</span>
          </div>

          <div className="d-total-item">
            <div className="d-total-header">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span className="d-total-label">Lab Quality Decisions</span>
            </div>
            <div className="d-total-val dec-row">
              <span className="accepted-txt font-mono">🟢 {accepted_count} Accepted</span>
              <span className="sep">•</span>
              <span className="rejected-txt font-mono">🔴 {rejected_count} Rejected</span>
            </div>
            <span className="d-total-sub">Rule engine & staff verified</span>
          </div>
        </div>
      </motion.section>

      {/* Storage Capacity & Operations */}
      <motion.section 
        initial={{ opacity: 0, y: 15 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.3 }}
        className="dashboard-section-card"
      >
        <div className="section-card-header">
          <div>
            <h2 className="section-heading">Warehouse Storage & Capacity</h2>
            <p className="section-subheading">Live stock capacity utilization & shift allocations</p>
          </div>
          <Link to="/capacity" className="btn-manage-link">
            <span>Manage Shift Capacity</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="capacity-bar-wrapper">
          <CapacityBar current={current_stock_bags} total={total_capacity_bags} />
        </div>
        
        <div className="operational-stats-grid">
          <div className="op-stat-card">
            <div className="op-icon-box">
              <Package size={20} />
            </div>
            <div className="op-info">
              <span className="op-label">Remaining Daily Quota</span>
              <span className="op-val font-mono">{remaining_quota_bags.toLocaleString()} <span className="unit">bags</span></span>
            </div>
          </div>

          <div className="op-stat-card">
            <div className="op-icon-box">
              <Layers size={20} />
            </div>
            <div className="op-info">
              <span className="op-label">Active Counters</span>
              <span className="op-val font-mono">{active_counters} <span className="unit">Stations</span></span>
            </div>
          </div>

          <div className="op-stat-card">
            <div className="op-icon-box">
              <UserCheck size={20} />
            </div>
            <div className="op-info">
              <span className="op-label">Available Personnel</span>
              <span className="op-val font-mono">{available_staff} <span className="unit">Staff</span></span>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Shift Actions */}
      <motion.section 
        initial={{ opacity: 0, y: 15 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.35 }}
        className="dashboard-section-card"
      >
        <div className="section-card-header">
          <div>
            <h2 className="section-heading">Staff Shift Actions</h2>
            <p className="section-subheading">Quick access to primary operational stations</p>
          </div>
        </div>

        <div className="shift-actions-grid">
          <Link to="/queue" className="action-nav-card card-hover-blue">
            <div className="action-card-left">
              <div className="action-badge-icon blue">
                <Scale size={24} />
              </div>
              <div>
                <h3 className="action-title">Manage Live Queue</h3>
                <p className="action-desc">Advance farmer tokens through Weighing, Quality Inspection, and Payment</p>
              </div>
            </div>
            <span className="action-btn-arrow">
              <span>Go to Queue</span>
              <ArrowRight size={14} />
            </span>
          </Link>

          <Link to="/capacity" className="action-nav-card card-hover-emerald">
            <div className="action-card-left">
              <div className="action-badge-icon emerald">
                <Building2 size={24} />
              </div>
              <div>
                <h3 className="action-title">Capacity & Operations</h3>
                <p className="action-desc">Adjust total warehouse limits, daily quotas, and staff counter allocations</p>
              </div>
            </div>
            <span className="action-btn-arrow">
              <span>Manage Capacity</span>
              <ArrowRight size={14} />
            </span>
          </Link>
        </div>
      </motion.section>
    </div>
  );
}
