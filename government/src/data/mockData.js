// ─── DISTRICTS ──────────────────────────────────────────
export const DISTRICTS = [
  { id: 'd1', name: 'Karnal', state: 'Haryana' },
  { id: 'd2', name: 'Anantapur', state: 'Andhra Pradesh' },
  { id: 'd3', name: 'East Godavari', state: 'Andhra Pradesh' },
  { id: 'd4', name: 'Krishna', state: 'Andhra Pradesh' },
];

// ─── CROPS ──────────────────────────────────────────────
export const CROPS = [
  { id: 'paddy', name: 'Paddy (Grade A)', msp: 2300 },
  { id: 'cotton', name: 'Cotton', msp: 6620 },
  { id: 'maize', name: 'Maize', msp: 2090 },
  { id: 'wheat', name: 'Wheat', msp: 2275 },
  { id: 'jowar', name: 'Jowar (Sorghum)', msp: 3180 },
  { id: 'bajra', name: 'Bajra (Pearl Millet)', msp: 2500 },
  { id: 'groundnut', name: 'Groundnut', msp: 6377 },
  { id: 'soybean', name: 'Soybean', msp: 4892 },
  { id: 'gram', name: 'Gram (Chana)', msp: 5650 },
  { id: 'redgram', name: 'Red Gram (Tur)', msp: 7550 },
  { id: 'mustard', name: 'Mustard', msp: 5650 },
  { id: 'sugarcane', name: 'Sugarcane', msp: 340 },
];

// ─── CENTERS ────────────────────────────────────────────
export const CENTERS = [
  { id: 'c01', name: 'Karnal Central Mandi', district: 'd1', lat: 29.6857, lng: 76.9905, status: 'normal', queueLength: 12, expectedWait: 35, capacityPercent: 58, todayArrivals: 87, processingRate: 14, staffOnDuty: 8, storagePercent: 62, crops: ['wheat','paddy'], approvalStatus: 'active' },
  { id: 'c02', name: 'Taraori Grain Market', district: 'd1', lat: 29.8024, lng: 76.9472, status: 'busy', queueLength: 28, expectedWait: 95, capacityPercent: 81, todayArrivals: 142, processingRate: 11, staffOnDuty: 6, storagePercent: 78, crops: ['wheat'], approvalStatus: 'active' },
  { id: 'c03', name: 'Gharaunda Purchase Hub', district: 'd1', lat: 29.5400, lng: 76.9700, status: 'congested', queueLength: 45, expectedWait: 180, capacityPercent: 96, todayArrivals: 198, processingRate: 8, staffOnDuty: 5, storagePercent: 91, crops: ['paddy','wheat'], approvalStatus: 'active' },
  { id: 'c04', name: 'Sri Lakshmi Centre', district: 'd2', lat: 14.6819, lng: 77.6006, status: 'normal', queueLength: 8, expectedWait: 20, capacityPercent: 42, todayArrivals: 56, processingRate: 16, staffOnDuty: 10, storagePercent: 38, crops: ['groundnut','cotton','paddy'], approvalStatus: 'active' },
  { id: 'c05', name: 'Anantapur APMC Yard', district: 'd2', lat: 14.6200, lng: 77.6500, status: 'busy', queueLength: 22, expectedWait: 65, capacityPercent: 73, todayArrivals: 94, processingRate: 12, staffOnDuty: 7, storagePercent: 69, crops: ['groundnut','maize'], approvalStatus: 'active' },
  { id: 'c06', name: 'Guntakal Mandi Point', district: 'd2', lat: 15.1710, lng: 77.3840, status: 'offline', queueLength: 0, expectedWait: 0, capacityPercent: 0, todayArrivals: 0, processingRate: 0, staffOnDuty: 0, storagePercent: 45, crops: ['groundnut'], approvalStatus: 'active' },
  { id: 'c07', name: 'Godavari Green Centre', district: 'd3', lat: 17.0005, lng: 81.8040, status: 'normal', queueLength: 15, expectedWait: 40, capacityPercent: 55, todayArrivals: 72, processingRate: 13, staffOnDuty: 9, storagePercent: 51, crops: ['paddy','sugarcane'], approvalStatus: 'active' },
  { id: 'c08', name: 'Rajahmundry APMC', district: 'd3', lat: 16.9891, lng: 81.7840, status: 'busy', queueLength: 31, expectedWait: 110, capacityPercent: 85, todayArrivals: 156, processingRate: 10, staffOnDuty: 6, storagePercent: 82, crops: ['paddy'], approvalStatus: 'active' },
  { id: 'c09', name: 'Kakinada Grain Hub', district: 'd3', lat: 16.9891, lng: 82.2475, status: 'normal', queueLength: 10, expectedWait: 28, capacityPercent: 48, todayArrivals: 63, processingRate: 15, staffOnDuty: 8, storagePercent: 44, crops: ['paddy','maize'], approvalStatus: 'active' },
  { id: 'c10', name: 'Krishna Delta Point', district: 'd4', lat: 16.5062, lng: 80.6480, status: 'congested', queueLength: 52, expectedWait: 200, capacityPercent: 98, todayArrivals: 210, processingRate: 7, staffOnDuty: 5, storagePercent: 94, crops: ['paddy','cotton'], approvalStatus: 'active' },
  { id: 'c11', name: 'Vijayawada Central', district: 'd4', lat: 16.5193, lng: 80.6305, status: 'normal', queueLength: 14, expectedWait: 38, capacityPercent: 52, todayArrivals: 78, processingRate: 14, staffOnDuty: 9, storagePercent: 49, crops: ['paddy','cotton','maize'], approvalStatus: 'active' },
  { id: 'c12', name: 'Machilipatnam Port Yard', district: 'd4', lat: 16.1875, lng: 81.1389, status: 'busy', queueLength: 19, expectedWait: 55, capacityPercent: 67, todayArrivals: 89, processingRate: 12, staffOnDuty: 7, storagePercent: 61, crops: ['paddy'], approvalStatus: 'active' },
];

