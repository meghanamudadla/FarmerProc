import { SLOT_TIMES } from '../data/domain.js';

export default function RescheduleModal({
  t, lang, rescheduleBooking, rescheduleDate, setRescheduleDate,
  rescheduleSlotIdx, setRescheduleSlotIdx, spotsLeft, confirmReschedule, setRescheduleBookingId,
}) {
  if (!rescheduleBooking) return null;

  return (
    <div className="modal-overlay" onClick={() => setRescheduleBookingId(null)}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--ink-muted)', fontWeight: 700, marginBottom: 4 }}>{t.reschedule}</div>
            <div className="mono" style={{ fontSize: 19, fontWeight: 700 }}>
              {rescheduleBooking.token}
            </div>
          </div>
          <button className="modal-close" onClick={() => setRescheduleBookingId(null)}>
            ✕
          </button>
        </div>

        <div style={{ fontSize: 13, color: 'var(--ink-muted)', marginBottom: 14 }}>
          {lang === 'en'
            ? `Current slot: ${rescheduleBooking.date} · ${SLOT_TIMES[rescheduleBooking.slotIdx]}`
            : `ప్రస్తుత స్లాట్: ${rescheduleBooking.date} · ${SLOT_TIMES[rescheduleBooking.slotIdx]}`}
        </div>

        <div className="field">
          <label>{t.preferredDate}</label>
          <input
            type="date"
            value={rescheduleDate}
            onChange={(e) => {
              setRescheduleDate(e.target.value);
              setRescheduleSlotIdx(null);
            }}
          />
        </div>

        <div className="label" style={{ marginBottom: 2 }}>
          {t.selectTimeSlot}
        </div>
        <div className="slot-grid">
          {SLOT_TIMES.map((time, idx) => {
            const isCurrent = rescheduleDate === rescheduleBooking.date && idx === rescheduleBooking.slotIdx;
            const left = spotsLeft(rescheduleBooking.centreId, rescheduleDate, idx) + (isCurrent ? 1 : 0);
            const isFull = left <= 0;
            return (
              <button key={idx} disabled={isFull} className={'slot-card' + (rescheduleSlotIdx === idx ? ' selected' : '') + (isFull ? ' full' : '')} onClick={() => setRescheduleSlotIdx(idx)}>
                <div className="slot-time">{time}</div>
                <div className={'slot-spots' + (isFull ? ' none' : left <= 5 ? ' low' : '')}>{isCurrent ? (lang === 'en' ? 'Current slot' : 'ప్రస్తుత స్లాట్') : isFull ? t.full : t.spotsLeft(left)}</div>
              </button>
            );
          })}
        </div>

        <div className="btn-row" style={{ marginTop: 14 }}>
          <button className="btn btn-ghost" onClick={() => setRescheduleBookingId(null)}>
            {t.back}
          </button>
          <button
            className="btn btn-primary"
            disabled={rescheduleSlotIdx == null || (rescheduleDate === rescheduleBooking.date && rescheduleSlotIdx === rescheduleBooking.slotIdx)}
            onClick={confirmReschedule}
          >
            {lang === 'en' ? 'Confirm Reschedule' : 'రీషెడ్యూల్ నిర్ధారించండి'} ✓
          </button>
        </div>
      </div>
    </div>
  );
}
