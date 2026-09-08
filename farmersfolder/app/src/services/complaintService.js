/**
 * Phase 10 — Farmer History & Complaint Management Service
 * 
 * Provides:
 * 1. 9 Grievance categories
 * 2. 6 Lifecycle states: SUBMITTED -> ASSIGNED -> UNDER_REVIEW -> RESOLVED / REJECTED / REOPENED
 * 3. Immutable audit trail logging
 * 4. Linked transaction tracking
 */

export const COMPLAINT_CATEGORIES = [
  { id: 'incorrect_weight', en: 'Incorrect Weight', te: 'సరికాని బరువు', hi: 'गलत वजन' },
  { id: 'quality_issue', en: 'Quality Issue', te: 'నాణ్యత సమస్య', hi: 'गुणवत्ता समस्या' },
  { id: 'payment_delay', en: 'Payment Delay', te: 'చెల్లింపు ఆలస్యం', hi: 'भुगतान में देरी' },
  { id: 'slot_issue', en: 'Slot Issue', te: 'స్లాట్ సమస్య', hi: 'स्लॉट समस्या' },
  { id: 'queue_issue', en: 'Queue Issue', te: 'క్యూ సమస్య', hi: 'कतार समस्या' },
  { id: 'centre_issue', en: 'Centre Issue', te: 'కేంద్రం సమస్య', hi: 'केंद्र समस्या' },
  { id: 'staff_issue', en: 'Staff Issue', te: 'సిబ్బంది సమస్య', hi: 'कर्मचारी समस्या' },
  { id: 'technical_issue', en: 'Technical Issue', te: 'సాంకేతిక సమస్య', hi: 'तकनीकी समस्या' },
  { id: 'other', en: 'Other', te: 'ఇతర', hi: 'अन्य' },
];