// ─── FARMERS ────────────────────────────────────────────
export const FARMERS = [
  { id: 'FARM-77121', name: 'Ramesh Singh', mobile: '98123 45678', village: 'Kishanpur', district: 'd1', aadhar: 'XXXX-XXXX-4521', crop: 'paddy', totalBookings: 12, noShows: 0, flagged: false },
  { id: 'FARM-88422', name: 'Suresh Kumar', mobile: '98765 43210', village: 'Taraori', district: 'd1', aadhar: 'XXXX-XXXX-8892', crop: 'wheat', totalBookings: 8, noShows: 1, flagged: false },
  { id: 'FARM-99123', name: 'Pritam Sharma', mobile: '98111 22334', village: 'Gharaunda', district: 'd1', aadhar: 'XXXX-XXXX-3341', crop: 'paddy', totalBookings: 15, noShows: 0, flagged: false },
  { id: 'FARM-44124', name: 'Anita Devi', mobile: '98222 33445', village: 'Nilokheri', district: 'd1', aadhar: 'XXXX-XXXX-1104', crop: 'wheat', totalBookings: 6, noShows: 0, flagged: false },
  { id: 'FARM-55125', name: 'Balwan Yadav', mobile: '98333 44556', village: 'Indri', district: 'd1', aadhar: 'XXXX-XXXX-7789', crop: 'wheat', totalBookings: 4, noShows: 2, flagged: true },
  { id: 'FARM-66126', name: 'Manjit Kaur', mobile: '98444 55667', village: 'Assandh', district: 'd1', aadhar: 'XXXX-XXXX-9910', crop: 'paddy', totalBookings: 9, noShows: 0, flagged: false },
  { id: 'FARM-10201', name: 'Venkatesh Reddy', mobile: '94400 12345', village: 'Rapthadu', district: 'd2', aadhar: 'XXXX-XXXX-2201', crop: 'groundnut', totalBookings: 11, noShows: 0, flagged: false },
  { id: 'FARM-10202', name: 'Lakshmi Bai', mobile: '94400 67890', village: 'Dharmavaram', district: 'd2', aadhar: 'XXXX-XXXX-3302', crop: 'cotton', totalBookings: 7, noShows: 1, flagged: false },
  { id: 'FARM-10301', name: 'Satish Naidu', mobile: '94411 11111', village: 'Mandapeta', district: 'd3', aadhar: 'XXXX-XXXX-4401', crop: 'paddy', totalBookings: 14, noShows: 0, flagged: false },
  { id: 'FARM-10302', name: 'Padmavathi G.', mobile: '94411 22222', village: 'Amalapuram', district: 'd3', aadhar: 'XXXX-XXXX-5502', crop: 'sugarcane', totalBookings: 5, noShows: 0, flagged: false },
  { id: 'FARM-10401', name: 'Ravi Teja M.', mobile: '94422 33333', village: 'Gannavaram', district: 'd4', aadhar: 'XXXX-XXXX-6601', crop: 'paddy', totalBookings: 10, noShows: 0, flagged: false },
  { id: 'FARM-10402', name: 'Srinivas Rao', mobile: '94422 44444', village: 'Nuzvid', district: 'd4', aadhar: 'XXXX-XXXX-7702', crop: 'cotton', totalBookings: 3, noShows: 3, flagged: true },
];

