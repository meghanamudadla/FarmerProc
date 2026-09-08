import React from 'react';

const STATUS_MAP = {
  normal:    { color: 'bg-status-normal',    text: 'text-status-normal',    ring: 'ring-status-normal/30',    label: 'Normal',    dot: '🟢' },
  busy:      { color: 'bg-status-busy',      text: 'text-status-busy',      ring: 'ring-status-busy/30',      label: 'Busy',      dot: '🟡' },
  congested: { color: 'bg-status-congested', text: 'text-status-congested', ring: 'ring-status-congested/30', label: 'Congested', dot: '🔴' },
  offline:   { color: 'bg-status-offline',   text: 'text-status-offline',   ring: 'ring-status-offline/30',   label: 'Offline',   dot: '⚫' },
};

export default function StatusBadge({ status, size = 'sm' }) {
  const config = STATUS_MAP[status] || STATUS_MAP.offline;
  const sizeClass = size === 'lg' ? 'px-3 py-1.5 text-sm' : 'px-2 py-0.5 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold ring-1 ${config.text} ${config.ring} bg-opacity-10 ${sizeClass}`}
      style={{ backgroundColor: `${config.color.replace('bg-', '')}10` }}>
      <span className={`w-2 h-2 rounded-full ${config.color} ${status !== 'offline' ? 'animate-pulse-dot' : ''}`} />
      {config.label}
    </span>
  );
}

export function SeverityBadge({ severity }) {
  const map = {
    critical: { bg: 'bg-severity-critical/15', text: 'text-severity-critical', ring: 'ring-severity-critical/30', label: 'Critical' },
    warning:  { bg: 'bg-severity-warning/15',  text: 'text-severity-warning',  ring: 'ring-severity-warning/30',  label: 'Warning' },
    info:     { bg: 'bg-severity-info/15',     text: 'text-severity-info',     ring: 'ring-severity-info/30',     label: 'Info' },
  };
  const config = map[severity] || map.info;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ring-1 ${config.bg} ${config.text} ${config.ring}`}>
      {config.label}
    </span>
  );
}
