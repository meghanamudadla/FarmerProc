import { useState } from 'react';
import { complaintService } from '../services/complaintService.js';

export default function ComplaintDetailModal({ t, lang, isOpen, onClose, complaint, onUpdateComplaint }) {
  if (!isOpen || !complaint) return null;

  const [officerStatus, setOfficerStatus] = useState(complaint.status);
  const [officerResponse, setOfficerResponse] = useState('');
  const [resolutionDetails, setResolutionDetails] = useState('');
  const [showStaffActions, setShowStaffActions] = useState(false);

  function handleSaveStatus() {
    const updated = complaintService.updateComplaintStatus({
      complaintId: complaint.complaintId,
      nextStatus: officerStatus,
      officerName: 'Officer S. Varma (Grievance Cell)',
      responseText: officerResponse || complaint.officialResponse,
      resolutionDetails: resolutionDetails || complaint.resolutionDetails,
    });

    if (onUpdateComplaint && updated) {
      onUpdateComplaint(updated);
    }
    setShowStaffActions(false);
  }

  const statusColors = {
    SUBMITTED: 'warn',
    ASSIGNED: 'processing',
    UNDER_REVIEW: 'processing',
    RESOLVED: 'completed',
    REJECTED: 'cancelled',
    REOPENED: 'warn',
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 600, padding: 24 }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary-accent)', letterSpacing: '.06em' }}>
              Official Grievance Record
            </div>
            <h3 style={{ margin: '3px 0 0', fontSize: 18 }} className="mono">
              {complaint.complaintId}
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className={`status-badge ${statusColors[complaint.status] || 'processing'}`}>
              {complaint.status}
            </span>
            <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Complaint Details Card */}
        <div className="card" style={{ background: 'var(--surface-elevated)', padding: 14, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, fontSize: 12, marginBottom: 10 }}>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: 10.5 }}>CATEGORY</span>
              <b>{(complaint.category || 'General').toUpperCase().replace('_', ' ')}</b>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: 10.5 }}>LINKED TRANSACTION</span>
              <b className="mono">{complaint.transactionId}</b>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: 10.5 }}>ASSIGNED CELL</span>
              <b>{complaint.assignedDepartment}</b>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: 10.5 }}>SUBMITTED ON</span>
              <b>{complaint.createdTime}</b>
            </div>
          </div>

          <div style={{ fontSize: 12.5, lineHeight: 1.5, background: 'var(--surface)', padding: 10, borderRadius: 6, border: '1px solid var(--border)' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>FARMER STATEMENT:</span>
            "{complaint.description}"
          </div>
        </div>

        {/* Official Resolution Response */}
        {complaint.officialResponse && (
          <div className="card" style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase', marginBottom: 4 }}>
              🏛️ Mandi Officer Official Response ({complaint.assignedOfficer || 'Officer S. Varma'})
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-main)', lineHeight: 1.5 }}>
              {complaint.officialResponse}
            </div>
            {complaint.resolutionDetails && (
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--success)', marginTop: 6 }}>
                Resolution: {complaint.resolutionDetails}
              </div>
            )}
          </div>
        )}

        {/* Immutable Audit Trail Timeline */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
            📜 Immutable Audit Log Timeline
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 130, overflowY: 'auto' }}>
            {(complaint.auditTrail || []).map((log, idx) => (
              <div key={idx} style={{ fontSize: 11, background: 'var(--surface-elevated)', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                  <span>{log.action}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{log.timestamp}</span>
                </div>
                <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>By {log.actor}: {log.note}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Officer Action Drawer (Simulation for Staff) */}
        {showStaffActions ? (
          <div className="card" style={{ background: 'var(--surface)', border: '1px solid var(--primary-accent)', padding: 12, marginBottom: 14 }}>
            <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8 }}>Staff Status Transition & Resolution</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8, marginBottom: 8 }}>
              <select
                className="input-select"
                value={officerStatus}
                onChange={(e) => setOfficerStatus(e.target.value)}
                style={{ fontSize: 12 }}
              >
                <option value="SUBMITTED">SUBMITTED</option>
                <option value="ASSIGNED">ASSIGNED</option>
                <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                <option value="RESOLVED">RESOLVED</option>
                <option value="REJECTED">REJECTED</option>
                <option value="REOPENED">REOPENED</option>
              </select>
              <input
                type="text"
                className="input-text"
                placeholder="Official remark / response..."
                value={officerResponse}
                onChange={(e) => setOfficerResponse(e.target.value)}
                style={{ fontSize: 12 }}
              />
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: 11 }} onClick={handleSaveStatus}>
                Save Official Resolution
              </button>
              <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => setShowStaffActions(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button className="btn btn-ghost" style={{ fontSize: 11.5, padding: '4px 10px', marginBottom: 12 }} onClick={() => setShowStaffActions(true)}>
            🏛️ Mandi Officer Resolution Action
          </button>
        )}

        <div className="btn-row">
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={onClose}>
            Close Inspection View
          </button>
        </div>
      </div>
    </div>
  );
}
