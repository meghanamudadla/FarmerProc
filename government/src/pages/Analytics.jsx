import React, { useState, useEffect } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import ChartBlock from '../components/ChartBlock';
import { DAILY_PROCUREMENT, CROP_PROCUREMENT, REJECTION_REASONS, CENTERS, getDistrictName } from '../data/mockData';
import { getProcurementAnalytics, getCenters } from '../api/api';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function Analytics() {
  const [period, setPeriod] = useState('thisWeek');
  const [centersList, setCentersList] = useState(CENTERS);
  const [liveAnalytics, setLiveAnalytics] = useState(null);

  useEffect(() => {
    getProcurementAnalytics()
      .then((data) => setLiveAnalytics(data))
      .catch((e) => console.log('Using baseline analytics'));

    getCenters()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const liveMapped = data.map((c) => ({
            id: `c${c.id}`,
            name: c.name,
            expectedWait: 22,
            status: 'normal',
          }));
          setCentersList([...liveMapped, ...CENTERS]);
        }
      })
      .catch((e) => console.log('Using baseline centers in analytics'));
  }, []);

  const districtData = [
    { district: 'Karnal', arrivals: 427, quantity: 4800, rejections: 28 },
    { district: 'Anantapur', arrivals: 150, quantity: 1680, rejections: 18 },
    { district: 'E.Godavari', arrivals: liveAnalytics ? liveAnalytics.today_arrivals * 15 + 180 : 291, quantity: liveAnalytics ? Math.round(liveAnalytics.total_procured_quintals) + 2000 : 3200, rejections: 12 },
    { district: 'Krishna', arrivals: 377, quantity: 4650, rejections: 22 },
  ];

  const waitTimeData = centersList.filter(c => c.status !== 'offline').map(c => ({
    name: c.name.length > 15 ? c.name.slice(0, 15) + '…' : c.name,
    wait: c.expectedWait || 20,
  })).sort((a, b) => b.wait - a.wait);

  const exportCSV = (data, filename) => {
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
          <p className="text-xs text-text-muted mt-0.5">Detailed performance metrics and trends</p>
        </div>
        <div className="flex items-center gap-2">
          {['thisWeek', 'lastWeek', 'thisMonth'].map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${period === p ? 'bg-accent-blue text-white' : 'bg-bg-card text-text-secondary border border-gray-700 hover:bg-bg-hover'}`}>
              {p === 'thisWeek' ? 'This Week' : p === 'lastWeek' ? 'Last Week' : 'This Month'}
            </button>
          ))}
        </div>
      </div>

      {/* Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartBlock title="Daily Procurement Trend" subtitle="Arrivals, completed, and rejected" onExport={() => exportCSV(DAILY_PROCUREMENT, 'daily_procurement')}>
          <AreaChart data={DAILY_PROCUREMENT}>
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

        <ChartBlock title="Crop-wise Procurement" subtitle="Distribution by quantity" onExport={() => exportCSV(CROP_PROCUREMENT, 'crop_procurement')}>
          <PieChart>
            <Pie data={CROP_PROCUREMENT} dataKey="quantity" nameKey="crop" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={2}
              label={({crop,percentage})=>`${crop} ${percentage}%`} labelLine={{stroke:'#64748b'}}>
              {CROP_PROCUREMENT.map((entry, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
            </Pie>
            <Tooltip contentStyle={{background:'#1a2236',border:'1px solid #374151',borderRadius:8,fontSize:12,color:'#f1f5f9'}}/>
          </PieChart>
        </ChartBlock>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartBlock title="Rejection Reasons Breakdown" subtitle="Why produce is being rejected" onExport={() => exportCSV(REJECTION_REASONS, 'rejection_reasons')}>
          <BarChart data={REJECTION_REASONS} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/>
            <XAxis type="number" tick={{fill:'#64748b',fontSize:11}} axisLine={{stroke:'#1e293b'}}/>
            <YAxis type="category" dataKey="reason" tick={{fill:'#94a3b8',fontSize:11}} axisLine={{stroke:'#1e293b'}} width={100}/>
            <Tooltip contentStyle={{background:'#1a2236',border:'1px solid #374151',borderRadius:8,fontSize:12,color:'#f1f5f9'}}/>
            <Bar dataKey="count" fill="#ef4444" radius={[0,4,4,0]} name="Count"/>
          </BarChart>
        </ChartBlock>

        <ChartBlock title="District-wise Performance" subtitle="Arrivals and quantity by district" onExport={() => exportCSV(districtData, 'district_performance')}>
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
      <ChartBlock title="Average Wait Time by Center" subtitle="Centers sorted by highest wait" onExport={() => exportCSV(waitTimeData, 'wait_times')}>
        <BarChart data={waitTimeData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/>
          <XAxis type="number" tick={{fill:'#64748b',fontSize:11}} axisLine={{stroke:'#1e293b'}} unit="m"/>
          <YAxis type="category" dataKey="name" tick={{fill:'#94a3b8',fontSize:10}} axisLine={{stroke:'#1e293b'}} width={120}/>
          <Tooltip contentStyle={{background:'#1a2236',border:'1px solid #374151',borderRadius:8,fontSize:12,color:'#f1f5f9'}}/>
          <Bar dataKey="wait" fill="#f59e0b" radius={[0,4,4,0]} name="Wait (min)"/>
        </BarChart>
      </ChartBlock>
    </div>
  );
}
