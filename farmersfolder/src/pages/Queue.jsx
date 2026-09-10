import { useState } from 'react';
import BookingTicketCard from '../components/BookingTicketCard.jsx';
import GateScannerModal from '../components/GateScannerModal.jsx';
import QueueStatusCard from '../components/QueueStatusCard.jsx';
import MandiOperatorPanel from '../components/MandiOperatorPanel.jsx';
import ProcurementReceiptCard from '../components/ProcurementReceiptCard.jsx';

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
                ₹{activeBooking.price.toLocaleString('en-IN')}
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
