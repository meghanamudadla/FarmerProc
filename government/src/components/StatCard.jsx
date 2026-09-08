import React from 'react';
import { motion } from 'framer-motion';

export default function StatCard({ label, value, change, prefix = '', suffix = '', icon, delay = 0, onClick }) {
  const isUp = change > 0;
  const isDown = change < 0;
  const changeAbs = Math.abs(change);

  const formatValue = (v) => {
    if (typeof v !== 'number') return v;
    if (v >= 10000000) return `${(v / 10000000).toFixed(1)}Cr`;
    if (v >= 100000) return `${(v / 100000).toFixed(1)}L`;
    if (v >= 1000) return v.toLocaleString('en-IN');
    return v;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.05, duration: 0.3 }}
      whileHover={{ scale: 1.02, y: -2 }}
      onClick={onClick}
      className={`bg-bg-card border border-gray-800 rounded-xl p-4 flex flex-col gap-2 ${onClick ? 'cursor-pointer' : ''} transition-shadow hover:shadow-lg hover:shadow-black/20 hover:border-gray-700`}
    >
      <div className="flex items-center justify-between">
        <span className="text-text-muted text-xs font-medium uppercase tracking-wider">{label}</span>
        {icon && <span className="text-lg">{icon}</span>}
      </div>
      <div className="flex items-end gap-2">
        <span className="font-tabular text-2xl font-bold text-text-primary">
          {prefix}{formatValue(value)}{suffix}
        </span>
        {change !== undefined && change !== 0 && (
          <span className={`text-xs font-semibold flex items-center gap-0.5 mb-1 ${isUp ? 'text-status-normal' : 'text-severity-critical'}`}>
            {isUp ? '▲' : '▼'} {changeAbs.toFixed(1)}%
          </span>
        )}
      </div>
    </motion.div>
  );
}