// ─── ALERTS ─────────────────────────────────────────────
export const ALERTS = [
  { id: 'ALT-001', type: 'congestion', severity: 'critical', centerId: 'c10', title: 'Severe congestion at Krishna Delta Point', description: 'Queue length 52, wait time exceeds 3 hours. Capacity at 98%.', status: 'new', createdAt: '2026-09-08T06:30:00', acknowledgedBy: null, resolvedAt: null },
  { id: 'ALT-002', type: 'congestion', severity: 'critical', centerId: 'c03', title: 'Critical congestion at Gharaunda Purchase Hub', description: 'Queue length 45, capacity 96%, processing rate dropped to 8/hr.', status: 'acknowledged', createdAt: '2026-09-08T07:15:00', acknowledgedBy: 'District Admin (Karnal)', resolvedAt: null },
  { id: 'ALT-003', type: 'offline', severity: 'critical', centerId: 'c06', title: 'Guntakal Mandi Point is OFFLINE', description: 'Center unresponsive since 05:45 AM. Staff not reporting. Power outage suspected.', status: 'in_progress', createdAt: '2026-09-08T05:45:00', acknowledgedBy: 'State Admin', resolvedAt: null },
  { id: 'ALT-004', type: 'excessive_wait', severity: 'warning', centerId: 'c08', title: 'High wait time at Rajahmundry APMC', description: 'Average wait time 110 min, exceeding 90 min threshold.', status: 'new', createdAt: '2026-09-08T08:00:00', acknowledgedBy: null, resolvedAt: null },
  { id: 'ALT-005', type: 'payment_delay', severity: 'warning', centerId: 'c02', title: 'Payment processing delayed at Taraori', description: '23 payments pending >24 hours. Bank API timeout suspected.', status: 'acknowledged', createdAt: '2026-09-08T04:30:00', acknowledgedBy: 'District Admin (Karnal)', resolvedAt: null },
  { id: 'ALT-006', type: 'high_rejection', severity: 'warning', centerId: 'c05', title: 'High rejection rate at Anantapur APMC', description: 'Rejection rate 18% today (threshold 10%). Quality check anomaly.', status: 'new', createdAt: '2026-09-08T09:00:00', acknowledgedBy: null, resolvedAt: null },
  { id: 'ALT-007', type: 'low_storage', severity: 'info', centerId: 'c10', title: 'Storage nearly full at Krishna Delta', description: 'Storage at 94%. Expected to reach full capacity by tomorrow.', status: 'resolved', createdAt: '2026-09-07T14:00:00', acknowledgedBy: 'State Admin', resolvedAt: '2026-09-07T18:30:00' },
  { id: 'ALT-008', type: 'abnormal_pattern', severity: 'info', centerId: 'c11', title: 'Unusual spike in arrivals at Vijayawada', description: '78 arrivals vs 45 avg. Possible rerouted traffic from congested centers.', status: 'new', createdAt: '2026-09-08T10:00:00', acknowledgedBy: null, resolvedAt: null },
];

