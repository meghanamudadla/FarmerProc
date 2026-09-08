import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQueue } from '../context/QueueContext';
import CapacityBar from '../components/CapacityBar';
import { Building2, Users, Layers, Warehouse, CheckCircle2, AlertTriangle, ArrowRight, Info, Gauge } from 'lucide-react';
import './Capacity.css';

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

function getCapacityStatusLabel(effectiveBagsPerHour, waitingCount, fillPercentage) {
  if (fillPercentage >= 95) {
    return { text: 'Critical Capacity Alert (Warehouse Near Full)', class: 'status-red' };
  }
  if (fillPercentage >= 85) {
    return { text: 'High Capacity Warning (Space Constrained)', class: 'status-yellow' };
  }
  if (effectiveBagsPerHour === 0) {
    return { text: 'Overloaded (No Active Counters)', class: 'status-red' };
  }

  const estimatedQueueBagsLoad = Math.max(1, waitingCount * 50);
  const throughputRatio = effectiveBagsPerHour / (estimatedQueueBagsLoad / 2);

  if (throughputRatio >= 1.0) {
    return { text: 'Normal (Optimal Throughput)', class: 'status-green' };
  } else if (throughputRatio >= 0.5) {
    return { text: 'Strained (High Demand)', class: 'status-yellow' };
  } else {
    return { text: 'Overloaded (Counter/Staff Bottleneck)', class: 'status-red' };
  }
}

export default function Capacity() {
  const { centerInfo, updateCenterConfig, tokens } = useQueue();

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

    setTimeout(() => setHasUpdated(false), 3000);
  };

  return (
    <div className="capacity-container">
      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -10 }} 
        animate={{ opacity: 1, y: 0 }}
        className="capacity-header-card"
      >
        <div>
          <div className="capacity-header-badge">
            <Building2 size={13} />
            <span>Shift Controls & Resource Allocation</span>
          </div>
          <h1 className="capacity-title">Center Storage & Throughput</h1>
          <p className="capacity-subtext">Manage shift personnel, station counters, and warehouse bag limits</p>
        </div>
        <div className={`status-pill ${statusInfo.class} font-mono`}>
          <span>{statusInfo.text}</span>
        </div>
      </motion.header>

      {/* Calculated Result Display Card */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }} 
        animate={{ opacity: 1, y: 0 }}
        className="result-hero-card"
      >
        <div className="result-metric-box">
          <div className="gauge-icon-box">
            <Gauge size={24} />
          </div>
          <div>
            <span className="result-label">Calculated Effective Capacity</span>
            <div className="result-value font-mono">
              {effectiveCapacity.toLocaleString()} <span className="unit font-mono">bags / hour</span>
            </div>
            <span className="result-subtext">
              Based on {formData.active_counters || 0} active counters & {formData.available_staff || 0} floor staff
            </span>
          </div>
        </div>

        <div className="result-stock-preview">
          <CapacityBar current={currentStockNum} total={totalCapacityNum} />
          <div className="capacity-meta-row">
            <span>Remaining Space: <strong className="font-mono">{remainingSpaceNum.toLocaleString()} bags</strong></span>
            <span>Utilization: <strong className="font-mono">{fillPercentage.toFixed(1)}%</strong></span>
          </div>
        </div>
      </motion.div>

      {errorMsg && (
        <div className="capacity-error-banner">
          <AlertTriangle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Editable Form */}
      <motion.form 
        initial={{ opacity: 0, y: 15 }} 
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        onSubmit={handleUpdate} 
        className="capacity-form-card"
      >
        <div className="form-card-header">
          <h2 className="form-card-title">Edit Operational Parameters</h2>
          <p className="form-card-subtitle">Adjust shift parameters to reflect live floor readiness</p>
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="active_counters">
              <Layers size={15} />
              <span>Active Counter Stations</span>
            </label>
            <input
              id="active_counters"
              type="number"
              name="active_counters"
              min="0"
              placeholder="e.g. 5"
              value={formData.active_counters}
              onChange={handleChange}
              className="font-mono"
              required
            />
            <span className="field-hint">Active weighing / quality counters</span>
          </div>

          <div className="form-group">
            <label htmlFor="available_staff">
              <Users size={15} />
              <span>Available Shift Staff</span>
            </label>
            <input
              id="available_staff"
              type="number"
              name="available_staff"
              min="0"
              placeholder="e.g. 10"
              value={formData.available_staff}
              onChange={handleChange}
              className="font-mono"
              required
            />
            <span className="field-hint">Total center staff on duty</span>
          </div>

          <div className="form-group">
            <label htmlFor="current_stock_bags">
              <Warehouse size={15} />
              <span>Current Stock (Bags)</span>
            </label>
            <input
              id="current_stock_bags"
              type="number"
              name="current_stock_bags"
              min="0"
              placeholder="e.g. 6500"
              value={formData.current_stock_bags}
              onChange={handleChange}
              className="font-mono"
              required
            />
            <span className="field-hint">Bags currently in warehouse</span>
          </div>

          <div className="form-group">
            <label htmlFor="total_capacity_bags">
              <Building2 size={15} />
              <span>Total Warehouse Limit (Bags)</span>
            </label>
            <input
              id="total_capacity_bags"
              type="number"
              name="total_capacity_bags"
              min="0"
              placeholder="e.g. 10000"
              value={formData.total_capacity_bags}
              onChange={handleChange}
              className="font-mono"
              required
            />
            <span className="field-hint">Maximum storage bag limit</span>
          </div>

          <div className="form-group full-width">
            <label htmlFor="remaining_quota_bags">
              <Warehouse size={15} />
              <span>Remaining Daily Quota (Bags)</span>
            </label>
            <input
              id="remaining_quota_bags"
              type="number"
              name="remaining_quota_bags"
              min="0"
              placeholder="e.g. 2000"
              value={formData.remaining_quota_bags}
              onChange={handleChange}
              className="font-mono"
              required
            />
            <span className="field-hint">Additional bags accepted today</span>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-update-capacity">
            <CheckCircle2 size={18} />
            <span>Update Operational Parameters</span>
            <ArrowRight size={16} />
          </button>

          {hasUpdated && (
            <motion.span initial={{ opacity: 0, x: 5 }} animate={{ opacity: 1, x: 0 }} className="update-toast">
              ✓ Operational capacity updated!
            </motion.span>
          )}
        </div>
      </motion.form>

      {/* Formula Info */}
      <div className="formula-info-card">
        <div className="formula-info-header">
          <Info size={16} className="text-emerald-600" />
          <span className="font-mono">Capacity Heuristic Formula</span>
        </div>
        <p className="formula-code font-mono">
          Effective Capacity (bags/hr) = Active Counters × 50 × (Staff / (Active Counters × 2))
        </p>
      </div>
    </div>
  );
}
