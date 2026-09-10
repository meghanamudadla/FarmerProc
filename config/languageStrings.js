/**
 * Multi-Language Voice & SMS Templates for Group 1 Telephony
 * Supports Telugu ('te'), Hindi ('hi'), and English ('en')
 * Centralized strings and phonetic speech formatters for Exotel IVR & Fast2SMS
 */

// -------------------------------------------------------------
// 1. PHONETIC MAPS FOR ACCURATE TTS PRONUNCIATION
// -------------------------------------------------------------

const TELUGU_DIGITS = {
  '0': 'సున్నా',
  '1': 'ఒకటి',
  '2': 'రెండు',
  '3': 'మూడు',
  '4': 'నాలుగు',
  '5': 'ఐదు',
  '6': 'ఆరు',
  '7': 'ఏడు',
  '8': 'ఎనిమిది',
  '9': 'తొమ్మిది'
};

const TELUGU_LETTERS = {
  'M': 'ఎమ్', 'N': 'ఎన్', 'D': 'డి', 'K': 'కె', 'H': 'హెచ్',
  'A': 'ఎ', 'B': 'బి', 'C': 'సి', 'E': 'ఇ', 'F': 'ఎఫ్',
  'G': 'జి', 'T': 'టి', 'P': 'పి', 'R': 'ఆర్', 'S': 'ఎస్',
  'W': 'డబ్ల్యూ', 'X': 'ఎక్స్', 'Y': 'వై', 'Z': 'జెడ్'
};

const HINDI_DIGITS = {
  '0': 'शून्य',
  '1': 'एक',
  '2': 'दो',
  '3': 'तीन',
  '4': 'चार',
  '5': 'पांच',
  '6': 'छह',
  '7': 'सात',
  '8': 'आठ',
  '9': 'नौ'
};

const HINDI_LETTERS = {
  'M': 'एम', 'N': 'एन', 'D': 'डी', 'K': 'के', 'H': 'एच',
  'A': 'ए', 'B': 'बी', 'C': 'सी', 'E': 'ई', 'F': 'एफ',
  'G': 'जी', 'T': 'टी', 'P': 'पी', 'R': 'आर', 'S': 'एस',
  'W': 'डबल्यू', 'X': 'एक्स', 'Y': 'वाई', 'Z': 'जेड'
};

const ENGLISH_DIGITS = {
  '0': 'Zero',
  '1': 'One',
  '2': 'Two',
  '3': 'Three',
  '4': 'Four',
  '5': 'Five',
  '6': 'Six',
  '7': 'Seven',
  '8': 'Eight',
  '9': 'Nine'
};

/**
 * Formats a Token ID (e.g. 'MND-104') phonetically per language for clear TTS
 */
function formatTokenForSpeech(tokenId, lang = 'te') {
  if (!tokenId) return '';

  const chars = tokenId.toUpperCase().split('');

  if (lang === 'hi') {
    return chars.map(ch => {
      if (HINDI_LETTERS[ch]) return HINDI_LETTERS[ch];
      if (HINDI_DIGITS[ch]) return HINDI_DIGITS[ch];
      if (ch === '-') return ' ';
      return ch;
    }).join(' ');
  }

  if (lang === 'en') {
    return chars.map(ch => {
      if (ENGLISH_DIGITS[ch]) return ENGLISH_DIGITS[ch];
      if (ch === '-') return ' ';
      return ch;
    }).join(' ');
  }

  // Default: Telugu ('te')
  return chars.map(ch => {
    if (TELUGU_LETTERS[ch]) return TELUGU_LETTERS[ch];
    if (TELUGU_DIGITS[ch]) return TELUGU_DIGITS[ch];
    if (ch === '-') return ' ';
    return ch;
  }).join(' ');
}

// -------------------------------------------------------------
// 2. LANGUAGE DICTIONARIES
// -------------------------------------------------------------

