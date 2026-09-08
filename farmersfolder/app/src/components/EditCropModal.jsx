import { useState } from 'react';
import { PREDEFINED_CROPS } from '../data/domain.js';
import { SEASONS } from '../services/eligibilityService.js';
import { CropRepository } from '../services/cropRepository.js';

export default function EditCropModal({ t = {}, lang = 'en', farmer, cropRecord, isOpen, onClose, onSaveCrop }) {
  if (!isOpen || !cropRecord) return null;

  const isCustom = cropRecord.cropSource === 'CUSTOM';
  const predefinedObj = PREDEFINED_CROPS.find((c) => c.id === cropRecord.cropId);
  const yieldNorm = isCustom ? 12 : (predefinedObj?.yieldPerAcre || 15);
  const alreadyProcured = parseFloat(cropRecord.procuredQuantity || cropRecord.alreadyProcuredQty || 0);

  const [cropName, setCropName] = useState(cropRecord.cropName || '');
  const [landArea, setLandArea] = useState(String(cropRecord.landArea || ''));
  const [expectedQty, setExpectedQty] = useState(String(cropRecord.expectedQty || ''));
  const [season, setSeason] = useState(cropRecord.season || 'Kharif 2026');
  const [plotReference, setPlotReference] = useState(cropRecord.plotReference || '');
  const [registrationDate, setRegistrationDate] = useState(cropRecord.registrationDate || '');
  const [notes, setNotes] = useState(cropRecord.notes || '');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Dynamic preview calculation
  const landNum = parseFloat(landArea) || 0;
  const expNum = parseFloat(expectedQty) || 0;
  const declaredOrNorm = expNum > 0 ? expNum : Math.round(landNum * yieldNorm);
  const calculatedQuota = Math.max(alreadyProcured, declaredOrNorm);
  const newRemaining = Math.max(0, calculatedQuota - alreadyProcured);

  function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (landNum <= 0) {
      setErrorMsg('Land area must be greater than 0 acres.');
      return;
    }

    if (calculatedQuota < alreadyProcured) {
      setErrorMsg(`Calculated quota cannot be less than already procured quantity (${alreadyProcured} Qtl).`);
      return;
    }

    setIsSaving(true);

    const res = CropRepository.updateCrop({
      cropRecordId: cropRecord.cropRecordId,
      farmerId: farmer?.farmerId || cropRecord.farmerId || 'FRM-10245',
      cropName,
      landArea: landNum,
      expectedQty: parseFloat(expectedQty) || calculatedQuota,
      season,
      plotReference,
      registrationDate,
      notes,
    });

    setIsSaving(false);

    if (!res.success) {
      setErrorMsg(res.error || 'Failed to update crop details.');
      return;
    }

    setSuccessMsg(`✓ "${res.crop.cropName}" updated successfully.`);
    if (onSaveCrop) {
      onSaveCrop(res.crop);
    }

    setTimeout(() => {
      setSuccessMsg('');
      onClose();
    }, 700);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 580, maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div className="modal-head">
          <div>
            <div
              style={{
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '.05em',
                color: 'var(--ink-muted)',
                fontWeight: 700,
                marginBottom: 4,
              }}
            >
              🌾 Official Crop Registry
            </div>
            <h2 style={{ fontSize: 19, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>✏️</span>
              <span>Edit Crop: {cropRecord.cropName}</span>
            </h2>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        {/* Informational Sub-strip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
            padding: '10px 14px',
            background: 'var(--surface-2)',
            borderRadius: 8,
            margin: '12px 0 16px',
            fontSize: 12.5,
          }}
        >
          <div>
            Record ID: <span className="mono" style={{ fontWeight: 700 }}>{cropRecord.cropRecordId}</span>
            <span style={{ margin: '0 8px', color: 'var(--border)' }}>|</span>
            Source: <strong>{isCustom ? 'Custom Crop' : 'MSP Notified'}</strong>
          </div>
          <div className="mono" style={{ fontWeight: 600 }}>
            Procured so far: <span style={{ color: alreadyProcured > 0 ? 'var(--success)' : 'var(--ink)' }}>{alreadyProcured} Qtl</span>
          </div>
        </div>

        {errorMsg && (
          <div
            className="hint error"
            style={{
              background: 'var(--critical-soft)',
              padding: '10px 14px',
              borderRadius: 8,
              marginBottom: 14,
              borderLeft: '4px solid var(--critical)',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            ⚠️ {errorMsg}
          </div>
        )}

        {successMsg && (
          <div
            className="hint success"
            style={{
              background: 'var(--success-soft)',
              padding: '10px 14px',
              borderRadius: 8,
              marginBottom: 14,
              borderLeft: '4px solid var(--success)',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {successMsg}
          </div>
        )}

        {/* Edit Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Crop Name */}
          <div>
            <label className="label" style={{ fontWeight: 600, marginBottom: 5, display: 'block' }}>
              Crop Name {isCustom ? '(Editable)' : '(MSP Standardized)'}
            </label>
            {isCustom ? (
              <input
                type="text"
                value={cropName}
                onChange={(e) => setCropName(e.target.value)}
                required
                style={{ width: '100%', padding: '8px 12px', fontSize: 13.5, borderRadius: 6 }}
                placeholder="Enter custom crop name..."
              />
            ) : (
              <div
                style={{
                  padding: '9px 12px',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  fontSize: 13.5,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>🌾 {cropRecord.cropName}</span>
                <span className="badge" style={{ fontSize: 11 }}>MSP Standard</span>
              </div>
            )}
            <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 4 }}>
              {isCustom
                ? 'Custom crops can be renamed. Valid letters, numbers, and basic punctuation allowed.'
                : 'MSP notified crop types are locked to maintain state procurement consistency.'}
            </div>
          </div>

          {/* Grid: Land Area & Expected Harvest */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="label" style={{ fontWeight: 600, marginBottom: 5, display: 'block' }}>
                Land Area (Acres) *
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="500"
                value={landArea}
                onChange={(e) => setLandArea(e.target.value)}
                required
                style={{ width: '100%', padding: '8px 12px', fontSize: 13.5, borderRadius: 6 }}
              />
            </div>
            <div>
              <label className="label" style={{ fontWeight: 600, marginBottom: 5, display: 'block' }}>
                Expected Harvest (Qtl)
              </label>
              <input
                type="number"
                step="1"
                min="1"
                value={expectedQty}
                onChange={(e) => setExpectedQty(e.target.value)}
                placeholder={`Est. ${calculatedQuota}`}
                style={{ width: '100%', padding: '8px 12px', fontSize: 13.5, borderRadius: 6 }}
              />
            </div>
          </div>

          {/* Dynamic Entitlement Quota Preview Box */}
          <div
            style={{
              padding: '10px 14px',
              background: 'var(--accent-soft)',
              borderRadius: 8,
              border: '1px solid rgba(22, 163, 74, 0.25)',
              fontSize: 12.5,
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600 }}>Government Entitlement Quota:</span>
              <span className="mono" style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>
                {calculatedQuota} Quintals
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--ink-muted)' }}>
              <span>New Remaining Quota:</span>
              <span className="mono" style={{ fontWeight: 600, color: newRemaining > 0 ? 'var(--success)' : 'var(--ink-muted)' }}>
                {newRemaining} Qtl {newRemaining === 0 && '(Completed)'}
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 2 }}>
              Calculated automatically using official norm: {yieldNorm} Qtl/Acre × {landNum || 0} Acres.
            </div>
          </div>

          {/* Grid: Season & Plot Reference */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="label" style={{ fontWeight: 600, marginBottom: 5, display: 'block' }}>
                Procurement Season *
              </label>
              <select
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', fontSize: 13, borderRadius: 6 }}
              >
                {SEASONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" style={{ fontWeight: 600, marginBottom: 5, display: 'block' }}>
                Land / Plot Reference
              </label>
              <input
                type="text"
                value={plotReference}
                onChange={(e) => setPlotReference(e.target.value)}
                placeholder="e.g. Survey Plot 104/A"
                style={{ width: '100%', padding: '8px 12px', fontSize: 13.5, borderRadius: 6 }}
              />
            </div>
          </div>

          {/* Registration Date */}
          <div>
            <label className="label" style={{ fontWeight: 600, marginBottom: 5, display: 'block' }}>
              Registration / Sowing Date *
            </label>
            <input
              type="date"
              value={registrationDate}
              onChange={(e) => setRegistrationDate(e.target.value)}
              required
              style={{ width: '100%', padding: '8px 12px', fontSize: 13.5, borderRadius: 6 }}
            />
            <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 3 }}>
              Official date of crop sowing or registration in government records.
            </div>
          </div>

          {/* Farmer Notes */}
          <div>
            <label className="label" style={{ fontWeight: 600, marginBottom: 5, display: 'block' }}>
              Farmer Remarks / Notes
            </label>
            <textarea
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Certified organic plot, drip irrigation installed..."
              style={{ width: '100%', padding: '8px 12px', fontSize: 13, borderRadius: 6, resize: 'vertical' }}
            />
          </div>

          {/* Modal Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={isSaving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              {isSaving ? 'Saving...' : '💾 Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
