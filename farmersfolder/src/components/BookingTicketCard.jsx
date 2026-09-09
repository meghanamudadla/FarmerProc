import { centreById, SLOT_TIMES } from '../data/domain.js';
import QR from './QR.jsx';
import { CheckInService } from '../services/checkInService.js';

export default function BookingTicketCard({
  t, lang, booking, farmer, cropLabel, onSimulateCheckIn,
}) {
  if (!booking) return null;

  const centreObj = centreById(booking.centreId);
  const centreName = centreObj ? (centreObj[lang] || centreObj.en) : booking.centreId;
  const timeSlotStr = booking.slotIdx != null ? SLOT_TIMES[booking.slotIdx] : '—';
  
  // SECURE QR PAYLOAD: Contains ONLY booking ID + Token. Sensitive PII (Aadhaar, Bank) is strictly omitted.
  const secureQrPayload = CheckInService.generateSecureQrPayload(booking.id, booking.token);

  function handleDownloadPass() {
    alert(`Downloading Official Gate Pass for Token ${booking.token}...\n\nFarmer: ${farmer?.name || 'Farmer'}\nCentre: ${centreName}\nDate: ${booking.date}`);
  }

  return (
    <div className="card pad-lg" style={{ border: '2px solid var(--accent)', background: 'var(--surface)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-muted)', fontWeight: 700 }}>
            Official Mandi Gate Pass Ticket
          </div>
          <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)' }}>
            {booking.token}
          </div>
        </div>

        <span className={`badge ${booking.checkedIn ? 'success' : booking.status === 'cancelled' ? 'critical' : 'warn'}`}>
          <span className="badge-dot"></span>
          {booking.checkedIn ? 'CHECKED_IN' : booking.status.toUpperCase()}
        </span>
      </div>

      {/* QR Code Section */}
      <div className="qr-box" style={{ background: 'var(--surface-2)', padding: 16, borderRadius: 12, marginBottom: 16 }}>
        <QR value={secureQrPayload} size={140} />
        <div style={{ fontSize: 11, color: 'var(--ink-muted)', textAlign: 'center', marginTop: 4 }}>
          🔒 <strong>Secure Encrypted Reference:</strong> Contains only token reference string.
        </div>
      </div>

      {/* Ticket Details */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 14px', fontSize: 13, marginBottom: 14 }}>
        <div>
          <div className="label">{t.fullName || 'Farmer Name'}</div>
          <div style={{ fontWeight: 600 }}>{farmer?.name || 'Ravi Kumar'}</div>
        </div>
        <div>
          <div className="label">Farmer ID</div>
          <div className="mono" style={{ fontWeight: 600 }}>{farmer?.farmerId || 'FARM-91234567'}</div>
        </div>
        <div>
          <div className="label">{t.crop || 'Crop'}</div>
          <div style={{ fontWeight: 600 }}>{cropLabel || 'Crop'} ({booking.qty} Qtl)</div>
        </div>
        <div>
          <div className="label">{t.centre || 'Centre'}</div>
          <div style={{ fontWeight: 600 }}>{centreName}</div>
        </div>
        <div>
          <div className="label">{t.date || 'Scheduled Date'}</div>
          <div className="mono" style={{ fontWeight: 600 }}>{booking.date}</div>
        </div>
        <div>
          <div className="label">{t.timeSlot || 'Time Slot'}</div>
          <div className="mono" style={{ fontWeight: 600 }}>{timeSlotStr}</div>
        </div>
      </div>

      <div className="divider" style={{ margin: '8px 0' }}></div>

      {/* Actions */}
      <div className="btn-row" style={{ marginTop: 10 }}>
        <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={handleDownloadPass}>
          📥 {t.downloadGatePass || 'Download Pass'}
        </button>

        {!booking.checkedIn && (
          <button className="btn btn-primary" style={{ flex: 1.2, justifyContent: 'center' }} onClick={() => onSimulateCheckIn(booking)}>
            📍 Gate QR Check-In
          </button>
        )}
      </div>
    </div>
  );
}
