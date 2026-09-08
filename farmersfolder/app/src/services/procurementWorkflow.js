/**
 * Phase 7 — Procurement Workflow & Non-Bypassable State Engine
 * 
 * Enforces linear progression:
 * CHECKED_IN -> QUALITY_CHECK -> WEIGHING -> ACCEPTANCE_DECISION -> PROCUREMENT_COMPLETED
 * 
 * Rejects illegal shortcuts (e.g. CHECKED_IN -> PAYMENT_CREDITED).
 * Records immutable audit logs for any post-finalization edit.
 */

export const WORKFLOW_STAGES = [
  'CHECKED_IN',
  'QUALITY_CHECK',
  'WEIGHING',
  'ACCEPTANCE_DECISION',
  'PROCUREMENT_COMPLETED',
];

const VALID_TRANSITIONS = {
  checked_in: ['quality_check', 'cancelled'],
  quality_check: ['weighing', 'rejected', 'cancelled'],
  weighing: ['acceptance_decision', 'cancelled'],
  acceptance_decision: ['procurement_completed', 'rejected'],
  procurement_completed: [], // Locked after finalization
  rejected: [],
};

class ProcurementWorkflow {
  /**
   * Validate if a state transition is legal according to strict policy rules
   */
  canTransition(currentStatus = 'checked_in', targetStatus) {
    const curr = (currentStatus || 'checked_in').toLowerCase();
    const target = (targetStatus || '').toLowerCase();

    const allowed = VALID_TRANSITIONS[curr] || [];
    return allowed.includes(target);
  }

  /**
   * Execute state transition with strict validation & audit logging
   */
  transition(booking, targetStatus, actorName = 'System Officer', auditReason = '') {
    const current = (booking.status || 'checked_in').toLowerCase();
    const target = targetStatus.toLowerCase();

    if (!this.canTransition(current, target)) {
      return {
        success: false,
        error: `Illegal state transition rejected: Cannot jump directly from ${current.toUpperCase()} to ${target.toUpperCase()}. Must follow linear workflow.`,
      };
    }

    const auditEntry = {
      action: `TRANSITION_${current.toUpperCase()}_TO_${target.toUpperCase()}`,
      fromState: current.toUpperCase(),
      toState: target.toUpperCase(),
      timestamp: new Date().toISOString(),
      actor: actorName,
      note: auditReason || 'Standard procurement workflow advancement.',
    };

    const updatedAuditLog = [...(booking.auditLog || []), auditEntry];

    return {
      success: true,
      error: null,
      updatedBooking: {
        ...booking,
        status: target,
        auditLog: updatedAuditLog,
        lastUpdatedTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    };
  }

  /**
   * Record an audit log for post-finalization edits
   */
  logPostFinalizationEdit(booking, actorName, editReason, changes = {}) {
    const auditEntry = {
      action: 'POST_FINALIZATION_SUPERVISOR_EDIT',
      timestamp: new Date().toISOString(),
      actor: actorName,
      note: editReason,
      changes,
    };

    return {
      ...booking,
      auditLog: [...(booking.auditLog || []), auditEntry],
    };
  }
}

export const procurementWorkflow = new ProcurementWorkflow();
