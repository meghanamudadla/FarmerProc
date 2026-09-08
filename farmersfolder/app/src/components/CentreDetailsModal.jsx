import { CentreService } from '../services/centreService.js';

export default function CentreDetailsModal({
  t, lang, centre, onClose, onSelectForBooking,
}) {
  if (!centre) return null;

  const centreName = centre[lang] || centre.en;
  const congestionLevel = CentreService.getCongestionLevel(centre);
  const estWaitMins = CentreService.calculateEstWaitTime(centre.currentQueue, centre.numberOfCounters);
  const remainingCap = Math.max(0, centre.dailyFarmerCapacity - centre.currentBookedCapacity);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="modal-head">
          <div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--ink-muted)', fontWeight: 700, marginBottom: 4 }}>
              🏛️ Procurement Facility Specs
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>{centreName}</h2>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span className={`badge ${centre.operatingStatus === 'OPEN' ? 'success' : 'critical'}`}>
            {centre.operatingStatus}
          </span>
          <span className="badge neutral">
            Congestion: {congestionLevel}
          </span>
          <span className="pill" style={{ background: 'var(--surface-2)' }}>
            📍 {centre.distanceKm || '3.2'} km away
          </span>
        </div>

        {centre.disruptionAlert && (
          <div className="hint error" style={{ background: 'var(--critical-soft)', padding: '10px 14px', borderRadius: 8, marginBottom: 16 }}>
            ⚠️ <strong>Operational Disruption Notice:</strong> {centre.disruptionAlert}
          </div>
        )}

        <div className="detail-grid" style={{ gap: '14px 16px', marginBottom: 16 }}>
          <div className="detail-item">
            <div className="dl">Mandi Location / Village</div>
            <div className="dv">{centre.village}, {centre.district}</div>
          </div>
          <div className="detail-item">
            <div className="dl">PIN Code</div>
            <div className="dv mono">{centre.pin}</div>
          </div>
          <div className="detail-item">
            <div className="dl">Full Address</div>
            <div className="dv" style={{ fontSize: 13 }}>{centre.address}</div>
          </div>
          <div className="detail-item">
            <div className="dl">Helpline Contact</div>
            <div className="dv mono">{centre.contactNumber}</div>
          </div>
          <div className="detail-item">
            <div className="dl">Operating Hours</div>
            <div className="dv mono">{centre.operatingHours}</div>
          </div>
          <div className="detail-item">
            <div className="dl">Slot Duration</div>
            <div className="dv mono">{centre.slotDuration}</div>
          </div>
          <div className="detail-item">
            <div className="dl">Processing Counters</div>
            <div className="dv mono">{centre.numberOfCounters} Active Counters</div>
          </div>
          <div className="detail-item">
            <div className="dl">Weighbridges & Scales</div>
            <div className="dv mono">{centre.weighingScales} Calibrated Scales</div>
          </div>
          <div className="detail-item">
            <div className="dl">Max Daily Farmer Capacity</div>
            <div className="dv mono">{centre.dailyFarmerCapacity} Farmers / Day</div>
          </div>
          <div className="detail-item">
            <div className="dl">Max Daily Grain Throughput</div>
            <div className="dv mono">{centre.dailyQuantityCapacity} Quintals / Day</div>
          </div>
          <div className="detail-item">
            <div className="dl">Storage Warehouse Cap</div>
            <div className="dv mono">{centre.storageCapQtl} Quintals</div>
          </div>
          <div className="detail-item">
            <div className="dl">Live Wait Time</div>
            <div className="dv mono" style={{ color: 'var(--accent)', fontWeight: 700 }}>~{estWaitMins} Mins</div>
          </div>
        </div>

        <div className="divider"></div>

        <div className="btn-row" style={{ marginTop: 12 }}>
          <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>
            Close
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 1.5, justifyContent: 'center' }}
            disabled={centre.operatingStatus !== 'OPEN' || remainingCap <= 0}
            onClick={() => {
              onClose();
              if (onSelectForBooking) onSelectForBooking(centre);
            }}
          >
            📅 Select Centre & Book Slot
          </button>
        </div>
      </div>
    </div>
  );
}
