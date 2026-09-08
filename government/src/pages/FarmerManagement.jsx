import React, { useState } from 'react';
import { motion } from 'framer-motion';
import DataTable from '../components/DataTable';
import { useAuth } from '../context/AuthContext';
import { FARMERS, getDistrictName, getCropName } from '../data/mockData';

export default function FarmerManagement() {
  const { canControl } = useAuth();
  const [farmers, setFarmers] = useState(FARMERS);

  const toggleFlag = (id) => {
    setFarmers(prev => prev.map(f => f.id === id ? { ...f, flagged: !f.flagged } : f));
  };

  const columns = [
    { key: 'id', header: 'Farmer ID', accessor: 'id', render: (val) => <span className="font-tabular text-accent-blue font-medium">{val}</span> },
    { key: 'name', header: 'Name', accessor: 'name', render: (val) => <span className="font-medium">{val}</span> },
    { key: 'mobile', header: 'Mobile', accessor: 'mobile', render: (val) => <span className="font-tabular">{val}</span> },
    { key: 'village', header: 'Village', accessor: 'village' },
    { key: 'district', header: 'District', accessor: row => getDistrictName(row.district) },
    { key: 'crop', header: 'Primary Crop', accessor: row => getCropName(row.crop) },
    { key: 'totalBookings', header: 'Bookings', accessor: 'totalBookings', render: (val) => <span className="font-tabular">{val}</span> },
    { key: 'noShows', header: 'No-Shows', accessor: 'noShows', render: (val) => (
      <span className={`font-tabular font-semibold ${val >= 3 ? 'text-severity-critical' : val >= 1 ? 'text-severity-warning' : 'text-text-primary'}`}>{val}</span>
    )},
    { key: 'flagged', header: 'Status', accessor: 'flagged', render: (val, row) => (
      <div className="flex items-center gap-2">
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${val ? 'bg-severity-critical/15 text-severity-critical' : 'bg-status-normal/15 text-status-normal'}`}>
          {val ? '🚩 Flagged' : '✓ Active'}
        </span>
        {canControl && (
          <button onClick={(e) => { e.stopPropagation(); toggleFlag(row.id); }}
            className="text-[10px] text-text-muted hover:text-accent-blue underline">
            {val ? 'Unflag' : 'Flag'}
          </button>
        )}
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary">👨‍🌾 Farmer Management</h1>
        <p className="text-xs text-text-muted mt-0.5">Search, view, and manage farmer records</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Farmers', value: farmers.length, icon: '👨‍🌾' },
          { label: 'Flagged', value: farmers.filter(f => f.flagged).length, icon: '🚩' },
          { label: 'Active', value: farmers.filter(f => !f.flagged).length, icon: '✓' },
          { label: 'Repeat No-Shows', value: farmers.filter(f => f.noShows >= 2).length, icon: '⚠️' },
        ].map(s => (
          <div key={s.label} className="bg-bg-card border border-gray-800 rounded-xl p-3">
            <div className="text-xs text-text-muted">{s.icon} {s.label}</div>
            <div className="font-tabular text-xl font-bold text-text-primary mt-1">{s.value}</div>
          </div>
        ))}
      </div>

      <DataTable columns={columns} data={farmers} pageSize={10} />
    </div>
  );
}
