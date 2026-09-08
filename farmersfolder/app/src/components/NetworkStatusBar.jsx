import { useState, useEffect } from 'react';
import { offlineSyncService } from '../services/offlineSyncService.js';

export default function NetworkStatusBar({ t, lang, onTriggerSync }) {
  const [networkMode, setNetworkMode] = useState(offlineSyncService.networkMode);
  const [pendingCount, setPendingCount] = useState(offlineSyncService.pendingQueue.length);

  useEffect(() => {
    const unsubscribe = offlineSyncService.subscribe((event, payload, mode) => {
      setNetworkMode(offlineSyncService.networkMode);
      setPendingCount(offlineSyncService.pendingQueue.length);
    });
    return () => unsubscribe();
  }, []);

  function handleSwitchMode(mode) {
    offlineSyncService.setNetworkMode(mode);
    setNetworkMode(mode);
    if (mode === 'ONLINE' && onTriggerSync) {
      onTriggerSync();
    }
  }

  return (
    <div className="network-status-bar" style={{
      background: networkMode === 'OFFLINE' ? '#fef2f2' : networkMode === 'SLOW_2G' ? '#fffbeb' : '#f0fdf4',
      border: '1.5px solid var(--border)',
      borderRadius: 8,
      marginBottom: 16,
      padding: '8px 16px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontSize: 12,
      flexWrap: 'wrap',
      gap: 8,
      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
    }}>
      {/* Left: Status Badge & Notice */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          display: 'inline-block',
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: networkMode === 'OFFLINE' ? '#dc2626' : networkMode === 'SLOW_2G' ? '#d97706' : '#16a34a',
        }} />
        <span style={{ fontWeight: 600, color: networkMode === 'OFFLINE' ? '#991b1b' : networkMode === 'SLOW_2G' ? '#92400e' : '#166534' }}>
          {networkMode === 'OFFLINE' ? '🔴 Offline Mode (No Internet - Caching Active)' : networkMode === 'SLOW_2G' ? '📡 Low-Bandwidth Mode (2G Optimized)' : '🟢 Online (Fast 4G/5G Network)'}
        </span>

        {pendingCount > 0 && (
          <span className="badge warn" style={{ padding: '2px 7px', fontSize: 11 }}>
            ⏳ {pendingCount} Pending Sync
          </span>
        )}
      </div>

      {/* Right: Mode Switcher Chips (for prototype demonstration) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Simulate Network:</span>
        <button
          className={`badge-filter ${networkMode === 'ONLINE' ? 'active' : ''}`}
          style={{ padding: '2px 8px', fontSize: 11 }}
          onClick={() => handleSwitchMode('ONLINE')}
        >
          🟢 4G/5G
        </button>
        <button
          className={`badge-filter ${networkMode === 'SLOW_2G' ? 'active' : ''}`}
          style={{ padding: '2px 8px', fontSize: 11 }}
          onClick={() => handleSwitchMode('SLOW_2G')}
        >
          📡 2G
        </button>
        <button
          className={`badge-filter ${networkMode === 'OFFLINE' ? 'active' : ''}`}
          style={{ padding: '2px 8px', fontSize: 11 }}
          onClick={() => handleSwitchMode('OFFLINE')}
        >
          🔴 Offline
        </button>

        {pendingCount > 0 && networkMode === 'ONLINE' && (
          <button
            className="btn btn-primary"
            style={{ padding: '2px 8px', fontSize: 11, marginLeft: 4 }}
            onClick={() => onTriggerSync && onTriggerSync()}
          >
            🔄 Sync Queue
          </button>
        )}
      </div>
    </div>
  );
}
