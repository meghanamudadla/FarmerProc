/**
 * Telugu Text-To-Speech (TTS) Service
 * Converts Telugu text into MP3 audio files cached in public/audio/
 * Generates publicly accessible URLs for Exotel's "Play Audio" Applet
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const googleTTS = require('google-tts-api');

class TtsService {
  constructor() {
    this.audioDir = path.join(__dirname, '..', 'public', 'audio');
    
    // Ensure public/audio directory exists
    if (!fs.existsSync(this.audioDir)) {
      fs.mkdirSync(this.audioDir, { recursive: true });
    }
  }

  /**
   * Generates or fetches cached MP3 for the given Telugu text
   * @param {string} text - Telugu text to speak
   * @param {string} [prefix='audio'] - Optional prefix for filename
   * @returns {Promise<{audioUrl: string, filename: string, text: string}>}
   */
  async generateTeluguAudio(text, prefix = 'telugu') {
    try {
      // Create deterministic filename using sha256 hash of text
      const hash = crypto.createHash('md5').update(text).digest('hex').slice(0, 12);
      const filename = `${prefix}_${hash}.mp3`;
      const filePath = path.join(this.audioDir, filename);

      // Return cached file if it already exists
      if (fs.existsSync(filePath)) {
        return {
          filename,
          audioUrl: this.buildAudioUrl(filename),
          text
        };
      }

      console.log(`[TTS Service] Generating new Telugu audio for: "${text.slice(0, 40)}..."`);

      // google-tts-api has a 200 character limit per call; for long text it provides getAllAudioBase64
      let base64Data = '';
      if (text.length > 180) {
        const results = await googleTTS.getAllAudioBase64(text, {
          lang: 'te',
          slow: false,
          timeout: 10000
        });
        base64Data = results.map(r => r.base64).join('');
      } else {
        base64Data = await googleTTS.getAudioBase64(text, {
          lang: 'te',
          slow: false,
          timeout: 10000
        });
      }

      // Save buffer to MP3
      const buffer = Buffer.from(base64Data, 'base64');
      fs.writeFileSync(filePath, buffer);
      console.log(`[TTS Service] Audio cached successfully: ${filename} (${buffer.length} bytes)`);

      return {
        filename,
        audioUrl: this.buildAudioUrl(filename),
        text
      };
    } catch (err) {
      console.error(`[TTS Service] Error generating Telugu audio: ${err.message}`);
      // Return fallback without crashing
      return {
        filename: null,
        audioUrl: null,
        text,
        error: err.message
      };
    }
  }

  /**
   * Pre-generate standard IVR static audio clips (Greeting, Menu, Errors)
   */
  async preheatStandardClips() {
    const teluguStrings = require('../config/teluguStrings');
    console.log('[TTS Service] Pre-heating standard IVR Telugu audio clips...');
    
    await Promise.allSettled([
      this.generateTeluguAudio(teluguStrings.menu.speech, 'menu_greeting'),
      this.generateTeluguAudio(teluguStrings.invalidInput.speech, 'invalid_input'),
      this.generateTeluguAudio(teluguStrings.error.speech, 'system_error'),
      this.generateTeluguAudio(teluguStrings.queueStatus.noTokenSpeech, 'no_token')
    ]);

    console.log('[TTS Service] Standard clips ready.');
  }

  /**
   * Construct absolute public URL
   */
  buildAudioUrl(filename) {
    const baseUrl = (process.env.SERVER_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
    return `${baseUrl}/audio/${filename}`;
  }
}

module.exports = new TtsService();
