/**
 * Thin wrappers around the real FastAPI backend (http://127.0.0.1:8000).
 * These replace the localStorage-based mock services for data that the
 * backend actually owns: farmer profile, crops, centres, slots, bookings,
 * queue status, grievances and notifications.
 */
import { apiRequest } from './api.js';

export async function registerFarmer({ name, phone, password, village, district, land_area }) {
  return apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, phone, password, village, district, land_area }),
  });
}

export async function fetchFarmerMe() {
  return apiRequest('/farmers/me');
}

export async function fetchCenters() {
  return apiRequest('/centers/');
}

export async function fetchSlotsForCenter(centerId) {
  return apiRequest(`/slots/center/${centerId}`);
}

export async function fetchMyCrops() {
  return apiRequest('/crops/my');
}

export async function createCrop({ crop_name, variety, season, quantity }) {
  return apiRequest('/crops/', {
    method: 'POST',
    body: JSON.stringify({ crop_name, variety, season, quantity }),
  });
}

export async function fetchMyBookings() {
  return apiRequest('/bookings/my');
}

export async function cancelBooking(bookingId) {
  return apiRequest(`/bookings/${bookingId}`, { method: 'DELETE' });
}

export async function createBooking({ center_id, crop_id, quantity, booking_date, slot_id }) {
  return apiRequest('/bookings/', {
    method: 'POST',
    body: JSON.stringify({ center_id, crop_id, quantity, booking_date, slot_id }),
  });
}

// Dynamic queue-allocation preview: live queue position + split-load ETA for
// a booking BEFORE it's created, computed from real existing bookings for
// the slot (see backend/dqa — inspired by github.com/meghanamudadla/FarmerProc/tree/main/dqa).
export async function fetchDynamicEta({ slot_id, crop_id, quantity }) {
  const params = new URLSearchParams({ slot_id, crop_id, quantity });
  return apiRequest(`/bookings/dynamic-eta?${params.toString()}`);
}

export async function fetchQueueForCenter(centerId) {
  return apiRequest(`/queue/center/${centerId}`);
}

export async function checkInByToken(token) {
  return apiRequest(`/checkin/${encodeURIComponent(token)}`, { method: 'POST' });
}

export async function fetchMyGrievances() {
  return apiRequest('/grievances/mine');
}

export async function createGrievance({ transaction_id, category, description, urgency, attachment_name }) {
  return apiRequest('/grievances/', {
    method: 'POST',
    body: JSON.stringify({ transaction_id, category, description, urgency, attachment_name }),
  });
}

export async function fetchMyNotifications() {
  return apiRequest('/notifications/my');
}

export async function markNotificationRead(notificationId) {
  return apiRequest(`/notifications/${notificationId}/read`, { method: 'PUT' });
}

export async function fetchMsp(bookingId) {
  return apiRequest(`/msp/${bookingId}`);
}
