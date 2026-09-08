export const PREDEFINED_CROPS = [
  { id: 'paddy', en: 'Paddy (Grade A)', te: 'వరి (గ్రేడ్ A)', hi: 'धान (ग्रेड A)', msp: 2300, yieldPerAcre: 20 },
  { id: 'wheat', en: 'Wheat', te: 'గోధుమ', hi: 'गेहूं', msp: 2275, yieldPerAcre: 18 },
  { id: 'cotton', en: 'Cotton', te: 'పత్తి', hi: 'कपास', msp: 6620, yieldPerAcre: 8 },
  { id: 'maize', en: 'Maize', te: 'మొక్కజొన్న', hi: 'मक्का', msp: 2090, yieldPerAcre: 24 },
  { id: 'jowar', en: 'Jowar / Sorghum', te: 'జొన్న', hi: 'ज्वार', msp: 3180, yieldPerAcre: 10 },
  { id: 'bajra', en: 'Bajra / Pearl Millet', te: 'సజ్జ', hi: 'बाजरा', msp: 2500, yieldPerAcre: 12 },
  { id: 'ragi', en: 'Ragi / Finger Millet', te: 'రాగి', hi: 'रागी', msp: 4290, yieldPerAcre: 11 },
  { id: 'groundnut', en: 'Groundnut', te: 'వేరుశనగ', hi: 'मूंगफली', msp: 6377, yieldPerAcre: 9 },
  { id: 'soybean', en: 'Soybean', te: 'సోయాబీన్', hi: 'सोयाबीन', msp: 4892, yieldPerAcre: 11 },
  { id: 'sunflower', en: 'Sunflower', te: 'పొద్దుతిరుగుడు', hi: 'सूरजमुखी', msp: 6760, yieldPerAcre: 8 },
  { id: 'mustard', en: 'Mustard', te: 'ఆవాలు', hi: 'सरसों', msp: 5650, yieldPerAcre: 9 },
  { id: 'chickpea', en: 'Chickpea / Bengal Gram', te: 'శనగ', hi: 'चना', msp: 5440, yieldPerAcre: 10 },
  { id: 'pigeonpea', en: 'Pigeon Pea / Red Gram', te: 'కంది', hi: 'अरहर (तुअर)', msp: 7550, yieldPerAcre: 7 },
  { id: 'greengram', en: 'Green Gram (Moong)', te: 'పెసర', hi: 'मूंग', msp: 8558, yieldPerAcre: 6 },
  { id: 'blackgram', en: 'Black Gram (Urad)', te: 'మినుములు', hi: 'उड़द', msp: 6950, yieldPerAcre: 6 },
  { id: 'lentil', en: 'Lentil (Masur)', te: 'ఎర్ర కంది', hi: 'मसूर', msp: 6425, yieldPerAcre: 7 },
  { id: 'sugarcane', en: 'Sugarcane', te: 'చెరకు', hi: 'गन्ना', msp: 340, yieldPerAcre: 350 },
  { id: 'chilli', en: 'Chilli', te: 'మిరప', hi: 'मिर्च', msp: 6500, yieldPerAcre: 14 },
  { id: 'drychilli', en: 'Dry Chilli', te: 'ఎండు మిరప', hi: 'सूखी मिर्च', msp: 7000, yieldPerAcre: 15 },
  { id: 'turmeric', en: 'Turmeric', te: 'పసుపు', hi: 'हल्दी', msp: 6850, yieldPerAcre: 22 },
  { id: 'tobacco', en: 'Tobacco', te: 'పొగాకు', hi: 'तंबाकू', msp: 5200, yieldPerAcre: 12 },
  { id: 'sesame', en: 'Sesame (Til)', te: 'నువ్వులు', hi: 'तिल', msp: 8635, yieldPerAcre: 4 },
  { id: 'castor', en: 'Castor Seed', te: 'ఆముదం', hi: 'अरंडी', msp: 5850, yieldPerAcre: 8 },
  { id: 'mango', en: 'Mango', te: 'మామిడి', hi: 'आम', msp: 3200, yieldPerAcre: 45 },
  { id: 'banana', en: 'Banana', te: 'అరటి', hi: 'केला', msp: 1800, yieldPerAcre: 180 },
  { id: 'papaya', en: 'Papaya', te: 'బొప్పాయి', hi: 'पपीता', msp: 1600, yieldPerAcre: 120 },
  { id: 'tomato', en: 'Tomato', te: 'టమోటా', hi: 'टमाटर', msp: 1400, yieldPerAcre: 80 },
  { id: 'potato', en: 'Potato', te: 'బంగాళాదుంప', hi: 'आलू', msp: 1250, yieldPerAcre: 90 },
  { id: 'onion', en: 'Onion', te: 'ఉల్లిపాయ', hi: 'प्याज', msp: 1650, yieldPerAcre: 75 },
  { id: 'garlic', en: 'Garlic', te: 'వెల్లుల్లి', hi: 'लहसुन', msp: 7500, yieldPerAcre: 30 },
  { id: 'cabbage', en: 'Cabbage', te: 'క్యాబేజీ', hi: 'पत्तागोभी', msp: 1100, yieldPerAcre: 85 },
  { id: 'cauliflower', en: 'Cauliflower', te: 'కాలీఫ్లవర్', hi: 'फूलगोभी', msp: 1350, yieldPerAcre: 70 },
  { id: 'brinjal', en: 'Brinjal (Eggplant)', te: 'వంకాయ', hi: 'बैंगन', msp: 1450, yieldPerAcre: 65 },
  { id: 'okra', en: 'Okra / Lady Finger', te: 'బెండకాయ', hi: 'भिंडी', msp: 2100, yieldPerAcre: 40 },
];

