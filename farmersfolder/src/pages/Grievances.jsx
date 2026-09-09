import { useState, useEffect } from 'react';
import { complaintService } from '../services/complaintService.js';

export default function Grievances({
  t,
  lang,
  farmer,
  complaints = [],
  onAddComplaint,
  onUpdateComplaint,
  prefillToken = null,
  onClearPrefillToken = null,
  onNavigateBack = null,
}) {
  const [viewMode, setViewMode] = useState(prefillToken ? 'register' : 'list'); // 'list' | 'register' | 'detail'
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  // Form State for Registering
  const [transactionId, setTransactionId] = useState(prefillToken || '');
  const [category, setCategory] = useState('WEIGHING_DISCREPANCY');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState('MEDIUM');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedAlert, setSubmittedAlert] = useState(null);
  const [registerError, setRegisterError] = useState('');

  // Officer Update State (for staff actions in detail view)
  const [officerStatus, setOfficerStatus] = useState('UNDER_REVIEW');
  const [officerResponse, setOfficerResponse] = useState('');
  const [showStaffConsole, setShowStaffConsole] = useState(false);

  useEffect(() => {
    if (prefillToken) {
      setTransactionId(prefillToken);
      setViewMode('register');
    }
  }, [prefillToken]);

  const filteredComplaints = complaints.filter((c) => {
    if (statusFilter === 'ALL') return true;
    return c.status === statusFilter;
  });

  const statusInfo = {
    SUBMITTED: {
      step: 1,
      icon: '⏳',
      colorClass: 'warn',
      label: 'SUBMITTED',
      headline: 'Stage 1 of 4: Awaiting Mandi Officer Allocation',
      defaultNote: 'Your dispute has been logged into the central Mandi registry. It will be assigned to a field inspection officer within 2-4 hours.',
    },
    ASSIGNED: {
      step: 2,
      icon: '👤',
      colorClass: 'info',
      label: 'OFFICER ASSIGNED',
      headline: 'Stage 2 of 4: Assigned for Investigation',
      defaultNote: 'An investigating officer has been designated to retrieve weighbridge sensors and physical grain records.',
    },
    UNDER_REVIEW: {
      step: 3,
      icon: '🔍',
      colorClass: 'processing',
      label: 'UNDER ACTIVE REVIEW',
      headline: 'Stage 3 of 4: Physical Inspection & Cross-Audit in Progress',
      defaultNote: 'Official investigation is actively underway (testing moisture calibration, checking weighbridge tare, or cross-auditing PFMS bank records).',
    },
    RESOLVED: {
      step: 4,
      icon: '✅',
      colorClass: 'completed',
      label: 'RESOLVED & SETTLED',
      headline: 'Stage 4 of 4: Dispute Successfully Settled & Payment Adjusted',
      defaultNote: 'The Mandi Superintendent has formally approved the resolution. Necessary financial or weight corrections have been finalized.',
    },
    REJECTED: {
      step: 4,
      icon: '❌',
      colorClass: 'cancelled',
      label: 'CLAIM CLOSED / REJECTED',
      headline: 'Claim Closed: Regulatory & Legal Findings Documented',
      defaultNote: 'After physical and statutory verification, the contested deduction was confirmed as standard and compliant with APMC regulations.',
    },
    REOPENED: {
      step: 2,
      icon: '🔄',
      colorClass: 'warn',
      label: 'REOPENED FOR REVIEW',
      headline: 'Reopened: Secondary Review Requested',
      defaultNote: 'The grievance has been reopened upon farmer request for secondary escalation committee review.',
    },
  };

  const statusColors = {
    SUBMITTED: 'warn',
    ASSIGNED: 'info',
    UNDER_REVIEW: 'processing',
    RESOLVED: 'completed',
    REJECTED: 'cancelled',
    REOPENED: 'warn',
  };

  function handleRegisterSubmit(e) {
    e.preventDefault();
    setRegisterError('');
    if (!description.trim()) {
      setRegisterError('Please describe the issue or reason for the grievance.');
      return;
    }

    setIsSubmitting(true);
    try {
      const newRecord = complaintService.createComplaint({
        farmerId: farmer?.farmerId || 'FRM-10245',
        farmerName: farmer?.fullName || 'Ravi Kumar',
        transactionId: transactionId.trim() || 'GENERAL_MANDI_ISSUE',
        category,
        description: description.trim(),
        urgency,
      });

      if (onAddComplaint) {
        onAddComplaint(newRecord);
      }

      setSubmittedAlert(newRecord.complaintId);
      setSelectedComplaint(newRecord);
      setViewMode('detail');
      setDescription('');
      if (onClearPrefillToken) onClearPrefillToken();
    } catch (err) {
      console.error('Failed to register grievance:', err);
      setRegisterError(err.message || 'Failed to submit grievance. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSaveOfficerUpdate() {
    if (!selectedComplaint) return;
    const updated = complaintService.updateComplaintStatus({
      complaintId: selectedComplaint.complaintId,
      nextStatus: officerStatus,
      officerName: 'Officer S. Varma (Grievance Redressal Cell)',
      responseText: officerResponse || selectedComplaint.officialResponse || 'Issue reviewed by Mandi Superintendent.',
      resolutionDetails: officerResponse,
    });

    if (onUpdateComplaint && updated) {
      onUpdateComplaint(updated);
    }
    setSelectedComplaint(updated);
    setShowStaffConsole(false);
  }

  /* -------------------------------------------------------------
   * VIEW 1: FULL PAGE GRIEVANCE REGISTRATION FORM
   * ------------------------------------------------------------- */
  if (viewMode === 'register') {
    return (
      <div style={{ maxWidth: 860, margin: '0 auto', paddingBottom: 40 }}>
        {/* Navigation Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <button
            className="btn btn-ghost"
            onClick={() => {
              if (onClearPrefillToken) onClearPrefillToken();
              if (onNavigateBack) onNavigateBack();
              else setViewMode('list');
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 13 }}
          >
            ← {prefillToken ? 'Back to Bookings' : 'Back to Grievances'}
          </button>

          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Official Mandi Redressal Cell · AgriStack
          </span>
        </div>

        {/* Full Page Card */}
        <div className="card" style={{ padding: '28px 32px', border: '2px solid var(--border)', borderRadius: 12, background: 'var(--surface)', color: 'var(--ink)' }}>
          <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--primary-accent)' }}>
              🏛️ Government of India · Central Mandi Dispute Resolution
            </div>
            <h1 style={{ margin: '6px 0 2px', fontSize: 22, fontWeight: 800, color: 'var(--ink)' }}>
              Register Official Farmer Grievance
            </h1>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Report discrepancies in weighbridge readings, quality moisture grade deductions, or delayed DBT bank payouts.
            </div>
          </div>

          <form onSubmit={handleRegisterSubmit}>
            {/* Linked Transaction Token */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', display: 'block', marginBottom: 6 }}>
                Linked Transaction Token / Booking ID
              </label>
              <input
                type="text"
                className="input-text mono"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="e.g. PDC-62F388 or leave blank for general mandi issue"
                style={{ width: '100%', fontSize: 14, padding: '10px 14px' }}
              />
              <span style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                If this dispute relates to a specific weighbridge slot or token, keep it entered above for expedited tracking.
              </span>
            </div>

            {/* Grievance Category Grid */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', display: 'block', marginBottom: 6 }}>
                Grievance Category
              </label>
              <select
                className="input-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{ width: '100%', fontSize: 13.5, padding: '10px 14px' }}
              >
                <option value="WEIGHING_DISCREPANCY">⚖️ Weighbridge Net Weight Discrepancy / Tare Error</option>
                <option value="QUALITY_DEDUCTION">🌾 Quality Moisture Grade Dispute / Unfair Price Deduction</option>
                <option value="PAYMENT_DELAY">🏦 Delayed DBT Bank Payout (Over 48 Hours)</option>
                <option value="GATE_STAFF_ISSUE">🚪 Mandi Gate Entry Delay / Staff Misconduct</option>
                <option value="OTHER">📝 Other Procedural or Mandi Facility Issue</option>
              </select>
            </div>

            {/* Description Textarea */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', display: 'block', marginBottom: 6 }}>
                Detailed Description & Statement of Facts <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <textarea
                className="input-text"
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please state clearly what happened (e.g. 'The moisture sensor at Counter #1 read 14.5% whereas the field test showed 11.2%. Requested secondary calibration inspection.')..."
                style={{ width: '100%', fontSize: 13.5, padding: '12px 14px', lineHeight: 1.5 }}
                required
              />
            </div>

            {/* Urgency Selection */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', display: 'block', marginBottom: 6 }}>
                Urgency Level
              </label>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {[
                  { id: 'NORMAL', label: 'Normal (Standard 48hr Resolution)' },
                  { id: 'MEDIUM', label: 'Medium (Mandi Staff Follow-up within 24hr)' },
                  { id: 'URGENT', label: '🚨 Urgent (Vehicle At Mandi Yard Right Now)' },
                ].map((u) => (
                  <label
                    key={u.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 14px',
                      borderRadius: 8,
                      border: urgency === u.id ? '2px solid var(--primary-accent)' : '1px solid var(--border)',
                      background: urgency === u.id ? 'var(--surface-2)' : 'transparent',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: urgency === u.id ? 700 : 500,
                      color: 'var(--ink)',
                    }}
                  >
                    <input
                      type="radio"
                      name="urgency"
                      value={u.id}
                      checked={urgency === u.id}
                      onChange={(e) => setUrgency(e.target.value)}
                    />
                    {u.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Error Message Box */}
            {registerError && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid var(--danger)',
                  color: 'var(--danger)',
                  padding: '10px 14px',
                  borderRadius: 8,
                  marginBottom: 16,
                  fontSize: 13,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span>⚠️</span>
                <span>{registerError}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid var(--border)', paddingTop: 18 }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  if (onClearPrefillToken) onClearPrefillToken();
                  if (onNavigateBack) onNavigateBack();
                  else setViewMode('list');
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
                style={{ padding: '10px 24px', fontSize: 14, fontWeight: 700 }}
              >
                {isSubmitting ? 'Registering Grievance...' : 'Submit Official Grievance'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------
   * VIEW 2: FULL PAGE GRIEVANCE DETAIL & TRACKER VIEW
   * ------------------------------------------------------------- */
  if (viewMode === 'detail' && selectedComplaint) {
    const c = selectedComplaint;
    return (
      <div style={{ maxWidth: 860, margin: '0 auto', paddingBottom: 40 }}>
        {/* Navigation Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <button
            className="btn btn-ghost"
            onClick={() => setViewMode('list')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 13 }}
          >
            ← Back to Grievances List
          </button>

          <span className={`status-badge ${statusInfo[c.status]?.colorClass || 'processing'}`} style={{ fontSize: 13, padding: '5px 14px' }}>
            {statusInfo[c.status]?.icon} STATUS: {c.status}
          </span>
        </div>

        {/* Confirmation Banner if just submitted */}
        {submittedAlert && (
          <div style={{
            background: 'rgba(34, 197, 94, 0.12)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 16,
            color: 'var(--success)',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <span>✓</span>
            <div>
              <strong>Grievance Registered Successfully!</strong> Reference ID: <b>{submittedAlert}</b>. Mandi officers have been notified.
            </div>
          </div>
        )}

        {/* Full Page Detail Card */}
        <div className="card" style={{ padding: '28px 32px', border: '2px solid var(--border)', borderRadius: 12, background: 'var(--surface)', color: 'var(--ink)' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: 16, marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--primary-accent)' }}>
                Official Redressal Record
              </div>
              <h1 style={{ margin: '4px 0 2px', fontSize: 22, fontWeight: 800 }} className="mono">
                {c.complaintId}
              </h1>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Category: <b>{(c.category || 'General').toUpperCase().replace('_', ' ')}</b>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>SUBMITTED ON</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{c.createdTime}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                Assigned: <b>{c.assignedDepartment}</b>
              </div>
            </div>
          </div>

          {/* 4-Step Resolution Progress Stepper in Detail View */}
          {(() => {
            const info = statusInfo[c.status] || statusInfo.SUBMITTED;
            return (
              <div style={{ margin: '0 0 20px 0', background: 'var(--surface-elevated)', borderRadius: 8, padding: '12px 16px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10, letterSpacing: '.05em' }}>
                  Dispute Redressal Pipeline Progress:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {[
                    { step: 1, label: '1. Submitted', key: 'SUBMITTED' },
                    { step: 2, label: '2. Assigned', key: 'ASSIGNED' },
                    { step: 3, label: '3. Under Review', key: 'UNDER_REVIEW' },
                    { step: 4, label: c.status === 'REJECTED' ? '4. Closed' : '4. Resolved', key: c.status === 'REJECTED' ? 'REJECTED' : 'RESOLVED' },
                  ].map((st) => {
                    const isCurrent = c.status === st.key;
                    const isPast = info.step > st.step;
                    return (
                      <div
                        key={st.step}
                        style={{
                          textAlign: 'center',
                          padding: '8px 6px',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: isCurrent ? 800 : (isPast ? 700 : 500),
                          background: isCurrent ? 'var(--surface)' : (isPast ? 'rgba(16, 185, 129, 0.15)' : 'transparent'),
                          color: isCurrent ? 'var(--ink)' : (isPast ? 'var(--success)' : 'var(--text-muted)'),
                          border: isCurrent ? '2px solid var(--primary-accent)' : (isPast ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border)'),
                        }}
                      >
                        {isPast ? '✓ ' : (isCurrent ? '▶ ' : '')}{st.label}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Key Identifiers Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
            background: 'var(--surface-2)',
            padding: '14px 18px',
            borderRadius: 8,
            marginBottom: 20,
            border: '1px solid var(--border)',
          }}>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: 11, fontWeight: 700 }}>FARMER NAME</span>
              <b style={{ color: 'var(--ink)' }}>{c.farmerName}</b>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: 11, fontWeight: 700 }}>FARMER ID</span>
              <b className="mono" style={{ color: 'var(--ink)' }}>{c.farmerId}</b>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: 11, fontWeight: 700 }}>LINKED TRANSACTION</span>
              <b className="mono" style={{ color: 'var(--primary-accent)' }}>{c.transactionId || 'General Mandi'}</b>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: 11, fontWeight: 700 }}>PRIORITY / URGENCY</span>
              <b style={{ color: 'var(--ink)' }}>{c.urgency || 'MEDIUM'}</b>
            </div>
          </div>

          {/* Farmer's Complaint Statement */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 12.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
              Statement of Grievance
            </label>
            <div style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '14px 16px',
              fontSize: 14,
              lineHeight: 1.6,
              color: 'var(--ink)',
            }}>
              "{c.description}"
            </div>
          </div>

          {/* Official Mandi Resolution & Response */}
          <div style={{
            background: c.status === 'RESOLVED' ? 'rgba(34, 197, 94, 0.08)' : 'var(--surface-2)',
            border: `1px solid ${c.status === 'RESOLVED' ? 'var(--success)' : 'var(--border)'}`,
            borderRadius: 8,
            padding: '16px 20px',
            marginBottom: 24,
          }}>
            <div style={{ fontSize: 12.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--ink)', marginBottom: 8 }}>
              🏛️ Mandi Redressal Officer Findings & Resolution
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.5 }}>
              {c.officialResponse || 'Under formal review by Mandi Committee. An inspection officer will review calibration logs and follow up with the farmer.'}
            </div>
            {c.officerName && (
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 8 }}>
                Reviewed by: <b>{c.officerName}</b>
              </div>
            )}
          </div>

          {/* Mandi Staff Simulation Console */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Demonstration Testing: Simulate Mandi Officer Status Advancement
              </span>
              <button
                className="btn btn-ghost"
                style={{ fontSize: 12, padding: '4px 10px' }}
                onClick={() => setShowStaffConsole(!showStaffConsole)}
              >
                ⚙️ {showStaffConsole ? 'Hide Staff Console' : 'Open Staff Console'}
              </button>
            </div>

            {showStaffConsole && (
              <div style={{ marginTop: 12, padding: 14, background: 'var(--surface-2)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>Advance Status:</label>
                  <select
                    className="input-select"
                    value={officerStatus}
                    onChange={(e) => setOfficerStatus(e.target.value)}
                    style={{ fontSize: 12.5 }}
                  >
                    <option value="ASSIGNED">ASSIGNED</option>
                    <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                    <option value="RESOLVED">RESOLVED</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>
                </div>
                <div style={{ marginBottom: 10 }}>
                  <input
                    type="text"
                    className="input-text"
                    placeholder="Officer Remarks / Findings..."
                    value={officerResponse}
                    onChange={(e) => setOfficerResponse(e.target.value)}
                    style={{ width: '100%', fontSize: 12.5 }}
                  />
                </div>
                <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={handleSaveOfficerUpdate}>
                  Save Status & Advise Farmer
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------
   * VIEW 3: FULL PAGE GRIEVANCES LIST
   * ------------------------------------------------------------- */
  return (
    <div style={{ maxWidth: 880, margin: '0 auto', paddingBottom: 40 }}>
      {/* Header Bar */}
      <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: 'var(--ink)' }}>
            🏛️ {t.grievancePortal || 'Farmer Grievance & Complaint Redressal'}
          </h1>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            Official Mandi Redressal Cell · Direct tracking for weight, quality deductions, and payment delays
          </div>
        </div>

        <button
          className="btn btn-primary"
          style={{ fontSize: 13.5, fontWeight: 700, padding: '8px 18px' }}
          onClick={() => {
            setTransactionId('');
            setViewMode('register');
          }}
        >
          🚨 Register New Grievance
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="queue-filter-row" style={{ display: 'flex', gap: 6, margin: '16px 0 18px', overflowX: 'auto' }}>
        {['ALL', 'SUBMITTED', 'ASSIGNED', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED'].map((st) => {
          const count = st === 'ALL' ? complaints.length : complaints.filter((c) => c.status === st).length;
          return (
            <button
              key={st}
              className={`badge-filter ${statusFilter === st ? 'active' : ''}`}
              onClick={() => setStatusFilter(st)}
              style={{ fontWeight: 600, fontSize: 12 }}
            >
              {st} ({count})
            </button>
          );
        })}
      </div>

      {/* Complaints List */}
      {filteredComplaints.length === 0 ? (
        <div className="card empty-note" style={{ padding: 32, textAlign: 'center' }}>
          No grievances found under status "{statusFilter}". Click "Register New Grievance" if you have any dispute to submit.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filteredComplaints.map((c) => {
            const info = statusInfo[c.status] || statusInfo.SUBMITTED;
            const currentNote = c.officialResponse || info.defaultNote;

            return (
              <div
                key={c.complaintId}
                className="card grievance-item-card"
                style={{
                  padding: '20px 22px',
                  border: '1.5px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--ink)',
                  borderRadius: 12,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                }}
              >
                {/* Top Row: ID, Status Badge, Category, and Action Button */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span className="mono font-bold" style={{ fontSize: 16, color: 'var(--ink)' }}>{c.complaintId}</span>
                      <span className={`status-badge ${info.colorClass}`}>
                        {info.icon} {c.status}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
                        · {(c.category || 'General').toUpperCase().replace('_', ' ')}
                      </span>
                    </div>

                    <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 600, marginTop: 4, lineHeight: 1.5 }}>
                      "{c.description}"
                    </div>
                  </div>

                  <button
                    className="btn btn-primary"
                    style={{ padding: '7px 16px', fontSize: 12.5, flexShrink: 0, fontWeight: 700 }}
                    onClick={() => {
                      setSelectedComplaint(c);
                      setViewMode('detail');
                    }}
                  >
                    🔍 View Full Details & Timeline →
                  </button>
                </div>

                {/* 4-Step Visual Progress Stepper */}
                <div style={{ margin: '14px 0 12px', background: 'var(--surface-elevated)', borderRadius: 8, padding: '10px 14px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '.05em' }}>
                    Resolution Pipeline Progress:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                    {[
                      { step: 1, label: '1. Submitted', key: 'SUBMITTED' },
                      { step: 2, label: '2. Assigned', key: 'ASSIGNED' },
                      { step: 3, label: '3. Under Review', key: 'UNDER_REVIEW' },
                      { step: 4, label: c.status === 'REJECTED' ? '4. Closed' : '4. Resolved', key: c.status === 'REJECTED' ? 'REJECTED' : 'RESOLVED' },
                    ].map((st) => {
                      const isCurrent = c.status === st.key;
                      const isPast = info.step > st.step;
                      return (
                        <div
                          key={st.step}
                          style={{
                            textAlign: 'center',
                            padding: '6px 4px',
                            borderRadius: 6,
                            fontSize: 11.5,
                            fontWeight: isCurrent ? 800 : (isPast ? 600 : 500),
                            background: isCurrent ? 'var(--surface)' : (isPast ? 'rgba(16, 185, 129, 0.12)' : 'transparent'),
                            color: isCurrent ? 'var(--ink)' : (isPast ? 'var(--success)' : 'var(--text-muted)'),
                            border: isCurrent ? '1.5px solid var(--primary-accent)' : (isPast ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border)'),
                          }}
                        >
                          {isPast ? '✓ ' : (isCurrent ? '▶ ' : '')}{st.label}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Official Status & Current Action Callout Box */}
                <div
                  style={{
                    background: 'var(--surface-elevated)',
                    borderLeft: `4px solid ${info.colorClass === 'completed' ? 'var(--success)' : (info.colorClass === 'cancelled' ? 'var(--danger)' : 'var(--primary-accent)')}`,
                    borderRadius: '0 8px 8px 0',
                    padding: '10px 14px',
                    marginBottom: 12,
                  }}
                >
                  <div style={{ fontSize: 11.5, fontWeight: 800, textTransform: 'uppercase', color: info.colorClass === 'completed' ? 'var(--success)' : (info.colorClass === 'cancelled' ? 'var(--danger)' : 'var(--primary-accent)') }}>
                    {info.icon} Current Status: {info.headline}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--ink)', marginTop: 4, lineHeight: 1.45 }}>
                    {currentNote}
                  </div>
                  {c.resolutionDetails && (
                    <div style={{ fontSize: 12, color: 'var(--success)', marginTop: 4, fontWeight: 700 }}>
                      ✓ Official Resolution: {c.resolutionDetails}
                    </div>
                  )}
                </div>

                {/* Footer Meta */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: 10,
                    borderTop: '1px solid var(--border)',
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  <div>
                    Linked Token: <b className="mono font-bold" style={{ color: 'var(--ink)' }}>{c.transactionId || 'General Mandi'}</b> · Submitted: <b>{c.createdTime}</b>
                  </div>
                  <div>
                    Assigned Cell: <b style={{ color: 'var(--ink)' }}>{c.assignedOfficer || c.assignedDepartment}</b>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
