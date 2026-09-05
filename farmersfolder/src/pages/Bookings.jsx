import { centreById } from '../data/domain.js';

export default function Bookings({ t, lang, bookings, setDetailBookingId, bookingCropLabel, setPage }) {
  return (
    <div className="card table-wrap">
      {bookings.length === 0 ? (
        <div className="empty-note">{t.noBookings}</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>{t.col.token}</th>
              <th>{t.col.crop}</th>
              <th>{t.col.centre}</th>
              <th>{t.col.date}</th>
              <th>{t.col.status}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id} className="clickable-row" onClick={() => setDetailBookingId(b.id)}>
                <td className="mono">{b.token}</td>
                <td>
                  {bookingCropLabel(b)} · {b.qty} qtl
                </td>
                <td>{centreById(b.centreId)[lang]}</td>
                <td className="mono">{b.date}</td>
                <td>
                  <span className={'badge ' + (b.status === 'booked' ? 'success' : b.status === 'cancelled' ? 'critical' : 'neutral')}>
                    <span className="badge-dot"></span>
                    {b.status === 'booked' ? (lang === 'en' ? 'Booked' : 'బుక్ అయింది') : b.status === 'cancelled' ? (lang === 'en' ? 'Cancelled' : 'రద్దు') : lang === 'en' ? 'Completed' : 'పూర్తయింది'}
                  </span>
                </td>
                <td>
                  {b.status === 'booked' && (
                    <button
                      className="btn btn-ghost"
                      style={{ padding: '5px 10px', fontSize: 12 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPage('queue');
                      }}
                    >
                      {t.nav.queue}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
