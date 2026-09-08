import { useState } from 'react';
import { notificationEngine } from '../services/notificationEngine.js';

export default function Notifications({ t, lang, notifications = [], onRetryNotification }) {
  const [channelFilter, setChannelFilter] = useState('ALL');
  const [playingIvrId, setPlayingIvrId] = useState(null);

  const filteredNotifications = notifications.filter((n) => {
    if (channelFilter === 'ALL') return true;
    return (n.channel || '').toUpperCase() === channelFilter;
  });

  function handlePlayIvr(n) {
    setPlayingIvrId(n.id || n.notificationId);
    setTimeout(() => setPlayingIvrId(null), 4000);
  }

  const channelIcons = {
    sms: '📲',
    push: '🔔',
    in_app: '💬',
    ivr: '☎️',
  };

  return (
    <div className="card" style={{ maxWidth: 720, margin: '0 auto' }}>
      <div className="section-title">
        <div>
          <h2 style={{ fontSize: 17 }}>📬 {t.notifTitle || 'Multi-Channel Notification Hub'}</h2>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>
            {t.notifSub || 'Centralized DLT SMS, Mobile Push, In-App alerts, and regional IVR voice calls.'}
          </div>
        </div>
      </div>

      {/* Multi-Channel Filter Tabs */}
      <div className="queue-filter-row" style={{ display: 'flex', gap: 6, margin: '14px 0 16px', overflowX: 'auto' }}>
        {['ALL', 'SMS', 'PUSH', 'IN_APP', 'IVR'].map((ch) => (
          <button
            key={ch}
            className={`badge-filter ${channelFilter === ch ? 'active' : ''}`}
            onClick={() => setChannelFilter(ch)}
          >
            {ch === 'ALL' ? '🌐 All Channels' : `${channelIcons[ch.toLowerCase()] || ''} ${ch}`}
          </button>
        ))}
      </div>

      <div className="divider" style={{ margin: '8px 0 16px' }} />

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <div className="empty-note">No notifications found for channel "{channelFilter}".</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredNotifications.map((n) => {
            const channel = (n.channel || 'in_app').toLowerCase();
            const status = (n.status || 'DELIVERED').toUpperCase();
            const isIvr = channel === 'ivr';
            const isPlaying = playingIvrId === (n.id || n.notificationId);

            return (
              <div
                key={n.id || n.notificationId}
                className="card notif-item-card"
                style={{
                  display: 'flex',
                  gap: 14,
                  padding: '14px 16px',
                  background: 'var(--surface-elevated)',
                  border: status === 'FAILED' ? '1px solid var(--danger)' : '1px solid var(--border)',
                  alignItems: 'flex-start',
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                    flexShrink: 0,
                  }}
                >
                  {channelIcons[channel] || '🔔'}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)', lineHeight: 1.5 }}>
                      {n.message || n.text}
                    </div>
                    <span className={`status-badge ${status === 'DELIVERED' ? 'completed' : status === 'FAILED' ? 'cancelled' : 'processing'}`} style={{ fontSize: 10 }}>
                      {status}
                    </span>
                  </div>

                  {/* Metadata Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                    <div>
                      <span style={{ textTransform: 'uppercase', fontWeight: 700 }}>{channel}</span> · {n.formattedTime || n.time || 'Just now'} · <span className="mono">{n.farmerId || 'FARM-91234567'}</span>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      {isIvr && (
                        <button
                          className="btn btn-ghost"
                          style={{ padding: '3px 8px', fontSize: 11, color: isPlaying ? 'var(--primary-accent)' : 'inherit' }}
                          onClick={() => handlePlayIvr(n)}
                        >
                          {isPlaying ? '🔊 Playing Audio...' : '▶️ Play Voice Note'}
                        </button>
                      )}

                      {status === 'FAILED' && (
                        <button
                          className="btn btn-primary"
                          style={{ padding: '3px 8px', fontSize: 11 }}
                          onClick={() => onRetryNotification && onRetryNotification(n.notificationId || n.id)}
                        >
                          🔁 Retry SMS
                        </button>
                      )}
                    </div>
                  </div>

                  {n.failureReason && (
                    <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>
                      ⚠️ Error: {n.failureReason}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
