import React from 'react';
import { ResponsiveContainer } from 'recharts';

export default function ChartBlock({ title, subtitle, children, onExport, className = '' }) {
  return (
    <div className={`bg-bg-card border border-gray-800 rounded-xl p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
          {subtitle && <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>}
        </div>
        {onExport && (
          <button
            onClick={onExport}
            className="text-xs text-accent-blue hover:text-accent-cyan border border-accent-blue/30 px-3 py-1 rounded-lg hover:bg-accent-blue/10 transition-colors"
          >
            📥 Export CSV
          </button>
        )}
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
