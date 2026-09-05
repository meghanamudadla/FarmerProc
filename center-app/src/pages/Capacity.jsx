import React, { useState } from 'react';
import { useQueue } from '../context/QueueContext';
import CapacityBar from '../components/CapacityBar';
import './Capacity.css';

/**
 * Placeholder Heuristic Formula for Effective Processing Capacity (bags per hour):
 * 
 * Formula:
 *   effectiveCapacityBagsPerHour = active_counters * 50 * (available_staff / (active_counters * 2))
 */
function computeEffectiveCapacity(activeCounters, availableStaff) {
  const counters = Math.max(0, parseInt(activeCounters, 10) || 0);
  const staff = Math.max(0, parseInt(availableStaff, 10) || 0);

  if (counters === 0) return 0;

  const idealStaffPerCounter = 2;
  const baseBagsPerHour = 50;
  const idealTotalStaff = counters * idealStaffPerCounter;

  const staffRatioFactor = idealTotalStaff > 0 ? staff / idealTotalStaff : 0;
  const effectiveBagsPerHour = counters * baseBagsPerHour * staffRatioFactor;

  return Math.round(effectiveBagsPerHour);
}

/**
 * Operational Status Threshold Logic
 */
function getCapacityStatusLabel(effectiveBagsPerHour, waitingCount, fillPercentage) {
  if (fillPercentage >= 95) {
    return { text: '🔴 Critical Capacity Alert (Warehouse Near Full)', className: 'status-red' };
  }
  if (fillPercentage >= 85) {
    return { text: '🟡 High Capacity Warning (Space Constrained)', className: 'status-yellow' };
  }
  if (effectiveBagsPerHour === 0) {
    return { text: '🔴 Overloaded (No Active Counters)', className: 'status-red' };
  }

  const estimatedQueueBagsLoad = Math.max(1, waitingCount * 50);
  const throughputRatio = effectiveBagsPerHour / (estimatedQueueBagsLoad / 2);

  if (throughputRatio >= 1.0) {
    return { text: '🟢 Normal (Optimal Throughput)', className: 'status-green' };
  } else if (throughputRatio >= 0.5) {
    return { text: '🟡 Strained (High Demand)', className: 'status-yellow' };
  } else {
    return { text: '🔴 Overloaded (Counter/Staff Bottleneck)', className: 'status-red' };
  }
}

