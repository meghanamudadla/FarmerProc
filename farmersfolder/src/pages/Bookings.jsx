import { useState, useMemo } from 'react';
import { centreById, CROPS } from '../data/domain.js';

export default function Bookings({
  t,
  lang,
  bookings = [],
  setDetailBookingId,
  bookingCropLabel,
  setPage,
  farmer,
  onAddComplaint,
  onRemoveSampleData,
  onOpenReceipt,
  onOpenGrievance,
  onCancelBooking,
}) {
  const [cropFilter, setCropFilter] = useState('ALL');
  const [centreFilter, setCentreFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const hasDemoSamples = bookings.some((b) => b.isDemoProcessSample);

  const availableCrops = useMemo(() => {
    const list = [];
    const seen = new Set();
    bookings.forEach((b) => {
      const label = bookingCropLabel ? bookingCropLabel(b) : (b.cropLabel || b.cropId);
      const val = b.cropId || b.cropLabel || label;
      if (val && !seen.has(val)) {
        seen.add(val);
        list.push({ id: val, label });
      }
    });
    return list;
  }, [bookings, bookingCropLabel]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const label = bookingCropLabel ? bookingCropLabel(b) : (b.cropLabel || b.cropId);
      const matchCrop = cropFilter === 'ALL' || b.cropId === cropFilter || b.cropLabel === cropFilter || label === cropFilter;
      const matchCentre = centreFilter === 'ALL' || b.centreId === centreFilter;
      const matchStatus = statusFilter === 'ALL' || (b.status || '').toUpperCase() === statusFilter;
      return matchCrop && matchCentre && matchStatus;
    });
  }, [bookings, cropFilter, centreFilter, statusFilter, bookingCropLabel]);

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      {/* Title & Stats */}
      <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2>📜 {t.nav?.bookings || 'Procurement History & Transactions'}</h2>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Immutable verified records connecting Booking, Weighing, Digital Receipts, and DBT Payouts
          </div>
        </div>

        {hasDemoSamples && onRemoveSampleData && (
          <button
            className="btn btn-ghost"
            style={{ fontSize: 12, border: '1px solid var(--border)', padding: '5px 12px', borderRadius: 6 }}
            onClick={onRemoveSampleData}
            title="Remove temporary demonstration process samples and keep only your original bookings"
          >
            🗑️ Remove Sample Data
          </button>
        )}
      </div>

      {/* Demo Process Stage Guidance Banner */}
      {hasDemoSamples && (
        <div style={{
          background: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          borderRadius: 8,
          padding: '10px 14px',
          marginBottom: 14,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 12.5,
          color: 'var(--text-main)',
        }}>
          <div>
            💡 <strong>Process Guide:</strong> Demonstration records are added below along with your original booking to illustrate the 4 procurement stages (<strong>Booked</strong> → <strong>Yard Waiting</strong> → <strong>Weighbridge Processing</strong> → <strong>Completed with Receipt & DBT Payout</strong>).
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="card" style={{ padding: '12px 16px', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Crop Filter */}
          <div style={{ flex: 1, minWidth: 140 }}>
            <label style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>FILTER CROP</label>
            <select className="input-select" value={cropFilter} onChange={(e) => setCropFilter(e.target.value)} style={{ width: '100%', fontSize: 12.5 }}>
              <option value="ALL">All Crops ({bookings.length})</option>
              {availableCrops.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Centre Filter */}
          <div style={{ flex: 1, minWidth: 160 }}>
            <label style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>FILTER MANDI</label>
            <select className="input-select" value={centreFilter} onChange={(e) => setCentreFilter(e.target.value)} style={{ width: '100%', fontSize: 12.5 }}>
              <option value="ALL">All Centres</option>
              <option value="c1">Sri Lakshmi Centre (Kakinada)</option>
              <option value="c2">Godavari Green Centre (Samalkota)</option>
              <option value="c3">East Godavari Mandi (Rajahmundry)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div style={{ flex: 1, minWidth: 130 }}>
            <label style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>STATUS</label>
            <select className="input-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: '100%', fontSize: 12.5 }}>
              <option value="ALL">All Statuses</option>
              <option value="BOOKED">BOOKED</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="card table-wrap" style={{ padding: 0 }}>
        {filteredBookings.length === 0 ? (
          <div className="empty-note" style={{ padding: 24 }}>No transactions found matching the selected filters.</div>
        ) : (
          <table className="table" style={{ width: '100%', fontSize: 13 }}>
            <thead>
              <tr>
                <th>{t.col.token}</th>
                <th>{t.col.crop}</th>
                <th>{t.col.centre}</th>
                <th>{t.col.date}</th>
                <th>Procurement Value</th>
                <th>{t.col.status}</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map((b) => {
                const isCompleted = b.status === 'completed';
                const isCancelled = b.status === 'cancelled';
                const centre = centreById(b.centreId);

                return (
                  <tr key={b.id} className="clickable-row" onClick={() => setDetailBookingId(b.id)}>
                    <td className="mono font-bold">
                      {b.token}
                      {b.isOriginalUserBooking || b.token === 'PDC-62F388' ? (
                        <span style={{ fontSize: 9.5, padding: '2px 6px', borderRadius: 4, background: 'rgba(34, 197, 94, 0.18)', color: 'var(--success, #16a34a)', marginLeft: 8, fontWeight: 700, letterSpacing: '.03em', display: 'inline-block' }}>
                          YOUR BOOKING
                        </span>
                      ) : b.isDemoProcessSample ? (
                        <span style={{ fontSize: 9.5, padding: '2px 6px', borderRadius: 4, background: 'rgba(234, 179, 8, 0.18)', color: '#d97706', marginLeft: 8, fontWeight: 700, letterSpacing: '.03em', display: 'inline-block' }}>
                          SAMPLE
                        </span>
                      ) : null}
                    </td>
                    <td>
                      {bookingCropLabel(b)} · <b>{b.qty} Qtl</b>
                    </td>
                    <td>{centre ? centre[lang] : b.centreId}</td>
                    <td className="mono">{b.date}</td>
                    <td className="mono" style={{ fontWeight: 600, color: isCancelled ? 'var(--text-muted)' : 'var(--text-main)' }}>
                      ₹{(b.price || 0).toLocaleString('en-IN')}
                    </td>
                    <td>
                      <span className={`status-badge ${isCompleted ? 'completed' : isCancelled ? 'cancelled' : 'processing'}`}>
                        {(b.status || 'BOOKED').toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                        {isCompleted && (
                          <button
                            className="btn btn-ghost"
                            style={{ padding: '5px 10px', fontSize: 12, fontWeight: 600 }}
                            onClick={() => {
                              if (onOpenReceipt) onOpenReceipt(b);
                            }}
                          >
                            📄 View Receipt
                          </button>
                        )}

                        {b.status === 'booked' && (
                          <button
                            className="btn btn-ghost"
                            style={{ padding: '5px 10px', fontSize: 12, color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.3)', fontWeight: 600 }}
                            title="Cancel this booking and restore your crop quota"
                            onClick={() => {
                              if (window.confirm(`Cancel booking ${b.token}? Your crop quota will be restored.`)) {
                                if (onCancelBooking) onCancelBooking(b);
                              }
                            }}
                          >
                            🗑️ Cancel
                          </button>
                        )}

                        <button
                          className="btn btn-ghost"
                          style={{ padding: '5px 10px', fontSize: 12, color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.3)', fontWeight: 600 }}
                          title="Raise Grievance for this transaction"
                          onClick={() => {
                            if (onOpenGrievance) onOpenGrievance(b.token);
                            else setPage('grievances');
                          }}
                        >
                          🚨 Grievance
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
