import { useState, useEffect } from 'react';
import { queueService } from '../services/queueService.js';

export default function QueueStatusCard({ t, lang, activeBooking, queueList = [] }) {
  const [metrics, setMetrics] = useState(() => queueService.getQueueMetrics(queueList, activeBooking));
  const [socketConnected, setSocketConnected] = useState(true);

  // Subscribe to real-time pub/sub events from queueService
  useEffect(() => {
    const updateLocalMetrics = () => {
      setMetrics(queueService.getQueueMetrics(queueList, activeBooking));
    };

    updateLocalMetrics();
    const unsubscribe = queueService.subscribe((event, payload) => {
      updateLocalMetrics();
    });

    return () => unsubscribe();
  }, [queueList, activeBooking]);

  if (!activeBooking) {
    return null;
  }

  const statusKeyMap = {
    booked: t.queueStatusWaiting || 'Booked',
    checked_in: t.queueStatusCheckedIn || 'Checked In',
    waiting: t.queueStatusWaiting || 'In Waiting Yard',
    called: t.queueStatusCalled || 'Called to Counter',
    processing: t.queueStatusProcessing || 'Weighing & Processing',
    completed: t.queueStatusCompleted || 'Procurement Completed',
    no_show: t.queueStatusNoShow || 'No-Show',
  };

  const isCalled = activeBooking.status === 'called';
  const isProcessing = activeBooking.status === 'processing';
  const isNoShow = activeBooking.status === 'no_show';
  const counterNum = activeBooking.counterNumber || 1;

  return (
    <div className="card queue-status-card" style={{ border: isCalled ? '2px solid var(--primary-accent)' : '1px solid var(--border)' }}>
      {/* Real-time Socket Indicator Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)' }}>
          {t.liveQueueStatus || 'LIVE QUEUE STATUS'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--success)', fontWeight: 600 }}>
          <span className="live-pulse-dot" />
          {socketConnected ? '🔴 REAL-TIME LIVE' : 'Connecting...'}
        </div>
      </div>

      {/* Prominent Banner when Called */}
      {isCalled && (
        <div className="call-alert-banner">
          {t.tokenCalledAlert ? t.tokenCalledAlert(activeBooking.token, counterNum) : `🚨 YOUR TOKEN ${activeBooking.token} HAS BEEN CALLED! Proceed to Counter #${counterNum}`}
        </div>
      )}

      {/* No-Show Alert */}
      {isNoShow && (
        <div className="no-show-alert-banner">
          {t.noShowNotice ? t.noShowNotice(activeBooking.noShowReason || 'Missed grace period window.') : '⚠️ Token marked No-Show. Please speak with Mandi Officer.'}
        </div>
      )}

      <div className="queue-grid-3">
        {/* Current Processing Token */}
        <div className="queue-metric-box">
          <div className="label">{t.currentlyServing || 'Currently Serving'}</div>
          <div className="mono-value highlight">{metrics.currentProcessingToken}</div>
          <div className="sub-tag">Counter #{counterNum}</div>
        </div>

        {/* Your Token */}
        <div className="queue-metric-box primary">
          <div className="label">Your Token</div>
          <div className="mono-value">{activeBooking.token}</div>
          <div className="status-pill-badge">{statusKeyMap[activeBooking.status] || activeBooking.status}</div>
        </div>

        {/* Farmers Ahead */}
        <div className="queue-metric-box">
          <div className="label">{t.peopleAhead || 'Farmers Ahead'}</div>
          <div className="mono-value">{metrics.farmersAhead}</div>
          <div className="sub-tag">Next: {metrics.nextProcessingToken}</div>
        </div>
      </div>

      {/* Estimated Waiting Time & Operating Status */}
      <div className="queue-footer-bar">
        <div>
          <span className="footer-label">{t.estWaitTime || 'Est. Waiting Time'}: </span>
          <span className="footer-value">~{metrics.estWaitTimeRange}</span>
        </div>
        <div>
          <span className="footer-label">Mandi Status: </span>
          <span className="footer-value success">OPEN · {metrics.activeCounters} Counters Active</span>
        </div>
      </div>
    </div>
  );
}