export const INITIAL_COMPLAINTS = [
  {
    complaintId: 'CMP-2026-91042',
    farmerId: 'FRM-10245',
    farmerName: 'Ravi Kumar',
    transactionId: 'PDC-84C109',
    category: 'incorrect_weight',
    description: 'Weighbridge scale at Counter #1 recorded net weight as 50 Qtl, but loaded truck gross scale showed 55 Qtl. 5 Quintal difference noticed. Requesting secondary calibration check.',
    attachmentName: 'weighbridge_slip_photo.jpg',
    status: 'UNDER_REVIEW',
    createdTime: '2026-09-08 02:45 PM',
    updatedTime: '2026-09-08 05:30 PM',
    assignedDepartment: 'Legal Metrology & Weighbridge Scale Inspection Wing',
    assignedOfficer: 'Inspector M. Rao (Weights & Measures Officer)',
    officialResponse: 'Mandi Legal Metrology team is inspecting Weighbridge Scale #1 calibration records. CCTV footage of truck arrival and gross/tare weighing currently retrieved for cross-audit.',
    resolutionDetails: 'Secondary digital re-calibration scheduled. Balance discrepancy will be adjusted in final procurement settlement.',
    auditTrail: [
      { action: 'COMPLAINT_SUBMITTED', timestamp: '2026-09-08 02:45 PM', actor: 'Ravi Kumar (Farmer)', note: 'Grievance submitted regarding 5 Qtl difference.' },
      { action: 'ASSIGNED_TO_OFFICER', timestamp: '2026-09-08 03:15 PM', actor: 'Mandi Dispatch Desk', note: 'Assigned to Inspector M. Rao (Legal Metrology).' },
      { action: 'STATUS_UNDER_REVIEW', timestamp: '2026-09-08 05:30 PM', actor: 'Inspector M. Rao', note: 'Weighbridge tare records and sensor logs under physical inspection.' },
    ],
  },
  {
    complaintId: 'CMP-2026-89215',
    farmerId: 'FRM-10245',
    farmerName: 'Ravi Kumar',
    transactionId: 'PDC-71B420',
    category: 'quality_issue',
    description: 'Moisture reading reported 13.8% and categorized as Grade B, but the cotton crop was sun-dried for 4 days before loading. Requesting lab moisture re-testing.',
    attachmentName: 'crop_sample_photo.jpg',
    status: 'ASSIGNED',
    createdTime: '2026-09-08 11:30 AM',
    updatedTime: '2026-09-08 12:15 PM',
    assignedDepartment: 'District Agricultural Quality Control Laboratory',
    assignedOfficer: 'Officer S. Varma (Senior QC Grader)',
    officialResponse: 'Complaint assigned to Senior QC Grader. Sealed reference sample sent to District QC Testing Lab for secondary digital hygrometer analysis.',
    resolutionDetails: null,
    auditTrail: [
      { action: 'COMPLAINT_SUBMITTED', timestamp: '2026-09-08 11:30 AM', actor: 'Ravi Kumar (Farmer)', note: 'Dispute filed against moisture assessment.' },
      { action: 'ASSIGNED_TO_OFFICER', timestamp: '2026-09-08 12:15 PM', actor: 'Central Mandi Cell', note: 'Assigned to Officer S. Varma.' },
    ],
  },
  {
    complaintId: 'CMP-2026-88102',
    farmerId: 'FRM-10245',
    farmerName: 'Ravi Kumar',
    transactionId: 'PDC-95E312',
    category: 'payment_delay',
    description: 'Weighbridge handover completed on 3rd Sept, but DBT payout credit confirmation was delayed past the standard 48-hour window.',
    attachmentName: 'bank_statement_snippet.pdf',
    status: 'RESOLVED',
    createdTime: '2026-09-05 10:30 AM',
    updatedTime: '2026-09-06 04:15 PM',
    assignedDepartment: 'Public Financial Management System (PFMS) & DBT Cell',
    assignedOfficer: 'Officer K. Sharma (DBT Nodal Officer)',
    officialResponse: 'PFMS batch re-processed through Aadhaar Payment Bridge. Transaction reference UTR-98274192847192 successfully settled to farmer APGVB account ending in 3422.',
    resolutionDetails: 'Full payment of ₹2,13,600 verified as credited. Payment status updated to CREDITED in mandi registry.',
    auditTrail: [
      { action: 'COMPLAINT_SUBMITTED', timestamp: '2026-09-05 10:30 AM', actor: 'Ravi Kumar (Farmer)', note: 'Delayed DBT payment reported.' },
      { action: 'ASSIGNED_TO_OFFICER', timestamp: '2026-09-05 02:00 PM', actor: 'System Dispatcher', note: 'Assigned to PFMS DBT Desk.' },
      { action: 'STATUS_UNDER_REVIEW', timestamp: '2026-09-06 11:00 AM', actor: 'Officer K. Sharma', note: 'Checking bank mandate and PFMS rejection logs.' },
      { action: 'STATUS_RESOLVED', timestamp: '2026-09-06 04:15 PM', actor: 'Officer K. Sharma', note: 'Payment re-disbursed and UTR verified.' },
    ],
  },
  {
    complaintId: 'CMP-2026-92301',
    farmerId: 'FRM-10245',
    farmerName: 'Ravi Kumar',
    transactionId: 'PDC-62F388',
    category: 'slot_issue',
    description: 'Requesting confirmation of gate arrival buffer time and tractor parking queue priority for booking on 10th Sept at Sri Lakshmi Procurement Centre.',
    attachmentName: null,
    status: 'SUBMITTED',
    createdTime: '2026-09-08 06:10 PM',
    updatedTime: '2026-09-08 06:10 PM',
    assignedDepartment: 'Mandi Gate Operations & Traffic Control',
    assignedOfficer: 'Pending Officer Allocation',
    officialResponse: 'Your enquiry has been logged. The Mandi Gate Dispatcher will allocate slot arrival instructions prior to your appointment.',
    resolutionDetails: null,
    auditTrail: [
      { action: 'COMPLAINT_SUBMITTED', timestamp: '2026-09-08 06:10 PM', actor: 'Ravi Kumar (Farmer)', note: 'Gate buffer inquiry submitted.' },
    ],
  },
  {
    complaintId: 'CMP-2026-86540',
    farmerId: 'FRM-10245',
    farmerName: 'Ravi Kumar',
    transactionId: 'PDC-95E312',
    category: 'staff_issue',
    description: 'Contested the ₹150 Mandi Handling & Weighing fee deduction on the final procurement receipt.',
    attachmentName: 'fee_receipt_slip.pdf',
    status: 'REJECTED',
    createdTime: '2026-09-04 09:15 AM',
    updatedTime: '2026-09-04 03:45 PM',
    assignedDepartment: 'APMC Regulatory & Mandi Cess Compliance Authority',
    assignedOfficer: 'Officer N. Reddy (APMC Secretary)',
    officialResponse: 'Statutory Mandi Cess of ₹5/Qtl is mandated under Section 12 of the AP Agricultural Produce & Livestock Markets Act. Electronic scale logs confirm the deduction is legally standard across all APMC procurement centres.',
    resolutionDetails: 'Claim closed as REJECTED under APMC Act statutory mandate. Certified fee schedule attached.',
    auditTrail: [
      { action: 'COMPLAINT_SUBMITTED', timestamp: '2026-09-04 09:15 AM', actor: 'Ravi Kumar (Farmer)', note: 'Dispute over ₹5/Qtl handling cess filed.' },
      { action: 'ASSIGNED_TO_OFFICER', timestamp: '2026-09-04 10:30 AM', actor: 'Mandi Regulatory Desk', note: 'Assigned to APMC Secretary Officer N. Reddy.' },
      { action: 'STATUS_REJECTED', timestamp: '2026-09-04 03:45 PM', actor: 'Officer N. Reddy', note: 'Statutory law cited; claim formally rejected.' },
    ],
  },
];

