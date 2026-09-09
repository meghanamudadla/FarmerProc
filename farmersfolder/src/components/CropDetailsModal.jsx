import { cropById } from '../data/domain.js';
import { CropRepository } from '../services/cropRepository.js';

export default function CropDetailsModal({
  t,
  lang,
  cropRecord,
  bookings = [],
  onClose,
  onOpenEligibility,
  onBookSlotForCrop,
  onEditCrop,
  onDeactivateCrop,
  onReactivateCrop,
  onDeleteCrop,
}) {
  if (!cropRecord) return null;

  const cropObj = cropById(cropRecord.cropId);
  const displayName = cropRecord.cropName || (cropObj ? (cropObj[lang] || cropObj.en) : cropRecord.cropId);
  const formattedAddedDate = CropRepository.formatCropDate(cropRecord.registrationDate);

  // Find related bookings (Section 20 & 47)
  const relatedBookings = (bookings || []).filter(
    (b) => b.cropRecordId === cropRecord.cropRecordId || b.cropId === cropRecord.cropId
  );
  const completedProcurements = relatedBookings.filter(
    (b) => b.status === 'completed' || b.paymentStatus === 'credited'
  );

  const isCompleted = cropRecord.status === 'COMPLETED' || cropRecord.remainingQuantity === 0;
  const isCustom = cropRecord.cropSource === 'CUSTOM';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 580, maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-head">
          <div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--ink-muted)', fontWeight: 700, marginBottom: 4 }}>
              🌾 Official Crop Registration Record
            </div>
            <div className="mono" style={{ fontSize: 19, fontWeight: 700 }}>
              {cropRecord.cropRecordId}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Title and Badges */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, margin: '8px 0 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>{isCustom ? '🌿' : '🌾'}</span>
            <div>
              <h3 style={{ fontSize: 19, margin: 0, fontWeight: 700 }}>{displayName}</h3>
              <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 2 }}>
                Added on: <strong>{formattedAddedDate}</strong> · Source: <strong>{cropRecord.cropSource || 'PREDEFINED'}</strong>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span className={`badge ${cropRecord.eligibilityStatus === 'ELIGIBLE' ? 'success' : cropRecord.eligibilityStatus === 'NOT_ELIGIBLE' ? 'critical' : 'warn'}`}>
              <span className="badge-dot"></span>
              {cropRecord.eligibilityStatus === 'ELIGIBLE'
                ? '✓ Eligible'
                : cropRecord.eligibilityStatus === 'NOT_ELIGIBLE'
                ? '✕ Not Eligible'
                : '⏳ Verification Pending'}
            </span>
            <span className={`badge ${isCompleted ? 'success' : cropRecord.status === 'INACTIVE' ? 'critical' : 'success'}`} style={{ fontWeight: 700 }}>
              {isCompleted ? '✓ COMPLETED' : cropRecord.status}
            </span>
          </div>
        </div>

        {/* Completed Announcement Banner */}
        {isCompleted && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              background: 'rgba(22, 163, 74, 0.08)',
              border: '1px solid rgba(22, 163, 74, 0.25)',
              borderRadius: 8,
              fontSize: 12.5,
              color: 'var(--ink)',
              marginBottom: 16,
            }}
          >
            <span style={{ fontSize: 18 }}>✅</span>
            <div>
              <strong style={{ color: 'var(--success)' }}>Procurement Fully Finalized:</strong> All allocated quota for this crop has been procured and verified by government mandi officers.
            </div>
          </div>
        )}

        {/* 10 Key Data Grid (Section 20) */}
        {(() => {
          const rawEnt = parseFloat(cropRecord.entitlementQuantity != null ? cropRecord.entitlementQuantity : cropRecord.eligibleQty) || 0;
          const rawProc = parseFloat(cropRecord.procuredQuantity != null ? cropRecord.procuredQuantity : cropRecord.alreadyProcuredQty) || 0;
          const displayEnt = Math.max(rawEnt, rawProc);
          const displayProc = rawProc;
          const displayRem = isCompleted ? 0 : Math.max(0, displayEnt - displayProc);
          const pct = displayEnt > 0 ? Math.min(100, Math.round((displayProc / displayEnt) * 100)) : (isCompleted ? 100 : 0);

          return (
            <>
              <div className="detail-grid" style={{ gap: '12px 16px', background: 'var(--surface-2)', padding: '14px', borderRadius: 8, marginBottom: 18 }}>
                <div className="detail-item">
                  <div className="dl">Procurement Season</div>
                  <div className="dv">{cropRecord.season || 'Kharif 2026'}</div>
                </div>
                <div className="detail-item">
                  <div className="dl">Land / Plot Reference</div>
                  <div className="dv">{cropRecord.plotReference || 'Main Plot'}</div>
                </div>
                <div className="detail-item">
                  <div className="dl">Cultivated Area</div>
                  <div className="dv mono">{cropRecord.landArea} Acres</div>
                </div>
                <div className="detail-item">
                  <div className="dl">Expected Harvest</div>
                  <div className="dv mono">{cropRecord.expectedQty || displayEnt} Qtl</div>
                </div>
                <div className="detail-item">
                  <div className="dl">Entitlement (Quota)</div>
                  <div className="dv mono" style={{ color: 'var(--accent)', fontWeight: 700 }}>
                    {displayEnt} Qtl
                  </div>
                </div>
                <div className="detail-item">
                  <div className="dl">Procured Quantity</div>
                  <div className="dv mono" style={{ fontWeight: 700, color: isCompleted ? 'var(--success)' : 'var(--ink)' }}>
                    {displayProc} Qtl {isCompleted && '✓'}
                  </div>
                </div>
                <div className="detail-item">
                  <div className="dl">Remaining Quota</div>
                  <div className="dv mono" style={{ color: 'var(--success)', fontWeight: 700 }}>
                    {isCompleted ? '0 Qtl (Completed)' : `${displayRem} Qtl`}
                  </div>
                </div>
                <div className="detail-item">
                  <div className="dl">Registration Date</div>
                  <div className="dv mono">{formattedAddedDate}</div>
                </div>
                <div className="detail-item">
                  <div className="dl">Related Bookings</div>
                  <div className="dv mono">{relatedBookings.length} bookings</div>
                </div>
                <div className="detail-item">
                  <div className="dl">Completed Procurements</div>
                  <div className="dv mono">{completedProcurements.length} completed</div>
                </div>
              </div>

              {/* Procurement Progress Bar */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-muted)', marginBottom: 4 }}>
                  <span style={{ fontWeight: isCompleted ? 600 : 400, color: isCompleted ? 'var(--success)' : 'var(--ink-muted)' }}>
                    {isCompleted ? '✓ Procurement Lifecycle (100% Completed)' : `Procurement Lifecycle (${pct}%)`}
                  </span>
                  <span className="mono" style={{ fontWeight: 600, color: 'var(--ink)' }}>
                    {displayProc} / {displayEnt} Qtl
                  </span>
                </div>
                <div style={{ height: 8, background: 'var(--surface-2)', borderRadius: 10, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      background: isCompleted ? 'var(--success, #16A34A)' : 'var(--accent)',
                      transition: 'width .3s ease',
                    }}
                  ></div>
                </div>
              </div>
            </>
          );
        })()}

        {/* Section 47: Related Bookings & Procurement History */}
        <div className="section-title" style={{ marginTop: 10, marginBottom: 8 }}>
          <h4 style={{ fontSize: 14, margin: 0 }}>📜 Procurement & Booking History</h4>
        </div>
        {relatedBookings.length === 0 ? (
          <div className="hint" style={{ background: 'var(--surface-2)', padding: '10px 14px', borderRadius: 6, fontSize: 12.5 }}>
            No bookings recorded for this crop yet. Click "Book Slot" to schedule your visit.
          </div>
        ) : (
          <div className="table-wrap" style={{ border: '1px solid var(--border)', borderRadius: 6, marginBottom: 14 }}>
            <table>
              <thead>
                <tr>
                  <th>Token</th>
                  <th>Date</th>
                  <th>Quantity</th>
                  <th>Status</th>
                  <th>Payment</th>
                </tr>
              </thead>
              <tbody>
                {relatedBookings.map((b) => (
                  <tr key={b.id}>
                    <td className="mono">{b.token}</td>
                    <td className="mono">{b.date}</td>
                    <td className="mono">{b.qty} Qtl</td>
                    <td>
                      <span className={`badge ${b.status === 'completed' ? 'success' : b.status === 'cancelled' ? 'critical' : 'warn'}`}>
                        {b.status}
                      </span>
                    </td>
                    <td>
                      <span className="mono" style={{ fontSize: 11.5 }}>
                        {b.paymentStatus || 'initiated'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="divider" style={{ margin: '14px 0' }}></div>

        <div className="btn-row">
          <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>
            {t.back || 'Close'}
          </button>
          {onEditCrop && (
            <button
              className="btn btn-ghost"
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={() => {
                onClose();
                onEditCrop(cropRecord);
              }}
            >
              ✏️ Edit Crop
            </button>
          )}
          {onOpenEligibility && (
            <button
              className="btn btn-ghost"
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={() => {
                onClose();
                onOpenEligibility(cropRecord);
              }}
            >
              📊 {t.viewEligibility || 'Eligibility Breakdown'}
            </button>
          )}
          {!isCompleted && cropRecord.status === 'ACTIVE' && cropRecord.remainingQuantity > 0 && onBookSlotForCrop && (
            <button
              className="btn btn-primary"
              style={{ flex: 1.2, justifyContent: 'center' }}
              onClick={() => {
                onClose();
                onBookSlotForCrop(cropRecord);
              }}
            >
              📅 Book Slot for {cropRecord.cropName}
            </button>
          )}
        </div>

        {/* Management Controls: Deactivate / Reactivate / Delete */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 14,
            paddingTop: 12,
            borderTop: '1px solid var(--border)',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <div>
            {cropRecord.status === 'INACTIVE' ? (
              onReactivateCrop && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ fontSize: 12, padding: '6px 12px', color: 'var(--success)', border: '1px solid var(--border)' }}
                  onClick={() => {
                    onClose();
                    onReactivateCrop(cropRecord);
                  }}
                >
                  ▶️ Reactivate Crop
                </button>
              )
            ) : (
              onDeactivateCrop && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ fontSize: 12, padding: '6px 12px', color: '#D97706', border: '1px solid var(--border)' }}
                  onClick={() => {
                    if (window.confirm(`Deactivate "${cropRecord.cropName}"? It will be archived and hidden from slot booking.`)) {
                      onClose();
                      onDeactivateCrop(cropRecord);
                    }
                  }}
                >
                  ⏸️ Deactivate (Archive)
                </button>
              )
            )}
          </div>
          {onDeleteCrop && (
            <button
              type="button"
              className="btn btn-ghost"
              style={{ fontSize: 12, padding: '6px 12px', color: 'var(--critical)', border: '1px solid var(--critical)' }}
              onClick={() => {
                if (window.confirm(`Are you sure you want to permanently delete "${cropRecord.cropName}"? This action cannot be undone.`)) {
                  onClose();
                  onDeleteCrop(cropRecord);
                }
              }}
            >
              🗑️ Delete Crop Record
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
