/*
  DEMO / CONFIGURATION VALUES:
  MSP (Minimum Support Price) rates per quintal are configurable baseline figures.
  In production, these rates are retrieved dynamically from the official MSP database API.
*/

export const MSP_RATES = {
  wheat: {
    season: 'Rabi 2024-25',
    cropLabel: 'Wheat',
    ratePerQuintal: 2275, // ₹2,275 / quintal
    unit: '₹ / quintal',
  },
  paddy_common: {
    season: 'Kharif 2024-25',
    cropLabel: 'Paddy (Common)',
    ratePerQuintal: 2183, // ₹2,183 / quintal
    unit: '₹ / quintal',
  },
  paddy_grade_a: {
    season: 'Kharif 2024-25',
    cropLabel: 'Paddy (Grade A)',
    ratePerQuintal: 2203, // ₹2,203 / quintal
    unit: '₹ / quintal',
  },
};

/**
 * Get applicable MSP rate per quintal for a given crop and grade/variety
 */
export function getMspRate(crop = 'wheat', variety = '') {
  const cropLower = String(crop).toLowerCase();
  const varietyLower = String(variety).toLowerCase();

  if (cropLower === 'paddy') {
    if (varietyLower.includes('grade a')) {
      return MSP_RATES.paddy_grade_a;
    }
    return MSP_RATES.paddy_common;
  }

  return MSP_RATES.wheat;
}
