import { useState } from 'react';
import { queueService } from '../services/queueService.js';
import { centreById } from '../data/domain.js';
import MandiProcurementModal from './MandiProcurementModal.jsx';
import { DIVERSE_QUEUE_MOCK_DATA } from '../data/mockQueueData.js';

export default function MandiOperatorPanel({ t, lang, bookings = [], onUpdateBookingStatus, farmer, onResetQueueData }) {
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [counterInput, setCounterInput] = useState(1);
  const [showConfig, setShowConfig] = useState(false);
  const [procurementModalBooking, setProcurementModalBooking] = useState(null);
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

  return (
    <div className="card mandi-operator-panel" style={{ marginTop: 20, border: '1px solid var(--border-focus)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>🏢 Mandi Staff Queue Control Panel</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Authorized Officer Operator Actions & Real-Time Queue Advancement</div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary"
            style={{
              padding: '5px 12px',
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
            <label style={{ fontSize: 12, fontWeight: 600 }}>Counter:</label>
            <select
              className="input-select"
              style={{ width: 105, padding: '4px 8px', fontSize: 12 }}
              value={counterInput}
              onChange={(e) => setCounterInput(Number(e.target.value))}
            >
              <option value={1}>Counter #1</option>
              <option value={2}>Counter #2</option>
              <option value={3}>Counter #3</option>
              <option value={4}>Counter #4</option>
            </select>
          </div>

          <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setShowConfig(!showConfig)}>
            ⚙️ Mandi Config
          </button>
        </div>
      </div>

      {/* Config drawer */}
      {showConfig && (
        <div className="card" style={{ background: 'var(--surface-elevated)', marginBottom: 16, padding: 14 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Configurable No-Show & Capacity Policy</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Active Counters</label>
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
              <label style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Avg Time / Farmer (mins)</label>
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
          <button className="btn btn-primary" style={{ marginTop: 10, padding: '6px 14px', fontSize: 12 }} onClick={handleSaveConfig}>
            Save Queue Policy
          </button>
        </div>
      )}

      {/* Queue Filter Tabs */}
      <div className="queue-filter-row" style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 12 }}>
        {['ALL', 'WAITING', 'CALLED', 'PROCESSING', 'COMPLETED', 'NO_SHOW'].map((st) => (
          <button
            key={st}
            className={`badge-filter ${filterStatus === st ? 'active' : ''}`}
            onClick={() => setFilterStatus(st)}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Queue List Table */}
      {filteredQueue.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>
          <div>No tokens match filter "{filterStatus}".</div>
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
          <table className="table" style={{ width: '100%', fontSize: 13 }}>
            <thead>
              <tr>
                <th>Token</th>
                <th>Farmer & Crop</th>
                <th>Check-in Time</th>
                <th>Status</th>
                <th>Centre</th>
                <th>Officer Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredQueue.map((b) => {
                const centre = centreById(b.centreId);
                const st = (b.status || 'checked_in').toLowerCase();
                
                // Assign realistic distinct farmer names across different tokens
                const defaultNames = {
                  'PDC-84C109': 'Ramesh Patel (Peddapuram)',
                  'PDC-71B420': 'Ananya Rao (Kirlampudi)',
                  'PDC-95E312': 'Vikram Singh (Samalkota)',
                  'PDC-62F388': b.isOriginalUserBooking ? `${farmer.fullName} (You)` : 'Ravi Kumar (You)',
                  'PDC-EB51B1': 'Lakshmi Devi (Rajahmundry)',
                  'PDC-315DCB': 'Balram Reddy (Gollaprolu)',
                  'PDC-104A12': 'Ramesh Patel (Peddapuram)',
                  'PDC-208B34': 'Ananya Rao (Kirlampudi)',
                  'PDC-315C56': 'Vikram Singh (Samalkota)',
                  'PDC-402D78': 'Balram Reddy (Gollaprolu)',
                  'PDC-511E90': 'Lakshmi Devi (Rajahmundry)',
                };
                const farmerName = b.farmerName || defaultNames[b.token] || (b.isOriginalUserBooking ? `${farmer.fullName} (You)` : 'Suresh Kumar (Farmer)');
                const cropName = b.cropLabel || (b.cropId ? b.cropId.toUpperCase() : 'Paddy');
                const qtyText = b.qty ? `${b.qty} Qtl` : '';

                return (
                  <tr key={b.id}>
                    <td className="mono" style={{ fontWeight: 700 }}>{b.token}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{farmerName}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{cropName} · {qtyText}</div>
                    </td>
                    <td>{b.arrivalTime || '09:14 AM'}</td>
                    <td>
                      <span className={`status-badge ${st}`}>
                        {st.toUpperCase()}
                      </span>
                    </td>
                    <td>{centre ? centre[lang] : b.centreId}</td>
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
                              onClick={() => setProcurementModalBooking(b)}
                              title="Start digital moisture inspection and scale weighing"
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
                            onClick={() => setProcurementModalBooking(b)}
                            title="Verify tare empty weight and issue official digital receipt"
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
                          <span style={{ fontSize: 11.5, color: 'var(--success)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            ✓ Procurement Certified · Receipt Issued
                          </span>
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

      {/* Explanatory Guide Box */}
      <div style={{ marginTop: 14, padding: 12, borderRadius: 8, background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
        <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 6, color: 'var(--ink)' }}>
          📋 Officer Action Reference Guide:
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8, fontSize: 11.5, color: 'var(--text-muted)' }}>
          <div><strong style={{ color: 'var(--primary)' }}>📢 Call to Counter:</strong> Broadcasts token on Mandi loudspeaker and sends farmer SMS to drive truck to weighbridge.</div>
          <div><strong style={{ color: 'var(--primary)' }}>🧪 Quality & Weigh:</strong> Inspects grain moisture % and records gross truck scale weight.</div>
          <div><strong style={{ color: 'var(--danger)' }}>❌ Mark No-Show:</strong> Forfeits turn if farmer does not arrive within the 20-min grace period.</div>
          <div><strong style={{ color: 'var(--success)' }}>⚖️ Weigh & Finalize:</strong> Weighs empty truck (Tare), certifies net produce weight, generates digital receipt, and triggers DBT payout.</div>
          <div><strong style={{ color: 'var(--ink)' }}>🔄 Re-Queue Token:</strong> Re-admits a late or no-show farmer back into the waiting yard queue.</div>
        </div>
      </div>

      {/* Phase 7 Mandi Procurement Inspection & Weighbridge Modal */}
      <MandiProcurementModal
        t={t}
        lang={lang}
        isOpen={!!procurementModalBooking}
        booking={procurementModalBooking}
        farmer={farmer}
        onClose={() => setProcurementModalBooking(null)}
        onFinalizeProcurement={(finalizedBooking) => {
          if (onUpdateBookingStatus) {
            onUpdateBookingStatus(finalizedBooking);
          }
        }}
      />
    </div>
  );
}
