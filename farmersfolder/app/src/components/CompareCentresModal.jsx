import { useEffect } from 'react';
import { CentreService } from '../services/centreService.js';

export default function CompareCentresModal({
  t,
  lang,
  isOpen,
  comparedCentres = [],
  allCentres = [],
  onClose,
  onRemoveCentre,
  onClearAll,
  onAddCentre,
  onSelectCentre,
}) {
  // Listen for Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !comparedCentres || comparedCentres.length === 0) {
    return null;
  }

  // Find lowest wait time among compared centres for highlighting
  const lowestWaitMins = Math.min(
    ...comparedCentres.map((c) => CentreService.calculateEstWaitTime(c.currentQueue, c.numberOfCounters))
  );

  // Available centres that can still be added
  const remainingCentres = (allCentres || []).filter(
    (c) => !comparedCentres.some((comp) => comp.id === c.id)
  );

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        overflowY: 'auto',
      }}
      onClick={onClose}
    >
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 960,
          width: '100%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--surface)',
          borderRadius: 14,
          border: '1px solid var(--border)',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--surface)',
            flexShrink: 0,
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '.06em',
                color: 'var(--accent)',
                fontWeight: 700,
                marginBottom: 4,
              }}
            >
              <span>🏛️ AgriStack Mandi Discovery</span>
              <span>•</span>
              <span>Side-by-Side Comparative Matrix</span>
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--ink)' }}>
              {t.compareCentres || 'Compare Procurement Centres'} ({comparedCentres.length} of 3)
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {onClearAll && (
              <button
                className="btn btn-ghost"
                style={{ padding: '6px 12px', fontSize: 12, color: 'var(--critical)' }}
                onClick={onClearAll}
              >
                Clear All
              </button>
            )}
            <button
              className="modal-close"
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--border)',
                background: 'var(--surface-2)',
                color: 'var(--ink)',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
              }}
              onClick={onClose}
              title="Close Comparison (Esc)"
              aria-label="Close comparison modal"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {/* If only 1 centre is selected, show side-by-side with an "Add 2nd Centre" invitation */}
          {comparedCentres.length === 1 && remainingCentres.length > 0 && (
            <div
              style={{
                background: 'var(--surface-2)',
                border: '1px dashed var(--accent)',
                borderRadius: 10,
                padding: '12px 16px',
                marginBottom: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div>
                <strong style={{ fontSize: 13, color: 'var(--ink)' }}>
                  💡 Tip: Add another centre to see live wait time differences side-by-side.
                </strong>
                <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 2 }}>
                  Select from nearby mandis to compare live queue load and available quota today.
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {remainingCentres.slice(0, 2).map((rc) => (
                  <button
                    key={rc.id}
                    className="btn btn-ghost"
                    style={{ fontSize: 11.5, padding: '5px 10px', background: 'var(--surface)' }}
                    onClick={() => onAddCentre && onAddCentre(rc.id)}
                  >
                    + Add {rc[lang] || rc.en}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Comparison Matrix Table */}
          <div
            style={{
              border: '1px solid var(--border)',
              borderRadius: 10,
              overflow: 'hidden',
              background: 'var(--surface)',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)', borderBottom: '2px solid var(--border)' }}>
                  <th
                    style={{
                      width: '24%',
                      padding: '16px 14px',
                      textAlign: 'left',
                      fontSize: 12,
                      fontWeight: 700,
                      color: 'var(--ink-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '.05em',
                      verticalAlign: 'top',
                    }}
                  >
                    Centre Details & Actions
                  </th>
                  {comparedCentres.map((c) => {
                    const rem = Math.max(0, c.dailyFarmerCapacity - c.currentBookedCapacity);
                    const isAvail = c.operatingStatus === 'OPEN' && rem > 0;
                    return (
                      <th
                        key={c.id}
                        style={{
                          padding: '16px 14px',
                          textAlign: 'center',
                          verticalAlign: 'top',
                          borderLeft: '1px solid var(--border)',
                          background: 'var(--surface)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                          <span
                            className={`badge ${
                              c.operatingStatus === 'OPEN' ? 'success' : c.operatingStatus === 'FULL' ? 'critical' : 'warn'
                            }`}
                            style={{ fontSize: 10.5 }}
                          >
                            <span className="badge-dot"></span>
                            {c.operatingStatus}
                          </span>
                          {onRemoveCentre && comparedCentres.length > 1 && (
                            <button
                              onClick={() => onRemoveCentre(c.id)}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                color: 'var(--ink-muted)',
                                cursor: 'pointer',
                                fontSize: 12,
                                padding: '2px 4px',
                              }}
                              title="Remove from comparison"
                            >
                              ✕
                            </button>
                          )}
                        </div>

                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)', lineHeight: 1.3, marginBottom: 2 }}>
                          {c[lang] || c.en}
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginBottom: 10 }}>
                          📍 {c.distanceKm || '3.2'} km away · {c.district}
                        </div>

                        <button
                          className="btn btn-primary"
                          style={{
                            width: '100%',
                            justifyContent: 'center',
                            padding: '7px 12px',
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                          disabled={!isAvail}
                          onClick={() => {
                            onClose();
                            onSelectCentre(c);
                          }}
                        >
                          {isAvail ? '✓ Select & Book' : 'Closed / Full'}
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {/* Congestion Level */}
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--ink)' }}>
                    🚦 Congestion Level
                  </td>
                  {comparedCentres.map((c) => {
                    const level = CentreService.getCongestionLevel(c);
                    return (
                      <td key={c.id} style={{ padding: '12px 14px', textAlign: 'center', borderLeft: '1px solid var(--border)' }}>
                        <span
                          className={`badge ${
                            level === 'LOW' ? 'success' : level === 'MEDIUM' || level === 'HIGH' ? 'warn' : 'critical'
                          }`}
                        >
                          {level}
                        </span>
                      </td>
                    );
                  })}
                </tr>

                {/* Live Queue */}
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                  <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--ink)' }}>
                    👥 Current Queue
                  </td>
                  {comparedCentres.map((c) => (
                    <td key={c.id} className="mono" style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700, borderLeft: '1px solid var(--border)' }}>
                      {c.currentQueue} <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--ink-muted)' }}>farmers waiting</span>
                    </td>
                  ))}
                </tr>

                {/* Estimated Wait Time */}
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--ink)' }}>
                    ⏱️ Est. Wait Time
                  </td>
                  {comparedCentres.map((c) => {
                    const mins = CentreService.calculateEstWaitTime(c.currentQueue, c.numberOfCounters);
                    const isFastest = mins === lowestWaitMins && comparedCentres.length > 1;
                    return (
                      <td key={c.id} className="mono" style={{ padding: '12px 14px', textAlign: 'center', borderLeft: '1px solid var(--border)' }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: mins > 30 ? 'var(--critical)' : 'var(--accent)' }}>
                          ~{mins} mins
                        </div>
                        {isFastest && (
                          <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--accent)', marginTop: 2 }}>
                            ⚡ Shortest Wait
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* Remaining Capacity Today */}
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                  <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--ink)' }}>
                    🎯 Spots Available
                  </td>
                  {comparedCentres.map((c) => {
                    const rem = Math.max(0, c.dailyFarmerCapacity - c.currentBookedCapacity);
                    return (
                      <td key={c.id} className="mono" style={{ padding: '12px 14px', textAlign: 'center', borderLeft: '1px solid var(--border)' }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: rem > 0 ? 'var(--success)' : 'var(--critical)' }}>
                          {rem} <span style={{ fontSize: 11, fontWeight: 400 }}>spots</span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 2 }}>
                          {c.currentBookedCapacity} of {c.dailyFarmerCapacity} booked
                        </div>
                      </td>
                    );
                  })}
                </tr>

                {/* Counters & Scales */}
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--ink)' }}>
                    ⚖️ Scales & Counters
                  </td>
                  {comparedCentres.map((c) => (
                    <td key={c.id} style={{ padding: '12px 14px', textAlign: 'center', fontSize: 12.5, borderLeft: '1px solid var(--border)' }}>
                      <strong>{c.numberOfCounters}</strong> Counters · <strong>{c.weighingScales}</strong> Weighbridges
                    </td>
                  ))}
                </tr>

                {/* Operational Hours & Status */}
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                  <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--ink)' }}>
                    🕒 Operating Hours
                  </td>
                  {comparedCentres.map((c) => (
                    <td key={c.id} style={{ padding: '12px 14px', textAlign: 'center', fontSize: 12, borderLeft: '1px solid var(--border)' }}>
                      {c.operatingHours || '06:00 AM – 06:00 PM'}
                    </td>
                  ))}
                </tr>

                {/* Operational Alerts / Disruptions */}
                <tr>
                  <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--ink)' }}>
                    📢 Mandi Alert
                  </td>
                  {comparedCentres.map((c) => (
                    <td key={c.id} style={{ padding: '12px 14px', textAlign: 'center', fontSize: 11.5, borderLeft: '1px solid var(--border)' }}>
                      {c.disruptionAlert ? (
                        <span style={{ color: 'var(--critical)', fontWeight: 600 }}>
                          ⚠️ {c.disruptionAlert}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--ink-muted)' }}>
                          ✓ Normal uninterrupted operations
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer with working Close button */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--surface)',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
            Official Mandi Quota & Queue Management System
          </span>
          <button
            className="btn btn-ghost"
            style={{
              padding: '8px 24px',
              fontSize: 13,
              fontWeight: 700,
              minWidth: 140,
              justifyContent: 'center',
              border: '1.5px solid var(--border-strong, #CBD5E1)',
              background: 'var(--surface-2)',
            }}
            onClick={onClose}
          >
            ✕ Close Comparison
          </button>
        </div>
      </div>
    </div>
  );
}
