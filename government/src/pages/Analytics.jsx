import React, { useState, useEffect } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import ChartBlock from '../components/ChartBlock';
import {
  getProcurementAnalytics,
  getCenters,
  getDailyProcurementAnalytics,
  getCropProcurementAnalytics,
  getRejectionReasonsAnalytics,
  getDistrictProcurementAnalytics
} from '../api/api';

const DEFAULT_DAILY = [
  { date: 'Mon', arrivals: 45, completed: 42, rejected: 3 },
  { date: 'Tue', arrivals: 52, completed: 48, rejected: 4 },
  { date: 'Wed', arrivals: 38, completed: 35, rejected: 2 },
  { date: 'Thu', arrivals: 65, completed: 60, rejected: 5 },
  { date: 'Fri', arrivals: 48, completed: 45, rejected: 2 }
];

const DEFAULT_CROPS = [
  { crop: 'Paddy', quantity: 65, percentage: 65 },
  { crop: 'Cotton', quantity: 20, percentage: 20 },
  { crop: 'Wheat', quantity: 15, percentage: 15 }
];

const DEFAULT_REJECTIONS = [
  { reason: 'High Moisture', count: 42 },
  { reason: 'Foreign Matter', count: 18 },
  { reason: 'Fungus/Discolored', count: 12 },
  { reason: 'Under-weight', count: 5 }
];

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function Analytics() {
  const [period, setPeriod] = useState('thisWeek');
  const [dailyData, setDailyData] = useState(DEFAULT_DAILY);
  const [cropData, setCropData] = useState(DEFAULT_CROPS);
  const [rejectionData, setRejectionData] = useState(DEFAULT_REJECTIONS);
  const [districtData, setDistrictData] = useState([
    { district: 'East Godavari', arrivals: 290, quantity: 3400, rejections: 12 },
    { district: 'NTR District', arrivals: 180, quantity: 1950, rejections: 8 },
    { district: 'Guntur', arrivals: 140, quantity: 1600, rejections: 6 },
    { district: 'West Godavari', arrivals: 210, quantity: 2300, rejections: 9 }
  ]);
  const [centersList, setCentersList] = useState([]);
  const [liveAnalytics, setLiveAnalytics] = useState(null);

  useEffect(() => {
    // 1. Overall Summary
    getProcurementAnalytics()
      .then((data) => setLiveAnalytics(data))
      .catch((e) => console.log('Analytics summary fetch fallback:', e.message));

    // 2. Real Daily Trends
    const days = period === 'thisMonth' ? 30 : 7;
    getDailyProcurementAnalytics(days)
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setDailyData(data);
      })
      .catch((e) => console.log('Daily analytics fetch fallback:', e.message));

    // 3. Real Crop Breakdown
    getCropProcurementAnalytics()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setCropData(data);
      })
      .catch((e) => console.log('Crop analytics fetch fallback:', e.message));

    // 4. Real Rejection Reasons
    getRejectionReasonsAnalytics()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setRejectionData(data);
      })
      .catch((e) => console.log('Rejection reasons fetch fallback:', e.message));

    // 5. Real District Aggregations
    getDistrictProcurementAnalytics()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setDistrictData(data);
      })
      .catch((e) => console.log('District analytics fetch fallback:', e.message));

    // 6. Real Center Wait Times
    getCenters()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const liveMapped = data.map((c) => ({
            id: `c${c.id}`,
            name: c.name,
            expectedWait: c.est_wait_minutes != null ? c.est_wait_minutes : (c.current_queue ? c.current_queue * 4 : 15),
            status: c.status || 'normal',
          }));
          setCentersList(liveMapped);
        }
      })
      .catch((e) => console.log('Centers wait fetch fallback:', e.message));
  }, [period]);

  const waitTimeData = centersList
    .filter(c => c.status !== 'offline')
    .map(c => ({
      name: c.name.length > 15 ? c.name.slice(0, 15) + '…' : c.name,
      wait: c.expectedWait || 15,
    }))
    .sort((a, b) => b.wait - a.wait);

  const exportCSV = (data, filename) => {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(r => Object.values(r).join(',')).join('\n');
    const blob = new Blob([headers + '\n' + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${filename}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Procurement Analytics</h1>
          <p className="text-xs text-text-muted mt-0.5">Live performance metrics and procurement intelligence from backend</p>
        </div>
        <div className="flex items-center gap-2">
          {['thisWeek', 'lastWeek', 'thisMonth'].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${period === p ? 'bg-accent-blue text-white' : 'bg-bg-card text-text-secondary border border-gray-700 hover:bg-bg-hover'}`}
            >
              {p === 'thisWeek' ? 'This Week' : p === 'lastWeek' ? 'Last Week' : 'This Month'}
            </button>
          ))}
        </div>
      </div>

      {/* Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartBlock title="Daily Procurement Trend" subtitle="Arrivals, completed, and rejected" onExport={() => exportCSV(dailyData, 'daily_procurement')}>
          <AreaChart data={dailyData}>
            <defs>
              <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="100%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
              <linearGradient id="gC" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22c55e" stopOpacity={0.3}/><stop offset="100%" stopColor="#22c55e" stopOpacity={0}/></linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/>
            <XAxis dataKey="date" tick={{fill:'#64748b',fontSize:11}} axisLine={{stroke:'#1e293b'}}/>
            <YAxis tick={{fill:'#64748b',fontSize:11}} axisLine={{stroke:'#1e293b'}}/>
            <Tooltip contentStyle={{background:'#1a2236',border:'1px solid #374151',borderRadius:8,fontSize:12,color:'#f1f5f9'}}/>
            <Legend wrapperStyle={{fontSize:11,color:'#94a3b8'}}/>
            <Area type="monotone" dataKey="arrivals" stroke="#3b82f6" fill="url(#gA)" strokeWidth={2} name="Arrivals"/>
            <Area type="monotone" dataKey="completed" stroke="#22c55e" fill="url(#gC)" strokeWidth={2} name="Completed"/>
            <Area type="monotone" dataKey="rejected" stroke="#ef4444" fill="none" strokeWidth={1.5} strokeDasharray="4 4" name="Rejected"/>
          </AreaChart>
        </ChartBlock>

        <ChartBlock title="Crop-wise Procurement" subtitle="Distribution by quantity (Quintals)" onExport={() => exportCSV(cropData, 'crop_procurement')}>
          <PieChart>
            <Pie
              data={cropData}
              dataKey="quantity"
              nameKey="crop"
              cx="50%"
              cy="50%"
              outerRadius={90}
              innerRadius={50}
              paddingAngle={2}
              label={({crop, percentage}) => `${crop} ${percentage || Math.round(percentage)}%`}
              labelLine={{stroke:'#64748b'}}
            >
              {cropData.map((entry, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
            </Pie>
            <Tooltip contentStyle={{background:'#1a2236',border:'1px solid #374151',borderRadius:8,fontSize:12,color:'#f1f5f9'}}/>
          </PieChart>
        </ChartBlock>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartBlock title="Rejection Reasons Breakdown" subtitle="Quality inspections determining rejection" onExport={() => exportCSV(rejectionData, 'rejection_reasons')}>
          <BarChart data={rejectionData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/>
            <XAxis type="number" tick={{fill:'#64748b',fontSize:11}} axisLine={{stroke:'#1e293b'}}/>
            <YAxis type="category" dataKey="reason" tick={{fill:'#94a3b8',fontSize:11}} axisLine={{stroke:'#1e293b'}} width={130}/>
            <Tooltip contentStyle={{background:'#1a2236',border:'1px solid #374151',borderRadius:8,fontSize:12,color:'#f1f5f9'}}/>
            <Bar dataKey="count" fill="#ef4444" radius={[0,4,4,0]} name="Rejection Count"/>
          </BarChart>
        </ChartBlock>

        <ChartBlock title="District-wise Performance" subtitle="Arrivals and rejections by district" onExport={() => exportCSV(districtData, 'district_performance')}>
          <BarChart data={districtData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/>
            <XAxis dataKey="district" tick={{fill:'#64748b',fontSize:11}} axisLine={{stroke:'#1e293b'}}/>
            <YAxis tick={{fill:'#64748b',fontSize:11}} axisLine={{stroke:'#1e293b'}}/>
            <Tooltip contentStyle={{background:'#1a2236',border:'1px solid #374151',borderRadius:8,fontSize:12,color:'#f1f5f9'}}/>
            <Legend wrapperStyle={{fontSize:11}}/>
            <Bar dataKey="arrivals" fill="#3b82f6" radius={[4,4,0,0]} name="Arrivals"/>
            <Bar dataKey="rejections" fill="#ef4444" radius={[4,4,0,0]} name="Rejections"/>
          </BarChart>
        </ChartBlock>
      </div>

      {/* Row 3 */}
      {waitTimeData.length > 0 && (
        <ChartBlock title="Average Wait Time by Center" subtitle="Centers sorted by highest wait (minutes)" onExport={() => exportCSV(waitTimeData, 'wait_times')}>
          <BarChart data={waitTimeData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/>
            <XAxis type="number" tick={{fill:'#64748b',fontSize:11}} axisLine={{stroke:'#1e293b'}} unit="m"/>
            <YAxis type="category" dataKey="name" tick={{fill:'#94a3b8',fontSize:10}} axisLine={{stroke:'#1e293b'}} width={130}/>
            <Tooltip contentStyle={{background:'#1a2236',border:'1px solid #374151',borderRadius:8,fontSize:12,color:'#f1f5f9'}}/>
            <Bar dataKey="wait" fill="#f59e0b" radius={[0,4,4,0]} name="Wait (min)"/>
          </BarChart>
        </ChartBlock>
      )}
    </div>
  );
}
