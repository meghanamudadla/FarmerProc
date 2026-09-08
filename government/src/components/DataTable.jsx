import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';

export default function DataTable({ columns, data, pageSize = 10, onRowClick, emptyMessage = 'No data available' }) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [filterText, setFilterText] = useState('');
  const [page, setPage] = useState(0);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const filtered = useMemo(() => {
    if (!filterText) return data;
    const lower = filterText.toLowerCase();
    return data.filter(row =>
      columns.some(col => {
        const val = col.accessor ? (typeof col.accessor === 'function' ? col.accessor(row) : row[col.accessor]) : '';
        return String(val).toLowerCase().includes(lower);
      })
    );
  }, [data, filterText, columns]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const col = columns.find(c => (typeof c.accessor === 'string' ? c.accessor : c.key) === sortKey);
      if (!col) return 0;
      const av = typeof col.accessor === 'function' ? col.accessor(a) : a[col.accessor];
      const bv = typeof col.accessor === 'function' ? col.accessor(b) : b[col.accessor];
      const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir, columns]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="flex items-center justify-between">
        <input
          type="text"
          placeholder="Search..."
          value={filterText}
          onChange={e => { setFilterText(e.target.value); setPage(0); }}
          className="bg-bg-primary border border-gray-700 rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-blue w-64"
        />
        <span className="text-xs text-text-muted">{sorted.length} records</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-bg-secondary border-b border-gray-800">
              {columns.map(col => {
                const key = typeof col.accessor === 'string' ? col.accessor : col.key;
                return (
                  <th
                    key={key}
                    onClick={() => col.sortable !== false && handleSort(key)}
                    className={`px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider ${
                      col.sortable !== false ? 'cursor-pointer hover:text-text-primary' : ''
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      {col.header}
                      {sortKey === key && (
                        <span className="text-accent-blue">{sortDir === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-text-muted">{emptyMessage}</td></tr>
            ) : (
              paged.map((row, i) => (
                <motion.tr
                  key={row.id || i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  onClick={() => onRowClick?.(row)}
                  className={`border-b border-gray-800/50 transition-colors ${
                    onRowClick ? 'cursor-pointer hover:bg-bg-hover' : 'hover:bg-bg-hover/50'
                  }`}
                >
                  {columns.map(col => {
                    const key = typeof col.accessor === 'string' ? col.accessor : col.key;
                    const val = typeof col.accessor === 'function' ? col.accessor(row) : row[col.accessor];
                    return (
                      <td key={key} className="px-4 py-3 text-text-primary">
                        {col.render ? col.render(val, row) : val}
                      </td>
                    );
                  })}
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 text-xs rounded-lg bg-bg-card border border-gray-700 text-text-secondary hover:bg-bg-hover disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>
          <span className="text-xs text-text-muted">Page {page + 1} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-1.5 text-xs rounded-lg bg-bg-card border border-gray-700 text-text-secondary hover:bg-bg-hover disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
