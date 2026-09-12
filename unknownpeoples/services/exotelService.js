/**
 * Exotel Telephony Webhook & Outbound Call Helper
 * Parses Exotel incoming requests, formats applet responses, and triggers automated outbound calls.
 */

const axios = require('axios');

class ExotelService {
  constructor() {
    this.sid = process.env.EXOTEL_SID || '';
    this.apiKey = process.env.EXOTEL_API_KEY || '';
    this.apiToken = process.env.EXOTEL_API_TOKEN || '';
    this.subdomain = process.env.EXOTEL_SUBDOMAIN || 'api.exotel.com';
    this.callerId = process.env.EXOTEL_CALLER_ID || process.env.EXOPHONE || '08047104000';

    // Track outbound calls for dashboard & automated verification
    this.callHistory = [];
  }

  /**
   * Extracts call parameters from Exotel request
   * Supports both GET and POST requests
   */
  extractCallDetails(req) {
    const data = req.method === 'POST' ? req.body : req.query;

    return {
      callSid: data.CallSid || data.call_sid || `sim_${Date.now()}`,
      from: data.From || data.CallFrom || data.Caller || data.phoneNumber || '',
      to: data.To || data.CallTo || '',
      digits: String(data.Digits || data.digits || '').trim(),
      direction: data.Direction || 'inbound',
      raw: data
    };
  }

  /**
   * Formats Exotel Passthru Applet HTTP Response
   * Exotel can parse JSON response fields to bind to subsequent Play or Say applets
   */
  formatPassthruResponse({ action, success, spokenText, audioUrl, tokenId, tokensAhead, ewtMinutes, smsStatus, extra = {} }) {
    return {
      status: success ? '200' : '400',
      action,
      success,
      // For Exotel "Say" applet (Text-to-Speech)
      spoken_text: spokenText,
      spokenText,
      // For Exotel "Play" applet (Fetches and plays pre-rendered MP3)
      audio_url: audioUrl,
      audioUrl,
      // Metadata fields for Exotel Flow variables & JavaScript consumption
      token_id: tokenId || '',
      tokenId: tokenId || '',
      tokens_ahead: tokensAhead !== undefined ? String(tokensAhead) : '',
      tokensAhead: tokensAhead !== undefined ? String(tokensAhead) : '',
      ewt_minutes: ewtMinutes !== undefined ? String(ewtMinutes) : '',
      ewtMinutes: ewtMinutes !== undefined ? String(ewtMinutes) : '',
      sms_status: smsStatus || 'queued',
      smsStatus: smsStatus || 'queued',
      timestamp: new Date().toISOString(),
      ...extra
    };
  }

  /**
   * Triggers an automated outbound call via Exotel Connect API
   * Used for Payment Delay Alerts and Smart Slot Re-allocations
   *
   * @param {object} params
   * @param {string} params.to - Farmer mobile number (10-digit)
   * @param {string} params.callType - 'PAYMENT_DELAY' | 'SLOT_REALLOCATION' | 'ALERT'
   * @param {string} [params.flowUrl] - IVR Webhook / Applet URL for call flow
   * @param {object} [params.customData] - Additional payload (tokenId, amount, delayReason, etc.)
   * @returns {Promise<{success: boolean, callSid: string, simulated: boolean, message: string}>}
   */
  async triggerOutboundCall({ to, callType = 'ALERT', flowUrl, customData = {} }) {
    const cleanTo = String(to || '').replace(/\D/g, '').slice(-10);
    const callSid = `ex_out_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const logEntry = {
      id: Date.now(),
      callSid,
      timestamp: new Date().toISOString(),
      to: cleanTo,
      callerId: this.callerId,
      callType,
      flowUrl,
      customData,
      status: 'INITIATED',
      details: null
    };

    if (!cleanTo || cleanTo.length !== 10) {
      logEntry.status = 'INVALID_PHONE';
      this.callHistory.unshift(logEntry);
      return { success: false, message: 'Invalid 10-digit Indian phone number', callSid };
    }

    // Dry-run mode if Exotel credentials are not configured
    if (!this.apiKey || !this.apiToken || !this.sid || this.apiKey === 'your_exotel_api_key') {
      console.log('\n=============================================================');
      console.log(`[Exotel Outbound Call SIMULATION]`);
      console.log(`CallSid:   ${callSid}`);
      console.log(`To:        +91 ${cleanTo}`);
      console.log(`CallerId:  ${this.callerId}`);
      console.log(`Type:      ${callType}`);
      console.log(`Flow URL:  ${flowUrl || 'Local IVR Flow'}`);
      console.log(`Payload:   ${JSON.stringify(customData)}`);
      console.log('=============================================================\n');

      logEntry.status = 'SIMULATED_CALL_INITIATED';
      logEntry.details = 'Simulated outbound call successfully triggered (No EXOTEL credentials configured)';
      this.callHistory.unshift(logEntry);

      return {
        success: true,
        simulated: true,
        callSid,
        to: cleanTo,
        callType,
        message: 'Outbound call simulated successfully in dry-run mode',
        flowUrl
      };
    }

    // Live Exotel Connect API invocation
    try {
      console.log(`[Exotel] Initiating live outbound call to ${cleanTo} (${callType})...`);

      const connectEndpoint = `https://${this.subdomain}/v1/Accounts/${this.sid}/Calls/connect.json`;
      const authHeader = Buffer.from(`${this.apiKey}:${this.apiToken}`).toString('base64');

      const params = new URLSearchParams();
      params.append('From', cleanTo);
      params.append('CallerId', this.callerId);
      params.append('CallType', 'trans');
      if (flowUrl) {
        params.append('Url', flowUrl);
      }
      if (customData.customField) {
        params.append('CustomField', JSON.stringify(customData));
      }

      const response = await axios.post(connectEndpoint, params.toString(), {
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000
      });

      const returnedCallSid = response.data?.Call?.Sid || callSid;
      logEntry.callSid = returnedCallSid;
      logEntry.status = 'LIVE_CALL_QUEUED';
      logEntry.details = response.data;
      this.callHistory.unshift(logEntry);

      return {
        success: true,
        simulated: false,
        callSid: returnedCallSid,
        data: response.data,
        to: cleanTo
      };
    } catch (err) {
      const errMsg = err.response?.data?.RestException?.Message || err.message;
      console.error(`[Exotel] Outbound call failed to ${cleanTo}:`, errMsg);

      logEntry.status = 'FAILED';
      logEntry.details = errMsg;
      this.callHistory.unshift(logEntry);

      return {
        success: false,
        simulated: false,
        error: errMsg,
        callSid,
        to: cleanTo
      };
    }
  }

  /**
   * Get recent outbound call history (for testing dashboard)
   */
  getCallHistory() {
    return this.callHistory.slice(0, 50);
  }
}

module.exports = new ExotelService();
