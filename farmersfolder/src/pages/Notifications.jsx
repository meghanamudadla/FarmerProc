export default function Notifications({ t, notifications }) {
  return (
    <div className="card" style={{ maxWidth: 640 }}>
      <div className="section-title">
        <h2 style={{ fontSize: 15 }}>{t.notifTitle}</h2>
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--ink-muted)', marginBottom: 6 }}>{t.notifSub}</div>
      <div className="channel-pills">
        <span className="pill">📲 {t.channels.sms}</span>
        <span className="pill">🔔 {t.channels.push}</span>
        <span className="pill">☎ {t.channels.ivr}</span>
      </div>
      <div className="divider"></div>
      {notifications.map((n) => (
        <div className="notif-item" key={n.id}>
          <div className={'notif-icon ' + n.channel}>{n.channel === 'sms' ? '📲' : n.channel === 'ivr' ? '☎' : '🔔'}</div>
          <div>
            <div className="notif-text">{n.text}</div>
            <div className="notif-meta">
              {t.channels[n.channel]} · {n.time}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
