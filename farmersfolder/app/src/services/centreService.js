/**
 * CentreService & Operational Capacity Management Engine
 *
 * Provides distance calculation (Haversine formula), mathematical congestion level calculation,
 * estimated wait time math, sorting algorithms, and backend capacity validation.
 */

export class CentreService {
  /**
   * Calculates distance between two lat/lon points in kilometers using Haversine formula.
   * @param {number} lat1
   * @param {number} lon1
   * @param {number} lat2
   * @param {number} lon2
   * @returns {number} Distance in km (1 decimal place)
   */
  static calculateDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 5.0; // fallback approximate distance
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  }

  /**
   * Calculates mathematical congestion state.
   * States: 'LOW' | 'MEDIUM' | 'HIGH' | 'FULL'
   * @param {Object} centre
   * @returns {'LOW' | 'MEDIUM' | 'HIGH' | 'FULL'}
   */
  static getCongestionLevel(centre) {
    if (centre.operatingStatus === 'FULL' || centre.operatingStatus === 'CLOSED' || centre.operatingStatus === 'TEMPORARILY_CLOSED') {
      return 'FULL';
    }
    const totalCap = centre.dailyFarmerCapacity || 100;
    const booked = centre.currentBookedCapacity || 0;
    const utilizationPct = (booked / totalCap) * 100;

    if (utilizationPct >= 95 || centre.currentQueue >= 30) {
      return 'FULL';
    }
    if (utilizationPct >= 75 || centre.currentQueue >= 15) {
      return 'HIGH';
    }
    if (utilizationPct >= 45 || centre.currentQueue >= 8) {
      return 'MEDIUM';
    }
    return 'LOW';
  }

  /**
   * Calculates estimated wait time in minutes based on queue length and active processing counters.
   * Average processing time per farmer is ~12-15 minutes per counter.
   * @param {number} queueLength
   * @param {number} numberOfCounters
   * @returns {number} Minutes
   */
  static calculateEstWaitTime(queueLength, numberOfCounters = 3) {
    const counters = Math.max(1, numberOfCounters);
    const queue = Math.max(0, queueLength);
    const avgMinsPerFarmer = 14;
    return Math.round((queue * avgMinsPerFarmer) / counters);
  }

  /**
   * Sorts centres by specified criteria.
   * Criteria: 'nearest' | 'queue' | 'wait' | 'availability'
   * @param {Array} centres
   * @param {string} sortBy
   * @returns {Array} Sorted copy
   */
  static sortCentres(centres, sortBy = 'nearest') {
    const copy = [...centres];
    switch (sortBy) {
      case 'nearest':
        return copy.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
      case 'queue':
        return copy.sort((a, b) => (a.currentQueue || 0) - (b.currentQueue || 0));
      case 'wait':
        return copy.sort(
          (a, b) =>
            CentreService.calculateEstWaitTime(a.currentQueue, a.numberOfCounters) -
            CentreService.calculateEstWaitTime(b.currentQueue, b.numberOfCounters)
        );
      case 'availability':
        return copy.sort(
          (a, b) =>
            (b.dailyFarmerCapacity - b.currentBookedCapacity) -
            (a.dailyFarmerCapacity - a.currentBookedCapacity)
        );
      default:
        return copy;
    }
  }

  /**
   * Validates backend capacity for booking.
   * @param {Object} centre
   * @returns {{ valid: boolean, reason?: string }}
   */
  static validateCapacityForBooking(centre) {
    if (!centre) return { valid: false, reason: 'Centre not found' };
    if (centre.operatingStatus !== 'OPEN') {
      return { valid: false, reason: `Centre is currently ${centre.operatingStatus.replace('_', ' ')}` };
    }
    const remainingCap = (centre.dailyFarmerCapacity || 100) - (centre.currentBookedCapacity || 0);
    if (remainingCap <= 0) {
      return { valid: false, reason: 'Centre has reached maximum daily farmer capacity' };
    }
    return { valid: true };
  }
}
