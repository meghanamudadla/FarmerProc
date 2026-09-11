import { centreById, SLOT_TIMES } from '../data/domain.js';

export default function BookingReviewModal({
  t, lang, form, matchedCrop, farmer, bank, isOpen, onClose, onConfirmBooking, isSubmitting,
}) {
  if (!isOpen) return null;

  const centreObj = centreById(form.centreId);
  const centreName = centreObj ? (centreObj[lang] || centreObj.en) : form.centreId;
  const cropLabel = matchedCrop ? (matchedCrop[lang] || matchedCrop.en) : form.cropText;
  const reqQtyNum = parseFloat(form.qty) || 0;
  const estimatedPrice = matchedCrop ? Math.round(reqQtyNum * matchedCrop.msp) : Math.round(reqQtyNum * 1500);
  const slotTimeStr = form.slotLabel || (form.slotIdx != null ? SLOT_TIMES[form.slotIdx] : '—');
  const maskedBankAcc = bank.acc ? `•••• •••• ${bank.acc.slice(-4)}` : (farmer.bankMasked || '•••• •••• 3422');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="modal-head">
          <div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--ink-muted)', fontWeight: 700, marginBottom: 4 }}>
              🔒 Step 4: Final Booking Review
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>
              {t.reviewBookingTitle || 'Review Procurement Booking & Payout'}
            </h2>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="detail-grid" style={{ gap: '14px 16px', marginBottom: 16 }}>
          <div className="detail-item">
            <div className="dl">Selected Crop</div>
            <div className="dv" style={{ fontWeight: 600 }}>{cropLabel}</div>
          </div>

          <div className="detail-item">
            <div className="dl">Planned Delivery Quantity</div>
            <div className="dv mono" style={{ fontWeight: 700 }}>
              {reqQtyNum} Quintals
              <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--ink-muted)', display: 'block' }}>
                (Subject to electronic weighbridge certification)
              </span>
            </div>
          </div>

          <div className="detail-item">
            <div className="dl">Procurement Centre (Mandi)</div>
            <div className="dv">{centreName}</div>
          </div>

          <div className="detail-item">
            <div className="dl">Scheduled Date & Time</div>
            <div className="dv mono">{form.date} · {slotTimeStr}</div>
          </div>

          <div className="detail-item">
            <div className="dl">Estimated Payout (MSP)</div>
            <div className="dv mono" style={{ fontSize: 18, color: 'var(--success)', fontWeight: 700 }}>
              ₹{estimatedPrice.toLocaleString('en-IN')}
              <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--ink-muted)', display: 'block' }}>
                (Provisional estimate · ₹{(matchedCrop?.msp || 1500).toLocaleString('en-IN')}/Qtl)
              </span>
            </div>
          </div>

          <div className="detail-item">
            <div className="dl">Direct Payout Account (DBT)</div>
            <div className="dv mono">{maskedBankAcc} ({bank.bankName || 'SBI'})</div>
          </div>
        </div>

        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: 'var(--ink-muted)', lineHeight: 1.45 }}>
          ⚖️ <strong>Weighbridge Notice:</strong> Your declared quantity ({reqQtyNum} Qtl) and estimated payout (₹{estimatedPrice.toLocaleString('en-IN')}) are provisional estimates. The final procurement voucher and DBT bank transfer amount will be calculated from the exact weight certified at the mandi gate.
        </div>

        <div className="divider"></div>

        <div className="btn-row" style={{ marginTop: 14 }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={isSubmitting}>
            ← {t.back || 'Back'}
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 1, justifyContent: 'center' }}
            disabled={isSubmitting}
            onClick={onConfirmBooking}
          >
            {isSubmitting ? '🔒 Validating & Locking Slot...' : `✓ ${t.confirmAndLockSlot || 'Confirm & Reserve Slot'}`}
          </button>
        </div>
      </div>
    </div>
  );
}
