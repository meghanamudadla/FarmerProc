import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { FORECAST } from '../data/mockData';

export default function Forecast() {
  const { canControl } = useAuth();
  const { tomorrowArrivals, peakWindow, trendBasis, atRiskCenters, redirections } = FORECAST;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary">📊 Congestion & Arrival Trends</h1>
        <p className="text-xs text-text-muted mt-0.5">Arrival trends based on historical patterns, season trends, and weather data</p>
      </div>

      {/* Trend summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="bg-bg-card border border-gray-800 rounded-xl p-5">
          <div className="text-xs text-text-muted uppercase tracking-wider mb-2">Tomorrow's Estimated Arrivals</div>
          <div className="font-tabular text-3xl font-bold text-accent-blue">{tomorrowArrivals.estimated || tomorrowArrivals.predicted}</div>
          <div className="flex items-center gap-2 mt-2">
            <div className="h-1.5 flex-1 bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-accent-blue to-accent-cyan rounded-full" style={{width:`${(tomorrowArrivals.thresholdRate || 0.82)*100}%`}} />
            </div>
            <span className="text-xs text-text-muted font-tabular">{Math.round((tomorrowArrivals.thresholdRate || 0.82)*100)}% threshold</span>
          </div>
          <div className="text-xs text-text-secondary mt-2">Range: {tomorrowArrivals.low} – {tomorrowArrivals.high}</div>
        </motion.div>

        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.1}} className="bg-bg-card border border-gray-800 rounded-xl p-5">
          <div className="text-xs text-text-muted uppercase tracking-wider mb-2">Peak Demand Window</div>
          <div className="text-2xl font-bold text-status-busy">{peakWindow}</div>
          <div className="text-xs text-text-secondary mt-2">Deploy extra staff during this window</div>
        </motion.div>

        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.2}} className="bg-bg-card border border-gray-800 rounded-xl p-5">
          <div className="text-xs text-text-muted uppercase tracking-wider mb-2">Trend Basis</div>
          <div className="text-sm text-text-secondary leading-relaxed">{trendBasis || FORECAST.modelBasis}</div>
        </motion.div>
      </div>

      {/* At-risk centers */}
      <div className="bg-bg-card border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-4">⚠️ Centers at Risk of Congestion</h3>
        <div className="space-y-3">
          {atRiskCenters.map((c, i) => (
            <motion.div
              key={c.centerId}
              initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} transition={{delay:i*0.1}}
              className="flex items-center justify-between p-3 rounded-xl bg-bg-primary border border-gray-800"
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
                  c.riskScore > 0.9 ? 'bg-severity-critical/15 text-severity-critical' :
                  c.riskScore > 0.7 ? 'bg-severity-warning/15 text-severity-warning' :
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
                <div className="font-tabular text-lg font-bold text-text-primary">{Math.round(c.riskScore*100)}%</div>
                <div className="text-xs text-text-muted">Expected queue: {c.expectedQueue}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Recommended redirections */}
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
                  className="ml-4 bg-accent-blue text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-accent-blue/80 transition-colors"
                >
                  Apply
                </motion.button>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
