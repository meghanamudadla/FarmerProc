import { useState } from 'react';
import { SecurityTestRunner } from '../services/securityTestRunner.js';

export default function SecurityTestModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const [isRunning, setIsRunning] = useState(false);
  const [testReport, setTestReport] = useState(null);
  const [activeTab, setActiveTab] = useState('TESTS'); // 'TESTS' | 'AUDIT_REPORT'

  async function handleRunTests() {
    setIsRunning(true);
    const report = await SecurityTestRunner.runAllTests();
    setIsRunning(false);
    setTestReport(report);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 740, padding: 24, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary-accent)', letterSpacing: '.06em' }}>
              SIH System Hardening & Validation Engine
            </div>
            <h3 style={{ margin: '2px 0 0', fontSize: 18 }}>
              🛡️ Automated Security, Validation & Business Rule Test Suite
            </h3>
          </div>
          <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={onClose}>✕</button>
        </div>

        {/* Tab Toggle */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexShrink: 0 }}>
          <button
            className={`signup-step-pill ${activeTab === 'TESTS' ? 'on' : ''}`}
            onClick={() => setActiveTab('TESTS')}
          >
            🧪 Automated Test Runner
          </button>
          <button
            className={`signup-step-pill ${activeTab === 'AUDIT_REPORT' ? 'on' : ''}`}
            onClick={() => setActiveTab('AUDIT_REPORT')}
          >
            📋 Production Readiness Audit
          </button>
        </div>

        {/* TAB 1: AUTOMATED TESTS */}
        {activeTab === 'TESTS' && (
          <div style={{ overflowY: 'auto', flex: 1, paddingRight: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-elevated)', padding: '12px 16px', borderRadius: 8, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Execute 20-Point Multi-Layer Security Suite</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                  Tests 18 core business rules, failure resilience, mutex race conditions, and QR check-in
                </div>
              </div>

              <button className="btn btn-primary" onClick={handleRunTests} disabled={isRunning}>
                {isRunning ? '⏳ Running Suite...' : '🚀 Run All 20 Tests'}
              </button>
            </div>

            {/* Test Summary Bar */}
            {testReport && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, textAlign: 'center', marginBottom: 14 }}>
                <div style={{ background: 'var(--surface)', padding: 8, borderRadius: 6, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>TOTAL TESTS</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{testReport.total}</div>
                </div>
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: 8, borderRadius: 6, border: '1px solid var(--success)' }}>
                  <div style={{ fontSize: 10, color: 'var(--success)' }}>PASSED</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--success)' }}>{testReport.passed}</div>
                </div>
                <div style={{ background: testReport.failed > 0 ? 'rgba(239, 68, 68, 0.1)' : 'var(--surface)', padding: 8, borderRadius: 6, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 10, color: testReport.failed > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>FAILED</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: testReport.failed > 0 ? 'var(--danger)' : 'inherit' }}>{testReport.failed}</div>
                </div>
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: 8, borderRadius: 6, border: '1px solid var(--success)' }}>
                  <div style={{ fontSize: 10, color: 'var(--success)' }}>PASS RATE</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--success)' }}>{testReport.rate}%</div>
                </div>
              </div>
            )}

            {/* Test Assertions List */}
            {testReport ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {testReport.results.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      background: r.passed ? 'rgba(16, 185, 129, 0.04)' : 'rgba(239, 68, 68, 0.06)',
                      border: `1px solid ${r.passed ? 'rgba(16, 185, 129, 0.25)' : 'var(--danger)'}`,
                      borderRadius: 8,
                      padding: '10px 14px',
                      fontSize: 12,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span className="mono font-bold" style={{ color: 'var(--primary-accent)', marginRight: 6 }}>{r.id}</span>
                        <b>{r.name}</b>
                        <span style={{ fontSize: 10.5, color: 'var(--text-muted)', marginLeft: 8 }}>[{r.category}]</span>
                      </div>
                      <span className={`status-badge ${r.passed ? 'completed' : 'cancelled'}`} style={{ fontSize: 10 }}>
                        {r.passed ? '✓ PASSED' : '✕ FAILED'}
                      </span>
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>
                      Assertion: {r.details}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card empty-note" style={{ padding: 24 }}>
                Click "Run All 20 Tests" to execute automated multi-layer test assertions.
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PRODUCTION READINESS AUDIT */}
        {activeTab === 'AUDIT_REPORT' && (
          <div style={{ overflowY: 'auto', flex: 1, paddingRight: 4, fontSize: 12.5, lineHeight: 1.6 }}>
            <div className="card" style={{ background: 'var(--surface-elevated)', padding: 14, marginBottom: 12 }}>
              <h4 style={{ margin: '0 0 6px', fontSize: 14, color: 'var(--primary-accent)' }}>🔒 Security Hardening Completed</h4>
              <ul style={{ paddingLeft: 18, margin: 0 }}>
                <li><b>Authentication & Authorization:</b> Session OTP validation; IDOR protection prevents cross-farmer access.</li>
                <li><b>QR Security:</b> Exposes zero sensitive PII (Aadhaar/Bank masked); 8-step gate check-in pipeline blocks duplicate/expired scans.</li>
                <li><b>Race Condition Mutex:</b> Simulated atomic locking on slot reservations prevents double-booking last spots.</li>
                <li><b>Immutability:</b> Read-only farmer history; finalized weights, quality grades, and receipts cannot be modified.</li>
                <li><b>Audit Trails:</b> Append-only logging for state transitions, supervisor corrections, and grievance updates.</li>
              </ul>
            </div>

            <div className="card" style={{ background: 'var(--surface-elevated)', padding: 14, marginBottom: 12 }}>
              <h4 style={{ margin: '0 0 6px', fontSize: 14, color: 'var(--text-main)' }}>⚙️ Isolated Prototype Mock Boundaries</h4>
              <ul style={{ paddingLeft: 18, margin: 0 }}>
                <li><code>MockEligibilityService</code>: Policy calculation engine based on registered land acres and MSP schedules.</li>
                <li><code>MockPaymentService</code>: Simulates the DBT banking lifecycle (Purchase Recorded $\rightarrow$ Credited) and failure states.</li>
                <li><code>MockSmsService</code>: Simulates telecom DLT SMS gateway delivery receipts and retry policies.</li>
                <li><code>WeighingService</code>: Clean hardware abstraction interface with gross/tare math validator.</li>
              </ul>
            </div>

            <div className="card" style={{ background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: 14 }}>
              <h4 style={{ margin: '0 0 6px', fontSize: 14, color: 'var(--success)' }}>🏛️ Real-World Production Integrations Required</h4>
              <ul style={{ paddingLeft: 18, margin: 0 }}>
                <li><b>DBT / PFMS API Gateway:</b> Real-time bank account name verification and NACH/DBT payout transfer.</li>
                <li><b>Telecom DLT SMS Gateway:</b> Integration with NIC / CDAC DLT SMS service for farmer text alerts.</li>
                <li><b>State Land Records API (Meebhoomi / Dharani):</b> Direct automated fetch of patta land boundaries and passbook data.</li>
                <li><b>IoT Electronic Weighbridge API:</b> Direct RS-232 / MQTT data stream from Mandi weighbridge load cells.</li>
              </ul>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
          <button className="btn btn-primary" onClick={onClose}>
            Close Test Suite
          </button>
        </div>
      </div>
    </div>
  );
}
