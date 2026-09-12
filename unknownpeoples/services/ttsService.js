/**
 * Multi-Language Text-To-Speech (TTS) Service
 * Converts Telugu ('te'), Hindi ('hi'), and English ('en') text into MP3 audio files cached in public/audio/
 * Generates publicly accessible URLs for Exotel's "Play Audio" Applet
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const googleTTS = require('google-tts-api');
const { languageStrings } = require('../config/languageStrings');

class TtsService {
  constructor() {
    this.audioDir = path.join(__dirname, '..', 'public', 'audio');
    
    // Ensure public/audio directory exists
    if (!fs.existsSync(this.audioDir)) {
      fs.mkdirSync(this.audioDir, { recursive: true });
    }
  }

  /**
   * Generates or fetches cached MP3 for text in specified language ('te', 'hi', 'en')
   * @param {string} text - Text to speak
   * @param {string} [lang='te'] - Language code ('te', 'hi', 'en')
   * @param {string} [prefix='audio'] - Optional prefix for filename
   * @returns {Promise<{audioUrl: string, filename: string, text: string, lang: string}>}
   */
  async generateAudio(text, lang = 'te', prefix = 'audio') {
    const validLang = ['te', 'hi', 'en'].includes(lang) ? lang : 'te';

    try {
      // Create deterministic filename using sha256 hash of language + text
      const hash = crypto.createHash('md5').update(`${validLang}_${text}`).digest('hex').slice(0, 12);
      const filename = `${prefix}_${validLang}_${hash}.mp3`;
      const filePath = path.join(this.audioDir, filename);

      // Return cached file if it already exists
      if (fs.existsSync(filePath)) {
        return {
          filename,
          audioUrl: this.buildAudioUrl(filename),
          text,
          lang: validLang
        };
      }

      console.log(`[TTS Service] Generating new ${validLang.toUpperCase()} audio for: "${text.slice(0, 40)}..."`);

      // google-tts-api has a 200 character limit per call; for long text it provides getAllAudioBase64
      let base64Data = '';
      if (text.length > 180) {
        const results = await googleTTS.getAllAudioBase64(text, {
          lang: validLang,
          slow: false,
          timeout: 10000
        });
        base64Data = results.map(r => r.base64).join('');
      } else {
        base64Data = await googleTTS.getAudioBase64(text, {
          lang: validLang,
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
        text,
        lang: validLang
      };
    } catch (err) {
      console.error(`[TTS Service] Error generating ${validLang} audio: ${err.message}`);
      return {
        filename: null,
        audioUrl: null,
        text,
        lang: validLang,
        error: err.message
      };
    }
  }

  /**
   * Backwards-compatible Telugu audio generator
   * @param {string} text - Telugu text to speak
   * @param {string} [prefix='telugu']
   */
  async generateTeluguAudio(text, prefix = 'telugu') {
    return this.generateAudio(text, 'te', prefix);
  }

  /**
   * Pre-generate standard IVR static audio clips in Telugu, Hindi, and English
   */
  async preheatStandardClips() {
    console.log('[TTS Service] Pre-heating standard multi-language IVR audio clips...');

    const tasks = [
      // Language Selection Greeting
      this.generateAudio(languageStrings.languageSelection.speech, 'te', 'lang_select')
    ];

    for (const lang of ['te', 'hi', 'en']) {
      const dict = languageStrings[lang];
      tasks.push(
        this.generateAudio(dict.menu.speech, lang, 'menu_greeting'),
        this.generateAudio(dict.invalidInput.speech, lang, 'invalid_input'),
        this.generateAudio(dict.error.speech, lang, 'system_error'),
        this.generateAudio(dict.queueStatus.noTokenSpeech, lang, 'no_token'),
        this.generateAudio(dict.slotReallocation.declineSpeech(), lang, 'realloc_decline')
      );
    }

    const results = await Promise.allSettled(tasks);
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.audioUrl).length;
    console.log(`[TTS Service] Standard clips ready (${successful}/${tasks.length} cached).`);
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