// ─── GRIEVANCES ─────────────────────────────────────────
export const GRIEVANCES = [
  { id: 'GRV-001', farmerId: 'FARM-55125', farmerName: 'Balwan Yadav', centerId: 'c02', category: 'unfair_rejection', title: 'Quality rejection disputed', description: 'Farmer claims wheat was unfairly rejected. Moisture reading disputed.', status: 'new', priority: 'high', createdAt: '2026-09-08T07:30:00', slaDeadline: '2026-09-10T07:30:00', assignedTo: null, resolvedAt: null },
  { id: 'GRV-002', farmerId: 'FARM-10402', farmerName: 'Srinivas Rao', centerId: 'c10', category: 'payment_dispute', title: 'Payment not received after 5 days', description: 'TXN-990102 shows completed but farmer has not received funds.', status: 'assigned', priority: 'critical', createdAt: '2026-09-05T10:00:00', slaDeadline: '2026-09-08T10:00:00', assignedTo: 'Revenue Officer, Krishna', resolvedAt: null },
  { id: 'GRV-003', farmerId: 'FARM-10201', farmerName: 'Venkatesh Reddy', centerId: 'c05', category: 'staff_misconduct', title: 'Staff demanded extra fee', description: 'Gate entry staff allegedly asked for ₹200 to expedite token.', status: 'in_progress', priority: 'high', createdAt: '2026-09-06T14:00:00', slaDeadline: '2026-09-09T14:00:00', assignedTo: 'District Inspector, Anantapur', resolvedAt: null },
  { id: 'GRV-004', farmerId: 'FARM-10301', farmerName: 'Satish Naidu', centerId: 'c08', category: 'unfair_rejection', title: 'Paddy graded incorrectly', description: 'Lab test shows 12.8% moisture but center recorded 15.2%.', status: 'resolved', priority: 'medium', createdAt: '2026-09-03T08:00:00', slaDeadline: '2026-09-06T08:00:00', assignedTo: 'Quality Supervisor, E.Godavari', resolvedAt: '2026-09-05T16:00:00' },
  { id: 'GRV-005', farmerId: 'FARM-66126', farmerName: 'Manjit Kaur', centerId: 'c01', category: 'long_wait', title: 'Waited 6 hours despite booking', description: 'Had 09:00 slot but was not called until 15:00.', status: 'new', priority: 'medium', createdAt: '2026-09-07T16:00:00', slaDeadline: '2026-09-10T16:00:00', assignedTo: null, resolvedAt: null },
];

// ─── AUDIT LOG ──────────────────────────────────────────
export const AUDIT_LOG = [
  { id: 'AUD-G001', timestamp: '2026-09-08T10:30:00', user: 'Rajesh Mehta', role: 'State Admin', action: 'threshold_change', description: 'Changed congestion threshold from 40 to 45 for all centers', target: 'System Config' },
  { id: 'AUD-G002', timestamp: '2026-09-08T09:15:00', user: 'Priya Sharma', role: 'District Admin (Karnal)', action: 'center_deactivate', description: 'Temporarily deactivated Gharaunda Purchase Hub for maintenance', target: 'Center c03' },
  { id: 'AUD-G003', timestamp: '2026-09-08T08:45:00', user: 'Rajesh Mehta', role: 'State Admin', action: 'alert_acknowledge', description: 'Acknowledged critical alert ALT-003 (Guntakal offline)', target: 'Alert ALT-003' },
  { id: 'AUD-G004', timestamp: '2026-09-08T08:00:00', user: 'System', role: 'System', action: 'auto_escalation', description: 'Auto-escalated unacknowledged critical alert ALT-001 to State Admin', target: 'Alert ALT-001' },
  { id: 'AUD-G005', timestamp: '2026-09-07T17:00:00', user: 'Vikram Singh', role: 'State Admin', action: 'farmer_flag', description: 'Flagged farmer FARM-10402 (Srinivas Rao) for repeated no-shows (3)', target: 'Farmer FARM-10402' },
  { id: 'AUD-G006', timestamp: '2026-09-07T15:30:00', user: 'Priya Sharma', role: 'District Admin (Karnal)', action: 'redirect_bookings', description: 'Redirected 15 new bookings from c03 (Gharaunda) to c01 (Karnal Central)', target: 'Centers c03 → c01' },
  { id: 'AUD-G007', timestamp: '2026-09-07T14:00:00', user: 'Anand Rao', role: 'District Admin (Krishna)', action: 'grievance_assign', description: 'Assigned grievance GRV-002 to Revenue Officer', target: 'Grievance GRV-002' },
  { id: 'AUD-G008', timestamp: '2026-09-07T12:00:00', user: 'Rajesh Mehta', role: 'State Admin', action: 'crop_config', description: 'Updated MSP rate for Paddy Grade A from ₹2,203 to ₹2,300/qtl', target: 'Crop Config' },
  { id: 'AUD-G009', timestamp: '2026-09-06T16:00:00', user: 'System', role: 'System', action: 'center_approve', description: 'New center "Nellore Agri Hub" approved and activated', target: 'Center c13' },
  { id: 'AUD-G010', timestamp: '2026-09-06T10:00:00', user: 'Vikram Singh', role: 'State Admin', action: 'user_role_change', description: 'Changed Dept. Auditor access for user meena.k@gov.in', target: 'User Management' },
];