export const CROPS = PREDEFINED_CROPS;

export const INITIAL_FARMER_CROPS = [
  {
    cropRecordId: 'cr-101',
    farmerId: 'FARM-91234567',
    cropId: 'cotton',
    season: 'Kharif 2026',
    landArea: 3.5,
    expectedQty: 75,
    eligibleQty: 70,
    alreadyProcuredQty: 70, // from completed booking b1
    verificationStatus: 'verified', // 'verified' | 'pending' | 'rejected'
    createdDate: '2026-08-15',
    updatedDate: '2026-09-03',
  },
  {
    cropRecordId: 'cr-102',
    farmerId: 'FARM-91234567',
    cropId: 'paddy',
    season: 'Kharif 2026',
    landArea: 4.0,
    expectedQty: 90,
    eligibleQty: 80,
    alreadyProcuredQty: 0,
    verificationStatus: 'verified',
    createdDate: '2026-08-20',
    updatedDate: '2026-08-20',
  },
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
  {
    id: 'c1',
    en: 'Sri Lakshmi Procurement Centre',
    te: 'శ్రీ లక్ష్మి సేకరణ కేంద్రం',
    hi: 'श्री लक्ष्मी खरीद केंद्र',
    place: 'Anantapur',
    village: 'Kakinada Rural',
    district: 'East Godavari',
    pin: '533001',
    address: 'NH-16 Bypass Road, Market Yard Yard-2, Kakinada',
    latitude: 16.9891,
    longitude: 82.2475,
    contactNumber: '+91 884 2345678',
    operatingHours: '06:00 AM – 06:00 PM',
    operatingStatus: 'OPEN', // 'OPEN' | 'CLOSED' | 'TEMPORARILY_CLOSED' | 'MAINTENANCE' | 'FULL'
    dailyFarmerCapacity: 100,
    dailyQuantityCapacity: 2000,
    slotDuration: '90 mins',
    numberOfCounters: 4,
    currentQueue: 5,
    currentBookedCapacity: 45,
    weighingScales: 3,
    storageCapQtl: 5000,
    disruptionAlert: null,
    distanceKm: 3.2,
  },
  {
    id: 'c2',
    en: 'Godavari Green Centre',
    te: 'గోదావరి గ్రీన్ కేంద్రం',
    hi: 'गोदावरी ग्रीन केंद्र',
    place: 'Rajahmundry',
    village: 'Dowleswaram',
    district: 'East Godavari',
    pin: '533125',
    address: 'Cotton Barrage Road, Opp. AP Markfed Depot, Dowleswaram',
    latitude: 16.9405,
    longitude: 81.7766,
    contactNumber: '+91 883 2456789',
    operatingHours: '06:00 AM – 06:00 PM',
    operatingStatus: 'OPEN',
    dailyFarmerCapacity: 120,
    dailyQuantityCapacity: 2500,
    slotDuration: '90 mins',
    numberOfCounters: 5,
    currentQueue: 28,
    currentBookedCapacity: 115,
    weighingScales: 4,
    storageCapQtl: 8000,
    disruptionAlert: 'Heavy rain alert — processing speed slightly reduced.',
    distanceKm: 8.5,
  },
  {
    id: 'c3',
    en: 'Krishna Delta Purchase Point',
    te: 'కృష్ణా డెల్టా కొనుగోలు కేంద్రం',
    hi: 'कृष्णा डेल्टा खरीद केंद्र',
    place: 'Vijayawada',
    village: 'Gollapudi',
    district: 'NTR District',
    pin: '521225',
    address: 'APMC Market Yard Gate 3, Gollapudi Bypass, Vijayawada',
    latitude: 16.5417,
    longitude: 80.5986,
    contactNumber: '+91 866 2567890',
    operatingHours: '06:00 AM – 06:00 PM',
    operatingStatus: 'FULL',
    dailyFarmerCapacity: 90,
    dailyQuantityCapacity: 1800,
    slotDuration: '90 mins',
    numberOfCounters: 3,
    currentQueue: 34,
    currentBookedCapacity: 90,
    weighingScales: 2,
    storageCapQtl: 4000,
    disruptionAlert: 'Centre capacity full for today. Please select an alternate centre.',
    distanceKm: 14.1,
  },
  {
    id: 'c4',
    en: 'Kakinada Port Agriculture Mandi',
    te: 'కాకినాడ పోర్ట్ వ్యవసాయ మండి',
    hi: 'काकीनाडा पोर्ट कृषि मंडी',
    place: 'Kakinada Port',
    village: 'Vakalapudi',
    district: 'East Godavari',
    pin: '533005',
    address: 'Port Main Road, Vakalapudi Industrial Area, Kakinada',
    latitude: 17.0012,
    longitude: 82.2718,
    contactNumber: '+91 884 2987654',
    operatingHours: '06:00 AM – 06:00 PM',
    operatingStatus: 'MAINTENANCE',
    dailyFarmerCapacity: 80,
    dailyQuantityCapacity: 1500,
    slotDuration: '90 mins',
    numberOfCounters: 2,
    currentQueue: 0,
    currentBookedCapacity: 20,
    weighingScales: 1,
    storageCapQtl: 3000,
    disruptionAlert: 'Weighbridge calibration underway. Resuming full operations shortly.',
    distanceKm: 5.4,
  },
];

