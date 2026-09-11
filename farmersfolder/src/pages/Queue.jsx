import { useState } from 'react';
import { centreById } from '../data/domain.js';
import BookingTicketCard from '../components/BookingTicketCard.jsx';
import GateScannerModal from '../components/GateScannerModal.jsx';
import QueueStatusCard from '../components/QueueStatusCard.jsx';
import MandiOperatorPanel from '../components/MandiOperatorPanel.jsx';
import ProcurementReceiptCard from '../components/ProcurementReceiptCard.jsx';

const STATUS_BADGE_CLASS = {
  booked: 'neutral',
  waiting: 'warn',
  processing: 'warn',
  completed: 'success',
  cancelled: 'critical',
};

export default function Queue({
  t, lang, farmer, bookings, activeBooking,
  bookingCropLabel, openReschedule, cancelActiveBooking, onCheckInSuccess, onUpdateBookingStatus, onResetQueueData,
}) {
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      {!activeBooking ? (
        <div className="card empty-note">{t.noBookings}</div>
      ) : (
        <div>
          {/* Phase 6 Real-Time Queue Status Card */}
          <QueueStatusCard
            t={t}
            lang={lang}
            activeBooking={activeBooking}
            queueList={bookings}
          />

          {/* Phase 7 Certified Procurement & Weighing Slip */}
          {activeBooking.status === 'completed' && (
            <div style={{ marginTop: 16 }}>
              <ProcurementReceiptCard
                t={t}
                lang={lang}
                booking={activeBooking}
                farmer={farmer}
              />
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            {/* Phase 5 Secure Booking Ticket */}
            <BookingTicketCard
              t={t}
              lang={lang}
              booking={activeBooking}
              farmer={farmer}
              cropLabel={bookingCropLabel(activeBooking)}
              onSimulateCheckIn={() => setIsScannerOpen(true)}
            />

            <div className="card" style={{ marginTop: 14 }}>
              <div className="label">
                {t.estPrice}
                {activeBooking.cropCustom && (
                  <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}> · provisional estimate</span>
                )}
              </div>
              <div className="mono" style={{ fontSize: 20, fontWeight: 600, color: 'var(--success)' }}>
                {activeBooking.price != null
                  ? `₹${activeBooking.price.toLocaleString('en-IN')}`
                  : 'Pending weighbridge & quality check'}
              </div>

              <div className="btn-row" style={{ marginTop: 12 }}>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => setIsScannerOpen(true)}
                >
                  📷 Open Mandi Officer Gate Scanner
                </button>
                <button className="btn btn-ghost" onClick={() => openReschedule(activeBooking)}>
                  {t.reschedule}
                </button>
                <button className="btn btn-danger" onClick={cancelActiveBooking}>
                  {t.cancelBooking}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* All tokens, every status — not just the single active one above */}
      {bookings && bookings.length > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="section-title" style={{ marginBottom: 10 }}>
            <h3 style={{ fontSize: 15 }}>🗂️ All Your Tokens ({bookings.length})</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {bookings.map((b) => {
              const centre = centreById(b.centreId);
              const isActive = activeBooking && b.id === activeBooking.id;
              return (
                <div
                  key={b.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 8,
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: isActive ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                    background: isActive ? 'var(--accent-soft)' : 'var(--surface)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13.5 }} className="mono">
                      {b.token}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 2 }}>
                      {bookingCropLabel ? bookingCropLabel(b) : b.cropLabel} · {b.qty} Qtl · {centre ? (centre[lang] || centre.en) : ''} · {b.date}
                    </div>
                  </div>
                  <span className={`badge ${STATUS_BADGE_CLASS[b.status] || 'neutral'}`} style={{ fontSize: 11, fontWeight: 700 }}>
                    {(b.status || 'booked').toUpperCase()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Gate Scanner Simulator Modal */}
      <GateScannerModal
        t={t}
        lang={lang}
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        bookings={bookings}
        farmer={farmer}
        onCheckInSuccess={onCheckInSuccess}
      />
    </div>
  );
}