// ─── PAYMENT RECORDS ────────────────────────────────────
export const PAYMENTS = [
  { centerId: 'c01', centerName: 'Karnal Central Mandi', totalProcuredQtl: 1250, totalPaidQtl: 1250, totalAmount: 2843750, pendingPayments: 3, completedPayments: 84, delayedPayments: 0, reconciled: true },
  { centerId: 'c02', centerName: 'Taraori Grain Market', totalProcuredQtl: 890, totalPaidQtl: 867, totalAmount: 2027525, pendingPayments: 23, completedPayments: 56, delayedPayments: 23, reconciled: false },
  { centerId: 'c03', centerName: 'Gharaunda Purchase Hub', totalProcuredQtl: 1580, totalPaidQtl: 1580, totalAmount: 3637400, pendingPayments: 0, completedPayments: 98, delayedPayments: 0, reconciled: true },
  { centerId: 'c04', centerName: 'Sri Lakshmi Centre', totalProcuredQtl: 670, totalPaidQtl: 670, totalAmount: 4271590, pendingPayments: 2, completedPayments: 54, delayedPayments: 0, reconciled: true },
  { centerId: 'c05', centerName: 'Anantapur APMC Yard', totalProcuredQtl: 520, totalPaidQtl: 498, totalAmount: 3170340, pendingPayments: 8, completedPayments: 42, delayedPayments: 5, reconciled: false },
  { centerId: 'c06', centerName: 'Guntakal Mandi Point', totalProcuredQtl: 0, totalPaidQtl: 0, totalAmount: 0, pendingPayments: 0, completedPayments: 0, delayedPayments: 0, reconciled: true },
  { centerId: 'c07', centerName: 'Godavari Green Centre', totalProcuredQtl: 980, totalPaidQtl: 980, totalAmount: 2254000, pendingPayments: 5, completedPayments: 67, delayedPayments: 0, reconciled: true },
  { centerId: 'c08', centerName: 'Rajahmundry APMC', totalProcuredQtl: 1340, totalPaidQtl: 1298, totalAmount: 2985400, pendingPayments: 12, completedPayments: 88, delayedPayments: 8, reconciled: false },
  { centerId: 'c09', centerName: 'Kakinada Grain Hub', totalProcuredQtl: 740, totalPaidQtl: 740, totalAmount: 1702000, pendingPayments: 1, completedPayments: 62, delayedPayments: 0, reconciled: true },
  { centerId: 'c10', centerName: 'Krishna Delta Point', totalProcuredQtl: 1890, totalPaidQtl: 1820, totalAmount: 4186000, pendingPayments: 18, completedPayments: 110, delayedPayments: 15, reconciled: false },
  { centerId: 'c11', centerName: 'Vijayawada Central', totalProcuredQtl: 860, totalPaidQtl: 860, totalAmount: 1978000, pendingPayments: 4, completedPayments: 74, delayedPayments: 0, reconciled: true },
  { centerId: 'c12', centerName: 'Machilipatnam Port Yard', totalProcuredQtl: 610, totalPaidQtl: 610, totalAmount: 1403000, pendingPayments: 2, completedPayments: 58, delayedPayments: 0, reconciled: true },
];