export default function Capacity() {
  const { centerInfo, updateCenterConfig, tokens } = useQueue();

  // Store input fields as strings for smooth typing without leading zeros or forced '0' on delete
  const [formData, setFormData] = useState({
    total_capacity_bags: String(centerInfo.total_capacity_bags),
    current_stock_bags: String(centerInfo.current_stock_bags),
    remaining_quota_bags: String(centerInfo.remaining_quota_bags),
    active_counters: String(centerInfo.active_counters),
    available_staff: String(centerInfo.available_staff),
  });

  const waitingCount = tokens.filter((t) => t.stage === 'WAITING' || t.stage === 'ARRIVED').length;

  const [effectiveCapacity, setEffectiveCapacity] = useState(() =>
    computeEffectiveCapacity(centerInfo.active_counters, centerInfo.available_staff)
  );

  const currentStockNum = parseInt(formData.current_stock_bags, 10) || 0;
  const totalCapacityNum = parseInt(formData.total_capacity_bags, 10) || 10000;
  const remainingSpaceNum = Math.max(0, totalCapacityNum - currentStockNum);
  const fillPercentage = totalCapacityNum > 0 ? (currentStockNum / totalCapacityNum) * 100 : 0;

  const [statusInfo, setStatusInfo] = useState(() =>
    getCapacityStatusLabel(
      computeEffectiveCapacity(centerInfo.active_counters, centerInfo.available_staff),
      waitingCount,
      fillPercentage
    )
  );

  const [hasUpdated, setHasUpdated] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Smooth string change handler - allows blank while editing and removes leading zeros
  const handleChange = (e) => {
    const { name, value } = e.target;
    const cleanedValue = value === '' ? '' : value.replace(/^0+(?=\d)/, '');
    setFormData((prev) => ({
      ...prev,
      [name]: cleanedValue,
    }));
  };

  const handleUpdate = (e) => {
    e.preventDefault();
    setErrorMsg('');

    const stock = parseInt(formData.current_stock_bags, 10) || 0;
    const total = parseInt(formData.total_capacity_bags, 10) || 0;

    if (stock > total) {
      setErrorMsg('Current stock cannot exceed total warehouse capacity.');
      return;
    }

    const activeCountersNum = parseInt(formData.active_counters, 10) || 0;
    const availableStaffNum = parseInt(formData.available_staff, 10) || 0;

    const newEffective = computeEffectiveCapacity(activeCountersNum, availableStaffNum);
    const newFillPct = total > 0 ? (stock / total) * 100 : 0;
    const newStatus = getCapacityStatusLabel(newEffective, waitingCount, newFillPct);

    updateCenterConfig({
      total_capacity_bags: total,
      current_stock_bags: stock,
      remaining_quota_bags: parseInt(formData.remaining_quota_bags, 10) || 0,
      active_counters: activeCountersNum,
      available_staff: availableStaffNum,
    });

    setEffectiveCapacity(newEffective);
    setStatusInfo(newStatus);
    setHasUpdated(true);
  };

  return (
    <div className="capacity-page-container">
      <header className="capacity-header">
        <div className="header-left">
          <h1>Center Capacity & Operations Control</h1>
          <p>Shift Staff Manual Storage, Quota & Counter Allocation</p>
        </div>
        <div className={`status-pill ${statusInfo.className}`}>
          {statusInfo.text}
        </div>
      </header>

      {/* Real-time Calculation Result Display Card */}
      <div className="result-card">
        <div className="result-metric">
          <span className="result-label">Calculated Effective Capacity</span>
          <span className="result-value">
            {effectiveCapacity.toLocaleString()} <span className="unit">bags / hour</span>
          </span>
          <span className="result-subtext">
            Based on {formData.active_counters || 0} active counters & {formData.available_staff || 0} staff members
          </span>
        </div>

        <div className="result-stock-preview">
          <CapacityBar current={currentStockNum} total={totalCapacityNum} />
          <div className="capacity-meta-row">
            <span>Remaining Storage Space: <strong>{remainingSpaceNum.toLocaleString()} bags</strong></span>
            <span>Utilization: <strong>{fillPercentage.toFixed(1)}%</strong></span>
          </div>
        </div>
      </div>

      {errorMsg && <div className="error-banner">⚠️ {errorMsg}</div>}

      {/* Editable Capacity Form */}
      <form onSubmit={handleUpdate} className="capacity-form-card">
        <h2 className="form-section-title">Edit Operational Parameters</h2>
        <p className="form-section-subtitle">
          Adjust shift counters and personnel to calculate live center throughput.
        </p>

        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="active_counters">Active Counters / Stations</label>
            <input
              id="active_counters"
              type="number"
              name="active_counters"
              min="0"
              placeholder="e.g. 5"
              value={formData.active_counters}
              onChange={handleChange}
              required
            />
            <span className="field-hint">Number of active weighing/quality counters</span>
          </div>

          <div className="form-group">
            <label htmlFor="available_staff">Available Shift Staff</label>
            <input
              id="available_staff"
              type="number"
              name="available_staff"
              min="0"
              placeholder="e.g. 10"
              value={formData.available_staff}
              onChange={handleChange}
              required
            />
            <span className="field-hint">Total personnel working on the center floor</span>
          </div>

          <div className="form-group">
            <label htmlFor="current_stock_bags">Current Stock (Bags)</label>
            <input
              id="current_stock_bags"
              type="number"
              name="current_stock_bags"
              min="0"
              placeholder="e.g. 6500"
              value={formData.current_stock_bags}
              onChange={handleChange}
              required
            />
            <span className="field-hint">Bags currently stored in warehouse</span>
          </div>

          <div className="form-group">
            <label htmlFor="total_capacity_bags">Total Warehouse Capacity (Bags)</label>
            <input
              id="total_capacity_bags"
              type="number"
              name="total_capacity_bags"
              min="0"
              placeholder="e.g. 10000"
              value={formData.total_capacity_bags}
              onChange={handleChange}
              required
            />
            <span className="field-hint">Maximum storage bag capacity</span>
          </div>

          <div className="form-group full-width">
            <label htmlFor="remaining_quota_bags">Remaining Daily Quota (Bags)</label>
            <input
              id="remaining_quota_bags"
              type="number"
              name="remaining_quota_bags"
              min="0"
              placeholder="e.g. 2000"
              value={formData.remaining_quota_bags}
              onChange={handleChange}
              required
            />
            <span className="field-hint">Max additional bags the center can accept today</span>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-update-capacity">
            Update Operational Capacity
          </button>

          {hasUpdated && (
            <span className="update-toast">
              ✓ Center capacity updated in QueueContext!
            </span>
          )}
        </div>
      </form>

      {/* Heuristic Formula Documentation Card */}
      <div className="formula-info-card">
        <h3>ℹ️ Operational Capacity Heuristic Formula</h3>
        <p className="formula-code">
          <code>Effective Capacity (bags/hr) = Active Counters × 50 × (Staff / (Active Counters × 2))</code>
        </p>
        <p className="formula-desc">
          Standard baseline assumes 1 counter operating with 2 staff members processes ~50 bags per hour.
          If staff count falls below 2 per counter, capacity scales down proportionally.
        </p>
      </div>
    </div>
  );
}
