/**
 * Telugu Voice & SMS Templates for Group 1 Telephony
 * Centralized strings and phonetic speech formatters for Exotel IVR & Fast2SMS
 *
 * NOTE: Multi-language support (te, hi, en) is managed in ./languageStrings.js.
 * This file preserves full backwards-compatibility for existing imports.
 */

const {
  TELUGU_DIGITS,
  TELUGU_LETTERS,
  formatTokenForSpeech: formatTokenMultiLang,
  languageStrings
} = require('./languageStrings');

function formatTokenForSpeech(tokenId) {
  return formatTokenMultiLang(tokenId, 'te');
}

const te = languageStrings.te;

module.exports = {
  // Digit and phonetic maps
  TELUGU_DIGITS,
  TELUGU_LETTERS,
  formatTokenForSpeech,

  // IVR Menu Prompts
  menu: te.menu,

  // Option 1: Book Slot
  booking: te.booking,

  // Option 2: Check Queue Status
  queueStatus: te.queueStatus,

  // Feature 1: Payment Delay Alert
  paymentDelay: te.paymentDelay,

  // Feature 2: Smart Slot Re-allocation
  slotReallocation: te.slotReallocation,

  // Errors / Invalid DTMF
  invalidInput: te.invalidInput,
  error: te.error
};
