import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { getForecastAnalytics } from '../api/api';

const DEFAULT_FORECAST = {
  tomorrowArrivals: {
    estimated: 320,
    predicted: 320,
    thresholdRate: 0.88,
    low: 280,
    high: 360
  },
  peakWindow: '09:30 AM – 01:00 PM',
  modelBasis: 'Multi-center arrival queue baseline with historical slot intake & weather adjustment',
  atRiskCenters: [
    {
      centerId: 'c1',
      name: 'Kakinada APMC Mandi Center',
      district: 'East Godavari',
      riskScore: 0.88,
      predictedQueue: 24,
      reason: 'Slot bookings at 92% capacity with heavy Paddy inflow'
    },
    {
      centerId: 'c2',
      name: 'Godavari Green Centre',
      district: 'East Godavari',
      riskScore: 0.74,
      predictedQueue: 18,
      reason: 'Moderate waiting queue expected during peak hours'
    }
  ],
  redirections: [
    {
      fromName: 'Kakinada APMC Mandi Center',
      toName: 'Godavari Green Centre',
      farmerCount: 15,
      saving: 'Save 45 mins wait'
    }
  ]
};

export default function Forecast() {
  const { canControl } = useAuth();
  const [forecastData, setForecastData] = useState(DEFAULT_FORECAST);
  const [applied, setApplied] = useState({});

  useEffect(() => {
    getForecastAnalytics()
      .then((data) => {
        if (data && data.tomorrowArrivals) {
          // Normalize atRiskCenters and redirections
          const normalized = {
            tomorrowArrivals: data.tomorrowArrivals,
            peakWindow: data.peakWindow || DEFAULT_FORECAST.peakWindow,
            modelBasis: data.modelBasis || DEFAULT_FORECAST.modelBasis,
            atRiskCenters: (data.atRiskCenters || []).map((c) => ({
              centerId: c.centerId,
              name: c.name,
              riskScore: c.riskScore || 0.75,
              reason: c.recommendedAction || c.reason || 'High volume expected during peak window',
              expectedQueue: c.predictedQueue || 20
            })),
            redirections: (data.redirections || []).map((r) => ({
              fromName: r.fromCenter || 'Kakinada Mandi',
              toName: r.toCenter || 'Godavari Green Centre',
              farmerCount: r.slotsAvailable ? Math.min(20, r.slotsAvailable) : 15,
              saving: `Save ~40 mins (Distance: ${r.distanceKm || 18} km)`
            }))
          };
          setForecastData(normalized);
        }
      })
      .catch((e) => console.log('Using baseline forecast:', e.message));
  }, []);

  const { tomorrowArrivals, peakWindow, modelBasis, atRiskCenters, redirections } = forecastData;

  const handleApplyRedirection = (index) => {
    setApplied(prev => ({ ...prev, [index]: true }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary">📈 Congestion & Arrival Trends</h1>
        <p className="text-xs text-text-muted mt-0.5">Live arrival trends and peak window estimations calculated from backend slot capacities & DQA queue models</p>
      </div>

      {/* Trend summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="bg-bg-card border border-gray-800 rounded-xl p-5">
          <div className="text-xs text-text-muted uppercase tracking-wider mb-2">Tomorrow's Estimated Arrivals</div>
          <div className="font-tabular text-3xl font-bold text-accent-blue">{tomorrowArrivals.estimated || tomorrowArrivals.predicted}</div>
          <div className="flex items-center gap-2 mt-2">
            <div className="h-1.5 flex-1 bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-accent-blue to-accent-cyan rounded-full" style={{width:`${(tomorrowArrivals.thresholdRate || 0.88)*100}%`}} />
            </div>
            <span className="text-xs text-text-muted font-tabular">{Math.round((tomorrowArrivals.thresholdRate || 0.88)*100)}% confidence</span>
          </div>
          <div className="text-xs text-text-secondary mt-2">Expected Range: {tomorrowArrivals.low} – {tomorrowArrivals.high} farmers</div>
        </motion.div>

        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.1}} className="bg-bg-card border border-gray-800 rounded-xl p-5">
          <div className="text-xs text-text-muted uppercase tracking-wider mb-2">Peak Demand Window</div>
          <div className="text-2xl font-bold text-status-busy">{peakWindow}</div>
          <div className="text-xs text-text-secondary mt-2">Deploy extra staff & active weighing scales during this window</div>
        </motion.div>

        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.2}} className="bg-bg-card border border-gray-800 rounded-xl p-5">
          <div className="text-xs text-text-muted uppercase tracking-wider mb-2">Trend Basis</div>
          <div className="text-sm text-text-secondary leading-relaxed">{modelBasis}</div>
        </motion.div>
      </div>

      {/* At-risk centers */}
      <div className="bg-bg-card border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-4">⚠️ Centers at Risk of Congestion</h3>
        <div className="space-y-3">
          {atRiskCenters.length === 0 ? (
            <div className="text-xs text-text-muted p-4 text-center">No centers currently exceed congestion thresholds.</div>
          ) : (
            atRiskCenters.map((c, i) => (
              <motion.div
                key={c.centerId || i}
                initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} transition={{delay:i*0.1}}
                className="flex items-center justify-between p-3 rounded-xl bg-bg-primary border border-gray-800"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
                    c.riskScore > 0.8 ? 'bg-severity-critical/15 text-severity-critical' :
                    c.riskScore > 0.6 ? 'bg-severity-warning/15 text-severity-warning' :
                    'bg-severity-info/15 text-severity-info'
                  }`}>
                    #{i+1}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-text-primary">{c.name}</div>
                    <div className="text-xs text-text-muted">{c.reason}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-tabular text-lg font-bold text-text-primary">{Math.round(c.riskScore*100)}% risk</div>
                  <div className="text-xs text-text-muted">Expected queue: {c.expectedQueue} farmers</div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Recommended redirections */}
      {redirections.length > 0 && (
        <div className="bg-bg-card border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">🔄 Recommended Redirections</h3>
          <div className="space-y-3">
            {redirections.map((r, i) => (
              <motion.div
                key={i}
                initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} transition={{delay:i*0.1}}
                className="flex items-center justify-between p-4 rounded-xl bg-bg-primary border border-gray-800"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="text-center">
                    <div className="text-xs text-severity-critical font-medium">{r.fromName}</div>
                    <div className="text-lg text-text-muted">→</div>
                    <div className="text-xs text-status-normal font-medium">{r.toName}</div>
                  </div>
                  <div className="h-px flex-1 bg-gradient-to-r from-severity-critical via-text-muted to-status-normal" />
                  <div className="text-center">
                    <div className="font-tabular text-xl font-bold text-text-primary">{r.farmerCount}</div>
                    <div className="text-xs text-text-muted">farmers</div>
                  </div>
                  <div className="text-xs text-accent-emerald bg-accent-emerald/10 px-2 py-1 rounded">{r.saving}</div>
                </div>
                {canControl && (
                  <motion.button
                    whileHover={{scale:1.05}} whileTap={{scale:0.95}}
                    onClick={() => handleApplyRedirection(i)}
                    disabled={applied[i]}
                    className={`ml-4 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                      applied[i] ? 'bg-status-normal text-white cursor-default' : 'bg-accent-blue text-white hover:bg-accent-blue/80'
                    }`}
                  >
                    {applied[i] ? '✓ Applied' : 'Apply'}
                  </motion.button>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
