import React from 'react';
import { Warehouse, AlertTriangle } from 'lucide-react';
import './CapacityBar.css';

export default function CapacityBar({ current = 0, total = 1 }) {
  const safeTotal = total > 0 ? total : 1;
  const rawPercentage = (current / safeTotal) * 100;
  const visualFillPercent = Math.min(Math.max(rawPercentage, 0), 100);
  const formattedPercentage = rawPercentage.toFixed(1);

  let barClass = 'fill-normal';
  if (rawPercentage >= 90) {
    barClass = 'fill-danger';
  } else if (rawPercentage >= 75) {
    barClass = 'fill-warning';
  }

  return (
    <div className="capacity-bar-container">
      <div className="capacity-bar-header">
        <div className="capacity-label-group">
          <Warehouse size={16} className="capacity-icon" />
          <span className="capacity-label">Stock Storage Utilization</span>
        </div>
        <div className="capacity-numbers">
          <strong className="font-mono">{current.toLocaleString()}</strong> / <span className="font-mono">{safeTotal.toLocaleString()}</span> bags
          <span className={`capacity-pct-pill ${barClass}`}>{formattedPercentage}%</span>
        </div>
      </div>
      <div className="capacity-track">
        <div 
          className={`capacity-fill ${barClass}`} 
          style={{ width: `${visualFillPercent}%` }}
        />
      </div>
      {rawPercentage >= 90 && (
        <div className="capacity-overflow-warning">
          <AlertTriangle size={14} />
          <span>Storage near critical limit! ({current.toLocaleString()} / {safeTotal.toLocaleString()} bags)</span>
        </div>
      )}
    </div>
  );
}
