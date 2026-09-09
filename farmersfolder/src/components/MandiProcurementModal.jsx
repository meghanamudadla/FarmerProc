import { useState } from 'react';
import { qualityService } from '../services/qualityService.js';
import { weighingService } from '../services/weighingService.js';
import { procurementWorkflow } from '../services/procurementWorkflow.js';
import { cropById } from '../data/domain.js';

export default function MandiProcurementModal({ t, lang, isOpen, onClose, booking, farmer, onFinalizeProcurement }) {
  if (!isOpen || !booking) return null;

  const crop = cropById(booking.cropId);
  const cropName = crop ? crop[lang] : (booking.cropLabel || 'Crop Produce');

  // Step 1: Quality Check Form State
  const [moisture, setMoisture] = useState('11.5');
  const [foreignMatter, setForeignMatter] = useState('1.2');
  const [inspectorName, setInspectorName] = useState('Officer K. Sharma');
  const [qcEvaluation, setQcEvaluation] = useState(() =>
    qualityService.evaluateQuality({
      cropId: booking.cropId || 'cotton',
      moisturePercentage: 11.5,
      foreignMatterPercentage: 1.2,
      inspectorName: 'Officer K. Sharma',
    })
  );

  // Step 2: Weighing Form State
  const [grossWeight, setGrossWeight] = useState(String(booking.qty ? (booking.qty + 5) : 75));
  const [tareWeight, setTareWeight] = useState('5.0');
  const [operatorName, setOperatorName] = useState('Officer M. Rao');
  const [weighingRecord, setWeighingRecord] = useState(null);
  const [weightError, setWeightError] = useState('');

  // Workflow Step: 'QUALITY_CHECK' | 'WEIGHING' | 'ACCEPTANCE_DECISION' | 'FINALIZED'
  const [stage, setStage] = useState('QUALITY_CHECK');

  function handleEvaluateQuality() {
    const evalResult = qualityService.evaluateQuality({
      cropId: booking.cropId || 'cotton',
      moisturePercentage: moisture,
      foreignMatterPercentage: foreignMatter,
      inspectorName,
    });
    setQcEvaluation(evalResult);
  }

  function handleProceedToWeighing() {
    if (qcEvaluation.acceptanceStatus === 'REJECTED') {
      alert(`Produce Rejected: ${qcEvaluation.rejectionReason}`);
      return;
    }
    setStage('WEIGHING');
  }

  function handleCalculateNetWeight() {
    const val = weighingService.validateWeights(grossWeight, tareWeight);
    if (!val.valid) {
      setWeightError(val.error);
      setWeighingRecord(null);
      return;
    }
    setWeightError('');
    const record = weighingService.recordWeighing({
      grossWeight,
      tareWeight,
      operatorName,
      unit: 'Qtl',
    });
    setWeighingRecord(record);
    setStage('ACCEPTANCE_DECISION');
  }

  function handleFinalize() {
    if (!qcEvaluation || !weighingRecord) return;

    // Rate calculation based on crop MSP and final net weight
    const mspRate = crop ? crop.msp : 6620;
    const finalPrice = Math.round(weighingRecord.netWeight * mspRate);

    const finalizedBooking = {
      ...booking,
      status: 'completed',
      finalNetWeight: weighingRecord.netWeight,
      price: finalPrice,
      qualityCheck: qcEvaluation,
      weighingRecord: weighingRecord,
      finalizedAt: new Date().toISOString(),
      finalizedBy: inspectorName,
      paymentStatus: 'initiated', // Source data for Phase 8 payouts
    };

    // Transition state safely via workflow engine
    const workflowResult = procurementWorkflow.transition(booking, 'quality_check', inspectorName);
    const completedResult = procurementWorkflow.transition(workflowResult.updatedBooking || booking, 'weighing', operatorName);

    onFinalizeProcurement(finalizedBooking);
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 580, padding: 24 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--primary-accent)' }}>
              Mandi Inspection & Weighbridge Processing
            </div>
            <h3 style={{ margin: '4px 0 0', fontSize: 18 }}>
              Token {booking.token} · {farmer?.name || 'Farmer Ravi'}
            </h3>
          </div>
          <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={onClose}>✕</button>
        </div>

        {/* Workflow Progress Breadcrumb */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          <div className={`signup-step-pill ${stage === 'QUALITY_CHECK' ? 'on' : ''}`}>1. Quality Check</div>
          <div className={`signup-step-pill ${stage === 'WEIGHING' ? 'on' : ''}`}>2. Weighing Scale</div>
          <div className={`signup-step-pill ${stage === 'ACCEPTANCE_DECISION' ? 'on' : ''}`}>3. Acceptance & Finalize</div>
        </div>

        {/* STAGE 1: QUALITY CHECK */}
        {stage === 'QUALITY_CHECK' && (
          <div>
            <div className="card" style={{ background: 'var(--surface-elevated)', padding: 14, marginBottom: 14 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Crop: {cropName} · Standard Govt Guidelines</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Moisture Content (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="input-text"
                    value={moisture}
                    onChange={(e) => {
                      setMoisture(e.target.value);
                      const res = qualityService.evaluateQuality({
                        cropId: booking.cropId || 'cotton',
                        moisturePercentage: e.target.value,
                        foreignMatterPercentage: foreignMatter,
                        inspectorName,
                      });
                      setQcEvaluation(res);
                    }}
                  />
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Max allowed: {qualityService.getPolicyForCrop(booking.cropId).maxMoisture}%</div>
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Foreign Matter / Impurities (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="input-text"
                    value={foreignMatter}
                    onChange={(e) => {
                      setForeignMatter(e.target.value);
                      const res = qualityService.evaluateQuality({
                        cropId: booking.cropId || 'cotton',
                        moisturePercentage: moisture,
                        foreignMatterPercentage: e.target.value,
                        inspectorName,
                      });
                      setQcEvaluation(res);
                    }}
                  />
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Max allowed: {qualityService.getPolicyForCrop(booking.cropId).maxForeignMatter}%</div>
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Inspector In-Charge</label>
                <input
                  type="text"
                  className="input-text"
                  value={inspectorName}
                  onChange={(e) => setInspectorName(e.target.value)}
                />
              </div>
            </div>

            {/* Quality Evaluation Result Box */}
            {qcEvaluation && (
              <div className="card" style={{
                background: qcEvaluation.acceptanceStatus === 'ACCEPTED' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                border: `1px solid ${qcEvaluation.acceptanceStatus === 'ACCEPTED' ? 'var(--success)' : 'var(--danger)'}`,
                padding: 14,
                marginBottom: 16
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Inspection Certificate #{qcEvaluation.qualityCheckId}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>
                      Quality Grade: <span style={{ color: qcEvaluation.qualityGrade === 'GRADE_A' ? 'var(--success)' : 'var(--accent)' }}>{qcEvaluation.qualityGrade}</span>
                    </div>
                  </div>
                  <span className={`status-badge ${qcEvaluation.acceptanceStatus === 'ACCEPTED' ? 'completed' : 'cancelled'}`}>
                    {qcEvaluation.acceptanceStatus}
                  </span>
                </div>

                {qcEvaluation.rejectionReason && (
                  <div style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 600, marginTop: 8 }}>
                    ⚠️ {qcEvaluation.rejectionReason}
                  </div>
                )}
              </div>
            )}

            <div className="btn-row" style={{ marginTop: 16 }}>
              <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={handleProceedToWeighing}
                disabled={qcEvaluation?.acceptanceStatus === 'REJECTED'}
              >
                Proceed to Weighbridge Scale →
              </button>
            </div>
          </div>
        )}

        {/* STAGE 2: WEIGHING SCALE */}
        {stage === 'WEIGHING' && (
          <div>
            <div className="card" style={{ background: 'var(--surface-elevated)', padding: 14, marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>⚖️ Weighbridge Hardware Interface (WeighingService)</span>
                <span style={{ fontSize: 11, color: 'var(--success)', fontWeight: 600 }}>● Scale Ready</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Gross Weight (Qtl)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input-text"
                    value={grossWeight}
                    onChange={(e) => setGrossWeight(e.target.value)}
                  />
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Loaded Vehicle / Gunny Weight</div>
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Tare Weight (Qtl)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input-text"
                    value={tareWeight}
                    onChange={(e) => setTareWeight(e.target.value)}
                  />
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Empty Vehicle / Container Weight</div>
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Weighbridge Operator</label>
                <input
                  type="text"
                  className="input-text"
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                />
              </div>
            </div>

            {weightError && (
              <div className="card" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', color: 'var(--danger)', padding: 10, fontSize: 12, marginBottom: 14 }}>
                ⛔ {weightError}
              </div>
            )}

            <div className="btn-row" style={{ marginTop: 16 }}>
              <button className="btn btn-ghost" onClick={() => setStage('QUALITY_CHECK')}>← Back to Quality</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleCalculateNetWeight}>
                Validate & Calculate Net Weight →
              </button>
            </div>
          </div>
        )}

        {/* STAGE 3: ACCEPTANCE DECISION & FINALIZATION */}
        {stage === 'ACCEPTANCE_DECISION' && weighingRecord && (
          <div>
            <div className="card" style={{ background: 'var(--surface-elevated)', padding: 16, marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
                Official Procurement Summary Slip
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, textAlign: 'center', marginBottom: 14 }}>
                <div style={{ background: 'var(--surface)', padding: 10, borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Gross Weight</div>
                  <div style={{ fontSize: 16, fontWeight: 700 }} className="mono">{weighingRecord.grossWeight} Qtl</div>
                </div>
                <div style={{ background: 'var(--surface)', padding: 10, borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Tare Weight</div>
                  <div style={{ fontSize: 16, fontWeight: 700 }} className="mono">{weighingRecord.tareWeight} Qtl</div>
                </div>
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: 10, borderRadius: 8, border: '1px solid var(--success)' }}>
                  <div style={{ fontSize: 10, color: 'var(--success)', fontWeight: 700 }}>NET WEIGHT</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--success)' }} className="mono">{weighingRecord.netWeight} Qtl</div>
                </div>
              </div>

              <div style={{ fontSize: 12, lineHeight: 1.6 }}>
                <div><b>Quality Grade:</b> {qcEvaluation.qualityGrade} ({qcEvaluation.moisturePercentage}% Moisture, {qcEvaluation.foreignMatterPercentage}% Foreign Matter)</div>
                <div><b>Weighbridge Ref:</b> <span className="mono">{weighingRecord.weighingRef}</span></div>
                <div><b>Payable MSP Rate:</b> ₹{crop ? crop.msp : 6620} / Qtl</div>
                <div style={{ fontSize: 15, fontWeight: 700, marginTop: 8, color: 'var(--text-main)' }}>
                  Total Payout Amount: <span style={{ color: 'var(--success)' }}>₹{(Math.round(weighingRecord.netWeight * (crop ? crop.msp : 6620))).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 14 }}>
              🔒 <b>Audit Security:</b> Once finalized, this procurement record becomes the immutable source for Phase 8 bank payout. Any post-finalization edit will require supervisor authorization and create an audit log entry.
            </div>

            <div className="btn-row">
              <button className="btn btn-ghost" onClick={() => setStage('WEIGHING')}>← Back</button>
              <button className="btn btn-success" style={{ flex: 1 }} onClick={handleFinalize}>
                ✅ Finalize Procurement Record
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
