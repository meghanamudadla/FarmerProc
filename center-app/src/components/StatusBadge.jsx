import React from 'react';
import { Clock, Scale, FlaskConical, CheckCircle2, AlertTriangle, XCircle, Banknote, ShieldCheck } from 'lucide-react';
import './StatusBadge.css';

const STAGE_CONFIG = {
  // Center Statuses
  AVAILABLE: { label: 'AVAILABLE', class: 'status-available', icon: ShieldCheck },
  NORMAL: { label: 'NORMAL', class: 'status-available', icon: ShieldCheck },
  BUSY: { label: 'BUSY', class: 'status-busy', icon: AlertTriangle },
  CONGESTED: { label: 'CONGESTED', class: 'status-congested', icon: AlertTriangle },
  
  // Token Stages
  WAITING: { label: 'WAITING IN QUEUE', class: 'badge-waiting', icon: Clock },
  ARRIVED: { label: 'ARRIVED AT CENTER', class: 'badge-arrived', icon: Clock },
  WEIGHING: { label: 'WEIGHBRIDGE', class: 'badge-weighing', icon: Scale },
  QUALITY_CHECK: { label: 'QUALITY INSPECTION', class: 'badge-quality', icon: FlaskConical },
  ACCEPTED: { label: 'QUALITY ACCEPTED', class: 'badge-accepted', icon: CheckCircle2 },
  PAYMENT_PROCESSING: { label: 'PAYMENT PROCESSING', class: 'badge-payment', icon: Banknote },
  PAYMENT_COMPLETED: { label: 'PAID OUT', class: 'badge-completed', icon: CheckCircle2 },
  REJECTED: { label: 'REJECTED', class: 'badge-rejected', icon: XCircle },
};

export default function StatusBadge({ status }) {
  const norm = String(status || 'AVAILABLE').toUpperCase();
  const config = STAGE_CONFIG[norm] || { label: norm.replace(/_/g, ' '), class: 'badge-default', icon: Clock };
  const Icon = config.icon;

  return (
    <span className={`status-badge ${config.class}`}>
      <Icon size={14} className="status-icon" />
      <span className="status-text">{config.label}</span>
    </span>
  );
}