class ComplaintService {
  constructor() {
    this.complaints = [...INITIAL_COMPLAINTS];
    this.listeners = new Set();
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  broadcast(complaint) {
    this.listeners.forEach((cb) => cb(complaint, this.complaints));
  }

  /**
   * Register a new grievance complaint
   */
  createComplaint({ farmerId, farmerName, transactionId, category, description, urgency = 'MEDIUM', attachmentName = null }) {
    const timestamp = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    const complaintId = 'CMP-2026-' + Math.floor(10000 + Math.random() * 90000);

    const newRecord = {
      complaintId,
      farmerId: farmerId || 'FARM-91234567',
      farmerName: farmerName || 'Ravi Kumar',
      transactionId: transactionId || 'GENERAL_PROCUREMENT',
      category: category || 'payment_delay',
      description,
      urgency,
      attachmentName,
      status: 'SUBMITTED',
      createdTime: timestamp,
      updatedTime: timestamp,
      assignedDepartment: 'Mandi Grievance & DBT Cell',
      assignedOfficer: 'Officer S. Varma',
      officialResponse: 'Your grievance has been registered. An investigating officer will inspect records within 24 hours.',
      resolutionDetails: null,
      auditTrail: [
        {
          action: 'COMPLAINT_SUBMITTED',
          timestamp,
          actor: farmerName || 'Farmer',
          note: `Grievance submitted for category: ${category}. Urgency: ${urgency}.`,
        },
      ],
    };

    this.complaints.unshift(newRecord);
    this.broadcast(newRecord);
    return newRecord;
  }

  registerComplaint(args) {
    return this.createComplaint(args);
  }

  /**
   * Official staff update of complaint status
   */
  updateComplaintStatus({ complaintId, nextStatus, officerName = 'Officer S. Varma', responseText = '', resolutionDetails = '' }) {
    const complaint = this.complaints.find((c) => c.complaintId === complaintId);
    if (!complaint) return null;

    const timestamp = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    const oldStatus = complaint.status;

    complaint.status = nextStatus.toUpperCase();
    complaint.updatedTime = timestamp;
    if (responseText) complaint.officialResponse = responseText;
    if (resolutionDetails) complaint.resolutionDetails = resolutionDetails;

    complaint.auditTrail.push({
      action: `STATUS_CHANGED_${oldStatus}_TO_${nextStatus.toUpperCase()}`,
      timestamp,
      actor: officerName,
      note: responseText || `Status transitioned to ${nextStatus}.`,
    });

    this.broadcast(complaint);
    return complaint;
  }

  getComplaintsForFarmer(farmerId) {
    return this.complaints.filter((c) => !farmerId || c.farmerId === farmerId);
  }
}

export const complaintService = new ComplaintService();
