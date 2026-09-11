import { useState, useMemo, useEffect } from 'react';
import { PREDEFINED_CROPS } from '../data/domain.js';
import { SEASONS } from '../services/eligibilityService.js';
import { CropRepository } from '../services/cropRepository.js';
import { createCrop } from '../services/backendData.js';
import { normalizeRealCrop } from '../services/realCrops.js';

export default function AddCropModal({ t, lang, farmer, crops = [], isOpen, onClose, onAddCrop, onSelectExistingCrop }) {
  const todayStr = new Date().toISOString().split('T')[0];

  const [cropMode, setCropMode] = useState('PREDEFINED'); // 'PREDEFINED' | 'CUSTOM'
  const [selectedCropId, setSelectedCropId] = useState(PREDEFINED_CROPS[0]?.id || 'paddy');
  const [searchQuery, setSearchQuery] = useState('');
  const [customCropName, setCustomCropName] = useState('');
  const [registrationDate, setRegistrationDate] = useState(todayStr);
  const [season, setSeason] = useState('Kharif 2026');
  const [plotReference, setPlotReference] = useState('Survey Plot 104/A');
  const [landArea, setLandArea] = useState(farmer?.landAcres || '2.0');
  const [expectedQty, setExpectedQty] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [duplicateCrop, setDuplicateCrop] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter predefined crops based on case-insensitive search query (Section 7)
  const filteredPredefined = useMemo(() => {
    if (!searchQuery.trim()) return PREDEFINED_CROPS;
    const q = searchQuery.toLowerCase().trim();
    return PREDEFINED_CROPS.filter(
      (c) =>
        c.en.toLowerCase().includes(q) ||
        (c.te && c.te.toLowerCase().includes(q)) ||
        (c.hi && c.hi.toLowerCase().includes(q)) ||
        c.id.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Reset form errors and search on modal open
  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setDuplicateCrop(null);
      setSuccessMsg('');
      setSearchQuery('');
      setSelectedCropId(PREDEFINED_CROPS[0]?.id || 'paddy');
    }
  }, [isOpen]);

  // Synchronize selectedCropId with filteredPredefined search matches immediately
  useEffect(() => {
    if (cropMode === 'PREDEFINED' && filteredPredefined.length > 0) {
      const isSelectedInFiltered = filteredPredefined.some((c) => c.id === selectedCropId);
      if (!isSelectedInFiltered) {
        setSelectedCropId(filteredPredefined[0].id);
      }
    }
  }, [filteredPredefined, cropMode, selectedCropId]);

  function handleSearchChange(e) {
    const val = e.target.value;
    setSearchQuery(val);
    setErrorMsg('');
    setDuplicateCrop(null);
    if (val.trim()) {
      const q = val.toLowerCase().trim();
      const match = PREDEFINED_CROPS.find(
        (c) =>
          c.en.toLowerCase().includes(q) ||
          (c.te && c.te.toLowerCase().includes(q)) ||
          (c.hi && c.hi.toLowerCase().includes(q)) ||
          c.id.toLowerCase().includes(q)
      );
      if (match) {
        setSelectedCropId(match.id);
      }
    }
  }

  if (!isOpen) return null;

  const landNum = parseFloat(landArea) || 0;
  const currentPredefinedObj =
    filteredPredefined.find((c) => c.id === selectedCropId) ||
    filteredPredefined[0] ||
    PREDEFINED_CROPS.find((c) => c.id === selectedCropId) ||
    PREDEFINED_CROPS[0];
  const yieldNorm = cropMode === 'CUSTOM' ? 12 : (currentPredefinedObj?.yieldPerAcre || 15);
  const expNum = parseFloat(expectedQty) || 0;
  const estimatedEntitlement = expNum > 0 ? expNum : Math.round(landNum * yieldNorm);

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg('');
    setDuplicateCrop(null);
    setSuccessMsg('');

    // Ensure effective crop id matches filtered search match if selectedCropId was out of sync
    let effectiveCropId = selectedCropId;
    if (cropMode === 'PREDEFINED') {
      const exists = filteredPredefined.some((c) => c.id === selectedCropId);
      if (!exists && filteredPredefined.length > 0) {
        effectiveCropId = filteredPredefined[0].id;
      }
    }

    const finalCropName =
      cropMode === 'CUSTOM'
        ? customCropName.trim()
        : (filteredPredefined.find((c) => c.id === effectiveCropId) || currentPredefinedObj)?.en || '';

    if (!finalCropName) {
      setErrorMsg('Please enter a crop name.');
      return;
    }

    // Duplicate check against this farmer's REAL registered crops (not local
    // browser storage), so it only blocks on crops that actually exist.
    const normalizedName = finalCropName.trim().toLowerCase();
    const existingActiveCrop = (crops || []).find((c) => {
      const isSameCrop = (c.normalizedCropName || (c.cropName || '').toLowerCase()) === normalizedName;
      const isSameSeason = c.season === season;
      const isCompleted = c.status === 'COMPLETED' || c.remainingQuantity === 0;
      const isInactive = c.status === 'INACTIVE' || c.status === 'ARCHIVED';
      return isSameCrop && isSameSeason && !isCompleted && !isInactive;
    });

    if (existingActiveCrop) {
      setErrorMsg(
        `"${finalCropName}" is already actively registered under your profile for ${season} (Remaining Quota: ${existingActiveCrop.remainingQuantity} Qtl). You can register a new quota cycle once current procurement is completed.`
      );
      setDuplicateCrop(existingActiveCrop);
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createCrop({
        crop_name: finalCropName,
        variety: plotReference || null,
        season,
        quantity: parseFloat(expectedQty) || estimatedEntitlement,
      });

      // Stamp with the farmer's business id (e.g. "FARMER-XXXX"), not the
      // backend's raw numeric farmer_id — BookSlot's ownership check compares
      // against farmer.farmerId, which uses the business id string.
      const normalized = { ...normalizeRealCrop(created), farmerId: farmer?.farmerId };
      const formattedDate = CropRepository.formatCropDate(normalized.registrationDate);
      setSuccessMsg(`✓ Crop registered successfully.\n${normalized.cropName} — Added on: ${formattedDate}`);
      onAddCrop(normalized);

      setTimeout(() => {
        setSuccessMsg('');
        setCustomCropName('');
        setExpectedQty('');
        setSearchQuery('');
        setNotes('');
        setCropMode('PREDEFINED');
        onClose();
      }, 900);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to register crop. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-head">
          <div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--ink-muted)', fontWeight: 700, marginBottom: 4 }}>
              {t.myCropsTitle || 'My Registered Crops'}
            </div>
            <h2 style={{ fontSize: 19, fontWeight: 700 }}>🌾 {t.addCrop || 'Register Crop for Procurement'}</h2>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">✕</button>
        </div>

        {errorMsg && (
          <div className="hint error" style={{ background: 'var(--critical-soft)', padding: '12px 14px', borderRadius: 8, marginBottom: 14, borderLeft: '4px solid var(--critical)' }}>
            <div style={{ fontWeight: 600 }}>⚠️ {errorMsg}</div>
            {duplicateCrop && (
              <div style={{ marginTop: 8 }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ fontSize: 12, padding: '4px 10px', background: 'var(--surface)' }}
                  onClick={() => {
                    onClose();
                    if (onSelectExistingCrop) onSelectExistingCrop(duplicateCrop);
                  }}
                >
                  🔍 View Existing Crop ({duplicateCrop.cropName}) →
                </button>
              </div>
            )}
          </div>
        )}

        {successMsg && (
          <div className="hint" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', padding: '12px 14px', borderRadius: 8, marginBottom: 14, borderLeft: '4px solid var(--accent)', fontWeight: 600, whiteSpace: 'pre-line' }}>
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Mode Selector Tabs (Section 6 & 8) */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
            <button
              type="button"
              className={`btn ${cropMode === 'PREDEFINED' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: 13, padding: '7px 14px', borderRadius: 6 }}
              onClick={() => {
                setCropMode('PREDEFINED');
                setErrorMsg('');
                setDuplicateCrop(null);
              }}
            >
              📋 Common Crops List
            </button>
            <button
              type="button"
              className={`btn ${cropMode === 'CUSTOM' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: 13, padding: '7px 14px', borderRadius: 6 }}
              onClick={() => {
                setCropMode('CUSTOM');
                setErrorMsg('');
                setDuplicateCrop(null);
              }}
            >
              ➕ Other / Add Custom Crop
            </button>
          </div>

          {cropMode === 'PREDEFINED' ? (
            <>
              {/* Search Crop Input (Section 7) */}
              <div className="field" style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 12 }}>🔍 Search Predefined Crops</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Type to search e.g. Paddy, Wheat, Cotton, Mustard, Jowar..."
                  style={{ fontSize: 13 }}
                />
              </div>

              <div className="field">
                <label>{t.cropType || 'Crop Type'} *</label>
                <select
                  value={selectedCropId}
                  onChange={(e) => setSelectedCropId(e.target.value)}
                  style={{ fontWeight: 600, fontSize: 13.5 }}
                >
                  {filteredPredefined.length === 0 ? (
                    <option value="" disabled>No matching crops — click "Other / Add Custom Crop" tab</option>
                  ) : (
                    filteredPredefined.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c[lang] || c.en} (MSP ₹{c.msp}/Qtl · Norm: {c.yieldPerAcre} Qtl/Acre)
                      </option>
                    ))
                  )}
                </select>
              </div>

              {filteredPredefined.length === 0 && (
                <div style={{ margin: '6px 0 14px' }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ fontSize: 12, color: 'var(--accent)', padding: '4px 8px' }}
                    onClick={() => {
                      setCropMode('CUSTOM');
                      setCustomCropName(searchQuery);
                    }}
                  >
                    + Register "{searchQuery}" as a custom crop →
                  </button>
                </div>
              )}
            </>
          ) : (
            /* Custom Crop Entry (Section 8, 9, 14, 52, 53) */
            <div className="field" style={{ background: 'var(--surface-2)', padding: '12px 14px', borderRadius: 8, marginBottom: 14 }}>
              <label style={{ color: 'var(--ink)', fontWeight: 600 }}>
                🌱 Custom Crop Name *
              </label>
              <input
                type="text"
                value={customCropName}
                onChange={(e) => setCustomCropName(e.target.value)}
                placeholder="e.g. Lady Finger, Dragon Fruit, Custard Apple..."
                autoFocus
                required
                style={{ fontWeight: 600, fontSize: 14, background: 'var(--surface)' }}
              />
              <div className="hint" style={{ marginTop: 6, fontSize: 11.5 }}>
                Your entered crop name is strictly preserved. Custom crops are marked with <strong>Verification Required</strong> status until verified by the mandi cell.
              </div>
            </div>
          )}

          {/* Registration Date (Section 10 & 11) */}
          <div className="field-row">
            <div className="field">
              <label>📅 Crop Registration Date *</label>
              <input
                type="date"
                value={registrationDate}
                max={new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0]}
                onChange={(e) => setRegistrationDate(e.target.value)}
                required
              />
              <div className="hint" style={{ fontSize: 11, marginTop: 3 }}>
                Added on: <strong>{CropRepository.formatCropDate(registrationDate)}</strong>
              </div>
            </div>

            <div className="field">
              <label>{t.season || 'Procurement Season'} *</label>
              <select value={season} onChange={(e) => setSeason(e.target.value)}>
                {SEASONS.map((s) => (
                  <option key={s.id} value={`${s[lang] || s.en} 2026`}>
                    {s[lang] || s.en} 2026
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Land / Plot Reference (Section 5 & 49) */}
          <div className="field">
            <label>📍 Land / Plot Reference (Survey Number)</label>
            <input
              type="text"
              value={plotReference}
              onChange={(e) => setPlotReference(e.target.value)}
              placeholder="e.g. Survey Plot #104/A, Field Unit 2"
            />
          </div>

          <div className="field-row">
            <div className="field">
              <label>{t.landArea || 'Cultivated Land (Acres)'} *</label>
              <input
                type="number"
                min="0.1"
                max="500"
                step="0.1"
                value={landArea}
                onChange={(e) => setLandArea(e.target.value)}
                placeholder="2.0"
                required
              />
            </div>

            <div className="field">
              <label>{t.expectedQty || 'Expected Harvest (Qtl)'} *</label>
              <input
                type="number"
                min="1"
                step="1"
                value={expectedQty}
                onChange={(e) => setExpectedQty(e.target.value)}
                placeholder={String(estimatedEntitlement || 30)}
                required
              />
            </div>
          </div>

          {/* Government Entitlement Derived from Norms (Section 22) */}
          <div className="eligibility-box" style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--accent)' }}>
                🏛️ Government Entitlement Quota:
              </div>
              <span className={`badge ${cropMode === 'CUSTOM' ? 'warn' : 'success'}`} style={{ fontSize: 11 }}>
                {cropMode === 'CUSTOM' ? 'Verification Required' : 'Eligible for Procurement'}
              </span>
            </div>
            <div className="mono" style={{ fontSize: 20, fontWeight: 700, margin: '4px 0' }}>
              {estimatedEntitlement} <span style={{ fontSize: 13 }}>Quintals (Qtl)</span>
            </div>
            <div className="hint" style={{ fontSize: 11.5 }}>
              Standard state yield norm: {yieldNorm} Qtl/acre for{' '}
              {cropMode === 'CUSTOM' ? (customCropName.trim() || 'Custom Crop') : (currentPredefinedObj?.[lang] || currentPredefinedObj?.en)}.
            </div>
          </div>

          {/* Optional Notes */}
          <div className="field" style={{ marginBottom: 16 }}>
            <label>📝 Farmer Notes (Optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Organic cultivation, Certified seed variety"
            />
          </div>

          <div className="btn-row">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              {t.back || 'Cancel'}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 1, justifyContent: 'center' }}
              disabled={(cropMode === 'CUSTOM' && !customCropName.trim()) || isSubmitting}
            >
              {isSubmitting ? 'Registering...' : `✓ ${t.addCrop || 'Register Crop to Profile'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
