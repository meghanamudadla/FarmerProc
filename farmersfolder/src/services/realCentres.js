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
    village: c.district || '',
    district: c.district || '',
    pin: '-',
    address: c.location || c.district || 'Address not available',
    latitude: null,
    longitude: null,
    contactNumber: 'Contact mandi office',
    operatingHours: '06:00 AM – 06:00 PM',
    operatingStatus: 'OPEN',
    dailyFarmerCapacity: capacity,
    dailyQuantityCapacity: capacity * 20,
    slotDuration: '90 mins',
    numberOfCounters: 3,
    currentQueue: 0,
    currentBookedCapacity: 0,
    weighingScales: 2,
    storageCapQtl: capacity * 50,
    disruptionAlert: null,
    distanceKm: null,
  };
}

// Shared cache so non-hook code (e.g. domain.js's centreById, used by
// booking cards/receipts/modals) can resolve real centre names too, without
// every one of those call sites needing to fetch or thread props through.
let realCentreCache = [];

export function getCachedRealCentre(id) {
  return realCentreCache.find((c) => c.id === id) || null;
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
