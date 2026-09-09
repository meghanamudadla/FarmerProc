import { cropById } from '../data/domain.js';
import { MockEligibilityService } from '../services/eligibilityService.js';

export default function EligibilityDetailsModal({ t, lang, cropRecord, farmer, onClose }) {
  if (!cropRecord) return null;

  const cropObj = cropById(cropRecord.cropId);
  const cropName = cropObj ? (cropObj[lang] || cropObj.en) : cropRecord.cropId;
  const yieldPerAcre = cropObj ? cropObj.yieldPerAcre : 15;
  const calculatedEligible = MockEligibilityService.calculateEligibility({ cropId: cropRecord.cropId, landAcres: cropRecord.landArea });
  const remainingQty = MockEligibilityService.calculateRemaining(calculatedEligible, cropRecord.alreadyProcuredQty);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="modal-head">
          <div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--ink-muted)', fontWeight: 700, marginBottom: 4 }}>
              🏛️ Policy Engine Breakdown
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>
              {t.viewEligibility || 'Eligibility Breakdown'}
            </h2>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="eligibility-box" style={{ background: 'var(--accent-soft)', borderColor: 'var(--accent)', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>
            Selected Crop: {cropName} ({cropRecord.season})
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--ink)', marginTop: 4 }}>
            Farmer Location: <strong>{farmer?.location || 'Andhra Pradesh'}</strong>
          </div>
        </div>

        <div style={{ background: 'var(--surface-2)', padding: 14, borderRadius: 10, marginBottom: 16, fontSize: 13, lineHeight: 1.6 }}>
          <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 13.5 }}>🧮 Server-Side Calculation Formula:</div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dashed var(--border)' }}>
            <span>Verified Land Area:</span>
            <span className="mono"><strong>{cropRecord.landArea} Acres</strong></span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dashed var(--border)' }}>
            <span>Govt Yield Norm ({cropName}):</span>
            <span className="mono"><strong>{yieldPerAcre} Qtl / Acre</strong></span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
            <span>Total Backend Eligible Quantity:</span>
            <span className="mono" style={{ color: 'var(--accent)', fontWeight: 700 }}>
              {cropRecord.landArea} × {yieldPerAcre} = {calculatedEligible} Qtl
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed var(--border)' }}>
            <span>Already Procured Quantity:</span>
            <span className="mono" style={{ color: 'var(--gold)', fontWeight: 700 }}>- {cropRecord.alreadyProcuredQty} Qtl</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 2px', fontSize: 14, fontWeight: 700 }}>
            <span>Live Remaining Entitlement:</span>
            <span className="mono" style={{ color: remainingQty > 0 ? 'var(--success)' : 'var(--critical)' }}>
              {remainingQty} Qtl
            </span>
          </div>
        </div>

        <div className="hint" style={{ marginBottom: 16 }}>
          ℹ️ <strong>MockEligibilityService Note:</strong> In production, this policy calculation connects directly to state land records (AgriStack KISAN registry) to enforce government caps automatically.
        </div>

        <div className="btn-row">
          <button className="btn btn-primary" onClick={onClose} style={{ width: '100%', justifyContent: 'center' }}>
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}
