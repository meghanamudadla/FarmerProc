import React from 'react';
import './StatusBadge.css';

export default function StatusBadge({ status }) {
  const normalizedStatus = (status || 'AVAILABLE').toUpperCase();
  
  let statusClass = 'status-available';
  let label = 'AVAILABLE';

  if (normalizedStatus === 'BUSY') {
    statusClass = 'status-busy';
    label = 'BUSY';
  } else if (normalizedStatus === 'CONGESTED') {
    statusClass = 'status-congested';
    label = 'CONGESTED';
  }

  return (
    <span className={`status-badge ${statusClass}`}>
      <span className="status-dot"></span>
      <span className="status-text">{label}</span>
    </span>
  );
}
