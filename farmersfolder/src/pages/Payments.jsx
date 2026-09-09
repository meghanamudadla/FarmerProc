import { useState } from 'react';
import { PAY_SEQUENCE } from '../data/domain.js';
import PaymentTrackerCard from '../components/PaymentTrackerCard.jsx';

export default function Payments({ t, lang, activeBooking, bookings = [], totalValue, farmer, onUpdateBookingStatus, onOpenReceipt }) {
  const [selectedReceiptBooking, setSelectedReceiptBooking] = useState(null);

  const completedOrActiveBookings = bookings.filter((b) => b.status !== 'cancelled');

  function handleRetryPayment(bookingId) {
    if (onUpdateBookingStatus) {
      const b = bookings.find((x) => x.id === bookingId);
      if (b) {
        onUpdateBookingStatus({
          ...b,
          paymentStatus: 'payment_initiated',
          failureReason: null,
          failureRefId: null,
        });
      }
    }
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      {/* Active / Recent DBT Payment Tracker */}
      {activeBooking && (
        <div style={{ marginBottom: 20 }}>
          <PaymentTrackerCard
            t={t}
            lang={lang}
            booking={activeBooking}
            farmer={farmer}
            onViewReceipt={(b) => (onOpenReceipt ? onOpenReceipt(b) : setSelectedReceiptBooking(b))}
            onRetryPayment={handleRetryPayment}
          />
        </div>
      )}

      {/* Financial Summary & Transactions Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 17 }}>🏦 {t.paymentSummary || 'Procurement Payments & DBT Disbursals'}</h3>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Official direct benefit transfer history to verified bank accounts
            </div>
          </div>
          <div className="mono" style={{ fontSize: 24, fontWeight: 700, color: 'var(--success)' }}>
            ₹{totalValue.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="table-wrap">
          <table className="table" style={{ width: '100%', fontSize: 13 }}>
            <thead>
              <tr>
                <th>{t.col.token}</th>
                <th>Amount</th>
                <th>Disbursal Route</th>
                <th>DBT Stage</th>
                <th>Digital Receipt</th>
              </tr>
            </thead>
            <tbody>
              {completedOrActiveBookings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="empty-note">No payment transactions recorded yet.</td>
                </tr>
              ) : (
                completedOrActiveBookings.map((b) => {
                  const isCredited = b.paymentStatus === 'credited';
                  const isFailed = b.paymentStatus === 'payment_failed';

                  return (
                    <tr key={b.id}>
                      <td className="mono font-bold">{b.token}</td>
                      <td className="mono" style={{ fontWeight: 600 }}>₹{(b.price || 0).toLocaleString('en-IN')}</td>
                      <td>{b.paymentMethod || 'Direct DBT'}</td>
                      <td>
                        <span className={`status-badge ${isCredited ? 'completed' : isFailed ? 'cancelled' : 'processing'}`}>
                          {(b.paymentStatus || 'Initiated').toUpperCase().replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: '4px 10px', fontSize: 11.5 }}
                          onClick={() => (onOpenReceipt ? onOpenReceipt(b) : setSelectedReceiptBooking(b))}
                        >
                          📄 View Receipt
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