// Real mandis typically open at first light and run through early evening;
// slots are shorter (90 min) so more farmers get precise, low-wait windows across the day.
export const SLOT_TIMES = [
  '06:00 AM – 07:30 AM', '07:30 AM – 09:00 AM', '09:00 AM – 10:30 AM', '10:30 AM – 12:00 PM',
  '12:00 PM – 01:30 PM', '01:30 PM – 03:00 PM', '03:00 PM – 04:30 PM', '04:30 PM – 06:00 PM',
];
export const SLOT_CAPACITY = 20;

export function cropById(id) {
  const found = CROPS.find((c) => c.id === id);
  if (found) return found;

  try {
    const saved = localStorage.getItem('kisanseva_farmer_crops');
    if (saved) {
      const all = JSON.parse(saved);
      const match = all.find((c) => c.cropId === id || c.cropRecordId === id);
      if (match) {
        return {
          id: match.cropId,
          en: match.cropName,
          te: match.cropName,
          hi: match.cropName,
          msp: DEFAULT_RATE,
          yieldPerAcre: 12,
        };
      }
    }
  } catch {}

  let cleanName = id || 'Produce';
  if (typeof cleanName === 'string' && cleanName.startsWith('custom-')) {
    cleanName = cleanName.replace('custom-', '').replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  }
  return { id: id || 'produce', en: cleanName, te: cleanName, hi: cleanName, msp: DEFAULT_RATE, yieldPerAcre: 10 };
}
export function centreById(id) {
  const found = CENTRES.find((c) => c.id === id);
  if (found) return found;
  return {
    id: id || 'c1',
    en: 'Procurement Centre',
    te: 'సేకరణ కేంద్రం',
    hi: 'खरीद केंद्र',
    place: 'Local Mandi',
    village: 'Local Village',
    district: 'District',
    pin: '500001',
    address: 'APMC Market Yard',
    operatingHours: '06:00 AM – 06:00 PM',
    operatingStatus: 'OPEN',
    dailyFarmerCapacity: 100,
    numberOfCounters: 3,
    distanceKm: 4.5,
  };
}

export function seedSlotBooked(centreId, date, slotIdx) {
  // deterministic pseudo-fill so the demo shows a mix of open / low / full slots
  let h = 0;
  const s = centreId + date + slotIdx;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 97;
  return h % (SLOT_CAPACITY + 1);
}
