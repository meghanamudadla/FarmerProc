import React from 'react';
import { Link } from 'react-router-dom';
import { useQueue } from '../context/QueueContext';
import StatusBadge from '../components/StatusBadge';
import CapacityBar from '../components/CapacityBar';
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

  // Dynamic Real-time Calculations from QueueContext Tokens
  const farmers_today = tokens.length;

  const waiting_today = tokens.filter(
    (t) => t.stage === 'WAITING' || t.stage === 'ARRIVED'
  ).length;

  const processing_today = tokens.filter(
    (t) => t.stage === 'WEIGHING' || t.stage === 'QUALITY_CHECK'
  ).length;

  const completed_today = tokens.filter(
    (t) => t.stage === 'PAYMENT_COMPLETED'
  ).length;

  const accepted_count = tokens.filter(
    (t) => t.stage === 'ACCEPTED' || t.stage === 'PAYMENT_PROCESSING' || t.stage === 'PAYMENT_COMPLETED'
  ).length;

  const rejected_count = tokens.filter((t) => t.stage === 'REJECTED').length;

  // Total Quintals Procured Today
  const total_quintals_procured = tokens
    .filter((t) => t.stage === 'ACCEPTED' || t.stage === 'PAYMENT_PROCESSING' || t.stage === 'PAYMENT_COMPLETED')
    .reduce((sum, t) => sum + (t.weight_details?.accepted_quintals || 0), 0);

  // Total Payout Amount
  const total_payout_amount = tokens
    .filter((t) => t.stage === 'PAYMENT_COMPLETED')
    .reduce((sum, t) => sum + (t.payment?.final_amount || 0), 0);

  return (
    <div className="dashboard-container">
      {/* Center Header & Live Operational Status */}
      <header className="dashboard-header-card">
        <div className="header-info">
          <span className="header-subtitle">Procurement Center Staff Console</span>
          <h1 className="header-title">{name}</h1>
        </div>
        <div className="header-pills">
          <StatusBadge status={status} />
          <div className="wait-pill">
            <span className="pill-icon">⏱️</span>
            <span>Expected Wait: <strong>{expected_wait_min} min</strong></span>
          </div>
        </div>
      </header>

      {/* Prominent Real-Time Metric Cards Grid */}
      <section className="metrics-grid">
        <div className="metric-card theme-blue">
          <div className="metric-card-header">
            <span className="metric-title">Farmers Arrived Today</span>
            <span className="metric-icon">🧑‍🌾</span>
          </div>
          <div className="metric-card-body">
            <span className="metric-big-number">{farmers_today}</span>
            <span className="metric-subtext">Total registered center visits</span>
          </div>
        </div>

        <div className="metric-card theme-amber">
          <div className="metric-card-header">
            <span className="metric-title">Waiting in Queue</span>
            <span className="metric-icon">⌛</span>
          </div>
          <div className="metric-card-body">
            <span className="metric-big-number">{waiting_today}</span>
            <span className="metric-subtext">Pending entry / tokens</span>
          </div>
        </div>

        <div className="metric-card theme-purple">
          <div className="metric-card-header">
            <span className="metric-title">Currently Processing</span>
            <span className="metric-icon">🔄</span>
          </div>
          <div className="metric-card-body">
            <span className="metric-big-number">{processing_today}</span>
            <span className="metric-subtext">At Weighing & Quality check</span>
          </div>
        </div>

        <div className="metric-card theme-green">
          <div className="metric-card-header">
            <span className="metric-title">Completed Payments</span>
            <span className="metric-icon">✅</span>
          </div>
          <div className="metric-card-body">
            <span className="metric-big-number">{completed_today}</span>
            <span className="metric-subtext">Accepted / Paid out ({accepted_count} total accepted)</span>
          </div>
        </div>
      </section>

      {/* Real-time Procurement Domain Totals Banner */}
      <section className="dashboard-section-card domain-totals-card">
        <div className="domain-totals-grid">
          <div className="d-total-item">
            <span className="d-total-label">Total Quantity Procured Today</span>
            <span className="d-total-val">{total_quintals_procured.toFixed(2)} <span className="unit">quintals</span></span>
            <span className="d-total-sub">({(total_quintals_procured * 100).toLocaleString()} kg net)</span>
          </div>

          <div className="d-total-item">
            <span className="d-total-label">Total Disbursed Payout</span>
            <span className="d-total-val payout-val">₹{total_payout_amount.toLocaleString()}</span>
            <span className="d-total-sub">Completed direct bank payments</span>
          </div>

          <div className="d-total-item">
            <span className="d-total-label">Inspection Decisions</span>
            <span className="d-total-val">
              <span className="accepted-txt">🟢 {accepted_count} Accepted</span>
              <span className="sep">•</span>
              <span className="rejected-txt">🔴 {rejected_count} Rejected</span>
            </span>
            <span className="d-total-sub">Rule engine & staff verified</span>
          </div>
        </div>
      </section>

      {/* Capacity & Warehouse Operations Section */}
      <section className="dashboard-section-card">
        <div className="section-card-header">
          <div>
            <h2 className="section-heading">Stock Storage Capacity</h2>
            <p className="section-subheading">Warehouse storage utilization & active shift limits</p>
          </div>
          <Link to="/capacity" className="btn-manage-link">
            Edit Capacity & Staff →
          </Link>
        </div>

        <div className="capacity-bar-container">
          <CapacityBar current={current_stock_bags} total={total_capacity_bags} />
        </div>
        
        <div className="operational-stats-grid">
          <div className="op-stat-card">
            <span className="op-icon">📦</span>
            <div className="op-info">
              <span className="op-label">Remaining Daily Quota</span>
              <span className="op-val">{remaining_quota_bags.toLocaleString()} <span className="unit">bags</span></span>
            </div>
          </div>

          <div className="op-stat-card">
            <span className="op-icon">🏗️</span>
            <div className="op-info">
              <span className="op-label">Active Counters</span>
              <span className="op-val">{active_counters} <span className="unit">Stations</span></span>
            </div>
          </div>

          <div className="op-stat-card">
            <span className="op-icon">👥</span>
            <div className="op-info">
              <span className="op-label">Available Staff</span>
              <span className="op-val">{available_staff} <span className="unit">Personnel</span></span>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Action Navigation */}
      <section className="dashboard-section-card">
        <h2 className="section-heading">Staff Shift Actions</h2>
        <p className="section-subheading">Direct links to core operational screens</p>

        <div className="shift-actions-grid">
          <Link to="/queue" className="action-nav-card card-hover-blue">
            <div className="action-card-left">
              <span className="action-badge-icon">📋</span>
              <div>
                <h3 className="action-title">Manage Live Queue</h3>
                <p className="action-desc">Advance farmer tokens through Weighing, Quality Check, and Payment</p>
              </div>
            </div>
            <span className="action-btn-arrow">Go to Queue →</span>
          </Link>

          <Link to="/capacity" className="action-nav-card card-hover-green">
            <div className="action-card-left">
              <span className="action-badge-icon">⚙️</span>
              <div>
                <h3 className="action-title">Capacity & Counters</h3>
                <p className="action-desc">Adjust total capacity limits, storage quota, and active counter count</p>
              </div>
            </div>
            <span className="action-btn-arrow">Manage Capacity →</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
