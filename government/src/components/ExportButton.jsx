import React from 'react';

export default function ExportButton({ label = 'Export CSV', onClick, variant = 'default' }) {
  const base = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200';
  const variants = {
    default: 'border border-gray-700 text-text-secondary hover:bg-bg-hover hover:text-text-primary',
    primary: 'bg-accent-blue/15 text-accent-blue border border-accent-blue/30 hover:bg-accent-blue/25',
  };

  return (
    <button onClick={onClick} className={`${base} ${variants[variant]}`}>
      📥 {label}
    </button>
  );
}
