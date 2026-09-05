import { centreById, SLOT_TIMES } from '../data/domain.js';
import QR from '../components/QR.jsx';

export default function Queue({
  t, lang, activeBooking, peopleAhead, estWaitMin, queueTick,
  bookingCropLabel, openReschedule, cancelActiveBooking,
}) {
  return (
    <div style={{ maxWidth: 520 }}>
      {!activeBooking ? (
        <div className="card empty-note">{t.noBookings}</div>
      ) : (
        <div className="queue-panel">
          <div style={{ fontSize: 12, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '.06em' }}>{t.liveQueueStatus}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 600, marginTop: 6 }}>{activeBooking.token}</div>
          <div className="queue-row">
            <div>
              <div className="queue-label">{t.currentlyServing}</div>
              <div className="queue-num">PDC-A{String(100 + queueTick).slice(-3)}</div>
            </div>
            <div>
              <div className="queue-label">{t.peopleAhead}</div>
              <div className="queue-num">{peopleAhead}</div>
            </div>
            <div>
              <div className="queue-label">{t.estWaitTime}</div>
              <div className="queue-num">
                ~{estWaitMin} {t.mins}
              </div>
            </div>
          </div>
        </div>
      )}
      {activeBooking && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="qr-box">
            <QR value={activeBooking.token} />
            <button className="btn btn-ghost">{t.downloadGate}</button>
          </div>
          <div className="divider"></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px', fontSize: 13 }}>
            <div>
              <div className="label" style={{ marginBottom: 2 }}>
                {t.crop}
              </div>
              {bookingCropLabel(activeBooking)} ({activeBooking.qty} Qtl)
            </div>
            <div>
              <div className="label" style={{ marginBottom: 2 }}>
                {t.centre}
              </div>
              {centreById(activeBooking.centreId)[lang]}
            </div>
            <div>
              <div className="label" style={{ marginBottom: 2 }}>
                {t.date}
              </div>
              {activeBooking.date}
            </div>
            <div>
              <div className="label" style={{ marginBottom: 2 }}>
                {t.timeSlot}
              </div>
              {SLOT_TIMES[activeBooking.slotIdx]}
            </div>
          </div>
          <div className="divider"></div>
          <div className="label">
            {t.estPrice}
            {activeBooking.cropCustom && (
              <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}> · {lang === 'en' ? 'provisional estimate' : 'తాత్కాలిక అంచనా'}</span>
            )}
          </div>
          <div className="mono" style={{ fontSize: 20, fontWeight: 600, color: 'var(--success)' }}>
            ₹{activeBooking.price.toLocaleString('en-IN')}
          </div>
          {activeBooking.cropCustom && (
            <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 2 }}>
              {lang === 'en' ? 'Not on the MSP list — centre officer confirms the final rate on arrival.' : 'MSP జాబితాలో లేదు — కేంద్ర అధికారి చేరుకున్నప్పుడు తుది ధరను నిర్ధారిస్తారు.'}
            </div>
          )}
          <div className="btn-row">
            <button className="btn btn-danger" onClick={cancelActiveBooking}>
              {t.cancelBooking}
            </button>
            <button className="btn btn-ghost" onClick={() => openReschedule(activeBooking)}>
              {t.reschedule}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
