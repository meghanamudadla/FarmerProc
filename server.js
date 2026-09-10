/**
 * Group 1 Telephony Backend
 * Mandi Slot Booking, Queue Status & Telephony IVR System
 * Features:
 *  1. Multi-Language IVR (Telugu, Hindi, English) with Session & Preference Persistence
 *  2. Payment Delay Alerts (Fast2SMS + Exotel Automated Outbound Voice Call)
 *  3. Smart Slot Re-allocation Flow (Queue-based fallback offering cancelled slots to next farmers)
 * Tech Stack: Node.js, Express, Exotel IVR Webhooks, Fast2SMS Unicode, Multi-Language TTS
 */

require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');

// Determine base directory for services and config
const baseDir = fs.existsSync(path.join(__dirname, 'services'))
  ? __dirname
  : path.join(__dirname, 'FarmerProc');

const { languageStrings, getStrings, formatTokenForSpeech } = require(path.join(baseDir, 'config', 'languageStrings'));
const teluguStrings = require(path.join(baseDir, 'config', 'teluguStrings'));
const ttsService = require(path.join(baseDir, 'services', 'ttsService'));
const smsService = require(path.join(baseDir, 'services', 'smsService'));
const group2Service = require(path.join(baseDir, 'services', 'group2Service'));
const exotelService = require(path.join(baseDir, 'services', 'exotelService'));

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from 'public' (Dashboard at / and cached audio at /audio/*)
const publicDir = path.join(baseDir, 'public');
app.use(express.static(publicDir));

// Simple request logger
app.use((req, res, next) => {
  const timestamp = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
  next();
});

// -------------------------------------------------------------
// SESSION & CALLER PREFERENCE STORE
// -------------------------------------------------------------
// CallSid -> { language: 'te'|'hi'|'en', phone: string, step: string }
const sessionStore = new Map();

// PhoneNumber -> 'te' | 'hi' | 'en' (Persist caller's language preference across calls)
const callerPreferences = new Map();

/**
 * Resolves language for request: Query Param -> Session -> Caller Profile -> Default ('te')
 */
function resolveLanguage(req, callSid, phone) {
  const cleanPhone = smsService.sanitizePhoneNumber(phone);
  const queryLang = req.query?.lang || req.body?.lang || req.body?.language;

  if (['te', 'hi', 'en'].includes(queryLang)) {
    if (callSid) sessionStore.set(callSid, { ...(sessionStore.get(callSid) || {}), language: queryLang });
    if (cleanPhone) callerPreferences.set(cleanPhone, queryLang);
    return queryLang;
  }

  if (callSid && sessionStore.has(callSid) && sessionStore.get(callSid).language) {
    return sessionStore.get(callSid).language;
  }

  if (cleanPhone && callerPreferences.has(cleanPhone)) {
    return callerPreferences.get(cleanPhone);
  }

  return 'te'; // Default to Telugu as per existing base behavior
}

// ============================================================================
// 1. MULTI-LANGUAGE SELECTION ENDPOINTS
// ============================================================================

/**
 * Initial IVR Language Menu
 * Plays: "For Telugu press 1, Hindi ke liye 2 dabayein, For English press 3"
 */
const handleLanguageMenuRequest = async (req, res) => {
  try {
    const callDetails = exotelService.extractCallDetails(req);
    const langSelectSpeech = languageStrings.languageSelection.speech;
    const audio = await ttsService.generateAudio(langSelectSpeech, 'te', 'lang_select');

    if (callDetails.callSid) {
      sessionStore.set(callDetails.callSid, {
        phone: callDetails.from,
        step: 'AWAITING_LANGUAGE'
      });
    }

    return res.status(200).json({
      status: '200',
      action: 'play_language_menu',
      prompt: langSelectSpeech,
      prompt_english: languageStrings.languageSelection.englishAlt,
      audio_url: audio.audioUrl,
      options: {
        '1': 'Telugu (తెలుగు)',
        '2': 'Hindi (हिंदी)',
        '3': 'English'
      }
    });
  } catch (err) {
    console.error('[Language Menu] Error:', err);
    return res.status(500).json({ status: '500', error: err.message });
  }
};

app.get('/api/ivr/language-menu', handleLanguageMenuRequest);
app.post('/api/ivr/language-menu', handleLanguageMenuRequest);
app.get('/api/ivr/welcome', handleLanguageMenuRequest);
app.post('/api/ivr/welcome', handleLanguageMenuRequest);

/**
 * Handles DTMF selection for language (1=te, 2=hi, 3=en)
 */
const handleLanguageSelect = async (req, res) => {
  try {
    const callDetails = exotelService.extractCallDetails(req);
    const { digits, callSid, from } = callDetails;
    const cleanPhone = smsService.sanitizePhoneNumber(from);

    let selectedLang = 'te';
    if (digits === '2') selectedLang = 'hi';
    else if (digits === '3') selectedLang = 'en';

    // Persist language choice
    sessionStore.set(callSid, {
      language: selectedLang,
      phone: cleanPhone,
      step: 'MAIN_MENU'
    });
    if (cleanPhone) {
      callerPreferences.set(cleanPhone, selectedLang);
    }

    console.log(`[Language Select] Call ${callSid} set language to: "${selectedLang.toUpperCase()}" (Farmer: ${cleanPhone || 'Unknown'})`);

    // Return the Main Menu in the selected language
    const dict = getStrings(selectedLang);
    const audio = await ttsService.generateAudio(dict.menu.speech, selectedLang, 'menu_greeting');

    return res.status(200).json({
      status: '200',
      action: 'play_menu',
      language: selectedLang,
      prompt: dict.menu.speech,
      audio_url: audio.audioUrl,
      options: dict.menu.options
    });
  } catch (err) {
    console.error('[Language Select] Error:', err);
    return res.status(500).json({ status: '500', error: err.message });
  }
};

app.get('/api/ivr/select-language', handleLanguageSelect);
app.post('/api/ivr/select-language', handleLanguageSelect);

// ============================================================================
// 2. MAIN IVR MENU / GREETING ENDPOINT
// ============================================================================
/**
 * Called at the start of the call or after language selection
 * Returns Voice Menu text and Audio URL in caller's language
 */
const handleMenuRequest = async (req, res) => {
  try {
    const callDetails = exotelService.extractCallDetails(req);
    const lang = resolveLanguage(req, callDetails.callSid, callDetails.from);
    console.log(`[IVR Menu] Inbound call from ${callDetails.from || 'Anonymous'} (Lang: ${lang.toUpperCase()}, CallSid: ${callDetails.callSid})`);

    const dict = getStrings(lang);
    const audio = await ttsService.generateAudio(dict.menu.speech, lang, 'menu_greeting');

    return res.status(200).json({
      status: '200',
      action: 'play_menu',
      language: lang,
      prompt_telugu: dict.menu.speech,
      prompt_english: dict.menu.englishAlt,
      audio_url: audio.audioUrl,
      options: dict.menu.options || {
        '1': 'Book Slot (స్లాట్ బుకింగ్)',
        '2': 'Check Queue Status (క్యూ స్టేటస్)'
      }
    });
  } catch (err) {
    console.error('[IVR Menu] Error:', err);
    return res.status(500).json({ status: '500', error: err.message });
  }
};

app.get('/api/ivr/menu', handleMenuRequest);
app.post('/api/ivr/menu', handleMenuRequest);

// ============================================================================
// 3. MAIN IVR INPUT HANDLER (PASSTHRU WEBHOOK)
// ============================================================================
/**
 * Exotel Passthru Applet calls this webhook after farmer inputs DTMF (1 or 2)
 * Supports Telugu, Hindi, and English based on caller's session/preference.
 */
const handleInputRequest = async (req, res) => {
  try {
    const callDetails = exotelService.extractCallDetails(req);
    const { from: farmerPhone, digits, callSid } = callDetails;
    const sanitizedPhone = smsService.sanitizePhoneNumber(farmerPhone) || '9876543210';
    const lang = resolveLanguage(req, callSid, sanitizedPhone);
    const dict = getStrings(lang);

    console.log('\n----------------- INCOMING IVR ACTION -----------------');
    console.log(`Caller: ${farmerPhone} (Sanitized: ${sanitizedPhone})`);
    console.log(`Language: ${lang.toUpperCase()}`);
    console.log(`DTMF Key Pressed: "${digits}"`);
    console.log(`CallSid: ${callSid}`);

    // -------------------------------------------------------------
    // OPTION 1: BOOK SLOT
    // -------------------------------------------------------------
    if (digits === '1') {
      console.log(`[Flow] Farmer selected OPTION 1: Book Slot (${lang.toUpperCase()})`);

      // 1. Call Group 2 Backend to book slot & generate Token ID
      const bookingData = await group2Service.bookSlot(sanitizedPhone);
      const tokenId = bookingData.tokenId || `MND-${Date.now().toString().slice(-3)}`;
      const slotTime = bookingData.slotTime || '10:30 AM';
      const mandiName = bookingData.mandiName || (lang === 'te' ? 'రైతు బంధు మార్కెట్ యార్డ్' : 'Rythu Mandi');

      // 2. Prepare spoken prompt in farmer's language & generate dynamic audio
      const spokenText = dict.booking.speech(tokenId);
      const audioResult = await ttsService.generateAudio(spokenText, lang, `book_${tokenId}`);

      // 3. Send SMS receipt in farmer's language via Fast2SMS asynchronously
      const smsMessage = dict.booking.sms({
        tokenId,
        slotTime,
        mandiName
      });

      smsService.sendSms(sanitizedPhone, smsMessage, lang)
        .then(smsRes => console.log(`[SMS Result] Booking SMS sent to ${sanitizedPhone} (${lang}):`, smsRes.success))
        .catch(err => console.error(`[SMS Error] Failed to send booking SMS:`, err.message));

      // 4. Return Exotel Passthru response
      const responsePayload = exotelService.formatPassthruResponse({
        action: 'book_slot',
        success: true,
        spokenText,
        audioUrl: audioResult.audioUrl,
        tokenId,
        smsStatus: 'sent',
        extra: { language: lang, slotTime, mandiName }
      });

      console.log('[Flow] Response sent to Exotel:', responsePayload);
      console.log('-------------------------------------------------------\n');

      return res.status(200).json(responsePayload);
    }

    // -------------------------------------------------------------
    // OPTION 2: CHECK QUEUE STATUS
    // -------------------------------------------------------------
    if (digits === '2') {
      console.log(`[Flow] Farmer selected OPTION 2: Check Queue Status (${lang.toUpperCase()})`);

      const statusData = await group2Service.getQueueStatus(sanitizedPhone);

      let spokenText = '';
      let smsMessage = '';
      let tokenId = '';
      let tokensAhead = 0;
      let ewtMinutes = 0;

      if (statusData.hasToken) {
        tokenId = statusData.tokenId;
        tokensAhead = statusData.tokensAhead;
        ewtMinutes = statusData.estimatedWaitTimeMinutes;

        spokenText = dict.queueStatus.speech({
          tokenId,
          tokensAhead,
          ewtMinutes
        });

        smsMessage = dict.queueStatus.sms({
          tokenId,
          tokensAhead,
          ewtMinutes
        });
      } else {
        // No active booking found
        spokenText = dict.queueStatus.noTokenSpeech;
        smsMessage = dict.queueStatus.noTokenSms;
      }

      // Generate dynamic audio in caller's language
      const audioPrefix = tokenId ? `status_${tokenId}` : 'no_token';
      const audioResult = await ttsService.generateAudio(spokenText, lang, audioPrefix);

      // Send SMS status update
      smsService.sendSms(sanitizedPhone, smsMessage, lang)
        .then(smsRes => console.log(`[SMS Result] Status SMS sent to ${sanitizedPhone} (${lang}):`, smsRes.success))
        .catch(err => console.error(`[SMS Error] Failed to send status SMS:`, err.message));

      // Return Exotel Passthru response
      const responsePayload = exotelService.formatPassthruResponse({
        action: 'check_status',
        success: true,
        spokenText,
        audioUrl: audioResult.audioUrl,
        tokenId,
        tokensAhead,
        ewtMinutes,
        smsStatus: 'sent',
        extra: { language: lang }
      });

      console.log('[Flow] Response sent to Exotel:', responsePayload);
      console.log('-------------------------------------------------------\n');

      return res.status(200).json(responsePayload);
    }

    // -------------------------------------------------------------
    // INVALID / UNRECOGNIZED INPUT
    // -------------------------------------------------------------
    console.warn(`[Flow] Unrecognized DTMF digit: "${digits}"`);
    const spokenText = dict.invalidInput.speech;
    const audioResult = await ttsService.generateAudio(spokenText, lang, 'invalid_input');

    return res.status(200).json(
      exotelService.formatPassthruResponse({
        action: 'invalid_input',
        success: false,
        spokenText,
        audioUrl: audioResult.audioUrl,
        extra: { language: lang }
      })
    );
  } catch (err) {
    console.error('[handleInputRequest] Internal Error:', err);
    const errorDict = getStrings('te');
    const errorAudio = await ttsService.generateAudio(errorDict.error.speech, 'te', 'system_error');

    return res.status(200).json({
      status: '500',
      action: 'error',
      spoken_text: errorDict.error.speech,
      audio_url: errorAudio.audioUrl
    });
  }
};

app.get('/api/ivr/handle-input', handleInputRequest);
app.post('/api/ivr/handle-input', handleInputRequest);

// ============================================================================
// 4. FEATURE 1: PAYMENT DELAY ALERTS PIPELINE
// ============================================================================
/**
 * Triggers Payment Delay Alert pipeline:
 * 1. Immediate Fast2SMS update to farmer
 * 2. Automated outbound Exotel voice call explaining delay reason & expected payout date
 */
app.post('/api/alerts/payment-delay', async (req, res) => {
  try {
    const {
      phoneNumber,
      farmerName,
      tokenId = 'MND-104',
      amount = '25,000',
      delayReason = 'Bank clearing & technical maintenance',
      expectedPayoutDate = 'Within 48 hours',
      language
    } = req.body;

    const cleanPhone = smsService.sanitizePhoneNumber(phoneNumber);
    if (!cleanPhone || cleanPhone.length !== 10) {
      return res.status(400).json({ success: false, error: 'Valid 10-digit Indian phoneNumber is required' });
    }

    // Determine language (provided > caller preference > 'te')
    const lang = language || callerPreferences.get(cleanPhone) || 'te';
    const dict = getStrings(lang);

    console.log(`\n🚨 [Payment Delay Pipeline] Initiating alert for ${farmerName || 'Farmer'} (+91 ${cleanPhone}) in ${lang.toUpperCase()}`);

    // 1. Send Fast2SMS update immediately
    const smsMessage = dict.paymentDelay.sms({
      farmerName,
      tokenId,
      amount,
      delayReason,
      expectedPayoutDate
    });

    const smsResult = await smsService.sendSms(cleanPhone, smsMessage, lang);

    // 2. Prepare spoken prompt and TTS audio
    const spokenText = dict.paymentDelay.speech({
      farmerName,
      tokenId,
      amount,
      delayReason,
      expectedPayoutDate
    });

    const audioResult = await ttsService.generateAudio(spokenText, lang, `delay_${tokenId}`);

    // 3. Initiate Automated Outbound Call via Exotel
    const serverBaseUrl = (process.env.SERVER_BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
    const flowUrl = `${serverBaseUrl}/api/ivr/payment-delay-call?phone=${cleanPhone}&lang=${lang}&token=${tokenId}`;

    const callResult = await exotelService.triggerOutboundCall({
      to: cleanPhone,
      callType: 'PAYMENT_DELAY',
      flowUrl,
      customData: {
        farmerName,
        tokenId,
        amount,
        delayReason,
        expectedPayoutDate,
        language: lang,
        audioUrl: audioResult.audioUrl,
        spokenText
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Payment delay alert pipeline successfully triggered',
      recipient: cleanPhone,
      language: lang,
      sms: {
        status: smsResult.success ? 'SENT' : 'FAILED',
        message: smsMessage
      },
      outboundCall: {
        callSid: callResult.callSid,
        simulated: !!callResult.simulated,
        audioUrl: audioResult.audioUrl,
        spokenText
      }
    });
  } catch (err) {
    console.error('[Payment Delay Alert] Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Exotel webhook called when farmer answers the outbound payment delay call
 */
const handlePaymentDelayCall = async (req, res) => {
  try {
    const callDetails = exotelService.extractCallDetails(req);
    const lang = req.query?.lang || 'te';
    const dict = getStrings(lang);
    const tokenId = req.query?.token || 'MND-104';

    const spokenText = dict.paymentDelay.speech({
      tokenId,
      delayReason: req.query?.delayReason,
      expectedPayoutDate: req.query?.expectedPayoutDate
    });

    const audioResult = await ttsService.generateAudio(spokenText, lang, `delay_${tokenId}`);

    return res.status(200).json(
      exotelService.formatPassthruResponse({
        action: 'play_payment_delay_message',
        success: true,
        spokenText,
        audioUrl: audioResult.audioUrl,
        tokenId,
        extra: { language: lang }
      })
    );
  } catch (err) {
    console.error('[handlePaymentDelayCall] Error:', err);
    return res.status(500).json({ error: err.message });
  }
};

app.get('/api/ivr/payment-delay-call', handlePaymentDelayCall);
app.post('/api/ivr/payment-delay-call', handlePaymentDelayCall);

/**
 * Automated Scanner: Checks pending delayed payments and triggers alerts for un-notified records
 */
app.post('/api/alerts/check-delayed-payments', async (req, res) => {
  try {
    const delayedList = group2Service.getDelayedPayments();
    const results = [];

    for (const payment of delayedList) {
      if (!payment.notified) {
        const lang = payment.language || callerPreferences.get(payment.phoneNumber) || 'te';
        const dict = getStrings(lang);

        // 1. Send SMS
        const smsMessage = dict.paymentDelay.sms(payment);
        await smsService.sendSms(payment.phoneNumber, smsMessage, lang);

        // 2. Outbound call
        const spokenText = dict.paymentDelay.speech(payment);
        const audio = await ttsService.generateAudio(spokenText, lang, `delay_${payment.tokenId}`);

        const callResult = await exotelService.triggerOutboundCall({
          to: payment.phoneNumber,
          callType: 'PAYMENT_DELAY',
          customData: { ...payment, audioUrl: audio.audioUrl }
        });

        group2Service.markPaymentNotified(payment.id);

        results.push({
          paymentId: payment.id,
          phone: payment.phoneNumber,
          farmer: payment.farmerName,
          smsStatus: 'SENT',
          callSid: callResult.callSid
        });
      }
    }

    return res.status(200).json({
      success: true,
      scannedCount: delayedList.length,
      alertsTriggered: results.length,
      details: results
    });
  } catch (err) {
    console.error('[Check Delayed Payments] Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// 5. FEATURE 2: SMART SLOT RE-ALLOCATION FLOW
// ============================================================================
/**
 * Cancels a booked slot and immediately initiates re-allocation offer to Farmer #2 in waitlist
 */
app.post('/api/slots/cancel', async (req, res) => {
  try {
    const { phoneNumber, tokenId, reason } = req.body;
    const identifier = phoneNumber || tokenId || '9876543210';

    // 1. Cancel slot in Group 2
    const cancelResult = await group2Service.cancelSlot(identifier, reason);
    const { reallocationId, nextFarmer, slotDetails } = cancelResult;

    if (!nextFarmer) {
      return res.status(200).json({
        success: true,
        action: 'NO_WAITLIST_FARMERS',
        message: 'Slot cancelled, but no farmers currently queued in waitlist',
        reallocationId: reallocationId || null,
        cancelledSlot: slotDetails || null,
        offeredFarmer: null,
        cancelResult
      });
    }

    console.log(`\n♻️ [Slot Re-allocation] Slot freed (${slotDetails.freedTokenId}). Offering to Farmer #2: ${nextFarmer.farmerName} (+91 ${nextFarmer.phoneNumber})`);

    const lang = nextFarmer.language || 'te';
    const dict = getStrings(lang);

    // 2. Send initial SMS offer
    const offerSms = dict.slotReallocation.offerSms(slotDetails);
    await smsService.sendSms(nextFarmer.phoneNumber, offerSms, lang);

    // 3. Initiate Automated Outbound Call to Farmer #2
    const offerSpeech = dict.slotReallocation.offerSpeech(slotDetails);
    const audio = await ttsService.generateAudio(offerSpeech, lang, `offer_${slotDetails.freedTokenId}`);

    const serverBaseUrl = (process.env.SERVER_BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
    const flowUrl = `${serverBaseUrl}/api/ivr/slot-reallocate-call?reallocationId=${reallocationId}`;

    const callResult = await exotelService.triggerOutboundCall({
      to: nextFarmer.phoneNumber,
      callType: 'SLOT_REALLOCATION',
      flowUrl,
      customData: {
        reallocationId,
        farmer: nextFarmer,
        slotDetails,
        audioUrl: audio.audioUrl
      }
    });

    return res.status(200).json({
      success: true,
      action: 'SLOT_CANCELLED_AND_OFFER_INITIATED',
      reallocationId,
      cancelledSlot: slotDetails,
      offeredFarmer: nextFarmer,
      spokenText: offerSpeech,
      spoken_text: offerSpeech,
      audioUrl: audio.audioUrl,
      audio_url: audio.audioUrl,
      outboundCall: {
        callSid: callResult.callSid,
        simulated: !!callResult.simulated,
        audioUrl: audio.audioUrl,
        audio_url: audio.audioUrl,
        spokenText: offerSpeech,
        spoken_text: offerSpeech
      },
      smsOfferSent: true
    });
  } catch (err) {
    console.error('[Cancel & Re-allocate] Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Exotel webhook for the Re-allocation Outbound Call
 * Prompts farmer: "Press 1 to Accept, Press 2 to Decline"
 */
const handleSlotReallocateCall = async (req, res) => {
  try {
    const reallocationId = req.query?.reallocationId || req.body?.reallocationId;
    const reallocations = group2Service.getReallocations();
    const record = reallocations.find(r => r.id === reallocationId);

    const lang = record?.offeredFarmer?.language || 'te';
    const dict = getStrings(lang);
    const slotDetails = record?.slotDetails || { slotTime: '11:00 AM', mandiName: 'రైతు బంధు మార్కెట్' };

    const spokenText = dict.slotReallocation.offerSpeech(slotDetails);
    const audio = await ttsService.generateAudio(spokenText, lang, `offer_prompt`);

    return res.status(200).json({
      status: '200',
      action: 'gather_reallocation_response',
      reallocation_id: reallocationId,
      prompt: spokenText,
      audio_url: audio.audioUrl,
      options: {
        '1': 'Accept Slot',
        '2': 'Decline Slot'
      },
      next_action_url: `/api/ivr/slot-reallocate-input?reallocationId=${reallocationId}`
    });
  } catch (err) {
    console.error('[handleSlotReallocateCall] Error:', err);
    return res.status(500).json({ error: err.message });
  }
};

app.get('/api/ivr/slot-reallocate-call', handleSlotReallocateCall);
app.post('/api/ivr/slot-reallocate-call', handleSlotReallocateCall);

/**
 * Handles DTMF Input from Farmer for Re-allocation (1 = Accept, 2 = Decline)
 * If Declined, automatically cascades offer to Farmer #3!
 */
const handleSlotReallocateInput = async (req, res) => {
  try {
    const callDetails = exotelService.extractCallDetails(req);
    const reallocationId = req.query?.reallocationId || req.body?.reallocationId;
    const { digits, from } = callDetails;

    console.log(`\n[Slot Re-allocation Response] ReallocationId: ${reallocationId}, DTMF: "${digits}", Caller: ${from}`);

    const result = await group2Service.handleReallocationResponse(reallocationId, digits);

    // ---------------------------------------------------------
    // CASE 1: FARMER ACCEPTS (Digit 1)
    // ---------------------------------------------------------
    if (result.action === 'ACCEPTED') {
      const { farmer, booking, tokenId, slotTime } = result;
      const lang = farmer.language || 'te';
      const dict = getStrings(lang);

      // 1. Send confirmation SMS
      const acceptSms = dict.slotReallocation.acceptSms({
        tokenId,
        slotTime,
        mandiName: booking.mandiName
      });
      smsService.sendSms(farmer.phoneNumber, acceptSms, lang)
        .then(() => console.log(`[Reallocation SMS] Confirmation sent to ${farmer.phoneNumber}`))
        .catch(err => console.error('[Reallocation SMS] Error:', err.message));

      // 2. Generate voice confirmation audio
      const spokenText = dict.slotReallocation.acceptSpeech({ tokenId, slotTime });
      const audio = await ttsService.generateAudio(spokenText, lang, `accept_${tokenId}`);

      return res.status(200).json(
        exotelService.formatPassthruResponse({
          action: 'reallocation_accepted',
          success: true,
          spokenText,
          spoken_text: spokenText,
          audioUrl: audio.audioUrl,
          audio_url: audio.audioUrl,
          tokenId,
          token_id: tokenId,
          extra: {
            farmerName: farmer.farmerName,
            slotTime,
            status: 'ASSIGNED',
            audioUrl: audio.audioUrl,
            audio_url: audio.audioUrl,
            spokenText,
            spoken_text: spokenText,
            tokenId,
            token_id: tokenId
          }
        })
      );
    }

    // ---------------------------------------------------------
    // CASE 2: FARMER DECLINES (Digit 2) -> CASCADE TO NEXT FARMER
    // ---------------------------------------------------------
    if (result.action === 'DECLINED_AND_CASCADED') {
      const { declinedFarmer, nextFarmer, slotDetails } = result;
      const declinedLang = declinedFarmer.language || 'te';
      const declinedDict = getStrings(declinedLang);

      // Spoken acknowledgement for declining farmer
      const spokenText = declinedDict.slotReallocation.declineSpeech();
      const declineAudio = await ttsService.generateAudio(spokenText, declinedLang, 'realloc_decline');

      // ASYNCHRONOUSLY CASCADE TO NEXT FARMER (Farmer #3)
      const nextLang = nextFarmer.language || 'te';
      const nextDict = getStrings(nextLang);

      // Send SMS to next farmer
      const nextSms = nextDict.slotReallocation.offerSms(slotDetails);
      smsService.sendSms(nextFarmer.phoneNumber, nextSms, nextLang)
        .then(() => console.log(`[Cascade] SMS offer sent to next farmer: ${nextFarmer.farmerName} (+91 ${nextFarmer.phoneNumber})`))
        .catch(err => console.error('[Cascade SMS Error]:', err.message));

      // Initiate outbound call to next farmer
      const nextSpeech = nextDict.slotReallocation.offerSpeech(slotDetails);
      const nextAudio = await ttsService.generateAudio(nextSpeech, nextLang, `offer_cascade_${nextFarmer.phoneNumber}`);
      
      const serverBaseUrl = (process.env.SERVER_BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
      exotelService.triggerOutboundCall({
        to: nextFarmer.phoneNumber,
        callType: 'SLOT_REALLOCATION_CASCADE',
        flowUrl: `${serverBaseUrl}/api/ivr/slot-reallocate-call?reallocationId=${reallocationId}`,
        customData: {
          reallocationId,
          farmer: nextFarmer,
          slotDetails,
          audioUrl: nextAudio.audioUrl
        }
      }).catch(err => console.error('[Cascade Call Error]:', err.message));

      return res.status(200).json(
        exotelService.formatPassthruResponse({
          action: 'reallocation_declined_and_cascaded',
          success: true,
          spokenText,
          spoken_text: spokenText,
          audioUrl: declineAudio.audioUrl,
          audio_url: declineAudio.audioUrl,
          extra: {
            declinedFarmer: declinedFarmer.farmerName,
            cascadedTo: nextFarmer.farmerName,
            nextFarmer: nextFarmer,
            status: 'OFFER_CASCADED',
            audioUrl: declineAudio.audioUrl,
            audio_url: declineAudio.audioUrl,
            spokenText,
            spoken_text: spokenText,
            cascadedAudioUrl: nextAudio.audioUrl,
            cascadedSpokenText: nextSpeech
          }
        })
      );
    }

    // CASE 3: QUEUE EXHAUSTED
    if (result.action === 'DECLINED_QUEUE_EXHAUSTED') {
      const declinedDict = getStrings('te');
      const spokenText = declinedDict.slotReallocation.declineSpeech();
      const audio = await ttsService.generateAudio(spokenText, 'te', 'realloc_decline');

      return res.status(200).json(
        exotelService.formatPassthruResponse({
          action: 'queue_exhausted',
          success: true,
          spokenText,
          spoken_text: spokenText,
          audioUrl: audio.audioUrl,
          audio_url: audio.audioUrl,
          extra: {
            message: result.message,
            audioUrl: audio.audioUrl,
            audio_url: audio.audioUrl,
            spokenText,
            spoken_text: spokenText
          }
        })
      );
    }

    return res.status(400).json({ success: false, message: result.message || 'Invalid re-allocation response' });
  } catch (err) {
    console.error('[handleSlotReallocateInput] Error:', err);
    return res.status(500).json({ error: err.message });
  }
};

app.get('/api/ivr/slot-reallocate-input', handleSlotReallocateInput);
app.post('/api/ivr/slot-reallocate-input', handleSlotReallocateInput);

/**
 * Direct simulator endpoint for testing re-allocation responses (Accept/Decline)
 */
app.post('/api/test/slot-reallocate/respond', async (req, res) => {
  const { reallocationId, digit } = req.body;
  if (!reallocationId || !digit) {
    return res.status(400).json({ error: 'Missing reallocationId or digit (1 or 2)' });
  }

  const mockReq = {
    method: 'POST',
    body: {
      Digits: String(digit),
      CallSid: `sim_realloc_${Date.now()}`
    },
    query: { reallocationId }
  };

  let responseData = null;
  const mockRes = {
    status: (code) => ({
      json: (payload) => {
        responseData = { statusCode: code, ...payload };
        return responseData;
      }
    })
  };

  await handleSlotReallocateInput(mockReq, mockRes);
  return res.status(200).json(responseData);
});

/**
 * Reset waitlist queue and demo bookings for continuous testing
 */
app.post('/api/slots/reset-waitlist', (req, res) => {
  const result = group2Service.resetWaitlistAndBookings();
  return res.status(200).json({
    success: true,
    message: 'Waitlist queue and demo bookings reset successfully',
    ...result
  });
});

// ============================================================================
// 6. CALL STATUS CALLBACK & SIMULATION / STATUS ENDPOINTS
// ============================================================================
app.all('/api/ivr/status-callback', (req, res) => {
  const data = req.method === 'POST' ? req.body : req.query;
  console.log(`[Exotel StatusCallback] CallSid: ${data.CallSid}, Status: ${data.Status}, Duration: ${data.Duration}s`);
  return res.status(200).send('OK');
});

// Interactive Simulator Hook (from Web Console or CLI tests)
app.post('/api/test/simulate', async (req, res) => {
  const { phoneNumber, digit, language } = req.body;
  
  if (!phoneNumber || !digit) {
    return res.status(400).json({ error: 'Missing phoneNumber or digit' });
  }

  if (language) {
    callerPreferences.set(smsService.sanitizePhoneNumber(phoneNumber), language);
  }

  const mockReq = {
    method: 'POST',
    body: {
      From: phoneNumber,
      Digits: digit,
      CallSid: `sim_${Date.now()}`,
      language
    }
  };

  let responseData = null;
  const mockRes = {
    status: (code) => ({
      json: (payload) => {
        responseData = { statusCode: code, ...payload };
        return responseData;
      }
    })
  };

  await handleInputRequest(mockReq, mockRes);
  return res.status(200).json(responseData);
});

// Health check and Dashboard stats
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'Group 1 Telephony Subsystem',
    features: [
      'Multi-Language IVR (te, hi, en)',
      'Payment Delay Alerts (SMS + Outbound Voice)',
      'Smart Slot Re-allocation Flow'
    ],
    mockGroup2: process.env.USE_MOCK_GROUP2 !== 'false',
    smsHistory: smsService.getHistory(),
    callHistory: exotelService.getCallHistory(),
    activeBookings: group2Service.getMockBookings(),
    waitlist: group2Service.getWaitlist(),
    reallocations: group2Service.getReallocations(),
    delayedPayments: group2Service.getDelayedPayments(),
    callerPreferences: Object.fromEntries(callerPreferences),
    serverBaseUrl: process.env.SERVER_BASE_URL || `http://localhost:${PORT}`
  });
});

app.get('/api/reallocations/status', (req, res) => {
  res.json({
    waitlist: group2Service.getWaitlist(),
    reallocations: group2Service.getReallocations()
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', uptime: process.uptime() });
});

// ============================================================================
// START SERVER
// ============================================================================
app.listen(PORT, async () => {
  console.log('=============================================================');
  console.log(`🌾 Group 1 Telephony Backend Running on port ${PORT}`);
  console.log(`📡 Local URL: http://localhost:${PORT}`);
  console.log(`📊 Test Dashboard: http://localhost:${PORT}/index.html`);
  console.log(`📞 Exotel Webhook URL: http://localhost:${PORT}/api/ivr/handle-input`);
  console.log(`🌐 Multi-Language IVR: http://localhost:${PORT}/api/ivr/language-menu`);
  console.log(`🚨 Payment Delay Alerts: http://localhost:${PORT}/api/alerts/payment-delay`);
  console.log(`♻️  Slot Re-allocation: http://localhost:${PORT}/api/slots/cancel`);
  console.log(`⚙️  Mock Group 2 Enabled: ${process.env.USE_MOCK_GROUP2 !== 'false'}`);
  console.log(`✉️  Fast2SMS Mode: ${process.env.FAST2SMS_API_KEY ? 'LIVE' : 'SIMULATION / DRY-RUN'}`);
  console.log(`📱 Exotel Mode: ${process.env.EXOTEL_API_KEY ? 'LIVE' : 'SIMULATION / DRY-RUN'}`);
  console.log('=============================================================');

  // Pre-generate standard IVR audio clips in background (Telugu, Hindi, English)
  ttsService.preheatStandardClips().catch(err => {
    console.warn('[Server Startup] Warning warming TTS clips:', err.message);
  });
});

module.exports = app;
