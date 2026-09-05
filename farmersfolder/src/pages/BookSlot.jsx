import { Fragment } from 'react';
import { CROPS, CENTRES, SLOT_TIMES } from '../data/domain.js';

export default function BookSlot({
  t, lang, profileComplete, setPage,
  bookStep, setBookStep, form, setForm, matchedCrop, eligibleQty, overLimit, farmer,
  spotsLeft, bank, setBank, confirmBooking,
}) {
  return (
    <div className="card pad-lg" style={{ maxWidth: 820 }}>
      <h2 style={{ fontSize: 19, marginBottom: 16 }}>{t.bookSlot}</h2>

      {!profileComplete ? (
        <div className="eligibility-box" style={{ borderColor: 'var(--critical)', background: 'var(--critical-soft)' }}>
          {t.profileNeeded}
          <div style={{ marginTop: 10 }}>
            <button className="btn btn-primary" onClick={() => setPage('profile')}>
              {t.goToProfile}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="steps">
            {[1, 2, 3].map((s, i) => (
              <Fragment key={s}>
                <div className={'step-dot ' + (bookStep > s ? 'done' : bookStep === s ? 'current' : '')}>{s}</div>
                {i < 2 && <div className={'step-line ' + (bookStep > s ? 'done' : '')}></div>}
              </Fragment>
            ))}
          </div>

          {bookStep === 1 && (
            <>
              <div className="section-title">
                <h2 style={{ fontSize: 14 }}>{t.cropDetails}</h2>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>{t.cropType}</label>
                  <input
                    type="text"
                    list="crop-suggestions"
                    value={form.cropText}
                    onChange={(e) => setForm({ ...form, cropText: e.target.value })}
                    placeholder={lang === 'en' ? 'Type your crop — e.g. Paddy, Onion, Turmeric...' : 'మీ పంట టైప్ చేయండి — ఉదా. వరి, ఉల్లిపాయ...'}
                  />
                  <datalist id="crop-suggestions">
                    {CROPS.map((c) => (
                      <option key={c.id} value={c[lang]}>{`MSP ₹${c.msp}/qtl`}</option>
                    ))}
                  </datalist>
                  <div className="hint">
                    {matchedCrop
                      ? `MSP ₹${matchedCrop.msp}/qtl · ${lang === 'en' ? 'notified crop' : 'నోటిఫై చేయబడిన పంట'}`
                      : form.cropText.trim()
                      ? lang === 'en'
                        ? "Not on the standard MSP list — the centre will confirm today's rate on arrival."
                        : 'ప్రామాణిక MSP జాబితాలో లేదు — కేంద్రం ధరను నిర్ధారిస్తుంది.'
                      : lang === 'en'
                      ? 'Start typing to see MSP-notified crops, or enter any crop you grow.'
                      : 'MSP పంటలు చూడటానికి టైప్ చేయండి, లేదా మీరు పండించే ఏ పంటనైనా enter చేయండి.'}
                  </div>
                </div>
                <div className="field">
                  <label>{t.expectedQty}</label>
                  <input type="number" min="0" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} />
                </div>
              </div>
              {eligibleQty != null && (
                <div className="eligibility-box" style={overLimit ? { borderColor: 'var(--critical)', background: 'var(--critical-soft)' } : {}}>
                  {overLimit ? t.overLimit(eligibleQty) : t.eligible(eligibleQty, farmer.landAcres, matchedCrop[lang])}
                </div>
              )}
              <div className="divider"></div>
              <div className="section-title">
                <h2 style={{ fontSize: 14 }}>{t.centreSchedule}</h2>
              </div>
              <div className="field">
                <label>{t.procurementCentre}</label>
                <select value={form.centreId} onChange={(e) => setForm({ ...form, centreId: e.target.value })}>
                  {CENTRES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c[lang]} ({c.place})
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>{t.preferredDate}</label>
                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="btn-row">
                <button className="btn btn-primary" disabled={!form.qty || !form.cropText.trim() || overLimit} onClick={() => setBookStep(2)}>
                  {t.checkAvail} →
                </button>
              </div>
            </>
          )}

          {bookStep === 2 && (
            <>
              <div className="label" style={{ marginBottom: 2 }}>
                {t.selectTimeSlot}
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-muted)', marginBottom: 4 }}>
                {form.date} · {CENTRES.find((c) => c.id === form.centreId)[lang]}
              </div>
              <div className="slot-grid">
                {SLOT_TIMES.map((time, idx) => {
                  const left = spotsLeft(form.centreId, form.date, idx);
                  const isFull = left <= 0;
                  return (
                    <button key={idx} disabled={isFull} className={'slot-card' + (form.slotIdx === idx ? ' selected' : '') + (isFull ? ' full' : '')} onClick={() => setForm({ ...form, slotIdx: idx })}>
                      <div className="slot-time">{time}</div>
                      <div className={'slot-spots' + (isFull ? ' none' : left <= 5 ? ' low' : '')}>{isFull ? t.full : t.spotsLeft(left)}</div>
                    </button>
                  );
                })}
              </div>
              <div className="btn-row">
                <button className="btn btn-ghost" onClick={() => setBookStep(1)}>
                  ← {t.back}
                </button>
                <button className="btn btn-primary" disabled={form.slotIdx == null} onClick={() => setBookStep(3)}>
                  {t.continueToPayment} →
                </button>
              </div>
            </>
          )}

          {bookStep === 3 && (
            <>
              <div className="section-title">
                <h2 style={{ fontSize: 14 }}>{t.bankDetails}</h2>
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-muted)', marginBottom: 12 }}>{t.bankTag}</div>
              <div className="field">
                <label>{t.accHolder}</label>
                <input type="text" value={bank.holder} onChange={(e) => setBank({ ...bank, holder: e.target.value })} placeholder="e.g. Ravi Kumar" />
              </div>
              <div className="field-row">
                <div className="field">
                  <label>{t.bankName}</label>
                  <input type="text" value={bank.bankName} onChange={(e) => setBank({ ...bank, bankName: e.target.value })} placeholder="SBI" />
                </div>
                <div className="field">
                  <label>{t.ifsc}</label>
                  <input type="text" value={bank.ifsc} onChange={(e) => setBank({ ...bank, ifsc: e.target.value })} placeholder="SBIN0003422" />
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>{t.accNumber}</label>
                  <input type="text" value={bank.acc} onChange={(e) => setBank({ ...bank, acc: e.target.value })} />
                </div>
                <div className="field">
                  <label>{t.confirmAcc}</label>
                  <input type="text" value={bank.confirmAcc} onChange={(e) => setBank({ ...bank, confirmAcc: e.target.value })} />
                </div>
              </div>
              <div className="btn-row">
                <button className="btn btn-ghost" onClick={() => setBookStep(2)}>
                  ← {t.back}
                </button>
                <button className="btn btn-primary" disabled={!bank.holder || !bank.acc || bank.acc !== bank.confirmAcc || !bank.ifsc} onClick={confirmBooking}>
                  {t.confirmBook} ✓
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
