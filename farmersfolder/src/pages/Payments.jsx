import { PAY_SEQUENCE } from '../data/domain.js';

export default function Payments({ t, activeBooking, bookings, totalValue }) {
  const payIdx = activeBooking ? PAY_SEQUENCE.indexOf(activeBooking.paymentStatus) : -1;
  const steps = [
    { title: t.payStage1, on: !!activeBooking, time: activeBooking ? activeBooking.date : '—' },
    { title: t.payStage2, on: payIdx >= 0, time: payIdx >= 0 ? activeBooking.date : '—' },
    { title: t.payStage3, on: payIdx >= 1, time: payIdx >= 1 ? activeBooking.date : '—' },
    { title: t.payStage4 + ' (' + (activeBooking ? activeBooking.paymentMethod : '') + ')', on: payIdx >= 2, time: payIdx >= 2 ? activeBooking.date : '—' },
    { title: t.payStage5, on: payIdx >= 3, time: payIdx >= 3 ? activeBooking.date : '—' },
  ];

  return (
    <div className="grid-2">
      <div className="card">
        <div className="section-title">
          <h2 style={{ fontSize: 15 }}>{t.paymentSummary}</h2>
        </div>
        {activeBooking && activeBooking.paymentStatus === 'pending_verification' ? (
          <div className="empty-note">{t.pendingRateNote}</div>
        ) : (
          <div className="progress-steps">
            {steps.map((s, i, arr) => (
              <div className="pstep" key={i}>
                <div className="pstep-rail">
                  <div className={'pstep-dot' + (s.on ? ' on' : '')}></div>
                  {i < arr.length - 1 && <div className={'pstep-line' + (arr[i + 1].on ? ' on' : '')}></div>}
                </div>
                <div className="pstep-body">
                  <div className="pstep-title">{s.title}</div>
                  <div className="pstep-time">{s.time}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        {activeBooking && activeBooking.paymentStatus !== 'pending_verification' && (
          <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 8, lineHeight: 1.5 }}>
            {activeBooking.paymentStatus !== 'credited' && (
              <>
                {t.autoUpdateNote}
                <br />
              </>
            )}
            {t.disbursalMethod}: <strong>{activeBooking.paymentMethod}</strong>
          </div>
        )}
      </div>
      <div className="card">
        <div className="section-title">
          <h2 style={{ fontSize: 15 }}>{t.totalValue}</h2>
        </div>
        <div className="mono" style={{ fontSize: 26, fontWeight: 600, marginBottom: 14 }}>
          ₹{totalValue.toLocaleString('en-IN')}
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t.col.token}</th>
                <th>{t.disbursalMethod}</th>
                <th>
                  {t.paid}/{t.pending}
                </th>
              </tr>
            </thead>
            <tbody>
              {bookings
                .filter((b) => b.status !== 'cancelled')
                .map((b) => (
                  <tr key={b.id}>
                    <td className="mono">{b.token}</td>
                    <td>{b.paymentMethod}</td>
                    <td>
                      <span className={'badge ' + (b.paymentStatus === 'credited' ? 'success' : 'warn')}>{b.paymentStatus === 'credited' ? t.paid : t.pending}</span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
