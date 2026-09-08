import { useState } from 'react';
import { COMPLAINT_CATEGORIES, complaintService } from '../services/complaintService.js';

export default function RaiseComplaintModal({ t, lang, isOpen, onClose, prefilledToken, farmer, onSubmitSuccess }) {
  if (!isOpen) return null;

  const [category, setCategory] = useState('payment_delay');
  const [transactionId, setTransactionId] = useState(prefilledToken || '');
  const [description, setDescription] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    if (!description.trim()) {
      alert('Please describe your grievance/issue.');
      return;
    }

    setIsSubmitting(true);
    const newComplaint = complaintService.createComplaint({
      farmerId: farmer?.farmerId,
      farmerName: farmer?.name,
      transactionId: transactionId || 'GENERAL_ISSUE',
      category,
      description: description.trim(),
      attachmentName: attachmentName ? 'farmer_slip_photo.jpg' : null,
    });

    setIsSubmitting(false);
    if (onSubmitSuccess) {
      onSubmitSuccess(newComplaint);
    }
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 520, padding: 24 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary-accent)', letterSpacing: '.06em' }}>
              Mandi Grievance Cell
            </div>
            <h3 style={{ margin: '3px 0 0', fontSize: 18 }}>🚨 Register a Complaint / Grievance</h3>
          </div>
          <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Linked Transaction ID */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>
              Linked Transaction Token / Booking ID
            </label>
            <input
              type="text"
              className="input-text mono"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              placeholder="e.g. PDC-62F388 or leave blank for general mandi issue"
            />
          </div>

          {/* Category Dropdown */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>
              Complaint Category
            </label>
            <select
              className="input-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ width: '100%' }}
            >
              {COMPLAINT_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat[lang] || cat.en}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>
              Describe Your Issue in Detail
            </label>
            <textarea
              className="input-text"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide exact details (e.g. expected amount vs credited, weighbridge difference, gate delay)..."
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>

          {/* Optional Attachment */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>
              Upload Supporting Photo / Slip (Optional)
            </label>
            <input
              type="file"
              onChange={(e) => setAttachmentName(e.target.files?.[0]?.name || '')}
              style={{ fontSize: 12 }}
            />
          </div>

          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>
            🔒 <b>Grievance SLA:</b> Every complaint is assigned an official tracking ID with immutable audit logging. Officers review within 24 hours.
          </div>

          <div className="btn-row">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Grievance to Mandi Cell →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
