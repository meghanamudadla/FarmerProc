import React from 'react';
import './CapacityBar.css';

export default function CapacityBar({ current = 0, total = 1 }) {
  const safeTotal = total > 0 ? total : 1;
  const rawPercentage = (current / safeTotal) * 100;
  const visualFillPercent = Math.min(Math.max(rawPercentage, 0), 100);
  const formattedPercentage = rawPercentage.toFixed(1);

  let barClass = 'fill-normal';
  if (rawPercentage >= 100) {
    barClass = 'fill-danger';
  } else if (rawPercentage >= 80) {
    barClass = 'fill-warning';
  }

  return (
    <div className="capacity-bar-container">
      <div className="capacity-bar-header">
        <span className="capacity-label">Stock Storage Capacity</span>
        <span className="capacity-numbers">
          <strong>{current.toLocaleString()}</strong> / {safeTotal.toLocaleString()} bags ({formattedPercentage}%)
        </span>
      </div>
      <div className="capacity-track">
        <div 
          className={`capacity-fill ${barClass}`} 
          style={{ width: `${visualFillPercent}%` }}
        />
      </div>
      {rawPercentage > 100 && (
        <div className="capacity-overflow-warning">
          ⚠️ Storage capacity exceeded! ({current.toLocaleString()} bags stored)
        </div>
      )}
    </div>
  );
}
