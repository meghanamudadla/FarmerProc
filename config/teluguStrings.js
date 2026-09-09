/**
 * Telugu Voice & SMS Templates for Group 1 Telephony
 * Centralized strings and phonetic speech formatters for Exotel IVR & Fast2SMS
 */

// Telugu phonetic representations for numbers and alphabet letters
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
  'M': 'ఎమ్',
  'N': 'ఎన్',
  'D': 'డి',
  'K': 'కె',
  'H': 'హెచ్',
  'M': 'ఎమ్',
  'A': 'ఎ',
  'B': 'బి',
  'C': 'సి',
  'E': 'ఇ',
  'F': 'ఎఫ్',
  'G': 'జి',
  'T': 'టి',
  'P': 'పి',
  'R': 'ఆర్',
  'S': 'ఎస్'
};

/**
 * Converts a Token ID like 'MND-104' into clear Telugu phonetic speech:
 * e.g., 'ఎమ్ ఎన్ డి - ఒకటి సున్నా నాలుగు' so TTS pronounces each character distinctly.
 */
function formatTokenForSpeech(tokenId) {
  if (!tokenId) return '';

  return tokenId
    .toUpperCase()
    .split('')
    .map(ch => {
      if (TELUGU_LETTERS[ch]) return TELUGU_LETTERS[ch];
      if (TELUGU_DIGITS[ch]) return TELUGU_DIGITS[ch];
      if (ch === '-') return ' ';
      return ch;
    })
    .join(' ');
}

module.exports = {
  // Digit and phonetic maps
  TELUGU_DIGITS,
  TELUGU_LETTERS,
  formatTokenForSpeech,

  // IVR Menu Prompts
  menu: {
    speech: 'రైతు బంధు మార్కెట్ యార్డ్ కు స్వాగతం. స్లాట్ బుకింగ్ కోసం ఒకటి నొక్కండి. మీ క్యూ స్టేటస్ తెలుసుకోవడానికి రెండు నొక్కండి.',
    englishAlt: 'Welcome to Rythu Mandi. Press 1 to book a slot. Press 2 to check your queue status.'
  },

  // Option 1: Book Slot
  booking: {
    speech: (tokenId) => {
      const spokenToken = formatTokenForSpeech(tokenId);
      return `మీ స్లాట్ విజయవంతంగా బుక్ చేయబడింది. మీ టోకెన్ నంబర్: ${spokenToken}. పూర్తి వివరాలు మీ మొబైల్ కు ఎస్ఎంఎస్ ద్వారా పంపబడ్డాయి. ధన్యవాదాలు.`;
    },
    sms: ({ tokenId, slotTime, mandiName }) => {
      return `నమస్కారం రైతు సోదరా, మీ మండి స్లాట్ బుకింగ్ విజయవంతమైంది.\nటోకెన్ నంబర్: ${tokenId}\nసమయం: ${slotTime || '10:00 AM'}\nమార్కెట్: ${mandiName || 'రైతు బంధు మండి'}\nసమయానికి మార్కెట్‌కు చేరుకోగలరు. ధన్యవాదాలు!`;
    }
  },

  // Option 2: Check Queue Status
  queueStatus: {
    speech: ({ tokenId, tokensAhead, ewtMinutes }) => {
      const spokenToken = formatTokenForSpeech(tokenId);
      const aheadText = tokensAhead === 0 ? 'సున్నా' : tokensAhead.toString();
      return `మీ టోకెన్ నంబర్: ${spokenToken}. మీకంటే ముందు ${aheadText} మంది రైతులు ఉన్నారు. సుమారు వేచి ఉండే సమయం ${ewtMinutes} నిమిషాలు. ధన్యవాదాలు.`;
    },
    sms: ({ tokenId, tokensAhead, ewtMinutes }) => {
      return `రైతు బంధు క్యూ అప్‌డేట్:\nటోకెన్ నంబర్: ${tokenId}\nమీ ముందు ఉన్న రైతులు: ${tokensAhead}\nవేచి ఉండే సమయం: ${ewtMinutes} నిమిషాలు.\nధన్యవాదాలు!`;
    },
    noTokenSpeech: 'మీ మొబైల్ నంబర్ పై ఎలాంటి యాక్టివ్ టోకెన్ కనిపించలేదు. దయచేసి ముందుగా స్లాట్ బుకింగ్ కోసం ఒకటి నొక్కండి.',
    noTokenSms: 'మీ మొబైల్ నంబర్ పై యాక్టివ్ టోకెన్ లేదు. కొత్త స్లాట్ కోసం మండి నంబర్ కు కాల్ చేసి 1 ఎంచుకోండి.'
  },

  // Errors / Invalid DTMF
  invalidInput: {
    speech: 'క్షమించండి, మీరు ఎంచుకున్న ఆప్షన్ చెల్లదు. స్లాట్ బుకింగ్ కోసం ఒకటి, క్యూ స్టేటస్ కోసం రెండు నొక్కండి.'
  },

  error: {
    speech: 'క్షమించండి, సర్వర్‌లో సాంకేతిక సమస్య ఏర్పడింది. దయచేసి కొద్దిసేపటి తర్వాత మళ్ళీ ప్రయత్నించండి.'
  }
};