const languageStrings = {
  // Global IVR Initial Language Selection Prompt
  languageSelection: {
    speech: 'తెలుగు కోసం 1 నొక్కండి. हिंदी के लिए 2 दबाएं. For English press 3.',
    englishAlt: 'For Telugu press 1, For Hindi press 2, For English press 3.',
    options: {
      '1': { code: 'te', name: 'Telugu (తెలుగు)' },
      '2': { code: 'hi', name: 'Hindi (हिंदी)' },
      '3': { code: 'en', name: 'English' }
    }
  },

  // -----------------------------------------------------------
  // TELUGU (te)
  // -----------------------------------------------------------
  te: {
    langCode: 'te',
    langName: 'Telugu',

    menu: {
      speech: 'రైతు బంధు మార్కెట్ యార్డ్ కు స్వాగతం. స్లాట్ బుకింగ్ కోసం ఒకటి నొక్కండి. మీ క్యూ స్టేటస్ తెలుసుకోవడానికి రెండు నొక్కండి.',
      englishAlt: 'Welcome to Rythu Mandi. Press 1 to book a slot. Press 2 to check your queue status.',
      options: {
        '1': 'స్లాట్ బుకింగ్ (Book Slot)',
        '2': 'క్యూ స్టేటస్ (Check Queue Status)'
      }
    },

    booking: {
      speech: (tokenId) => {
        const spokenToken = formatTokenForSpeech(tokenId, 'te');
        return `మీ స్లాట్ విజయవంతంగా బుక్ చేయబడింది. మీ టోకెన్ నంబర్: ${spokenToken}. పూర్తి వివరాలు మీ మొబైల్ కు ఎస్ఎంఎస్ ద్వారా పంపబడ్డాయి. ధన్యవాదాలు.`;
      },
      sms: ({ tokenId, slotTime, mandiName }) => {
        return `నమస్కారం రైతు సోదరా, మీ మండి స్లాట్ బుకింగ్ విజయవంతమైంది.\nటోకెన్ నంబర్: ${tokenId}\nసమయం: ${slotTime || '10:00 AM'}\nమార్కెట్: ${mandiName || 'రైతు బంధు మండి'}\nసమయానికి మార్కెట్‌కు చేరుకోగలరు. ధన్యవాదాలు!`;
      }
    },

    queueStatus: {
      speech: ({ tokenId, tokensAhead, ewtMinutes }) => {
        const spokenToken = formatTokenForSpeech(tokenId, 'te');
        const aheadText = tokensAhead === 0 ? 'సున్నా' : tokensAhead.toString();
        return `మీ టోకెన్ నంబర్: ${spokenToken}. మీకంటే ముందు ${aheadText} మంది రైతులు ఉన్నారు. సుమారు వేచి ఉండే సమయం ${ewtMinutes} నిమిషాలు. ధన్యవాదాలు.`;
      },
      sms: ({ tokenId, tokensAhead, ewtMinutes }) => {
        return `రైతు బంధు క్యూ అప్‌డేట్:\nటోకెన్ నంబర్: ${tokenId}\nమీ ముందు ఉన్న రైతులు: ${tokensAhead}\nవేచి ఉండే సమయం: ${ewtMinutes} నిమిషాలు.\nధన్యవాదాలు!`;
      },
      noTokenSpeech: 'మీ మొబైల్ నంబర్ పై ఎలాంటి యాక్టివ్ టోకెన్ కనిపించలేదు. దయచేసి ముందుగా స్లాట్ బుకింగ్ కోసం ఒకటి నొక్కండి.',
      noTokenSms: 'మీ మొబైల్ నంబర్ పై యాక్టివ్ టోకెన్ లేదు. కొత్త స్లాట్ కోసం మండి నంబర్ కు కాల్ చేసి 1 ఎంచుకోండి.'
    },

    // Feature 1: Payment Delay Alert
    paymentDelay: {
      speech: ({ farmerName, tokenId, amount, delayReason, expectedPayoutDate }) => {
        const spokenToken = formatTokenForSpeech(tokenId, 'te');
        const nameGreeting = farmerName ? `నమస్కారం ${farmerName} గారు.` : 'నమస్కారం రైతు సోదరా.';
        const amountText = amount ? `రూపాయలు ${amount}` : '';
        return `${nameGreeting} రైతు బంధు చెల్లింపు ముఖ్య గమనిక. మీ టోకెన్ ${spokenToken} కి సంబంధించిన ${amountText} చెల్లింపు సాంకేతిక కారణాల వల్ల ఆలస్యమైంది. ఆలస్యానికి కారణం: ${delayReason || 'బ్యాంక్ సర్వర్ సాంకేతిక నిర్వహణ'}. మీ నగదు అంచనా చెల్లింపు తేదీ ${expectedPayoutDate || 'రెండు రోజుల్లో'}. కలిగిన అసౌకర్యానికి చింతిస్తున్నాము. ధన్యవాదాలు.`;
      },
      sms: ({ farmerName, tokenId, amount, delayReason, expectedPayoutDate }) => {
        return `రైతు బంధు చెల్లింపు అప్‌డేట్:\nనమస్కారం ${farmerName || 'రైతు సోదరా'}, టోకెన్ ${tokenId} చెల్లింపు ${amount ? `(రూ. ${amount})` : ''} ఆలస్యమైంది.\nకారణం: ${delayReason || 'బ్యాంక్ సాంకేతిక నిర్వహణ'}\nఅంచనా చెల్లింపు తేదీ: ${expectedPayoutDate || 'రాబోయే 48 గంటల్లో'}\nఅసౌకర్యానికి చింతిస్తున్నాము.`;
      }
    },

    // Feature 2: Smart Slot Re-allocation Flow
    slotReallocation: {
      offerSpeech: ({ slotTime, mandiName }) => {
        return `నమస్కారం రైతు సోదరా. రైతు బంధు మండి నుండి అత్యవసర సమాచారం. ${mandiName || 'మార్కెట్ యార్డ్'} వద్ద ${slotTime || '11:00 AM'} స్లాట్ ఇప్పుడు అందుబాటులో ఉంది. ఈ స్లాట్‌ను బుక్ చేసుకోవడానికి ఒకటి నొక్కండి. తిరస్కరించడానికి రెండు నొక్కండి.`;
      },
      offerSms: ({ slotTime, mandiName }) => {
        return `రైతు బంధు స్లాట్ లభ్యత:\n${mandiName || 'మార్కెట్'} వద్ద ${slotTime || 'రాబోయే'} స్లాట్ ఖాళీగా ఉంది.\nఈ స్లాట్ పొందడానికి త్వరగా కాల్ చేసి 1 నొక్కండి, లేదా నిరాకరించడానికి 2 నొక్కండి.`;
      },
      acceptSpeech: ({ tokenId, slotTime }) => {
        const spokenToken = formatTokenForSpeech(tokenId, 'te');
        return `అభినందనలు! స్లాట్ మీకు కేటాయించబడింది. మీ కొత్త టోకెన్ నంబర్: ${spokenToken}. సమయం: ${slotTime}. వివరాలు మీ మొబైల్ కు పంపబడ్డాయి. ధన్యవాదాలు.`;
      },
      acceptSms: ({ tokenId, slotTime, mandiName }) => {
        return `స్లాట్ కేటాయింపు ధృవీకరణ:\nమీకు రీ-అలోకేటెడ్ స్లాట్ విజయవంతంగా కేటాయించబడింది.\nటోకెన్: ${tokenId}\nసమయం: ${slotTime}\nమార్కెట్: ${mandiName || 'రైతు బంధు మండి'}\nధన్యవాదాలు!`;
      },
      declineSpeech: () => {
        return 'మీ సమాధానం నమోదయింది. ఈ స్లాట్ క్యూలో ఉన్న తదుపరి రైతుకు అందించబడుతుంది. ధన్యవాదాలు.';
      },
      declineSms: () => {
        return 'రైతు బంధు: మీరు స్లాట్‌ను తిరస్కరించారు. ఈ స్లాట్ తదుపరి రైతుకు కేటాయించబడుతుంది. ధన్యవాదాలు.';
      }
    },

    invalidInput: {
      speech: 'క్షమించండి, మీరు ఎంచుకున్న ఆప్షన్ చెల్లదు. స్లాట్ బుకింగ్ కోసం ఒకటి, క్యూ స్టేటస్ కోసం రెండు నొక్కండి.'
    },

    error: {
      speech: 'క్షమించండి, సర్వర్‌లో సాంకేతిక సమస్య ఏర్పడింది. దయచేసి కొద్దిసేపటి తర్వాత మళ్ళీ ప్రయత్నించండి.'
    }
  },

  // -----------------------------------------------------------
  // HINDI (hi)
  // -----------------------------------------------------------
  hi: {
    langCode: 'hi',
    langName: 'Hindi',

    menu: {
      speech: 'किसान सहायता मंडी में आपका स्वागत है। स्लॉट बुकिंग के लिए एक दबाएं। अपनी कतार स्थिति जानने के लिए दो दबाएं।',
      englishAlt: 'Welcome to Kisan Mandi. Press 1 to book a slot. Press 2 to check your queue status.',
      options: {
        '1': 'स्लॉट बुकिंग (Book Slot)',
        '2': 'कतार स्थिति (Check Queue Status)'
      }
    },

    booking: {
      speech: (tokenId) => {
        const spokenToken = formatTokenForSpeech(tokenId, 'hi');
        return `आपका स्लॉट सफलतापूर्वक बुक हो गया है। आपका टोकन नंबर है: ${spokenToken}। पूरी जानकारी आपके मोबाइल पर एसएमएस द्वारा भेज दी गई है। धन्यवाद।`;
      },
      sms: ({ tokenId, slotTime, mandiName }) => {
        return `नमस्ते किसान भाई, आपकी मंडी स्लॉट बुकिंग सफल रही।\nटोकन नंबर: ${tokenId}\nसमय: ${slotTime || '10:00 AM'}\nमंडी: ${mandiName || 'किसान सहायता मंडी'}\nकृपया समय पर मंडी पहुंचें। धन्यवाद!`;
      }
    },

    queueStatus: {
      speech: ({ tokenId, tokensAhead, ewtMinutes }) => {
        const spokenToken = formatTokenForSpeech(tokenId, 'hi');
        const aheadText = tokensAhead === 0 ? 'शून्य' : tokensAhead.toString();
        return `आपका टोकन नंबर है: ${spokenToken}। आपसे आगे ${aheadText} किसान हैं। अनुमानित प्रतीक्षा समय ${ewtMinutes} मिनट है। धन्यवाद।`;
      },
      sms: ({ tokenId, tokensAhead, ewtMinutes }) => {
        return `किसान सहायता कतार अपडेट:\nटोकन नंबर: ${tokenId}\nआपके आगे किसान: ${tokensAhead}\nप्रतीक्षा समय: ${ewtMinutes} मिनट।\nधन्यवाद!`;
      },
      noTokenSpeech: 'आपके मोबाइल नंबर पर कोई सक्रिय टोकन नहीं मिला। कृपया स्लॉट बुक करने के लिए पहले एक दबाएं।',
      noTokenSms: 'आपके नंबर पर कोई सक्रिय टोकन नहीं है। नया स्लॉट बुक करने के लिए मंडी नंबर पर कॉल करके 1 चुनें।'
    },

    // Feature 1: Payment Delay Alert
    paymentDelay: {
      speech: ({ farmerName, tokenId, amount, delayReason, expectedPayoutDate }) => {
        const spokenToken = formatTokenForSpeech(tokenId, 'hi');
        const nameGreeting = farmerName ? `नमस्ते ${farmerName} जी।` : 'नमस्ते किसान भाई।';
        const amountText = amount ? `रुपये ${amount}` : '';
        return `${nameGreeting} किसान सहायता भुगतान सूचना। आपके टोकन ${spokenToken} का ${amountText} का भुगतान तकनीकी कारणों से विलंबित है। कारण: ${delayReason || 'बैंक सर्वर रखरखाव'}। अपेक्षित भुगतान तिथि: ${expectedPayoutDate || 'दो दिनों में'}। असुविधा के लिए हमें खेद है। धन्यवाद।`;
      },
      sms: ({ farmerName, tokenId, amount, delayReason, expectedPayoutDate }) => {
        return `किसान सहायता भुगतान अपडेट:\nनमस्ते ${farmerName || 'किसान भाई'}, टोकन ${tokenId} का भुगतान ${amount ? `(रु. ${amount})` : ''} विलंबित है।\nकारण: ${delayReason || 'बैंक तकनीकी रखरखाव'}\nअपेक्षित तिथि: ${expectedPayoutDate || 'अगले 48 घंटे'}\nअसुविधा के लिए खेद है।`;
      }
    },

    // Feature 2: Smart Slot Re-allocation Flow
    slotReallocation: {
      offerSpeech: ({ slotTime, mandiName }) => {
        return `नमस्ते किसान भाई। किसान मंडी से आवश्यक सूचना। ${mandiName || 'मार्केट यार्ड'} में ${slotTime || '11:00 AM'} का स्लॉट अब उपलब्ध है। इस स्लॉट को स्वीकार करने के लिए एक दबाएं। अस्वीकार करने के लिए दो दबाएं।`;
      },
      offerSms: ({ slotTime, mandiName }) => {
        return `किसान सहायता स्लॉट अलर्ट:\n${mandiName || 'मंडी'} में ${slotTime || 'नया'} स्लॉट उपलब्ध हुआ है।\nस्वीकार करने के लिए कॉल में 1 दबाएं, या मना करने के लिए 2 दबाएं।`;
      },
      acceptSpeech: ({ tokenId, slotTime }) => {
        const spokenToken = formatTokenForSpeech(tokenId, 'hi');
        return `बधाई हो! स्लॉट आपको आवंटित कर दिया गया है। आपका नया टोकन नंबर है: ${spokenToken}। समय: ${slotTime}। विवरण एसएमएस द्वारा भेज दिया गया है। धन्यवाद।`;
      },
      acceptSms: ({ tokenId, slotTime, mandiName }) => {
        return `स्लॉट आवंटन पुष्टि:\nआपको री-अलोकेटेड स्लॉट सफलतापूर्वक मिल गया है।\nटोकन: ${tokenId}\nसमय: ${slotTime}\nमंडी: ${mandiName || 'किसान सहायता मंडी'}\nधन्यवाद!`;
      },
      declineSpeech: () => {
        return 'आपकी प्रतिक्रिया दर्ज कर ली गई है। यह स्लॉट कतार में अगले किसान को पेश किया जाएगा। धन्यवाद।';
      },
      declineSms: () => {
        return 'किसान सहायता: आपने स्लॉट अस्वीकार कर दिया है। यह स्लॉट अगले किसान को आवंटित किया जाएगा। धन्यवाद।';
      }
    },

    invalidInput: {
      speech: 'क्षमा करें, आपका विकल्प अमान्य है। स्लॉट बुकिंग के लिए एक, कतार स्थिति के लिए दो दबाएं।'
    },

    error: {
      speech: 'क्षमा करें, सर्वर में तकनीकी समस्या है। कृपया थोड़ी देर बाद पुनः प्रयास करें।'
    }
  },

  // -----------------------------------------------------------
  // ENGLISH (en)
  // -----------------------------------------------------------
  en: {
    langCode: 'en',
    langName: 'English',

    menu: {
      speech: 'Welcome to Rythu Mandi Telephony Portal. Press 1 to book a slot. Press 2 to check your queue status.',
      englishAlt: 'Welcome to Rythu Mandi. Press 1 to book a slot. Press 2 to check your queue status.',
      options: {
        '1': 'Book Slot',
        '2': 'Check Queue Status'
      }
    },

    booking: {
      speech: (tokenId) => {
        const spokenToken = formatTokenForSpeech(tokenId, 'en');
        return `Your slot has been booked successfully. Your token number is: ${spokenToken}. Full details have been sent to your mobile via SMS. Thank you.`;
      },
      sms: ({ tokenId, slotTime, mandiName }) => {
        return `Dear Farmer, your mandi slot booking is confirmed.\nToken ID: ${tokenId}\nSlot Time: ${slotTime || '10:00 AM'}\nMarket: ${mandiName || 'Rythu Mandi'}\nPlease arrive on time. Thank you!`;
      }
    },

    queueStatus: {
      speech: ({ tokenId, tokensAhead, ewtMinutes }) => {
        const spokenToken = formatTokenForSpeech(tokenId, 'en');
        return `Your token number is: ${spokenToken}. There are ${tokensAhead} farmers ahead of you. Estimated wait time is ${ewtMinutes} minutes. Thank you.`;
      },
      sms: ({ tokenId, tokensAhead, ewtMinutes }) => {
        return `Rythu Mandi Queue Update:\nToken ID: ${tokenId}\nFarmers Ahead: ${tokensAhead}\nEstimated Wait Time: ${ewtMinutes} minutes.\nThank you!`;
      },
      noTokenSpeech: 'No active booking was found for your mobile number. Please press 1 to book a slot.',
      noTokenSms: 'No active token found for your number. Call the Mandi IVR and press 1 to book a new slot.'
    },

    // Feature 1: Payment Delay Alert
    paymentDelay: {
      speech: ({ farmerName, tokenId, amount, delayReason, expectedPayoutDate }) => {
        const spokenToken = formatTokenForSpeech(tokenId, 'en');
        const greeting = farmerName ? `Hello ${farmerName}.` : 'Hello Respected Farmer.';
        const amountStr = amount ? `of rupees ${amount}` : '';
        return `${greeting} Important payment notification from Rythu Mandi. Your payout ${amountStr} for token ${spokenToken} is delayed due to technical processing. Reason: ${delayReason || 'Banking clearing maintenance'}. Expected payout date: ${expectedPayoutDate || 'within 2 business days'}. We sincerely regret the inconvenience. Thank you.`;
      },
      sms: ({ farmerName, tokenId, amount, delayReason, expectedPayoutDate }) => {
        return `Rythu Mandi Payment Alert:\nDear ${farmerName || 'Farmer'}, payout ${amount ? `(Rs. ${amount})` : ''} for Token ${tokenId} is delayed.\nReason: ${delayReason || 'Bank technical clearing'}\nExpected Date: ${expectedPayoutDate || 'Within 48 hours'}\nWe regret the inconvenience.`;
      }
    },

    // Feature 2: Smart Slot Re-allocation Flow
    slotReallocation: {
      offerSpeech: ({ slotTime, mandiName }) => {
        return `Hello Farmer. Urgent update from Rythu Mandi. A procurement slot at ${mandiName || 'Market Yard'} for ${slotTime || '11:00 AM'} is now available. Press 1 to Accept this slot. Press 2 to Decline.`;
      },
      offerSms: ({ slotTime, mandiName }) => {
        return `Rythu Mandi Slot Availability:\nA slot at ${mandiName || 'Market'} for ${slotTime || 'Upcoming'} has opened up.\nPress 1 in the call to Accept, or Press 2 to Decline.`;
      },
      acceptSpeech: ({ tokenId, slotTime }) => {
        const spokenToken = formatTokenForSpeech(tokenId, 'en');
        return `Congratulations! The slot has been assigned to you. Your new token number is: ${spokenToken}. Slot time: ${slotTime}. Details have been sent via SMS. Thank you.`;
      },
      acceptSms: ({ tokenId, slotTime, mandiName }) => {
        return `Slot Allocation Confirmed:\nYou have successfully accepted the re-allocated slot.\nToken: ${tokenId}\nTime: ${slotTime}\nMarket: ${mandiName || 'Rythu Mandi'}\nThank you!`;
      },
      declineSpeech: () => {
        return 'Your response has been recorded. This slot will now be offered to the next farmer in the queue. Thank you.';
      },
      declineSms: () => {
        return 'Rythu Mandi: You have declined the slot. It will now be offered to the next farmer in line. Thank you.';
      }
    },

    invalidInput: {
      speech: 'Sorry, the selected option is invalid. Press 1 to book a slot, or press 2 to check queue status.'
    },

    error: {
      speech: 'Sorry, a technical error occurred on the server. Please try again after some time.'
    }
  }
};

/**
 * Safe accessor for localized strings with fallback to Telugu ('te')
 */
function getStrings(lang = 'te') {
  return languageStrings[lang] || languageStrings.te;
}

module.exports = {
  TELUGU_DIGITS,
  TELUGU_LETTERS,
  HINDI_DIGITS,
  HINDI_LETTERS,
  ENGLISH_DIGITS,
  formatTokenForSpeech,
  languageStrings,
  getStrings
};
