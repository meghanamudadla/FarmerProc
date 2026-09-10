import { apiRequest } from "./api";

export async function getCenterQueue(centerId = 1) {
  return apiRequest(`/queue/center/${centerId}`);
}

export async function checkInToken(tokenNumber) {
  return apiRequest(`/checkin/${tokenNumber}`, {
    method: "POST",
  });
}

export async function callNextFarmer(centerId = 1) {
  return apiRequest(`/queue/center/${centerId}/next`, {
    method: "POST",
  });
}

export async function submitWeighment(bookingId, weighmentData) {
  return apiRequest(`/weighing/${bookingId}`, {
    method: "POST",
    body: JSON.stringify(weighmentData),
  });
}

export async function submitQualityCheck(bookingId, qualityData) {
  return apiRequest(`/quality/${bookingId}`, {
    method: "POST",
    body: JSON.stringify(qualityData),
  });
}

export async function getMspCalculation(bookingId) {
  return apiRequest(`/msp/${bookingId}`);
}

export async function submitProcurement(procurementData) {
  return apiRequest("/procurement/", {
    method: "POST",
    body: JSON.stringify(procurementData),
  });
}

export async function submitPayment(paymentData) {
  return apiRequest("/payments/", {
    method: "POST",
    body: JSON.stringify(paymentData),
  });
}

export async function completeFarmer(bookingId) {
  return apiRequest(`/queue/${bookingId}/complete`, {
    method: "POST",
  });
}