// ─── ANALYTICS DATA ─────────────────────────────────────
export const DAILY_PROCUREMENT = [
  { date: 'Sep 01', arrivals: 680, completed: 645, rejected: 35, quantity: 7200, payments: 6980 },
  { date: 'Sep 02', arrivals: 720, completed: 690, rejected: 30, quantity: 7800, payments: 7500 },
  { date: 'Sep 03', arrivals: 695, completed: 660, rejected: 35, quantity: 7400, payments: 7100 },
  { date: 'Sep 04', arrivals: 810, completed: 770, rejected: 40, quantity: 8600, payments: 8200 },
  { date: 'Sep 05', arrivals: 890, completed: 840, rejected: 50, quantity: 9500, payments: 9100 },
  { date: 'Sep 06', arrivals: 760, completed: 720, rejected: 40, quantity: 8100, payments: 7800 },
  { date: 'Sep 07', arrivals: 840, completed: 800, rejected: 40, quantity: 9000, payments: 8700 },
  { date: 'Sep 08', arrivals: 1245, completed: 987, rejected: 58, quantity: 10330, payments: 8900 },
];

export const CROP_PROCUREMENT = [
  { crop: 'Paddy', quantity: 32500, percentage: 42 },
  { crop: 'Wheat', quantity: 21800, percentage: 28 },
  { crop: 'Groundnut', quantity: 8900, percentage: 12 },
  { crop: 'Cotton', quantity: 6200, percentage: 8 },
  { crop: 'Maize', quantity: 4100, percentage: 5 },
  { crop: 'Others', quantity: 3800, percentage: 5 },
];

export const REJECTION_REASONS = [
  { reason: 'High Moisture', count: 124, percentage: 38 },
  { reason: 'Foreign Matter', count: 78, percentage: 24 },
  { reason: 'Damaged Grains', count: 52, percentage: 16 },
  { reason: 'Documentation', count: 39, percentage: 12 },
  { reason: 'Other', count: 35, percentage: 10 },
];

export const HOURLY_TODAY = [
  { hour: '6AM', arrivals: 45, completed: 12 },
  { hour: '7AM', arrivals: 89, completed: 56 },
  { hour: '8AM', arrivals: 134, completed: 98 },
  { hour: '9AM', arrivals: 178, completed: 145 },
  { hour: '10AM', arrivals: 156, completed: 138 },
  { hour: '11AM', arrivals: 198, completed: 167 },
  { hour: '12PM', arrivals: 145, completed: 132 },
  { hour: '1PM', arrivals: 112, completed: 99 },
  { hour: '2PM', arrivals: 98, completed: 82 },
  { hour: '3PM', arrivals: 67, completed: 45 },
  { hour: '4PM', arrivals: 23, completed: 13 },
];

// ─── CONGESTION & TREND DATA (Rule-based / Illustrative baseline data) ───
export const FORECAST = {
  tomorrowArrivals: { estimated: 1380, low: 1220, high: 1540, thresholdRate: 0.82 },
  peakWindow: '9:00 AM – 12:00 PM',
  modelBasis: 'Based on last 3 harvest-week baseline data, current seasonal arrival patterns, and weather reports (clear skies, 32°C)',
  atRiskCenters: [
    { centerId: 'c10', name: 'Krishna Delta Point', riskScore: 0.94, expectedQueue: 68, reason: 'Persistent congestion + rising arrivals trend' },
    { centerId: 'c03', name: 'Gharaunda Purchase Hub', riskScore: 0.87, expectedQueue: 52, reason: 'Storage 91% + high arrival trend' },
    { centerId: 'c08', name: 'Rajahmundry APMC', riskScore: 0.71, expectedQueue: 38, reason: 'Staff shortage (6 of 12 rostered)' },
  ],
  redirections: [
    { from: 'c10', fromName: 'Krishna Delta Point', to: 'c11', toName: 'Vijayawada Central', farmerCount: 25, saving: '~2hr wait reduction' },
    { from: 'c03', fromName: 'Gharaunda Purchase Hub', to: 'c01', toName: 'Karnal Central Mandi', farmerCount: 18, saving: '~1.5hr wait reduction' },
    { from: 'c08', fromName: 'Rajahmundry APMC', to: 'c09', toName: 'Kakinada Grain Hub', farmerCount: 12, saving: '~1hr wait reduction' },
  ],
};

