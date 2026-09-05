import React, { createContext, useContext, useState } from 'react';
import initialQueue from '../data/queue.json';
import initialCenter from '../data/center.json';
import { calculateNetWeight, convertKgToQuintals, calculateMspPayout } from '../services/procurementService';
import { createAuditEvent } from '../services/auditService';

const QueueContext = createContext();

export function QueueProvider({ children }) {
  const [tokens, setTokens] = useState(initialQueue);
  const [centerInfo, setCenterInfo] = useState(initialCenter);

  /**
   * Appends an audit log entry to a token's audit_trail history
   */
  const addAuditEntry = (tokenNumber, eventName, role, details) => {
    const newAuditLog = createAuditEvent(eventName, role, details);
    setTokens((prev) =>
      prev.map((t) => {
        if (String(t.token_number) === String(tokenNumber)) {
          return {
            ...t,
            audit_trail: [newAuditLog, ...(t.audit_trail || [])],
          };
        }
        return t;
      })
    );
  };

  /**
   * Advance token stage directly (for queue action buttons)
   */
  const updateTokenStage = (tokenNumber, newStage) => {
    setTokens((prev) =>
      prev.map((t) => {
        if (String(t.token_number) === String(tokenNumber)) {
          let stageLabel = newStage;
          let auditEventName = 'Stage Updated';

          if (newStage === 'ARRIVED') auditEventName = 'Farmer Arrived at Center';
          if (newStage === 'WEIGHING') auditEventName = 'Sent to Weighing Station';
          if (newStage === 'QUALITY_CHECK') auditEventName = 'Sent to Quality Inspection';

          const updatedAudit = [
            createAuditEvent(auditEventName, 'Queue Operator', `Stage changed to ${newStage}.`),
            ...(t.audit_trail || []),
          ];

          return { ...t, stage: stageLabel, audit_trail: updatedAudit };
        }
        return t;
      })
    );
  };

  /**
   * Record Detailed Weighment (Gross, Tare, Net KG, Quintals)
   */
  const updateTokenWeighment = (tokenNumber, weighmentInput) => {
    const { weighed_bags, gross_weight_kg, tare_weight_kg } = weighmentInput;
    const netKg = calculateNetWeight(gross_weight_kg, tare_weight_kg);
    const quintals = convertKgToQuintals(netKg);

    setTokens((prev) =>
      prev.map((t) => {
        if (String(t.token_number) === String(tokenNumber)) {
          const updatedWeightDetails = {
            ...t.weight_details,
            weighed_bags: parseInt(weighed_bags, 10) || t.weight_details.declared_bags,
            gross_weight_kg: parseFloat(gross_weight_kg),
            tare_weight_kg: parseFloat(tare_weight_kg),
            net_weight_kg: netKg,
            accepted_weight_kg: netKg,
            accepted_quintals: quintals,
          };

          const auditLog = createAuditEvent(
            'Weighing Completed',
            'Weighbridge Operator',
            `Gross: ${gross_weight_kg} kg, Tare: ${tare_weight_kg} kg. Net Weight: ${netKg} kg (${quintals} quintals).`
          );

          return {
            ...t,
            stage: 'QUALITY_CHECK',
            weight_details: updatedWeightDetails,
            audit_trail: [auditLog, ...(t.audit_trail || [])],
          };
        }
        return t;
      })
    );
  };

  /**
   * Record Quality Inspection & Staff Explicit Decision (Accept / Reject)
   */
  const updateTokenQuality = (tokenNumber, qualityInput) => {
    const {
      moisture_percent,
      foreign_matter_percent,
      damaged_grains_percent,
      slightly_damaged_percent,
      shrivelled_broken_percent,
      other_grains_percent,
      weevilled_grains_percent,
      grade,
      result,
      rejection_reason,
      recommendation,
    } = qualityInput;

    setTokens((prev) =>
      prev.map((t) => {
        if (String(t.token_number) === String(tokenNumber)) {
          const isAccepted = result === 'ACCEPTED';
          const newStage = isAccepted ? 'ACCEPTED' : 'REJECTED';

          const netKg = t.weight_details.net_weight_kg || t.weight_details.declared_weight_kg;
          const acceptedKg = isAccepted ? netKg : 0;
          const acceptedQuintals = isAccepted ? convertKgToQuintals(acceptedKg) : 0;

          // Compute MSP payout details using quintals formula
          const mspCalc = calculateMspPayout(acceptedKg, t.crop, grade, 0);

          const updatedWeightDetails = {
            ...t.weight_details,
            accepted_weight_kg: acceptedKg,
            accepted_quintals: acceptedQuintals,
          };

          const updatedQuality = {
            moisture_percent: parseFloat(moisture_percent) || 0,
            foreign_matter_percent: parseFloat(foreign_matter_percent) || 0,
            damaged_grains_percent: parseFloat(damaged_grains_percent) || 0,
            slightly_damaged_percent: parseFloat(slightly_damaged_percent) || 0,
            shrivelled_broken_percent: parseFloat(shrivelled_broken_percent) || 0,
            other_grains_percent: parseFloat(other_grains_percent) || 0,
            weevilled_grains_percent: parseFloat(weevilled_grains_percent) || 0,
            grade: grade || 'FAQ Accepted',
            result: result,
            rejection_reason: isAccepted ? null : rejection_reason,
            recommendation: recommendation || (isAccepted ? 'FAQ_ACCEPTED' : 'REJECTED'),
          };

          const updatedPayment = {
            ...t.payment,
            msp_rate_per_quintal: mspCalc.mspRatePerQuintal,
            accepted_quintals: mspCalc.acceptedQuintals,
            base_amount: mspCalc.baseMspAmount,
            quality_deduction: mspCalc.qualityDeduction,
            final_amount: mspCalc.finalPayableAmount,
          };

          const auditLog = createAuditEvent(
            isAccepted ? 'Quality Inspection Accepted' : 'Quality Inspection Rejected',
            'Quality Inspector',
            isAccepted
              ? `Grain passed inspection (${grade}). Moisture: ${moisture_percent}%, Foreign Matter: ${foreign_matter_percent}%.`
              : `Batch rejected. Reason: ${rejection_reason || 'Failed quality threshold limits'}.`
          );

          return {
            ...t,
            stage: newStage,
            weight_details: updatedWeightDetails,
            quality: updatedQuality,
            payment: updatedPayment,
            audit_trail: [auditLog, ...(t.audit_trail || [])],
          };
        }
        return t;
      })
    );
  };

  /**
   * Record Payment Disbursement & UTR Reference ID
   */
  const updateTokenPayment = (tokenNumber, paymentInput) => {
    const { amount, status, transaction_id } = paymentInput;

    setTokens((prev) =>
      prev.map((t) => {
        if (String(t.token_number) === String(tokenNumber)) {
          let newStage = t.stage;
          if (status === 'COMPLETED') newStage = 'PAYMENT_COMPLETED';
          if (status === 'PROCESSING') newStage = 'PAYMENT_PROCESSING';

          const updatedPayment = {
            ...t.payment,
            final_amount: parseFloat(amount) || t.payment.final_amount,
            status: status,
            transaction_id: transaction_id,
          };

          const auditLog = createAuditEvent(
            status === 'COMPLETED' ? 'Payment Completed' : 'Payment Marked Processing',
            'Accounts Officer',
            `Disbursement amount: ₹${parseFloat(amount).toLocaleString()}. UTR Ref: ${transaction_id}.`
          );

          return {
            ...t,
            stage: newStage,
            payment: updatedPayment,
            audit_trail: [auditLog, ...(t.audit_trail || [])],
          };
        }
        return t;
      })
    );
  };

  /**
   * Skip Token Position in Queue
   */
  const skipToken = (tokenNumber) => {
    setTokens((prev) => {
      const index = prev.findIndex((t) => String(t.token_number) === String(tokenNumber));
      if (index === -1 || index === prev.length - 1) return prev;
      const copy = [...prev];
      const [moved] = copy.splice(index, 1);
      copy.push(moved);
      return copy;
    });
    addAuditEntry(tokenNumber, 'Token Skipped', 'Queue Marshal', 'Pushed down in active queue order.');
  };

  /**
   * Update Procurement Center Operational Parameters
   */
  const updateCenterConfig = (newConfig) => {
    setCenterInfo((prev) => ({ ...prev, ...newConfig }));
  };

  return (
    <QueueContext.Provider
      value={{
        tokens,
        centerInfo,
        updateTokenStage,
        updateTokenWeighment,
        updateTokenQuality,
        updateTokenPayment,
        skipToken,
        updateCenterConfig,
        addAuditEntry,
      }}
    >
      {children}
    </QueueContext.Provider>
  );
}

export function useQueue() {
  const context = useContext(QueueContext);
  if (!context) {
    throw new Error('useQueue must be used within a QueueProvider');
  }
  return context;
}
