import { CentreService } from '../services/centreService.js';

export default function CentreCard({
  t, lang, centre, isCompared, onToggleCompare, onViewDetails, onSelectForBooking,
}) {
  const centreName = centre[lang] || centre.en;
  const congestionLevel = CentreService.getCongestionLevel(centre);
  const estWaitMins = CentreService.calculateEstWaitTime(centre.currentQueue, centre.numberOfCounters);
  const remainingCap = Math.max(0, centre.dailyFarmerCapacity - centre.currentBookedCapacity);
  const bookedPct = Math.min(100, Math.round((centre.currentBookedCapacity / centre.dailyFarmerCapacity) * 100));

  const congestionColorMap = {
    LOW: { badgeClass: 'success', label: t.congestionLow || 'LOW' },
    MEDIUM: { badgeClass: 'warn', label: t.congestionMed || 'MEDIUM' },
    HIGH: { badgeClass: 'warn', label: t.congestionHigh || 'HIGH' },
    FULL: { badgeClass: 'critical', label: t.congestionFull || 'FULL' },
  };

  const statusColorMap = {
    OPEN: 'success',
    FULL: 'critical',
    MAINTENANCE: 'warn',
    TEMPORARILY_CLOSED: 'critical',
    CLOSED: 'neutral',
  };

  const isAvailable = centre.operatingStatus === 'OPEN' && remainingCap > 0;

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'relative', border: '1px solid var(--border)', background: 'var(--surface)' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <span className={`badge ${statusColorMap[centre.operatingStatus] || 'neutral'}`}>
              <span className="badge-dot"></span>
              {centre.operatingStatus}
            </span>
            <span className="pill" style={{ background: 'var(--surface-2)', fontWeight: 600 }}>
              📍 {centre.distanceKm || '3.2'} km away
            </span>
          </div>

          <h3 style={{ fontSize: 16.5, fontWeight: 700, margin: '4px 0 2px' }}>{centreName}</h3>
          <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
            {centre.address} · <span className="mono">{centre.pin}</span>
          </div>
        </div>

        {/* Compare Checkbox / Toggle Button */}
        <button
          className={`btn ${isCompared ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '6px 12px', fontSize: 12.5 }}
          onClick={() => onToggleCompare(centre)}
        >
          {isCompared ? '✓ Comparing' : '+ Compare'}
        </button>
      </div>

      {/* Disruption Alert Banner */}
      {centre.disruptionAlert && (
        <div className="hint error" style={{ background: 'var(--critical-soft)', padding: '8px 12px', borderRadius: 8, margin: 0, fontSize: 12 }}>
          ⚠️ <strong>Operational Alert:</strong> {centre.disruptionAlert}
        </div>
      )}

      <div className="divider" style={{ margin: '2px 0' }}></div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px 12px', fontSize: 13 }}>
        <div>
          <div className="label">{t.congestionLabel || 'Congestion'}</div>
          <div style={{ marginTop: 2 }}>
            <span className={`badge ${congestionColorMap[congestionLevel].badgeClass}`} style={{ fontSize: 10.5 }}>
              {congestionLevel}
            </span>
          </div>
        </div>

        <div>
          <div className="label">Current Queue</div>
          <div className="mono" style={{ fontWeight: 700, fontSize: 15 }}>
            {centre.currentQueue} <span style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>farmers</span>
          </div>
        </div>

        <div>
          <div className="label">Est. Waiting Time</div>
          <div className="mono" style={{ fontWeight: 700, fontSize: 15 }}>
            ~{estWaitMins} <span style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>min</span>
          </div>
        </div>

        <div>
          <div className="label">Remaining Capacity</div>
          <div className="mono" style={{ fontWeight: 700, fontSize: 15, color: remainingCap > 0 ? 'var(--success)' : 'var(--critical)' }}>
            {remainingCap} <span style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>spots</span>
          </div>
        </div>
      </div>

      {/* Capacity Progress Bar */}
      <div style={{ marginTop: 2 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--ink-muted)', marginBottom: 4 }}>
          <span>Daily Utilization ({bookedPct}%)</span>
          <span>{centre.currentBookedCapacity} / {centre.dailyFarmerCapacity} Farmers</span>
        </div>
        <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 10, overflow: 'hidden' }}>
          <div
            style={{
              width: `${bookedPct}%`,
              height: '100%',
              background: bookedPct >= 95 ? 'var(--critical)' : bookedPct >= 75 ? 'var(--warn)' : 'var(--accent)',
              transition: 'width .3s',
            }}
          ></div>
        </div>
      </div>

      {/* Actions Row */}
      <div className="btn-row" style={{ marginTop: 4 }}>
        <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => onViewDetails(centre)}>
          🔍 {t.viewDetails || 'Details'}
        </button>
        <button
          className="btn btn-primary"
          style={{ flex: 1.5, justifyContent: 'center' }}
          disabled={!isAvailable}
          onClick={() => onSelectForBooking(centre)}
        >
          {isAvailable ? '📅 Select & Book Slot' : '❌ Capacity Full / Closed'}
        </button>
      </div>
    </div>
  );
}
