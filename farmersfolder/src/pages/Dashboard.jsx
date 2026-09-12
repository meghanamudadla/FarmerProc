import StatTile from '../components/StatTile.jsx';
import { centreById, SLOT_TIMES } from '../data/domain.js';

export default function Dashboard({
  t, lang, activeBooking, peopleAhead, estWaitMin, previousBookings,
  setPage, setDetailBookingId, bookingCropLabel, totalValue, paidValue, pendingValue,
  crops = [], farmer,
}) {
  const activeCrops = crops.filter((c) => c.status !== 'INACTIVE');

  return (
    <>
      <div className="grid-3">
        <StatTile label={t.activeBooking} value={activeBooking ? activeBooking.token : '—'} icon="bookings" iconTone="violet" />
        <StatTile label={t.queuePosition} value={activeBooking ? `${peopleAhead} ${t.ahead}` : '—'} tone="accent" icon="queue" iconTone="amber" />
        <StatTile label={t.estWait} value={activeBooking ? `~${estWaitMin} ${t.mins}` : '—'} icon="clock" iconTone="teal" />
      </div>

      <div className="grid-2">
        <div>
          <div className="section-title">
            <h2>{lang === 'en' ? 'Active Booking' : 'యాక్టివ్ బుకింగ్'}</h2>
          </div>
          {!activeBooking ? (
            <div className="card empty-note">{t.noBookings}</div>
          ) : (
            <button className="card active-booking-card" onClick={() => setDetailBookingId(activeBooking.id)}>
              <div className="ab-top">
                <span className="mono ab-token">{activeBooking.token}</span>
                <span className={'badge ' + (activeBooking.checkedIn ? 'success' : 'warn')}>
                  <span className="badge-dot"></span>
                  {activeBooking.checkedIn ? (lang === 'en' ? 'Arrived' : 'చేరుకున్నారు') : lang === 'en' ? 'Scheduled' : 'షెడ్యూల్'}
                </span>
              </div>
              <div className="ab-crop">
                {bookingCropLabel(activeBooking)} · {activeBooking.qty} {lang === 'en' ? 'Qtl' : 'క్వి'}
              </div>
              <div className="ab-meta">
                {centreById(activeBooking.centreId)[lang]} · {activeBooking.date} · {activeBooking.slotLabel || SLOT_TIMES[activeBooking.slotIdx]}
              </div>
              <div className="ab-foot">
                <span>
                  {t.peopleAhead}: <b className="mono">{peopleAhead}</b>
                </span>
                <span>
                  {t.estWaitTime}:{' '}
                  <b className="mono">
                    ~{estWaitMin} {t.mins}
                  </b>
                </span>
                <span className="ab-viewmore">{lang === 'en' ? 'View full details' : 'పూర్తి వివరాలు'} →</span>
              </div>
            </button>
          )}

          <div className="section-title" style={{ marginTop: 20 }}>
            <h2>{lang === 'en' ? 'Previous Bookings' : 'మునుపటి బుకింగ్‌లు'}</h2>
            <button className="link" onClick={() => setPage('bookings')}>
              {t.viewAll}
            </button>
          </div>
          <div className="card table-wrap">
            {previousBookings.length === 0 ? (
              <div className="empty-note">{lang === 'en' ? 'No previous bookings yet.' : 'ఇంకా మునుపటి బుకింగ్‌లు లేవు.'}</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>{t.col.token}</th>
                    <th>{t.col.crop}</th>
                    <th>{t.col.centre}</th>
                    <th>{t.col.date}</th>
                    <th>{t.col.status}</th>
                  </tr>
                </thead>
                <tbody>
                  {previousBookings.slice(0, 4).map((b) => (
                    <tr key={b.id} className="clickable-row" onClick={() => setDetailBookingId(b.id)}>
                      <td className="mono">{b.token}</td>
                      <td>{bookingCropLabel(b)}</td>
                      <td>{centreById(b.centreId)[lang]}</td>
                      <td className="mono">{b.date}</td>
                      <td>
                        <span className={'badge ' + (b.status === 'booked' ? 'success' : b.status === 'cancelled' ? 'critical' : 'neutral')}>
                          <span className="badge-dot"></span>
                          {b.status === 'booked' ? (lang === 'en' ? 'Booked' : 'బుక్ అయింది') : b.status === 'cancelled' ? (lang === 'en' ? 'Cancelled' : 'రద్దు') : lang === 'en' ? 'Completed' : 'పూర్తయింది'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div>
          {/* Payment Summary */}
          <div className="section-title">
            <h2>{t.paymentSummary}</h2>
          </div>
          <div className="card">
            <div className="label" style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--ink-muted)', fontWeight: 600 }}>
              {t.totalValue}
            </div>
            <div className="mono" style={{ fontSize: 23, fontWeight: 600, margin: '6px 0 14px' }}>
              ₹{totalValue.toLocaleString('en-IN')}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="badge-dot" style={{ background: 'var(--success)', width: 8, height: 8, borderRadius: '50%', display: 'inline-block' }}></span>
                {t.paid}
              </span>
              <span className="mono">₹{paidValue.toLocaleString('en-IN')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 14 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ background: 'var(--warn)', width: 8, height: 8, borderRadius: '50%', display: 'inline-block' }}></span>
                {t.pending}
              </span>
              <span className="mono">₹{pendingValue.toLocaleString('en-IN')}</span>
            </div>
            <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setPage('payments')}>
              {t.viewTx}
            </button>
          </div>

          {/* PART 27: Registered Crops Summary on Dashboard */}
          <div className="section-title" style={{ marginTop: 20 }}>
            <h2>{lang === 'en' ? 'Registered Crops' : 'నమోదైన పంటలు'}</h2>
            <span className="badge" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: 11, fontWeight: 700 }}>
              {activeCrops.length} {lang === 'en' ? 'Registered' : 'నమోదు'}
            </span>
          </div>
          <div className="card">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activeCrops.length === 0 ? (
                <div className="empty-note" style={{ padding: '10px 0', textAlign: 'center' }}>
                  No crops registered yet.
                </div>
              ) : (
                activeCrops.slice(0, 5).map((c) => (
                  <div
                    key={c.cropRecordId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      background: 'var(--surface-2)',
                      borderRadius: 6,
                      fontSize: 13,
                    }}
                  >
                    <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{c.cropSource === 'CUSTOM' ? '🌿' : '🌾'}</span> {c.cropName}
                    </span>
                    <span className="mono" style={{ color: 'var(--ink-muted)', fontSize: 12 }}>
                      Rem: {c.remainingQuantity != null ? c.remainingQuantity : c.eligibleQty} Qtl
                    </span>
                  </div>
                ))
              )}
            </div>
            <button
              className="btn btn-ghost"
              style={{ width: '100%', justifyContent: 'center', marginTop: 14, fontSize: 12.5 }}
              onClick={() => setPage('myCrops')}
            >
              {lang === 'en' ? 'View My Crops →' : 'నా పంటలను చూడండి →'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
