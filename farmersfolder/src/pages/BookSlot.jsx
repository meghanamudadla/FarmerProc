import { useState, useEffect, useMemo, Fragment } from 'react';
import { CENTRES, SLOT_TIMES, cropById } from '../data/domain.js';
import { MockEligibilityService } from '../services/eligibilityService.js';
import { CentreService } from '../services/centreService.js';
import { BookingEngine } from '../services/bookingEngine.js';
import { CropRepository } from '../services/cropRepository.js';
import { offlineSyncService } from '../services/offlineSyncService.js';
import BookingReviewModal from '../components/BookingReviewModal.jsx';

export default function BookSlot({
  t, lang, profileComplete, setPage,
  bookStep, setBookStep, form, setForm, farmer, crops = [], bookings = [],
  spotsLeft, bank, setBank, confirmBooking,
}) {
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [alternativeSlots, setAlternativeSlots] = useState(null);

  // Normalize all crops passed in to guarantee standard fields (status, remainingQuantity, cropName, etc.)
  const normalizedFarmerCrops = useMemo(() => {
    return (crops || []).map((c) => CropRepository.normalizeCropRecord(c));
  }, [crops]);

  // Filter crops belonging to the authenticated farmer
  const isFarmerMatch = (id) =>
    !id ||
    id === farmer?.farmerId ||
    ((farmer?.farmerId === 'FRM-10245' || farmer?.farmerId === 'FARM-91234567') &&
      (id === 'FRM-10245' || id === 'FARM-91234567'));

  const farmerRegisteredCrops = normalizedFarmerCrops.filter(
    (c) => isFarmerMatch(c.farmerId) && c.status !== 'INACTIVE' && c.status !== 'ARCHIVED'
  );

  // Active selectable crops: Active + remaining quantity > 0
  const selectableCrops = farmerRegisteredCrops.filter(
    (c) => c.status === 'ACTIVE' && (c.remainingQuantity > 0 || c.entitlementQuantity > (c.procuredQuantity || 0))
  );


  // Currently selected registered crop
  // Priority 1: Match specifically by unique cropRecordId in selectable crops
  // Priority 2: Match specifically by unique cropRecordId in all farmer crops
  // Priority 3: Fallback match ONLY if no cropRecordId is defined
  // Priority 4: Default to first selectable crop
  const selectedCropRec =
    (form.cropRecordId && selectableCrops.find((c) => c.cropRecordId === form.cropRecordId)) ||
    (form.cropRecordId && farmerRegisteredCrops.find((c) => c.cropRecordId === form.cropRecordId)) ||
    (!form.cropRecordId && form.cropId && selectableCrops.find((c) => c.cropId === form.cropId)) ||
    (!form.cropRecordId && form.cropText && selectableCrops.find((c) => c.cropName === form.cropText)) ||
    selectableCrops[0] ||
    farmerRegisteredCrops[0];

  // Sync form state with the active registered crop (Section 18 & 44: Reference existing cropId)
  useEffect(() => {
    if (selectedCropRec && (!form.cropRecordId || form.cropRecordId !== selectedCropRec.cropRecordId)) {
      setForm((prev) => ({
        ...prev,
        cropRecordId: selectedCropRec.cropRecordId,
        cropId: selectedCropRec.cropId,
        cropText: selectedCropRec.cropName,
      }));
    }
  }, [selectedCropRec?.cropRecordId]);

  // Active booking check (Double booking protection)
  const activeBooking = BookingEngine.getActiveBooking(bookings);

  // Authoritative remaining quantity strictly from the selected individual crop record
  const remainingQty = selectedCropRec?.remainingQuantity != null
    ? selectedCropRec.remainingQuantity
    : 0;

  const selectedCentreObj = CENTRES.find((c) => c.id === form.centreId) || CENTRES[0];
  const centreCapValidation = CentreService.validateCapacityForBooking(selectedCentreObj);

  const reqQty = parseFloat(form.qty) || 0;
  const exceedsRemaining = remainingQty != null && reqQty > remainingQty;

  function handleCropChange(cropRecordId) {
    const rec = farmerRegisteredCrops.find((c) => c.cropRecordId === cropRecordId);
    if (rec) {
      setForm((prev) => {
        const nextQty = prev.qty && parseFloat(prev.qty) > rec.remainingQuantity ? '' : prev.qty;
        return {
          ...prev,
          cropRecordId: rec.cropRecordId,
          cropId: rec.cropId,
          cropText: rec.cropName,
          qty: nextQty,
        };
      });
    }
  }

  function handleFinalSubmit() {
    setBookingError('');
    setIsSubmitting(true);

    // Section 37: Offline Mode Validation
    if (offlineSyncService.isOffline()) {
      offlineSyncService.queueOfflineBooking({
        form: {
          ...form,
          cropRecordId: selectedCropRec?.cropRecordId,
          cropId: selectedCropRec?.cropId,
          cropText: selectedCropRec?.cropName,
        },
        farmer,
        bank,
      });
      setIsSubmitting(false);
      setIsReviewOpen(false);
      alert('📡 Offline Request Saved: Internet connection is required to confirm your booking. Your request has been queued and will be verified by the mandi server once reconnected.');
      setPage('dashboard');
      return;
    }

    // Backend Validation Pipeline (Sections 32 & 41)
    const result = BookingEngine.validateAndProcessBooking({
      farmer,
      crops: farmerRegisteredCrops,
      matchedCrop: selectedCropRec
        ? {
            id: selectedCropRec.cropId,
            cropRecordId: selectedCropRec.cropRecordId,
            en: selectedCropRec.cropName,
            msp: cropById(selectedCropRec.cropId)?.msp || 1500,
            yieldPerAcre: 15,
          }
        : null,
      requestedQty: form.qty,
      centre: selectedCentreObj,
      date: form.date,
      slotIdx: form.slotIdx,
      slotTimes: SLOT_TIMES,
      bankDetails: bank,
      existingBookings: bookings,
    });

    setIsSubmitting(false);

    if (!result.success) {
      setIsReviewOpen(false);
      setBookingError(result.errorMessage);
      if (result.alternativeSlots) {
        setAlternativeSlots(result.alternativeSlots);
      }
      return;
    }

    setIsReviewOpen(false);
    confirmBooking(result.booking);
  }

  return (
    <div className="card pad-lg" style={{ maxWidth: 840, border: '1px solid var(--border)' }}>
      <div className="section-title">
        <div>
          <h2 style={{ fontSize: 19 }}>📅 {t.bookSlot || 'Book Procurement Slot'}</h2>
          <div style={{ fontSize: 12.5, color: 'var(--ink-muted)', marginTop: 2 }}>
            National Mandi E-Token Reservation System · Verified Registered Crops Only
          </div>
        </div>
        {activeBooking && (
          <span className="badge warn">
            ⚠️ Active Booking: {activeBooking.token}
          </span>
        )}
      </div>

      {/* Double Booking Warning Banner */}
      {activeBooking && activeBooking.status !== 'cancelled' && (
        <div className="hint error" style={{ background: 'var(--critical-soft)', padding: '12px 16px', borderRadius: 8, marginBottom: 16, borderLeft: '4px solid var(--critical)' }}>
          ⛔ <strong>Active Booking In Progress:</strong> You already have an active procurement token (<strong>{activeBooking.token}</strong>). Please complete or cancel it before reserving another slot.
          <div style={{ marginTop: 6 }}>
            <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setPage('queue')}>
              Go to Active Queue ({activeBooking.token}) →
            </button>
          </div>
        </div>
      )}

      {!profileComplete ? (
        <div className="eligibility-box" style={{ borderColor: 'var(--critical)', background: 'var(--critical-soft)' }}>
          {t.profileNeeded}
          <div style={{ marginTop: 10 }}>
            <button className="btn btn-primary" onClick={() => setPage('profile')}>
              {t.goToProfile}
            </button>
          </div>
        </div>
      ) : farmerRegisteredCrops.length === 0 ? (
        /* SECTION 33: NO REGISTERED CROPS */
        <div className="card empty-note" style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--surface-2)', border: '1px dashed var(--border)' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🌾</div>
          <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8, color: 'var(--ink)' }}>
            No eligible crops are registered.
          </h3>
          <p style={{ color: 'var(--ink-muted)', fontSize: 13.5, maxWidth: 520, margin: '0 auto 18px', lineHeight: 1.5 }}>
            Under official procurement policy, you can only book a mandi slot for crops registered under your profile ({farmer?.fullName || 'Farmer'}).
            Please register your harvested crops in My Crops first.
          </p>
          <button className="btn btn-primary" onClick={() => setPage('myCrops')}>
            ➕ Go to My Crops to Register
          </button>
        </div>
      ) : selectableCrops.length === 0 ? (
        /* SECTION 34: REGISTERED CROPS EXIST BUT NONE ELIGIBLE / ALL COMPLETED */
        <div className="card empty-note" style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--surface-2)', border: '1px dashed var(--border)' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>⏳</div>
          <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8, color: 'var(--ink)' }}>
            You have registered crops, but none are currently eligible for procurement.
          </h3>
          <p style={{ color: 'var(--ink-muted)', fontSize: 13.5, maxWidth: 520, margin: '0 auto 18px', lineHeight: 1.5 }}>
            Your registered crops are either fully procured (completed) or pending administrative verification. You can review their status in My Crops.
          </p>
          <button className="btn btn-primary" onClick={() => setPage('myCrops')}>
            🌾 View My Crops
          </button>
        </div>
      ) : (
        <>
          {/* Wizard Step Progress */}
          <div className="steps">
            {[1, 2, 3, 4].map((s, i) => (
              <Fragment key={s}>
                <div className={'step-dot ' + (bookStep > s ? 'done' : bookStep === s ? 'current' : '')}>{s}</div>
                {i < 3 && <div className={'step-line ' + (bookStep > s ? 'done' : '')}></div>}
              </Fragment>
            ))}
          </div>

          {bookingError && (
            <div className="hint error" style={{ background: 'var(--critical-soft)', padding: '12px 16px', borderRadius: 8, marginBottom: 16, borderLeft: '4px solid var(--critical)' }}>
              🚨 <strong>Backend Validation Error:</strong> {bookingError}
              {alternativeSlots && alternativeSlots.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <strong>Alternative Available Slots for {form.date}:</strong>
                  <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                    {alternativeSlots.map((s) => (
                      <button
                        key={s.idx}
                        className="btn btn-ghost"
                        style={{ padding: '4px 8px', fontSize: 11.5 }}
                        onClick={() => {
                          setForm({ ...form, slotIdx: s.idx });
                          setBookingError('');
                          setAlternativeSlots(null);
                        }}
                      >
                        {s.time}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 1: Crop & Quantity (Sections 18, 29, 30, 31) */}
          {bookStep === 1 && (
            <>
              <div className="section-title">
                <h3 style={{ fontSize: 15 }}>Step 1: Select Registered Crop & Planned Delivery Quantity</h3>
              </div>

              <div className="field-row">
                <div className="field">
                  <label>{t.cropType || 'Select Registered Crop'} *</label>
                  <select
                    value={selectedCropRec?.cropRecordId || ''}
                    onChange={(e) => handleCropChange(e.target.value)}
                    style={{ fontWeight: 600, fontSize: 14 }}
                  >
                    {selectableCrops.map((c) => (
                      <option key={c.cropRecordId} value={c.cropRecordId}>
                        {c.cropName} ({c.season}) — Remaining: {c.remainingQuantity} Qtl {c.plotReference ? `· ${c.plotReference}` : ''}
                      </option>
                    ))}
                  </select>
                  <div className="hint" style={{ marginTop: 4, fontSize: 11.5 }}>
                    Loaded from My Crops database for profile {farmer?.farmerId}.
                  </div>
                </div>

                <div className="field">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label>{t.expectedQty || 'Planned Delivery Quantity (Qtl)'} *</label>
                    {selectedCropRec && (
                      <span style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>
                        Actual crop limit: <strong style={{ color: 'var(--accent)' }}>{remainingQty} Qtl</strong>
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    min="1"
                    max={remainingQty || 500}
                    value={form.qty}
                    onChange={(e) => setForm({ ...form, qty: e.target.value })}
                    placeholder={`e.g. 20 (Max: ${remainingQty} Qtl)`}
                    style={{
                      fontWeight: 600,
                      borderColor: exceedsRemaining ? 'var(--critical)' : undefined,
                    }}
                  />
                  <div
                    className="hint"
                    style={{
                      marginTop: 4,
                      fontSize: 11.5,
                      color: exceedsRemaining ? 'var(--critical)' : 'var(--ink-muted)',
                      fontWeight: exceedsRemaining ? 600 : 400,
                    }}
                  >
                    {exceedsRemaining
                      ? `⚠️ Expected quantity must be lower than or equal to the actual crop quantity (${remainingQty} Qtl). Cannot book ${reqQty} Qtl.`
                      : `Expected quantity must be lower than or equal to this crop's actual limit (${remainingQty} Qtl), not overall crops total.`}
                  </div>

                  {/* Quick Select Quantity Chips */}
                  <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                    {remainingQty >= 10 && (
                      <button
                        type="button"
                        className="badge-filter"
                        style={{ padding: '3px 8px', fontSize: 11 }}
                        onClick={() => setForm({ ...form, qty: '10' })}
                      >
                        +10 Qtl
                      </button>
                    )}
                    {remainingQty >= 20 && (
                      <button
                        type="button"
                        className="badge-filter"
                        style={{ padding: '3px 8px', fontSize: 11 }}
                        onClick={() => setForm({ ...form, qty: '20' })}
                      >
                        +20 Qtl
                      </button>
                    )}
                    {remainingQty >= 50 && (
                      <button
                        type="button"
                        className="badge-filter"
                        style={{ padding: '3px 8px', fontSize: 11 }}
                        onClick={() => setForm({ ...form, qty: '50' })}
                      >
                        +50 Qtl
                      </button>
                    )}
                    {remainingQty >= 100 && (
                      <button
                        type="button"
                        className="badge-filter"
                        style={{ padding: '3px 8px', fontSize: 11 }}
                        onClick={() => setForm({ ...form, qty: '100' })}
                      >
                        +100 Qtl
                      </button>
                    )}
                    {remainingQty > 0 && (
                      <button
                        type="button"
                        className="badge-filter active"
                        style={{ padding: '3px 8px', fontSize: 11, background: 'var(--accent)', color: '#fff', border: 'none' }}
                        onClick={() => setForm({ ...form, qty: String(remainingQty) })}
                      >
                        ⚡ Full Actual Crop Quota ({remainingQty} Qtl)
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Authoritative Quota & Entitlement Information (Section 22) */}
              {selectedCropRec && (
                <div
                  className="card"
                  style={{
                    background: exceedsRemaining ? 'var(--critical-soft)' : 'var(--surface-2)',
                    borderColor: exceedsRemaining ? 'var(--critical)' : 'var(--border)',
                    padding: '12px 14px',
                    borderRadius: 8,
                    margin: '12px 0 16px',
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, fontSize: 12.5 }}>
                    <div>
                      <div className="label">Registered Crop</div>
                      <div style={{ fontWeight: 700 }}>
                        {selectedCropRec.cropName} (ID: <span className="mono">{selectedCropRec.cropRecordId}</span>)
                      </div>
                    </div>
                    <div>
                      <div className="label">Govt Entitlement</div>
                      <div className="mono" style={{ fontWeight: 700, color: 'var(--accent)' }}>
                        {selectedCropRec.entitlementQuantity || selectedCropRec.eligibleQty} Qtl
                      </div>
                    </div>
                    <div>
                      <div className="label">Already Procured</div>
                      <div className="mono" style={{ fontWeight: 600 }}>
                        {selectedCropRec.procuredQuantity || selectedCropRec.alreadyProcuredQty || 0} Qtl
                      </div>
                    </div>
                    <div>
                      <div className="label">Actual Remaining Quota</div>
                      <div
                        className="mono"
                        style={{
                          fontWeight: 700,
                          color: remainingQty > 0 ? 'var(--success)' : 'var(--critical)',
                        }}
                      >
                        {remainingQty} Qtl
                      </div>
                    </div>
                  </div>

                  {reqQty > 0 && !exceedsRemaining && (
                    <div
                      style={{
                        marginTop: 12,
                        paddingTop: 10,
                        borderTop: '1px solid var(--border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 8,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>
                          💰 Estimated MSP Value (Provisional):
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--success)' }}>
                          ₹{Math.round(reqQty * (cropById(selectedCropRec.cropId)?.msp || 1500)).toLocaleString('en-IN')}
                          <span style={{ fontSize: 11.5, fontWeight: 400, color: 'var(--ink-muted)', marginLeft: 6 }}>
                            ({reqQty} Qtl × ₹{(cropById(selectedCropRec.cropId)?.msp || 1500).toLocaleString('en-IN')}/Qtl MSP)
                          </span>
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--ink-muted)', textAlign: 'right', maxWidth: 300 }}>
                        ⚖️ <em>Estimated payout only. Actual weight and final DBT payout are verified at the mandi weighbridge upon arrival.</em>
                      </div>
                    </div>
                  )}

                  {exceedsRemaining && (
                    <div style={{ color: 'var(--critical)', fontWeight: 700, fontSize: 12.5, marginTop: 8 }}>
                      ⛔ REJECTED: Expected quantity ({reqQty} Qtl) exceeds the actual available crop quantity for {selectedCropRec.cropName} ({remainingQty} Qtl). The quantity must be lower than or equal to {remainingQty} Qtl (individual crop quota, not overall crops).
                    </div>
                  )}
                </div>
              )}

              <div className="btn-row" style={{ marginTop: 20 }}>
                <button
                  className="btn btn-primary"
                  disabled={!form.qty || exceedsRemaining || reqQty <= 0 || !!activeBooking}
                  onClick={() => setBookStep(2)}
                >
                  Continue to Centre Selection →
                </button>
              </div>
            </>
          )}

          {/* STEP 2: Centre & Date */}
          {bookStep === 2 && (
            <>
              <div className="section-title">
                <h3 style={{ fontSize: 15 }}>Step 2: {t.centreSchedule || 'Select Mandi Centre & Date'}</h3>
              </div>
              <div className="field">
                <label>{t.procurementCentre || 'Procurement Centre'}</label>
                <select value={form.centreId} onChange={(e) => setForm({ ...form, centreId: e.target.value })}>
                  {CENTRES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c[lang] || c.en} ({c.place}) — {c.operatingStatus === 'OPEN' ? `${Math.max(0, c.dailyFarmerCapacity - c.currentBookedCapacity)} spots left` : c.operatingStatus}
                    </option>
                  ))}
                </select>
              </div>

              {!centreCapValidation.valid && (
                <div className="hint error" style={{ background: 'var(--critical-soft)', padding: '10px 14px', borderRadius: 8, marginBottom: 12 }}>
                  ⛔ <strong>Centre Rejection:</strong> {centreCapValidation.reason}. Select an open centre from <strong>"Find Centres"</strong>.
                </div>
              )}

              <div className="field">
                <label>{t.preferredDate || 'Preferred Date'}</label>
                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>

              <div className="btn-row">
                <button className="btn btn-ghost" onClick={() => setBookStep(1)}>
                  ← Back
                </button>
                <button className="btn btn-primary" disabled={!centreCapValidation.valid} onClick={() => setBookStep(3)}>
                  View Available Time Slots →
                </button>
              </div>
            </>
          )}

          {/* STEP 3: Slot Status Picker */}
          {bookStep === 3 && (
            <>
              <div className="section-title">
                <h3 style={{ fontSize: 15 }}>Step 3: {t.selectTimeSlot || 'Choose Arrival Time Slot'}</h3>
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-muted)', marginBottom: 10 }}>
                {form.date} · {selectedCentreObj ? (selectedCentreObj[lang] || selectedCentreObj.en) : ''}
              </div>

              <div className="slot-grid">
                {SLOT_TIMES.map((time, idx) => {
                  const left = spotsLeft(form.centreId, form.date, idx);
                  const status = BookingEngine.getSlotStatus({
                    date: form.date,
                    timeSlotStr: time,
                    bookedCount: 20 - left,
                    capacityLimit: 20,
                    centreStatus: selectedCentreObj?.operatingStatus,
                  });
                  const isFullOrClosed = status !== 'AVAILABLE';

                  return (
                    <button
                      type="button"
                      key={idx}
                      disabled={isFullOrClosed}
                      className={'slot-card' + (form.slotIdx === idx ? ' selected' : '') + (isFullOrClosed ? ' full' : '')}
                      onClick={() => setForm({ ...form, slotIdx: idx })}
                    >
                      <div className="slot-time">{time}</div>
                      <div style={{ margin: '6px 0' }}>
                        <span className={`badge ${status === 'AVAILABLE' ? 'success' : status === 'FULL' ? 'critical' : 'neutral'}`} style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px' }}>
                          {status}
                        </span>
                      </div>
                      <div className={'slot-spots' + (isFullOrClosed ? ' none' : left <= 5 ? ' low' : '')}>
                        {isFullOrClosed ? status : (t.spotsLeft ? t.spotsLeft(left) : `${left} spots left`)}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="btn-row">
                <button className="btn btn-ghost" onClick={() => setBookStep(2)}>
                  ← Back
                </button>
                <button className="btn btn-primary" disabled={form.slotIdx == null} onClick={() => setBookStep(4)}>
                  Continue to Payout & Review →
                </button>
              </div>
            </>
          )}

          {/* STEP 4: Bank Payout & Final Confirmation Trigger */}
          {bookStep === 4 && (
            <>
              <div className="section-title">
                <h3 style={{ fontSize: 15 }}>Step 4: {t.bankDetails || 'Direct Benefit Transfer (DBT) Account'}</h3>
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-muted)', marginBottom: 12 }}>
                Verified bank account for direct payment transfer upon weighment confirmation.
              </div>

              <div className="field">
                <label>{t.accHolder || 'Account Holder Name'}</label>
                <input type="text" value={bank.holder} onChange={(e) => setBank({ ...bank, holder: e.target.value })} placeholder="e.g. Ravi Kumar" />
              </div>
              <div className="field-row">
                <div className="field">
                  <label>{t.bankName || 'Bank Name'}</label>
                  <input type="text" value={bank.bankName} onChange={(e) => setBank({ ...bank, bankName: e.target.value })} placeholder="SBI" />
                </div>
                <div className="field">
                  <label>{t.ifsc || 'IFSC Code'}</label>
                  <input type="text" value={bank.ifsc} onChange={(e) => setBank({ ...bank, ifsc: e.target.value })} placeholder="SBIN0003422" />
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>{t.accNumber || 'Bank Account Number'}</label>
                  <input type="text" value={bank.acc} onChange={(e) => setBank({ ...bank, acc: e.target.value })} placeholder="•••• •••• 3422" />
                </div>
                <div className="field">
                  <label>{t.confirmAcc || 'Confirm Account Number'}</label>
                  <input type="text" value={bank.confirmAcc} onChange={(e) => setBank({ ...bank, confirmAcc: e.target.value })} placeholder="•••• •••• 3422" />
                </div>
              </div>

              <div className="btn-row">
                <button className="btn btn-ghost" onClick={() => setBookStep(3)}>
                  ← Back
                </button>
                <button
                  className="btn btn-primary"
                  disabled={!bank.holder || !bank.acc || bank.acc !== bank.confirmAcc || !bank.ifsc}
                  onClick={() => setIsReviewOpen(true)}
                >
                  🔍 Review Booking & Reserve Slot →
                </button>
              </div>
            </>
          )}
        </>
      )}

      {/* Final Booking Review & Atomic Lock Modal */}
      <BookingReviewModal
        t={t}
        lang={lang}
        form={form}
        matchedCrop={
          selectedCropRec
            ? {
                id: selectedCropRec.cropId,
                cropRecordId: selectedCropRec.cropRecordId,
                en: selectedCropRec.cropName,
                msp: cropById(selectedCropRec.cropId)?.msp || 1500,
              }
            : null
        }
        farmer={farmer}
        bank={bank}
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        onConfirmBooking={handleFinalSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
