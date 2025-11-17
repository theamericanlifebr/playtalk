(function () {
  const DEFAULT_MODE_VOICES = {
    1: 'alloy',
    2: 'ember',
    3: 'verse',
    4: 'sol',
    5: 'sage',
    6: 'lumi'
  };

  class PlaytalkOpenAIVoice {
    constructor(options = {}) {
      this.modeVoices = options.modeVoices || DEFAULT_MODE_VOICES;
      this.defaultVoice = options.defaultVoice || 'alloy';
      this.defaultFormat = options.format || 'mp3';
      this.cache = new Map();
      this.currentAudio = null;
      this.currentToken = 0;
    }

    getVoiceForMode(mode, explicitVoice) {
      if (explicitVoice && typeof explicitVoice === 'string') {
        return explicitVoice;
      }
      const key = String(mode || '');
      const mapped = this.modeVoices && this.modeVoices[key];
      if (typeof mapped === 'string' && mapped.trim()) {
        return mapped.trim();
      }
      if (mapped && typeof mapped === 'object') {
        const voiceName = mapped.voice || mapped.en || mapped.pt;
        if (voiceName && typeof voiceName === 'string') {
          return voiceName;
        }
      }
      return this.defaultVoice;
    }

    async play(options = {}) {
      const text = typeof options.text === 'string' ? options.text.trim() : '';
      if (!text) {
        return Promise.resolve();
      }
      const lang = options.lang || 'en';
      const voice = this.getVoiceForMode(options.mode, options.voice);
      const format = options.format || this.defaultFormat;
      this.stop();
      const token = ++this.currentToken;
      const audioSource = await this.loadAudio({ text, voice, lang, format });
      return new Promise((resolve, reject) => {
        if (!audioSource) {
          resolve();
          return;
        }
        if (token !== this.currentToken) {
          resolve();
          return;
        }
        const audio = typeof Audio === 'function'
          ? new Audio()
          : (typeof document !== 'undefined' && typeof document.createElement === 'function'
            ? document.createElement('audio')
            : null);
        if (!audio) {
          resolve();
          return;
        }
        audio.preload = 'auto';
        audio.src = audioSource;
        this.currentAudio = audio;
        const cleanup = () => {
          if (this.currentAudio === audio) {
            this.currentAudio = null;
          }
        };
        audio.onended = () => {
          cleanup();
          resolve();
        };
        audio.onerror = () => {
          cleanup();
          reject(new Error('Falha ao reproduzir áudio.'));
        };
        const playPromise = audio.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch((error) => {
            cleanup();
            reject(error || new Error('Falha ao iniciar áudio.'));
          });
        }
      });
    }

    stop() {
      if (this.currentAudio) {
        try { this.currentAudio.pause(); } catch (error) {}
        try { this.currentAudio.currentTime = 0; } catch (error) {}
        this.currentAudio = null;
      }
    }

    async loadAudio({ text, voice, lang, format }) {
      const cacheKey = `${voice}::${lang}::${text}`;
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice, language: lang, format })
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data || !data.success || !data.audio) {
        const message = data && data.message ? data.message : 'Falha ao gerar voz.';
        throw new Error(message);
      }
      const source = data.audio.startsWith('data:')
        ? data.audio
        : `data:audio/${data.format || format};base64,${data.audio}`;
      this.cache.set(cacheKey, source);
      return source;
    }
  }

  window.PlaytalkOpenAIVoice = PlaytalkOpenAIVoice;
  if (!window.playtalkModeVoices) {
    window.playtalkModeVoices = DEFAULT_MODE_VOICES;
  }
  if (!window.playtalkVoiceEngine) {
    window.playtalkVoiceEngine = new PlaytalkOpenAIVoice({
      modeVoices: window.playtalkModeVoices,
      defaultVoice: 'alloy',
      format: 'mp3'
    });
  }
})();
