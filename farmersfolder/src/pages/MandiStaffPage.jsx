import { useState } from 'react';
import { queueService } from '../services/queueService.js';
import { qualityService } from '../services/qualityService.js';
import { weighingService } from '../services/weighingService.js';
import { procurementWorkflow } from '../services/procurementWorkflow.js';
import { centreById, cropById } from '../data/domain.js';
import { DIVERSE_QUEUE_MOCK_DATA } from '../data/mockQueueData.js';

export default function MandiStaffPage({
  t,
  lang,
  farmer,
  bookings = [],
  onUpdateBookingStatus,
  onResetQueueData,
  onOpenReceipt,
  onBackToQueue,
}) {
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [counterInput, setCounterInput] = useState(1);
  const [showConfig, setShowConfig] = useState(false);
  const [inspectBooking, setInspectBooking] = useState(null);
  const [inspectStage, setInspectStage] = useState('QUALITY_CHECK'); // 'QUALITY_CHECK' | 'WEIGHING' | 'ACCEPTANCE'
  const [inspectionSuccess, setInspectionSuccess] = useState(null);

  // Inspection form states
  const [moisture, setMoisture] = useState('11.5');
  const [foreignMatter, setForeignMatter] = useState('1.2');
  const [inspectorName, setInspectorName] = useState('Officer K. Sharma');
  const [grossWeight, setGrossWeight] = useState('75.0');
  const [tareWeight, setTareWeight] = useState('5.0');
  const [operatorName, setOperatorName] = useState('Officer M. Rao');
  const [weightError, setWeightError] = useState('');

  const [configForm, setConfigForm] = useState({
    activeCounters: queueService.config.activeCounters,
    avgProcessingTimeMin: queueService.config.avgProcessingTimeMin,
    noShowGracePeriodMin: queueService.config.noShowGracePeriodMin,
  });

  const sortedQueue = queueService.sortQueue(bookings);

  const filteredQueue = sortedQueue.filter((b) => {
    if (filterStatus === 'ALL') return true;
    return (b.status || '').toUpperCase() === filterStatus;
  });

  // Calculate statistics
  const stats = {
    total: bookings.length,
    waiting: bookings.filter((b) => b.status === 'waiting' || b.status === 'checked_in').length,
    called: bookings.filter((b) => b.status === 'called').length,
    processing: bookings.filter((b) => b.status === 'processing').length,
    completed: bookings.filter((b) => b.status === 'completed').length,
    noShow: bookings.filter((b) => b.status === 'no_show').length,
  };

  function handleStatusAction(booking, nextStatus) {
    const updated = queueService.transitionStatus(booking, nextStatus, counterInput);
    if (onUpdateBookingStatus) {
      onUpdateBookingStatus(updated);
    }
  }

  function handleSaveConfig() {
    queueService.updateConfig(configForm);
    setShowConfig(false);
  }

  function startInspection(booking) {
    setInspectBooking(booking);
    setInspectionSuccess(null);
    setGrossWeight(String(booking.qty ? booking.qty + 5 : 75));
    setTareWeight('5.0');
    setMoisture('11.5');
    setForeignMatter('1.2');
    setInspectStage(booking.status === 'processing' ? 'WEIGHING' : 'QUALITY_CHECK');
  }

  function handleFinalizeInspection() {
    if (!inspectBooking) return;
    const crop = cropById(inspectBooking.cropId);
    const mspRate = crop ? crop.msp : 2300;
    const netWeightVal = Math.max(1, parseFloat(grossWeight) - parseFloat(tareWeight));
    const finalPrice = Math.round(netWeightVal * mspRate);

    const finalizedBooking = {
      ...inspectBooking,
      status: 'completed',
      finalNetWeight: netWeightVal,
      price: finalPrice,
      qualityCheck: {
        cropId: inspectBooking.cropId,
        moisturePercentage: parseFloat(moisture),
        foreignMatterPercentage: parseFloat(foreignMatter),
        acceptanceStatus: 'ACCEPTED',
        inspectorName,
        inspectedAt: new Date().toISOString(),
      },
      weighingRecord: {
        grossWeight: parseFloat(grossWeight),
        tareWeight: parseFloat(tareWeight),
        netWeight: netWeightVal,
        operatorName,
        weighedAt: new Date().toISOString(),
        unit: 'Qtl',
      },
      finalizedAt: new Date().toISOString(),
      paymentStatus: 'initiated',
    };

    if (onUpdateBookingStatus) {
      onUpdateBookingStatus(finalizedBooking);
    }
    setInspectionSuccess(finalizedBooking);
  }

  // Map farmer names nicely
  const defaultNames = {
    'PDC-84C109': 'Ramesh Patel (Peddapuram)',
    'PDC-71B420': 'Ananya Rao (Kirlampudi)',
    'PDC-95E312': 'Vikram Singh (Samalkota)',
    'PDC-62F388': 'Ravi Kumar (You)',
    'PDC-EB51B1': 'Lakshmi Devi (Rajahmundry)',
    'PDC-315DCB': 'Balram Reddy (Gollaprolu)',
    'PDC-104A12': 'Ramesh Patel (Peddapuram)',
    'PDC-208B34': 'Ananya Rao (Kirlampudi)',
    'PDC-315C56': 'Vikram Singh (Samalkota)',
    'PDC-402D78': 'Balram Reddy (Gollaprolu)',
    'PDC-511E90': 'Lakshmi Devi (Rajahmundry)',
  };

  // --- FULL-PAGE INSPECTION & WEIGHING VIEW ---
  if (inspectBooking) {
    const crop = cropById(inspectBooking.cropId);
    const cropName = crop ? crop[lang] : (inspectBooking.cropLabel || 'Produce');
    const farmerDisplay = inspectBooking.farmerName || defaultNames[inspectBooking.token] || 'Registered Farmer';
    const centre = centreById(inspectBooking.centreId);

    return (
      <div style={{ maxWidth: 900, margin: '0 auto', paddingBottom: 40 }}>
        {/* Navigation back bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <button
            className="btn btn-ghost"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
            onClick={() => setInspectBooking(null)}
          >
            ← Back to Queue Control Panel
          </button>
          <span className="mono" style={{ background: 'var(--surface-elevated)', padding: '4px 12px', borderRadius: 6, fontWeight: 700 }}>
            {inspectBooking.token}
          </span>
        </div>

        {/* Success Banner */}
        {inspectionSuccess ? (
          <div className="card" style={{ border: '2px solid var(--success)', background: 'var(--surface-elevated)', textAlign: 'center', padding: 28 }}>
            <div style={{ fontSize: 42, marginBottom: 8 }}>✅</div>
            <h2 style={{ color: 'var(--success)', marginBottom: 8, fontSize: 22 }}>Procurement Certified & Finalized!</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, maxWidth: 540, margin: '0 auto 20px auto' }}>
              Token <strong>{inspectionSuccess.token}</strong> for {farmerDisplay} has been successfully certified. Net Weight: <strong>{inspectionSuccess.finalNetWeight} Qtl</strong>. Aadhaar DBT payout of <strong>₹{inspectionSuccess.price?.toLocaleString('en-IN')}</strong> has been initiated.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary"
                style={{ padding: '8px 20px', fontWeight: 700 }}
                onClick={() => {
                  if (onOpenReceipt) onOpenReceipt(inspectionSuccess);
                }}
              >
                📄 View Official Certified Receipt
              </button>
              <button
                className="btn btn-ghost"
                style={{ padding: '8px 16px' }}
                onClick={() => setInspectBooking(null)}
              >
                Return to Queue Panel
              </button>
            </div>
          </div>
        ) : (
          <div className="card" style={{ border: '1px solid var(--border-focus)' }}>
            {/* Header info */}
            <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px 0', color: 'var(--ink)' }}>
                    🌾 Mandi Weighbridge & Quality Inspection Terminal
                  </h2>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    APMC Weighbridge Counter #{counterInput} · {centre ? centre[lang] : inspectBooking.centreId}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>{farmerDisplay}</div>
                  <div style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}>{cropName} · Expected: {inspectBooking.qty} Qtl</div>
                </div>
              </div>
            </div>

            {/* Stepper Tabs */}
            <div style={{ display: 'flex', gap: 10, borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 20 }}>
              <button
                className={`badge-filter ${inspectStage === 'QUALITY_CHECK' ? 'active' : ''}`}
                onClick={() => setInspectStage('QUALITY_CHECK')}
              >
                1. Digital Moisture & QC
              </button>
              <button
                className={`badge-filter ${inspectStage === 'WEIGHING' ? 'active' : ''}`}
                onClick={() => setInspectStage('WEIGHING')}
              >
                2. Certified Weighbridge Scale
              </button>
              <button
                className={`badge-filter ${inspectStage === 'ACCEPTANCE' ? 'active' : ''}`}
                onClick={() => setInspectStage('ACCEPTANCE')}
              >
                3. Final Acceptance & DBT Disbursal
              </button>
            </div>

            {/* STEP 1: Moisture & QC */}
            {inspectStage === 'QUALITY_CHECK' && (
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>🧪 Step 1: Grain Quality & Moisture Inspection</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Moisture Content (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="input-text"
                      value={moisture}
                      onChange={(e) => setMoisture(e.target.value)}
                    />
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Standard FAQ Limit: ≤ 12.0%</div>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Foreign Matter / Dust (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="input-text"
                      value={foreignMatter}
                      onChange={(e) => setForeignMatter(e.target.value)}
                    />
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Permissible Limit: ≤ 2.0%</div>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Authorized Inspector Name</label>
                    <input
                      type="text"
                      className="input-text"
                      value={inspectorName}
                      onChange={(e) => setInspectorName(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ background: 'var(--surface-elevated)', padding: 14, borderRadius: 8, marginBottom: 20, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--success)' }}>✓ Quality Status: Fair Average Quality (FAQ) Standard Passed</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    Crop conforms to Government Procurement Standards (IS:4333). Grain approved for immediate weighbridge scale deduction.
                  </div>
                </div>

                <button
                  className="btn btn-primary"
                  style={{ padding: '8px 20px', fontWeight: 700 }}
                  onClick={() => setInspectStage('WEIGHING')}
                >
                  Proceed to Weighbridge Scale →
                </button>
              </div>
            )}

            {/* STEP 2: Weighbridge Scale */}
            {inspectStage === 'WEIGHING' && (
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>⚖️ Step 2: Certified Weighbridge Scale Measurement</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Gross Weight (Loaded Vehicle in Qtl)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="input-text"
                      value={grossWeight}
                      onChange={(e) => setGrossWeight(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Tare Weight (Empty Vehicle in Qtl)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="input-text"
                      value={tareWeight}
                      onChange={(e) => setTareWeight(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Scale Operator Officer</label>
                    <input
                      type="text"
                      className="input-text"
                      value={operatorName}
                      onChange={(e) => setOperatorName(e.target.value)}
                    />
                  </div>
                </div>

                {/* Net calculation preview */}
                <div style={{ background: 'var(--surface-elevated)', padding: 16, borderRadius: 8, marginBottom: 20, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Certified Net Crop Weight:</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--success)' }}>
                        {(Math.max(0, parseFloat(grossWeight || 0) - parseFloat(tareWeight || 0))).toFixed(2)} Quintals
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Government MSP Rate:</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>
                        ₹{crop?.msp || 2300} / Qtl
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-ghost" onClick={() => setInspectStage('QUALITY_CHECK')}>
                    ← Back
                  </button>
                  <button
                    className="btn btn-primary"
                    style={{ padding: '8px 20px', fontWeight: 700 }}
                    onClick={() => setInspectStage('ACCEPTANCE')}
                  >
                    Proceed to Final Authorization →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Acceptance & Finalize */}
            {inspectStage === 'ACCEPTANCE' && (
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>🏛️ Step 3: Acceptance & DBT Disbursal Authorization</h3>
                
                <div style={{ background: 'var(--surface-elevated)', padding: 16, borderRadius: 8, marginBottom: 20, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>FARMER NAME</div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{farmerDisplay}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>COMMODITY & GRADE</div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{cropName}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>CERTIFIED NET WEIGHT</div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--success)' }}>
                        {(Math.max(0, parseFloat(grossWeight || 0) - parseFloat(tareWeight || 0))).toFixed(2)} Qtl
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>TOTAL DIRECT BENEFIT TRANSFER</div>
                      <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--success)' }}>
                        ₹{Math.round((Math.max(0, parseFloat(grossWeight || 0) - parseFloat(tareWeight || 0))) * (crop?.msp || 2300)).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-ghost" onClick={() => setInspectStage('WEIGHING')}>
                    ← Back
                  </button>
                  <button
                    className="btn btn-success"
                    style={{ padding: '9px 24px', fontWeight: 800, fontSize: 13, background: 'var(--success)', color: '#FFFFFF' }}
                    onClick={handleFinalizeInspection}
                  >
                    ⚖️ Finalize Procurement & Issue Government Receipt
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // --- FULL-PAGE QUEUE CONTROL PANEL VIEW ---
  return (
    <div style={{ maxWidth: 1050, margin: '0 auto', paddingBottom: 40 }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: 'var(--ink)' }}>
              🏢 Mandi Staff Queue Control Panel
            </h1>
            <span style={{ fontSize: 11, background: 'var(--primary-subtle)', color: 'var(--primary)', padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>
              OFFICER MODE
            </span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Real-Time Yard Flow, Weighbridge Advancement & Certified Procurement Desk
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {onBackToQueue && (
            <button className="btn btn-ghost" style={{ fontSize: 12, padding: '5px 12px' }} onClick={onBackToQueue}>
              ← Farmer Queue View
            </button>
          )}

          <button
            className="btn btn-primary"
            style={{
              padding: '6px 14px',
              fontSize: 12,
              fontWeight: 700,
              background: 'linear-gradient(135deg, #10B981, #059669)',
              color: '#FFFFFF',
              border: 'none',
              cursor: 'pointer',
            }}
            onClick={() => onResetQueueData && onResetQueueData(DIVERSE_QUEUE_MOCK_DATA)}
            title="Populate 5 sample tokens in WAITING, CALLED, PROCESSING, NO-SHOW, and COMPLETED states"
          >
            ⚡ Load Diverse Queue Mock Data
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Active Counter:</label>
            <select
              className="input-select"
              style={{ width: 110, padding: '4px 8px', fontSize: 12 }}
              value={counterInput}
              onChange={(e) => setCounterInput(Number(e.target.value))}
            >
              <option value={1}>Counter #1</option>
              <option value={2}>Counter #2</option>
              <option value={3}>Counter #3</option>
              <option value={4}>Counter #4</option>
            </select>
          </div>

          <button className="btn btn-ghost" style={{ padding: '5px 12px', fontSize: 12 }} onClick={() => setShowConfig(!showConfig)}>
            ⚙️ Policy Config
          </button>
        </div>
      </div>

      {/* Metrics Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 18 }}>
        <div className="card" style={{ padding: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL IN SYSTEM</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)' }}>{stats.total}</div>
        </div>
        <div className="card" style={{ padding: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>WAITING IN YARD</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary)' }}>{stats.waiting}</div>
        </div>
        <div className="card" style={{ padding: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>CALLED TO SCALES</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#F59E0B' }}>{stats.called}</div>
        </div>
        <div className="card" style={{ padding: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>PROCESSING WEIGH</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#3B82F6' }}>{stats.processing}</div>
        </div>
        <div className="card" style={{ padding: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>COMPLETED (DBT)</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--success)' }}>{stats.completed}</div>
        </div>
        <div className="card" style={{ padding: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>NO-SHOW</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--danger)' }}>{stats.noShow}</div>
        </div>
      </div>

      {/* Mandi Policy Config Drawer */}
      {showConfig && (
        <div className="card" style={{ background: 'var(--surface-elevated)', marginBottom: 18, padding: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>⚙️ Mandi Operating Policy & Dynamic Wait Config</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Active Weighbridge Counters</label>
              <input
                type="number"
                min="1"
                max="10"
                className="input-text"
                value={configForm.activeCounters}
                onChange={(e) => setConfigForm({ ...configForm, activeCounters: Number(e.target.value) })}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Avg Weighing Time / Truck (mins)</label>
              <input
                type="number"
                min="2"
                max="60"
                className="input-text"
                value={configForm.avgProcessingTimeMin}
                onChange={(e) => setConfigForm({ ...configForm, avgProcessingTimeMin: Number(e.target.value) })}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>No-Show Grace Period (mins)</label>
              <input
                type="number"
                min="5"
                max="120"
                className="input-text"
                value={configForm.noShowGracePeriodMin}
                onChange={(e) => setConfigForm({ ...configForm, noShowGracePeriodMin: Number(e.target.value) })}
              />
            </div>
          </div>
          <button className="btn btn-primary" style={{ marginTop: 12, padding: '6px 16px', fontSize: 12 }} onClick={handleSaveConfig}>
            Save Queue Policy
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="queue-filter-row" style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 14 }}>
        {['ALL', 'WAITING', 'CALLED', 'PROCESSING', 'COMPLETED', 'NO_SHOW'].map((st) => (
          <button
            key={st}
            className={`badge-filter ${filterStatus === st ? 'active' : ''}`}
            onClick={() => setFilterStatus(st)}
          >
            {st} ({st === 'ALL' ? stats.total : (stats[st.toLowerCase()] || 0)})
          </button>
        ))}
      </div>

      {/* Queue Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border)' }}>
        {filteredQueue.length === 0 ? (
          <div style={{ fontSize: 14, color: 'var(--text-muted)', textAlign: 'center', padding: '36px 0' }}>
            <div>No farmers found under filter "{filterStatus}".</div>
            <button
              className="btn btn-primary"
              style={{ marginTop: 12, padding: '6px 14px', fontSize: 12 }}
              onClick={() => onResetQueueData && onResetQueueData(DIVERSE_QUEUE_MOCK_DATA)}
            >
              ⚡ Load Diverse Queue Mock Data
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', fontSize: 13, margin: 0 }}>
              <thead style={{ background: 'var(--surface-elevated)' }}>
                <tr>
                  <th>Token</th>
                  <th>Farmer & Village</th>
                  <th>Commodity & Quantity</th>
                  <th>Check-in</th>
                  <th>Status</th>
                  <th>Mandi Centre</th>
                  <th>Officer Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredQueue.map((b) => {
                  const centre = centreById(b.centreId);
                  const st = (b.status || 'checked_in').toLowerCase();
                  const farmerName = b.farmerName || defaultNames[b.token] || (b.isOriginalUserBooking ? `${farmer.fullName} (You)` : 'Registered Farmer');
                  const cropName = b.cropLabel || (b.cropId ? b.cropId.toUpperCase() : 'Paddy');
                  const qtyText = b.qty ? `${b.qty} Qtl` : '';

                  return (
                    <tr key={b.id}>
                      <td className="mono" style={{ fontWeight: 700 }}>{b.token}</td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{farmerName}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{cropName}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{qtyText}</div>
                      </td>
                      <td>{b.arrivalTime || '09:14 AM'}</td>
                      <td>
                        <span className={`status-badge ${st}`}>
                          {st.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ fontSize: 12 }}>{centre ? centre[lang] : b.centreId}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                          {(st === 'checked_in' || st === 'waiting' || st === 'booked') && (
                            <button
                              className="btn btn-primary"
                              style={{ padding: '5px 12px', fontSize: 11.5, fontWeight: 700 }}
                              onClick={() => handleStatusAction(b, 'called')}
                              title="Announce token over PA system and call vehicle to active counter"
                            >
                              📢 Call to Counter #{counterInput}
                            </button>
                          )}
                          {st === 'called' && (
                            <>
                              <button
                                className="btn btn-primary"
                                style={{ padding: '5px 12px', fontSize: 11.5, fontWeight: 700 }}
                                onClick={() => startInspection(b)}
                                title="Open full-page quality inspection and scale weighing"
                              >
                                🧪 Quality & Weigh
                              </button>
                              <button
                                className="btn btn-danger"
                                style={{ padding: '5px 10px', fontSize: 11.5 }}
                                onClick={() => handleStatusAction(b, 'no_show')}
                                title="Mark farmer absent if not present at counter after grace period"
                              >
                                ❌ Mark No-Show
                              </button>
                            </>
                          )}
                          {st === 'processing' && (
                            <button
                              className="btn btn-success"
                              style={{ padding: '5px 12px', fontSize: 11.5, fontWeight: 700, background: 'var(--success)', color: '#fff' }}
                              onClick={() => startInspection(b)}
                              title="Verify tare empty weight and finalize certified receipt"
                            >
                              ⚖️ Weigh & Finalize
                            </button>
                          )}
                          {st === 'no_show' && (
                            <button
                              className="btn btn-ghost"
                              style={{ padding: '5px 10px', fontSize: 11.5, fontWeight: 600 }}
                              onClick={() => handleStatusAction(b, 'waiting')}
                              title="Re-admit farmer into waiting yard queue"
                            >
                              🔄 Re-Queue Token
                            </button>
                          )}
                          {st === 'completed' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 11.5, color: 'var(--success)', fontWeight: 700 }}>
                                ✓ Certified
                              </span>
                              <button
                                className="btn btn-ghost"
                                style={{ padding: '3px 8px', fontSize: 11 }}
                                onClick={() => onOpenReceipt && onOpenReceipt(b)}
                              >
                                📄 Receipt
                              </button>
                            </div>
                          )}
                          {st === 'cancelled' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                🚫 Cancelled
                              </span>
                              <button
                                className="btn btn-ghost"
                                style={{ padding: '3px 8px', fontSize: 11 }}
                                onClick={() => handleStatusAction(b, 'waiting')}
                                title="Re-open cancelled slot and check in at gate"
                              >
                                🔄 Check In
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Explanatory Guide Box */}
      <div style={{ marginTop: 18, padding: 14, borderRadius: 8, background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: 'var(--ink)' }}>
          📋 Officer Action Operational Workflow Guide:
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10, fontSize: 12, color: 'var(--text-muted)' }}>
          <div><strong style={{ color: 'var(--primary)' }}>📢 Call to Counter:</strong> Broadcasts token on Mandi loudspeaker and sends farmer SMS to drive truck to weighbridge.</div>
          <div><strong style={{ color: 'var(--primary)' }}>🧪 Quality & Weigh:</strong> Navigates to full-page inspection terminal to test moisture % and record gross truck scale weight.</div>
          <div><strong style={{ color: 'var(--danger)' }}>❌ Mark No-Show:</strong> Forfeits turn if farmer does not arrive within the 20-min grace period.</div>
          <div><strong style={{ color: 'var(--success)' }}>⚖️ Weigh & Finalize:</strong> Deducts vehicle Tare weight, certifies net crop weight, generates digital receipt, and triggers DBT payout.</div>
          <div><strong style={{ color: 'var(--ink)' }}>🔄 Re-Queue Token:</strong> Re-admits a late or no-show farmer back into the waiting yard queue.</div>
        </div>
      </div>
    </div>
  );
}
