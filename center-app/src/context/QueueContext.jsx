import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import initialCenter from "../data/center.json";
import {
  calculateNetWeight,
  convertKgToQuintals,
  calculateMspPayout,
} from "../services/procurementService";
import { createAuditEvent } from "../services/auditService";
import {
  getCenterQueue,
  checkInToken,
  submitWeighment,
  submitQualityCheck,
  getMspCalculation,
  submitProcurement,
  submitPayment,
  completeFarmer
} from "../api/queueapi";

const QueueContext = createContext();
const CENTER_ID = 1;

export function QueueProvider({ children }) {
  const [tokens, setTokens] = useState([]);
  const [centerInfo, setCenterInfo] = useState(initialCenter);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadQueue = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCenterQueue(CENTER_ID);

      if (data.tokens && data.tokens.length > 0) {
        setTokens(data.tokens);
      } else {
        const queueItems = [];
        if (data.currently_serving) {
          queueItems.push({
            ...data.currently_serving,
            stage: data.currently_serving.status,
          });
        }
        if (Array.isArray(data.waiting)) {
          data.waiting.forEach((booking) => {
            queueItems.push({
              ...booking,
              stage: booking.status,
            });
          });
        }
        setTokens(queueItems);
      }
    } catch (err) {
      console.warn("Backend queue fetch note:", err.message);
      setError(err.message || "Failed to load queue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const addAuditEntry = (tokenNumber, eventName, role, details) => {
    const newAuditLog = createAuditEvent(eventName, role, details);
    setTokens((prev) =>
      prev.map((token) => {
        if (String(token.token_number) === String(tokenNumber)) {
          return {
            ...token,
            audit_trail: [newAuditLog, ...(token.audit_trail || [])],
          };
        }
        return token;
      })
    );
  };

  const updateTokenStage = async (tokenNumber, newStage) => {
    // 1. Optimistic UI update
    setTokens((prev) =>
      prev.map((token) => {
        if (String(token.token_number) === String(tokenNumber)) {
          let auditEventName = "Stage Updated";
          if (newStage === "ARRIVED") auditEventName = "Farmer Arrived at Center";
          if (newStage === "WEIGHING") auditEventName = "Sent to Weighing Station";
          if (newStage === "QUALITY_CHECK") auditEventName = "Sent to Quality Inspection";

          const updatedAudit = [
            createAuditEvent(
              auditEventName,
              "Queue Operator",
              `Stage changed to ${newStage}.`
            ),
            ...(token.audit_trail || []),
          ];

          return {
            ...token,
            stage: newStage,
            status: newStage,
            checked_in: newStage === "ARRIVED" ? true : token.checked_in,
            audit_trail: updatedAudit,
          };
        }
        return token;
      })
    );

    // 2. Sync with Backend
    try {
      if (newStage === "ARRIVED") {
        await checkInToken(tokenNumber);
      }
    } catch (e) {
      console.warn("Backend stage update sync error:", e);
    }
  };

  const updateTokenWeighment = async (tokenNumber, weighmentInput) => {
    const { weighed_bags, gross_weight_kg, tare_weight_kg } = weighmentInput;
    const netKg = calculateNetWeight(gross_weight_kg, tare_weight_kg);
    const quintals = convertKgToQuintals(netKg);

    const targetToken = tokens.find((t) => String(t.token_number) === String(tokenNumber));

    // 1. Optimistic UI update
    setTokens((prev) =>
      prev.map((token) => {
        if (String(token.token_number) === String(tokenNumber)) {
          const currentWeightDetails = token.weight_details || {};
          const updatedWeightDetails = {
            ...currentWeightDetails,
            weighed_bags: parseInt(weighed_bags, 10) || currentWeightDetails.declared_bags || 0,
            gross_weight_kg: parseFloat(gross_weight_kg) || 0,
            tare_weight_kg: parseFloat(tare_weight_kg) || 0,
            net_weight_kg: netKg,
            accepted_weight_kg: netKg,
            accepted_quintals: quintals,
          };

          const auditLog = createAuditEvent(
            "Weighing Completed",
            "Weighbridge Operator",
            `Gross: ${gross_weight_kg} kg, Tare: ${tare_weight_kg} kg. Net Weight: ${netKg} kg (${quintals} quintals).`
          );

          return {
            ...token,
            stage: "QUALITY_CHECK",
            status: "QUALITY_CHECK",
            weight_details: updatedWeightDetails,
            audit_trail: [auditLog, ...(token.audit_trail || [])],
          };
        }
        return token;
      })
    );

    // 2. Sync with Backend
    if (targetToken && targetToken.id) {
      try {
        await submitWeighment(targetToken.id, {
          weighed_bags: parseInt(weighed_bags, 10) || 1,
          gross_weight_kg: parseFloat(gross_weight_kg) || 0,
          tare_weight_kg: parseFloat(tare_weight_kg) || 0,
          declared_bags: parseInt(weighed_bags, 10) || 1,
          declared_weight_kg: netKg,
        });
      } catch (e) {
        console.warn("Backend weighment sync error:", e);
      }
    }
  };

  const updateTokenQuality = async (tokenNumber, qualityInput) => {
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

    const targetToken = tokens.find((t) => String(t.token_number) === String(tokenNumber));
    const isAccepted = result === "ACCEPTED";
    const newStage = isAccepted ? "ACCEPTED" : "REJECTED";

    // 1. Optimistic UI update
    setTokens((prev) =>
      prev.map((token) => {
        if (String(token.token_number) === String(tokenNumber)) {
          const weightDetails = token.weight_details || {};
          const netKg = weightDetails.net_weight_kg || weightDetails.declared_weight_kg || 0;
          const acceptedKg = isAccepted ? netKg : 0;
          const acceptedQuintals = isAccepted ? convertKgToQuintals(acceptedKg) : 0;

          const updatedWeightDetails = {
            ...weightDetails,
            accepted_weight_kg: acceptedKg,
            accepted_quintals: acceptedQuintals,
          };

          const cropName = token.crop || "Paddy";
          const cropVariety = token.variety || "Grade A";

          const mspCalc = calculateMspPayout(
            acceptedKg,
            cropName,
            cropVariety,
            qualityInput.suggested_deduction_rs || 0
          );

          const updatedQuality = {
            moisture_percent: parseFloat(moisture_percent) || 0,
            foreign_matter_percent: parseFloat(foreign_matter_percent) || 0,
            damaged_grains_percent: parseFloat(damaged_grains_percent) || 0,
            slightly_damaged_percent: parseFloat(slightly_damaged_percent) || 0,
            shrivelled_broken_percent: parseFloat(shrivelled_broken_percent) || 0,
            other_grains_percent: parseFloat(other_grains_percent) || 0,
            weevilled_grains_percent: parseFloat(weevilled_grains_percent) || 0,
            grade: grade || "FAQ Accepted",
            result: result,
            rejection_reason: isAccepted ? null : rejection_reason,
            recommendation: recommendation || (isAccepted ? "FAQ_ACCEPTED" : "REJECTED"),
          };

          const currentPayment = token.payment || {};
          const updatedPayment = {
            ...currentPayment,
            msp_rate_per_quintal: mspCalc.mspRatePerQuintal,
            accepted_quintals: mspCalc.acceptedQuintals,
            base_amount: mspCalc.baseMspAmount,
            quality_deduction: mspCalc.qualityDeduction,
            final_amount: mspCalc.finalPayableAmount,
          };

          const auditLog = createAuditEvent(
            isAccepted ? "Quality Inspection Accepted" : "Quality Inspection Rejected",
            "Quality Inspector",
            isAccepted
              ? `Grain passed inspection (${grade}). Moisture: ${moisture_percent}%, Foreign Matter: ${foreign_matter_percent}%.`
              : `Batch rejected. Reason: ${rejection_reason || "Failed quality threshold limits"}.`
          );

          return {
            ...token,
            stage: newStage,
            status: newStage,
            weight_details: updatedWeightDetails,
            quality: updatedQuality,
            payment: updatedPayment,
            audit_trail: [auditLog, ...(token.audit_trail || [])],
          };
        }
        return token;
      })
    );

    // 2. Sync with Backend
    if (targetToken && targetToken.id) {
      try {
        await submitQualityCheck(targetToken.id, {
          moisture_percent: parseFloat(moisture_percent) || 0,
          foreign_matter_percent: parseFloat(foreign_matter_percent) || 0,
          damaged_grains_percent: parseFloat(damaged_grains_percent) || 0,
          slightly_damaged_percent: parseFloat(slightly_damaged_percent) || 0,
          shrivelled_broken_percent: parseFloat(shrivelled_broken_percent) || 0,
          other_grains_percent: parseFloat(other_grains_percent) || 0,
          weevilled_grains_percent: parseFloat(weevilled_grains_percent) || 0,
        });

        if (isAccepted) {
          await getMspCalculation(targetToken.id);
        }
      } catch (e) {
        console.warn("Backend quality check sync error:", e);
      }
    }
  };

  const updateTokenPayment = async (tokenNumber, paymentInput) => {
    const { amount, status, transaction_id } = paymentInput;
    const targetToken = tokens.find((t) => String(t.token_number) === String(tokenNumber));

    // 1. Optimistic UI update
    setTokens((prev) =>
      prev.map((token) => {
        if (String(token.token_number) === String(tokenNumber)) {
          let newStage = token.stage;
          if (status === "COMPLETED") newStage = "PAYMENT_COMPLETED";
          if (status === "PROCESSING") newStage = "PAYMENT_PROCESSING";

          const currentPayment = token.payment || {};
          const updatedPayment = {
            ...currentPayment,
            final_amount: parseFloat(amount) || currentPayment.final_amount || 0,
            status: status,
            transaction_id: transaction_id,
          };

          const auditLog = createAuditEvent(
            status === "COMPLETED" ? "Payment Completed" : "Payment Marked Processing",
            "Accounts Officer",
            `Disbursement amount: ₹${(parseFloat(amount) || 0).toLocaleString()}. UTR Ref: ${transaction_id}.`
          );

          return {
            ...token,
            stage: newStage,
            status: newStage,
            payment: updatedPayment,
            audit_trail: [auditLog, ...(token.audit_trail || [])],
          };
        }
        return token;
      })
    );

    // 2. Sync with Backend
    if (targetToken && targetToken.id) {
      try {
        const finalAmt = parseFloat(amount) || targetToken.price || 50000;
        const qtl = targetToken.weight_details?.accepted_quintals || 25;

        // Record procurement in database
        const proc = await submitProcurement({
          booking_id: targetToken.id,
          crop: targetToken.crop || "Paddy (Grade A)",
          quantity: qtl,
          quality: targetToken.quality?.grade || "FAQ Grade A",
          price_per_kg: Math.round(finalAmt / (qtl * 100)),
        });

        if (proc && proc.id) {
          await submitPayment({
            procurement_id: proc.id,
            amount: finalAmt,
          });
        }

        // Mark queue complete
        await completeFarmer(targetToken.id);
      } catch (e) {
        console.warn("Backend payment completion sync error:", e);
      }
    }
  };

  const skipToken = (tokenNumber) => {
    setTokens((prev) => {
      const index = prev.findIndex(
        (token) => String(token.token_number) === String(tokenNumber)
      );
      if (index === -1 || index === prev.length - 1) return prev;
      const copy = [...prev];
      const [moved] = copy.splice(index, 1);
      copy.push(moved);
      return copy;
    });

    addAuditEntry(
      tokenNumber,
      "Token Skipped",
      "Queue Marshal",
      "Pushed down in active queue order."
    );
  };

  const updateCenterConfig = (newConfig) => {
    setCenterInfo((prev) => ({
      ...prev,
      ...newConfig,
    }));
  };

  return (
    <QueueContext.Provider
      value={{
        tokens,
        centerInfo,
        loading,
        error,
        loadQueue,
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
    throw new Error("useQueue must be used within a QueueProvider");
  }
  return context;
}