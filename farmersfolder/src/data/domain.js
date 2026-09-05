export const CROPS = [
  { id: 'paddy', en: 'Paddy (Grade A)', te: 'వరి (గ్రేడ్ A)', msp: 2300, yieldPerAcre: 20 },
  { id: 'cotton', en: 'Cotton', te: 'పత్తి', msp: 6620, yieldPerAcre: 8 },
  { id: 'maize', en: 'Maize', te: 'మొక్కజొన్న', msp: 2090, yieldPerAcre: 24 },
  { id: 'wheat', en: 'Wheat', te: 'గోధుమ', msp: 2275, yieldPerAcre: 18 },
  { id: 'jowar', en: 'Jowar (Sorghum)', te: 'జొన్న', msp: 3180, yieldPerAcre: 10 },
  { id: 'bajra', en: 'Bajra (Pearl Millet)', te: 'సజ్జ', msp: 2500, yieldPerAcre: 12 },
  { id: 'groundnut', en: 'Groundnut', te: 'వేరుశనగ', msp: 6377, yieldPerAcre: 9 },
  { id: 'soybean', en: 'Soybean', te: 'సోయాబీన్', msp: 4892, yieldPerAcre: 11 },
  { id: 'gram', en: 'Gram (Chana)', te: 'శనగ', msp: 5650, yieldPerAcre: 10 },
  { id: 'redgram', en: 'Red Gram (Tur/Arhar)', te: 'కంది', msp: 7550, yieldPerAcre: 7 },
  { id: 'mustard', en: 'Mustard', te: 'ఆవాలు', msp: 5650, yieldPerAcre: 9 },
  { id: 'sugarcane', en: 'Sugarcane', te: 'చెరకు', msp: 340, yieldPerAcre: 350 },
];

// Fallback provisional rate (₹/quintal) shown for crops outside the MSP-notified list
// (e.g. vegetables like ladyfinger/tomato). Never ₹0 — the centre officer confirms the
// final rate on arrival, so this is clearly labelled as an estimate, not the final price.
export const DEFAULT_RATE = 1500;

// Farmer payments under MSP procurement are disbursed by Direct Benefit Transfer;
// the actual rail used depends on the bank/branch. We vary it per booking for realism.
export const PAYMENT_METHODS = ['NEFT (DBT)', 'RTGS (DBT)', 'UPI (BHIM Aadhaar Pay)'];

export function paymentMethodFor(token) {
  let h = 0;
  for (let i = 0; i < token.length; i++) h = (h * 31 + token.charCodeAt(i)) >>> 0;
  return PAYMENT_METHODS[h % PAYMENT_METHODS.length];
}

// Ordered payment pipeline. Progresses automatically over time — the farmer only ever views it.
export const PAY_SEQUENCE = ['initiated', 'verified', 'processing', 'credited'];

export function nextPayStage(status) {
  const i = PAY_SEQUENCE.indexOf(status);
  return i === -1 || i === PAY_SEQUENCE.length - 1 ? status : PAY_SEQUENCE[i + 1];
}

export const CENTRES = [
  { id: 'c1', en: 'Sri Lakshmi Procurement Centre', te: 'శ్రీ లక్ష్మి సేకరణ కేంద్రం', place: 'Anantapur' },
  { id: 'c2', en: 'Godavari Green Centre', te: 'గోదావరి గ్రీన్ కేంద్రం', place: 'Rajahmundry' },
  { id: 'c3', en: 'Krishna Delta Purchase Point', te: 'కృష్ణా డెల్టా కొనుగోలు కేంద్రం', place: 'Vijayawada' },
];

// Real mandis typically open at first light and run through early evening;
// slots are shorter (90 min) so more farmers get precise, low-wait windows across the day.
export const SLOT_TIMES = [
  '06:00 AM – 07:30 AM', '07:30 AM – 09:00 AM', '09:00 AM – 10:30 AM', '10:30 AM – 12:00 PM',
  '12:00 PM – 01:30 PM', '01:30 PM – 03:00 PM', '03:00 PM – 04:30 PM', '04:30 PM – 06:00 PM',
];
export const SLOT_CAPACITY = 20;

export function cropById(id) {
  return CROPS.find((c) => c.id === id);
}
export function centreById(id) {
  return CENTRES.find((c) => c.id === id);
}

export function seedSlotBooked(centreId, date, slotIdx) {
  // deterministic pseudo-fill so the demo shows a mix of open / low / full slots
  let h = 0;
  const s = centreId + date + slotIdx;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 97;
  return h % (SLOT_CAPACITY + 1);
}
