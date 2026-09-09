/**
 * Phase 9 — Notification Template Registry
 * 
 * Multilingual message templates (EN, TE, HI) for all 14 business events
 * across 4 channels (SMS, PUSH, IN_APP, IVR).
 */

export const NOTIFICATION_TEMPLATES = {
  BOOKING_CONFIRMED: {
    en: (d) => `Your procurement slot is confirmed! Token: ${d.token} at ${d.centreName || 'Mandi'} on ${d.date}, ${d.slotTime || 'Morning Slot'}. Please bring your Aadhaar and land document.`,
    te: (d) => `మీ సేకరణ స్లాట్ నిర్ధారించబడింది! టోకెన్: ${d.token}, ${d.centreName || 'మండి'}లో ${d.date}, ${d.slotTime || 'ఉదయం'}. దయచేసి ఆధార్ మరియు పట్టాదారు పాస్‌బుక్ తీసుకురండి.`,
    hi: (d) => `आपका खरीद स्लॉट कन्फर्म हो गया है! टोकन: ${d.token}, ${d.centreName || 'मंडी'} पर दिनांक ${d.date}, ${d.slotTime || 'सुबह'}. कृपया अपना आधार और भूमि दस्तावेज साथ लाएं।`,
  },
  BOOKING_REMINDER: {
    en: (d) => `Reminder: Your procurement visit for Token ${d.token} is scheduled for tomorrow at ${d.centreName}. Arrive 15 minutes prior to gate opening.`,
    te: (d) => `గుర్తుంచుకోండి: మీ టోకెన్ ${d.token} కోసం సేకరణ సందర్శన రేపు ${d.centreName}లో షెడ్యూల్ చేయబడింది. 15 నిమిషాలు ముందుగా చేరుకోండి.`,
    hi: (d) => `स्मरणपत्र: टोकन ${d.token} के लिए आपकी खरीद कल ${d.centreName} पर निर्धारित है। कृपया 15 मिनट पहले पहुंचें।`,
  },
  BOOKING_CANCELLED: {
    en: (d) => `Your procurement slot for Token ${d.token} has been cancelled successfully. You may book a new slot anytime.`,
    te: (d) => `టోకెన్ ${d.token} కోసం మీ సేకరణ స్లాట్ విజయవంతంగా రద్దు చేయబడింది. మీరు ఎప్పుడైనా కొత్త స్లాట్ బుక్ చేసుకోవచ్చు.`,
    hi: (d) => `टोकन ${d.token} के लिए आपका खरीद स्लॉट रद्द कर दिया गया है। आप किसी भी समय नया स्लॉट बुक कर सकते हैं।`,
  },
  BOOKING_RESCHEDULED: {
    en: (d) => `Your slot for Token ${d.token} has been rescheduled to ${d.date}, ${d.slotTime} at ${d.centreName}.`,
    te: (d) => `టోకెన్ ${d.token} కోసం మీ స్లాట్ ${d.date}, ${d.slotTime}, ${d.centreName}కి మార్చబడింది.`,
    hi: (d) => `टोकन ${d.token} के लिए आपका स्लॉट बदलकर ${d.date}, ${d.slotTime}, ${d.centreName} कर दिया गया है।`,
  },
  QUEUE_APPROACHING: {
    en: (d) => `Your turn is approaching! Token ${d.token}: Only ${d.peopleAhead || 1} farmer(s) ahead of you in queue. Please be near your vehicle.`,
    te: (d) => `మీ వంతు దగ్గరపడుతోంది! టోకెన్ ${d.token}: క్యూలో మీ ముందు కేవలం ${d.peopleAhead || 1} రైతు మాత్రమే ఉన్నారు. దయచేసి వాహనం వద్ద సిద్ధంగా ఉండండి.`,
    hi: (d) => `आपकी बारी आने वाली है! टोकन ${d.token}: कतार में आपके आगे केवल ${d.peopleAhead || 1} किसान हैं। कृपया अपने वाहन के पास रहें।`,
  },
  CHECKED_IN: {
    en: (d) => `Gate check-in verified for Token ${d.token} at ${d.time || '09:15 AM'}. Your live queue status is now active.`,
    te: (d) => `టోకెన్ ${d.token} కోసం గేట్ చెక్-ఇన్ ధృవీకరించబడింది (${d.time || '09:15 AM'}). మీ లైవ్ క్యూ స్థితి యాక్టివ్‌గా ఉంది.`,
    hi: (d) => `टोकन ${d.token} के लिए गेट चेक-इन सत्यापित हो गया है (${d.time || '09:15 AM'})। आपका लाइव कतार स्टेटस सक्रिय है।`,
  },
  QUALITY_COMPLETED: {
    en: (d) => `Quality inspection completed for Token ${d.token}. Grade: ${d.grade || 'GRADE_A'} (Moisture: ${d.moisture || '11.5'}%). Proceeding to weighbridge.`,
    te: (d) => `టోకెన్ ${d.token} కోసం నాణ్యత తనిఖీ పూర్తయింది. గ్రేడ్: ${d.grade || 'GRADE_A'} (తేమ: ${d.moisture || '11.5'}%). వేబ్రిడ్జికి వెళ్లండి.`,
    hi: (d) => `टोकन ${d.token} के लिए गुणवत्ता जांच पूरी हो गई। ग्रेड: ${d.grade || 'GRADE_A'} (नमी: ${d.moisture || '11.5'}%)। धर्मकांटा वजन के लिए आगे बढ़ें।`,
  },
  PROCUREMENT_COMPLETED: {
    en: (d) => `Procurement completed for Token ${d.token}! Net Weight: ${d.netWeight || '70'} Qtl. Certified value: ₹${(d.amount || 463400).toLocaleString('en-IN')}.`,
    te: (d) => `టోకెన్ ${d.token} కోసం సేకరణ పూర్తయింది! నికర బరువు: ${d.netWeight || '70'} క్వి. ధృవీకరించిన విలువ: ₹${(d.amount || 463400).toLocaleString('en-IN')}.`,
    hi: (d) => `टोकन ${d.token} की खरीद सफलतापूर्वक पूरी हुई! शुद्ध वजन: ${d.netWeight || '70'} क्विंटल। कुल मूल्य: ₹${(d.amount || 463400).toLocaleString('en-IN')}।`,
  },
  RECEIPT_GENERATED: {
    en: (d) => `Official Digital Receipt #${d.receiptId || 'RCP-2026-849102'} generated for Token ${d.token}. Tap to view or download gate slip.`,
    te: (d) => `టోకెన్ ${d.token} కోసం అధికారిక డిజిటల్ రసీదు #${d.receiptId || 'RCP-2026-849102'} రూపొందించబడింది. రసీదు చూడటానికి క్లిక్ చేయండి.`,
    hi: (d) => `टोकन ${d.token} के लिए आधिकारिक डिजिटल रसीद #${d.receiptId || 'RCP-2026-849102'} जारी कर दी गई है। देखने के लिए क्लिक करें।`,
  },
  PAYMENT_INITIATED: {
    en: (d) => `DBT payment of ₹${(d.amount || 463400).toLocaleString('en-IN')} has been initiated to your bank account ${d.bankMasked || '•••• 3422'} (Ref: ${d.refId || 'PFMS-99418'}).`,
    te: (d) => `మీ బ్యాంక్ ఖాతా ${d.bankMasked || '•••• 3422'}కి ₹${(d.amount || 463400).toLocaleString('en-IN')} DBT చెల్లింపు ప్రారంభమైంది (రెఫ్: ${d.refId || 'PFMS-99418'}).`,
    hi: (d) => `आपके बैंक खाते ${d.bankMasked || '•••• 3422'} में ₹${(d.amount || 463400).toLocaleString('en-IN')} का DBT भुगतान शुरू कर दिया गया है (रेफरेंस: ${d.refId || 'PFMS-99418'})।`,
  },
  PAYMENT_CREDITED: {
    en: (d) => `✅ Payment of ₹${(d.amount || 463400).toLocaleString('en-IN')} has been successfully CREDITED to your bank account via PFMS/DBT.`,
    te: (d) => `✅ ₹${(d.amount || 463400).toLocaleString('en-IN')} చెల్లింపు మీ బ్యాంక్ ఖాతాలో విజయవంతంగా జమ చేయబడింది.`,
    hi: (d) => `✅ ₹${(d.amount || 463400).toLocaleString('en-IN')} की राशि आपके बैंक खाते में सफलतापूर्वक जमा कर दी गई है।`,
  },
  PAYMENT_FAILED: {
    en: (d) => `⚠️ Payment failed for Token ${d.token} (Reason: ${d.reason || 'Bank IFSC Migration'}). Tap to re-initiate or call Mandi Helpdesk.`,
    te: (d) => `⚠️ టోకెన్ ${d.token} కోసం చెల్లింపు విఫలమైంది (కారణం: ${d.reason || 'బ్యాంక్ IFSC మైగ్రేషన్'}). తిరిగి ప్రారంభించడానికి క్లిక్ చేయండి.`,
    hi: (d) => `⚠️ टोकन ${d.token} का भुगतान विफल रहा (कारण: ${d.reason || 'बैंक IFSC माइग्रेशन'})। पुन: प्रयास के लिए क्लिक करें।`,
  },
  CENTRE_CLOSED: {
    en: (d) => `⚠️ Operational Alert: ${d.centreName || 'Procurement Centre'} is temporarily closed due to ${d.reason || 'weather maintenance'}. Affected slots will be rescheduled.`,
    te: (d) => `⚠️ నిర్వహణ హెచ్చరిక: ${d.centreName || 'సేకరణ కేంద్రం'} ${d.reason || 'వాతావరణం/నిర్వహణ'} కారణంగా తాత్కాలికంగా మూసివేయబడింది.`,
    hi: (d) => `⚠️ मंडी सूचना: ${d.centreName || 'खरीद केंद्र'} ${d.reason || 'रखरखाव'} के कारण अस्थायी रूप से बंद है।`,
  },
  CENTRE_CAPACITY_CHANGED: {
    en: (d) => `Capacity Notice: Daily farmer capacity at ${d.centreName || 'Centre'} updated to ${d.newCapacity || '80'} farmers.`,
    te: (d) => `సామర్థ్య నోటీసు: ${d.centreName || 'కేంద్రం'}లో రోజువారీ రైతు సామర్థ్యం ${d.newCapacity || '80'}కి నవీకరించబడింది.`,
    hi: (d) => `क्षमता सूचना: ${d.centreName || 'केंद्र'} पर दैनिक किसान क्षमता ${d.newCapacity || '80'} कर दी गई है।`,
  },
};
