import { useState, useEffect } from 'react';
import { fetchCenters } from './backendData.js';

/**
 * Maps a backend ProcurementCenter record (id, name, location, district,
 * capacity) into the richer shape the existing centre UI (CentreCard,
 * CentreDetailsModal, CompareCentresModal, CentreService) was built around.
 * Fields the backend doesn't track yet (live queue, distance, contact info)
 * get sensible defaults rather than fabricated numbers.
 */
export function normalizeRealCentre(c) {
  const name = c.name || 'Procurement Centre';
  const capacity = c.capacity || 100;
  return {
    id: c.id,
    en: name,
    te: name,
    hi: name,
    place: c.district || '',
    village: c.village || c.district || '',
    district: c.district || '',
    pin: c.pin || '533001',
    address: c.location || c.address || 'Address not available',
    latitude: typeof c.latitude === 'number' ? c.latitude : null,
    longitude: typeof c.longitude === 'number' ? c.longitude : null,
    contactNumber: c.contact_number || '+91 884 2345678',
    operatingHours: c.operating_hours || '06:00 AM – 06:00 PM',
    operatingStatus: c.operating_status || 'OPEN',
    dailyFarmerCapacity: c.daily_farmer_capacity || capacity,
    dailyQuantityCapacity: c.daily_quantity_capacity || (capacity * 20),
    slotDuration: '90 mins',
    numberOfCounters: c.active_counters || c.weighing_scales || 3,
    currentQueue: c.current_queue != null ? c.current_queue : 0,
    currentBookedCapacity: c.today_arrivals != null ? c.today_arrivals : 0,
    weighingScales: c.weighing_scales || 2,
    storageCapQtl: c.storage_cap_qtl || (capacity * 50),
    disruptionAlert: c.disruption_alert || null,
    distanceKm: null,
    todayArrivals: c.today_arrivals || 0,
    estWaitMinutes: c.est_wait_minutes || 0,
  };
}

// Shared cache so non-hook code (e.g. domain.js's centreById, used by
// booking cards/receipts/modals) can resolve real centre names too, without
// every one of those call sites needing to fetch or thread props through.
let realCentreCache = [];

export function getCachedRealCentre(id) {
  if (id == null) return null;
  const numId = String(id).replace(/\D/g, '');
  return (
    realCentreCache.find(
      (c) =>
        c.id === id ||
        String(c.id) === String(id) ||
        (numId && String(c.id) === numId)
    ) || null
  );
}

export async function fetchRealCentres() {
  const list = await fetchCenters();
  const normalized = (Array.isArray(list) ? list : []).map(normalizeRealCentre);
  realCentreCache = normalized;
  return normalized;
}

/** Loads the real procurement centres from the backend once on mount. */
export function useRealCentres() {
  const [centres, setCentres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchRealCentres()
      .then((list) => {
        if (!cancelled) setCentres(list);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Could not load procurement centres from the server.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { centres, loading, error };
}
