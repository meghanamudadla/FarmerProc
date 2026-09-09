import { useState } from 'react';
import { CENTRES } from '../data/domain.js';
import { CheckInService } from '../services/checkInService.js';

export default function GateScannerModal({
  t, lang, isOpen, onClose, bookings, farmer, onCheckInSuccess,
}) {
  const [scannedInput, setScannedInput] = useState('');
  const [selectedScannerCentreId, setSelectedScannerCentreId] = useState('c1');
  const [isOnline, setIsOnline] = useState(true);
  const [scanResult, setScanResult] = useState(null);

  if (!isOpen) return null;

  function handleScan() {
    if (!scannedInput.trim()) return;

    setScanResult(null);

    const result = CheckInService.processGateScan({
      scannedTokenOrPayload: scannedInput.trim(),
      scannerCentreId: selectedScannerCentreId,
      bookings,
      farmer,
      isOnline,
    });

    setScanResult(result);

    if (result.success && result.booking) {
      onCheckInSuccess(result.booking.id, result.arrivalTime);
    }
  }

  function handleQuickFillToken(token) {
    setScannedInput(token);
  }

  const activeBookingsList = bookings.filter((b) => b.status !== 'cancelled');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 580 }}>
        <div className="modal-head">
          <div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--ink-muted)', fontWeight: 700, marginBottom: 4 }}>
              📷 Officer Gate Portal
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>
              {t.mandiGateScannerTitle || 'Mandi Gate Officer QR Scanner'}
            </h2>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Network & Scanner Location Bar */}
        <div className="field-row" style={{ marginBottom: 14 }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Gate Scanner Location</label>
            <select value={selectedScannerCentreId} onChange={(e) => setSelectedScannerCentreId(e.target.value)}>
              {CENTRES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c[lang] || c.en}
                </option>
              ))}
            </select>
          </div>

          <div className="field" style={{ marginBottom: 0 }}>
            <label>Network Connectivity Mode</label>
            <button
              type="button"
              className={`btn ${isOnline ? 'btn-primary' : 'btn-ghost'}`}
              style={{ width: '100%', justifyContent: 'center', padding: '9px 12px', fontSize: 12.5 }}
              onClick={() => setIsOnline(!isOnline)}
            >
              {isOnline ? '🟢 Online Mode (Live Server)' : '🔴 Offline Mode (Pending Sync)'}
            </button>
          </div>
        </div>

        {/* Quick Fill Token Chips */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11.5 }}>Quick Select Active Booking Token:</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
            {activeBookingsList.map((b) => (
              <button
                key={b.id}
                type="button"
                className="pill"
                style={{ cursor: 'pointer', background: 'var(--surface-2)', fontWeight: 600 }}
                onClick={() => handleQuickFillToken(b.token)}
              >
                {b.token} ({b.checkedIn ? 'Checked In' : 'Scheduled'})
              </button>
            ))}
          </div>
        </div>

        {/* Scan Input */}
        <div className="field">
          <label>QR Payload / Token Input *</label>
          <input
            type="text"
            value={scannedInput}
            onChange={(e) => setScannedInput(e.target.value)}
            placeholder={t.scanTokenPlaceholder || 'Scan QR code or enter token (e.g. PDC-F51B1E)...'}
            autoFocus
          />
        </div>

        {/* Validation Result Feedback */}
        {scanResult && (
          <div
            className="eligibility-box"
            style={{
              marginBottom: 14,
              borderColor: scanResult.success
                ? 'var(--success)'
                : scanResult.isOfflineQueued
                ? 'var(--gold)'
                : 'var(--critical)',
              background: scanResult.success
                ? 'var(--accent-soft)'
                : scanResult.isOfflineQueued
                ? 'var(--gold-soft)'
                : 'var(--critical-soft)',
            }}
          >
            {scanResult.success ? (
              <div style={{ color: 'var(--success)', fontWeight: 700 }}>
                ✅ CHECK-IN SUCCESSFUL! Ticket verified for {scanResult.booking?.token}. State updated to CHECKED_IN (Arrival: {scanResult.arrivalTime}). Queue entry created.
              </div>
            ) : scanResult.isOfflineQueued ? (
              <div style={{ color: 'var(--gold)', fontWeight: 700 }}>
                📡 OFFLINE PENDING: Network unavailable. Check-in for {scanResult.booking?.token} buffered locally. Syncing when network returns.
              </div>
            ) : (
              <div style={{ color: 'var(--critical)', fontWeight: 700 }}>
                ⛔ CHECK-IN REJECTED ({scanResult.errorCode}): {scanResult.errorMessage}
              </div>
            )}
          </div>
        )}

        <div className="btn-row">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Close Scanner
          </button>
          <button
            type="button"
            className="btn btn-primary"
            style={{ flex: 1, justifyContent: 'center' }}
            disabled={!scannedInput.trim()}
            onClick={handleScan}
          >
            📷 Process Gate Scan →
          </button>
        </div>
      </div>
    </div>
  );
}
