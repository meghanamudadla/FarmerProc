import { apiRequest } from "./api";

export async function getCenterQueue(centerId) {
  return apiRequest(`/queue/center/${centerId}`);
}

export async function callNextFarmer(centerId) {
  return apiRequest(`/queue/center/${centerId}/next`, {
    method: "POST",
  });
}

export async function completeFarmer(bookingId) {
  return apiRequest(`/queue/${bookingId}/complete`, {
    method: "POST",
  });
}