// ─── LIVE EVENTS (Pulse Strip) ──────────────────────────
export const LIVE_EVENTS = [
  { id: 'EV-001', time: '10:32 AM', type: 'alert', message: 'Krishna Delta Point hit 98% capacity', icon: '🔴' },
  { id: 'EV-002', time: '10:28 AM', type: 'payment', message: 'Payment batch ₹12.4L cleared for Karnal Central', icon: '💰' },
  { id: 'EV-003', time: '10:15 AM', type: 'offline', message: 'Guntakal Mandi still unresponsive (4h 30m)', icon: '⚫' },
  { id: 'EV-004', time: '10:02 AM', type: 'milestone', message: 'Today\'s procurement crossed 10,000 quintals', icon: '📦' },
  { id: 'EV-005', time: '09:45 AM', type: 'grievance', message: 'New grievance filed: Payment dispute at Krishna Delta', icon: '📋' },
];

// ─── HELPER FUNCTIONS ───────────────────────────────────
export function getCentersByDistrict(districtId) {
  return CENTERS.filter(c => c.district === districtId);
}

export function getDistrictName(districtId) {
  // Real backend records store the district as a plain place name (e.g.
  // "East Godavari") rather than a mock district id (e.g. "d3") — fall back
  // to the raw value instead of "Unknown" so live data still displays.
  return DISTRICTS.find(d => d.id === districtId)?.name || districtId || 'Unknown';
}

export function getCropName(cropId) {
  return CROPS.find(c => c.id === cropId)?.name || cropId;
}

export function getStatusColor(status) {
  const map = { normal: '#22c55e', busy: '#eab308', congested: '#ef4444', offline: '#6b7280' };
  return map[status] || '#6b7280';
}

export function getSeverityColor(severity) {
  const map = { critical: '#ef4444', warning: '#f59e0b', info: '#3b82f6' };
  return map[severity] || '#3b82f6';
}

// KPI aggregations
export function computeKPIs() {
  const activeCenters = CENTERS.filter(c => c.status !== 'offline');
  const totalArrivals = CENTERS.reduce((s, c) => s + c.todayArrivals, 0);
  const totalCompleted = DAILY_PROCUREMENT[DAILY_PROCUREMENT.length - 1]?.completed || 0;
  const totalQuantity = DAILY_PROCUREMENT[DAILY_PROCUREMENT.length - 1]?.quantity || 0;
  const totalPayments = PAYMENTS.reduce((s, p) => s + p.totalAmount, 0);
  const activeQueues = CENTERS.reduce((s, c) => s + c.queueLength, 0);
  const congested = CENTERS.filter(c => c.status === 'congested').length;
  const offline = CENTERS.filter(c => c.status === 'offline').length;
  const normal = CENTERS.filter(c => c.status === 'normal').length;
  const pendingIssues = ALERTS.filter(a => a.status !== 'resolved').length + GRIEVANCES.filter(g => g.status !== 'resolved').length;

  // Yesterday comparisons (simulated)
  return {
    totalFarmers: { value: FARMERS.length * 84, change: 3.2, label: 'Registered Farmers' },
    totalCenters: { value: CENTERS.length, change: 0, label: 'Procurement Centers' },
    todayArrivals: { value: totalArrivals, change: 8.5, label: "Today's Arrivals" },
    todayCompleted: { value: totalCompleted, change: 5.1, label: "Today's Completed" },
    totalQuantity: { value: totalQuantity, change: 12.3, label: 'Qty Procured (qtl)' },
    totalPayments: { value: totalPayments, change: 6.7, label: 'Payments Disbursed' },
    activeQueues: { value: activeQueues, change: -4.2, label: 'Active Queue Total' },
    congested: { value: congested, change: 0, label: 'Congested Centers' },
    offline: { value: offline, change: 100, label: 'Offline Centers' },
    normal: { value: normal, change: 0, label: 'Normal Centers' },
    pendingIssues: { value: pendingIssues, change: 15, label: 'Pending Issues' },
  };
}
