/**
 * Exotel Telephony Webhook Helper
 * Parses Exotel incoming requests (GET query or POST body) and formats applet responses.
 */

class ExotelService {
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
  formatPassthruResponse({ action, success, spokenText, audioUrl, tokenId, tokensAhead, ewtMinutes, smsStatus }) {
    return {
      status: success ? '200' : '400',
      action,
      success,
      // For Exotel "Say" applet (Text-to-Speech)
      spoken_text: spokenText,
      // For Exotel "Play" applet (Fetches and plays pre-rendered MP3)
      audio_url: audioUrl,
      // Metadata fields for Exotel Flow variables
      token_id: tokenId || '',
      tokens_ahead: tokensAhead !== undefined ? String(tokensAhead) : '',
      ewt_minutes: ewtMinutes !== undefined ? String(ewtMinutes) : '',
      sms_status: smsStatus || 'queued',
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new ExotelService();
