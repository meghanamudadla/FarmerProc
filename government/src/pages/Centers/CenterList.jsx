import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { CENTERS, DISTRICTS, getDistrictName } from '../../data/mockData';
import { getCenters } from '../../api/api';

export default function CenterList() {
  const navigate = useNavigate();
  const { user, isDistrictAdmin } = useAuth();
  const [statusFilter, setStatusFilter] = useState('all');
  const [districtFilter, setDistrictFilter] = useState('all');
  const [allCenters, setAllCenters] = useState(CENTERS);

  useEffect(() => {
    getCenters()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const liveMapped = data.map((c) => ({
            id: `c${c.id}`,
            name: c.name,
            district: c.district || 'East Godavari',
            lat: 16.9891,
            lng: 82.2475,
            status: 'normal',
            queueLength: 6,
            expectedWait: 20,
            capacityPercent: 45,
            todayArrivals: 24,
            processingRate: 12,
            staffOnDuty: Math.max(6, Math.round((c.capacity || 100) / 10)),
            storagePercent: 38,
            crops: ['paddy', 'cotton'],
            approvalStatus: 'active',
          }));
          const existingNames = new Set(liveMapped.map(l => l.name.toLowerCase()));
          setAllCenters([...liveMapped, ...CENTERS.filter(c => !existingNames.has(c.name.toLowerCase()))]);
        }
      })
      .catch((err) => console.log('Using baseline centers list'));
  }, []);

  const centers = useMemo(() => {
    let data = [...allCenters];
    if (isDistrictAdmin && user.district) {
      data = data.filter(c => c.district === user.district);
    }
    if (statusFilter !== 'all') data = data.filter(c => c.status === statusFilter);
    if (districtFilter !== 'all') data = data.filter(c => c.district === districtFilter);
    return data;
  }, [allCenters, statusFilter, districtFilter, isDistrictAdmin, user]);

  const columns = [
    { key: 'name', header: 'Center Name', accessor: 'name', render: (val) => <span className="font-medium">{val}</span> },
    { key: 'district', header: 'District', accessor: (row) => getDistrictName(row.district) },
    { key: 'status', header: 'Status', accessor: 'status', render: (val) => <StatusBadge status={val} /> },
    { key: 'queueLength', header: 'Queue', accessor: 'queueLength', render: (val) => <span className="font-tabular font-bold">{val}</span> },
    { key: 'expectedWait', header: 'Wait (min)', accessor: 'expectedWait', render: (val) => <span className="font-tabular">{val > 0 ? `${val}m` : '—'}</span> },
    { key: 'capacityPercent', header: 'Capacity', accessor: 'capacityPercent', render: (val) => (
      <div className="flex items-center gap-2">
        <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${val > 85 ? 'bg-severity-critical' : val > 60 ? 'bg-status-busy' : 'bg-status-normal'}`} style={{ width: `${val}%` }} />
        </div>
        <span className="font-tabular text-xs">{val}%</span>
      </div>
    )},
    { key: 'todayArrivals', header: 'Arrivals', accessor: 'todayArrivals', render: (val) => <span className="font-tabular">{val}</span> },
    { key: 'processingRate', header: 'Rate/hr', accessor: 'processingRate', render: (val) => <span className="font-tabular">{val}</span> },
    { key: 'staffOnDuty', header: 'Staff', accessor: 'staffOnDuty', render: (val) => <span className="font-tabular">{val}</span> },
    { key: 'storagePercent', header: 'Storage', accessor: 'storagePercent', render: (val) => (
      <div className="flex items-center gap-2">
        <div className="w-12 h-1.5 bg-gray-700 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${val > 85 ? 'bg-severity-critical' : val > 60 ? 'bg-status-busy' : 'bg-accent-blue'}`} style={{ width: `${val}%` }} />
        </div>
        <span className="font-tabular text-xs">{val}%</span>
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Procurement Centers</h1>
          <p className="text-xs text-text-muted mt-0.5">{centers.length} centers • Click any row to view details</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="bg-bg-card border border-gray-700 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue"
        >
          <option value="all">All Statuses</option>
          <option value="normal">🟢 Normal</option>
          <option value="busy">🟡 Busy</option>
          <option value="congested">🔴 Congested</option>
          <option value="offline">⚫ Offline</option>
        </select>
        {!isDistrictAdmin && (
          <select
            value={districtFilter}
            onChange={e => setDistrictFilter(e.target.value)}
            className="bg-bg-card border border-gray-700 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue"
          >
            <option value="all">All Districts</option>
            {DISTRICTS.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        )}
      </div>

      <DataTable
        columns={columns}
        data={centers}
        onRowClick={(row) => navigate(`/centers/${row.id}`)}
        pageSize={12}
      />
    </div>
  );
}
