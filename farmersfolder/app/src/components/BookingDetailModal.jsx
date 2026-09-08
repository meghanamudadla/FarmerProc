import { centreById, SLOT_TIMES } from '../data/domain.js';
import QR from './QR.jsx';

export default function BookingDetailModal({
  t, lang, detailBooking, setDetailBookingId, queueTick, peopleAhead, estWaitMin,
  bookingCropLabel, simulateArrival, openReschedule, completeProcurement,
}) {
  if (!detailBooking) return null;

  return (
    <div className="modal-overlay" onClick={() => setDetailBookingId(null)}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--ink-muted)', fontWeight: 700, marginBottom: 4 }}>
              {lang === 'en' ? 'Booking Details' : 'బుకింగ్ వివరాలు'}
            </div>
            <div className="mono" style={{ fontSize: 19, fontWeight: 700 }}>
              {detailBooking.token}
            </div>
          </div>
          <button className="modal-close" onClick={() => setDetailBookingId(null)}>
            ✕
          </button>
        </div>

        <span className={'badge ' + (detailBooking.status === 'booked' ? 'success' : detailBooking.status === 'cancelled' ? 'critical' : 'neutral')} style={{ marginBottom: 16, display: 'inline-flex' }}>
          <span className="badge-dot"></span>
          {detailBooking.status === 'booked' ? (lang === 'en' ? 'Booked' : 'బుక్ అయింది') : detailBooking.status === 'cancelled' ? (lang === 'en' ? 'Cancelled' : 'రద్దు') : lang === 'en' ? 'Completed' : 'పూర్తయింది'}
        </span>

        <div className="detail-grid">
          <div className="detail-item">
            <div className="dl">{t.crop}</div>
            <div className="dv">{bookingCropLabel(detailBooking)}</div>
          </div>
          <div className="detail-item">
            <div className="dl">{t.expectedQty.replace(' (Qtl)', '').replace(' (క్వింటాళ్లు)', '')}</div>
            <div className="dv mono">
              {detailBooking.qty} {lang === 'en' ? 'Qtl' : 'క్వి'}
            </div>
          </div>
          <div className="detail-item">
            <div className="dl">{t.centre}</div>
            <div className="dv">{centreById(detailBooking.centreId)[lang]}</div>
          </div>
          <div className="detail-item">
            <div className="dl">{t.date}</div>
            <div className="dv mono">{detailBooking.date}</div>
          </div>
          <div className="detail-item">
            <div className="dl">{t.timeSlot}</div>
            <div className="dv">{SLOT_TIMES[detailBooking.slotIdx]}</div>
          </div>
          <div className="detail-item">
            <div className="dl">{lang === 'en' ? 'Farmer Arrival' : 'రైతు రాక సమయం'}</div>
            <div className="dv">
              {detailBooking.checkedIn ? detailBooking.arrivalTime : <span style={{ color: 'var(--warn)' }}>{lang === 'en' ? 'Not arrived yet' : 'ఇంకా చేరుకోలేదు'}</span>}
            </div>
          </div>

          {detailBooking.status === 'booked' && (
            <>
              <div className="detail-item">
                <div className="dl">{t.currentlyServing}</div>
                <div className="dv mono">PDC-A{String(100 + queueTick).slice(-3)}</div>
              </div>
              <div className="detail-item">
                <div className="dl">{t.peopleAhead}</div>
                <div className="dv mono">{peopleAhead}</div>
              </div>
              <div className="detail-item">
                <div className="dl">{t.estWaitTime}</div>
                <div className="dv mono">
                  ~{estWaitMin} {t.mins}
                </div>
              </div>
            </>
          )}

          <div className="detail-item">
            <div className="dl">
              {t.estPrice}
              {detailBooking.cropCustom && (lang === 'en' ? ' (provisional)' : ' (తాత్కాలిక)')}
            </div>
            <div className="dv mono" style={{ color: 'var(--success)' }}>
              ₹{detailBooking.price.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="detail-item">
            <div className="dl">{lang === 'en' ? 'Payment Status' : 'చెల్లింపు స్థితి'}</div>
            <div className="dv">
              {detailBooking.paymentStatus === 'credited' ? (
                <span style={{ color: 'var(--success)' }}>{t.payStage5}</span>
              ) : detailBooking.paymentStatus === 'processing' ? (
                <span style={{ color: 'var(--warn)' }}>{t.payStage4}</span>
              ) : detailBooking.paymentStatus === 'verified' ? (
                <span style={{ color: 'var(--warn)' }}>{t.payStage3}</span>
              ) : detailBooking.paymentStatus === 'initiated' ? (
                <span style={{ color: 'var(--warn)' }}>{t.payStage2}</span>
              ) : detailBooking.paymentStatus === 'pending_verification' ? (
                <span style={{ color: 'var(--ink-muted)' }}>{lang === 'en' ? 'Awaiting rate confirmation' : 'ధర నిర్ధారణ కోసం వేచి ఉంది'}</span>
              ) : (
                <span style={{ color: 'var(--ink-muted)' }}>{lang === 'en' ? 'Not applicable' : 'వర్తించదు'}</span>
              )}
            </div>
          </div>
          {detailBooking.paymentMethod && detailBooking.status !== 'cancelled' && (
            <div className="detail-item">
              <div className="dl">{t.disbursalMethod}</div>
              <div className="dv">{detailBooking.paymentMethod}</div>
            </div>
          )}
        </div>

        {detailBooking.status === 'booked' && !detailBooking.checkedIn && (
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginBottom: 10 }} onClick={() => simulateArrival(detailBooking.id)}>
            📍 {lang === 'en' ? 'Simulate Arrival (QR Check-in)' : 'రాక సిమ్యులేట్ చేయండి'}
          </button>
        )}
        {detailBooking.status === 'booked' && !detailBooking.checkedIn && (
          <button
            className="btn btn-ghost"
            style={{ width: '100%', justifyContent: 'center', marginBottom: 10 }}
            onClick={() => {
              setDetailBookingId(null);
              openReschedule(detailBooking);
            }}
          >
            {t.reschedule}
          </button>
        )}
        {detailBooking.status !== 'completed' && detailBooking.status !== 'cancelled' && completeProcurement && (
          <button
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginBottom: 10, background: 'var(--accent)' }}
            onClick={() => {
              completeProcurement(detailBooking.id);
              setDetailBookingId(null);
            }}
          >
            ⚖️ {lang === 'en' ? `Finalize Weighment & Complete Procurement (${detailBooking.qty} Qtl)` : `తూకం ఖరారు చేయండి (${detailBooking.qty} క్వి)`}
          </button>
        )}
        {detailBooking.status === 'booked' && (
          <div className="qr-box" style={{ marginTop: 4 }}>
            <QR value={detailBooking.token} size={110} />
          </div>
        )}
      </div>
    </div>
  );
}
