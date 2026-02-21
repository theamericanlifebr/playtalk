(function () {
  class KitSpeechRecognizer {
    constructor(options = {}) {
      this._lang = options.lang || 'en-US';
      this.onstart = null;
      this.onresult = null;
      this.onerror = null;
      this.onend = null;

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition || null;
      this._Recognition = typeof SpeechRecognition === 'function' ? SpeechRecognition : null;
      this._recognition = this._Recognition ? new this._Recognition() : null;

      if (this._recognition) {
        this._recognition.continuous = true;
        this._recognition.interimResults = false;
        this._recognition.maxAlternatives = 1;
        this._recognition.lang = this._lang;
        this._recognition.addEventListener('start', () => this._emit('onstart'));
        this._recognition.addEventListener('end', () => this._emit('onend'));
        this._recognition.addEventListener('result', (event) => this._emit('onresult', event));
        this._recognition.addEventListener('error', (event) => {
          if (typeof this.onerror === 'function') {
            this.onerror(event);
          } else {
            const code = event && event.error ? event.error : 'error';
            this._emitError(code, event);
          }
        });
      }
    }

    get lang() {
      return this._lang;
    }

    set lang(value) {
      this._lang = value || 'en-US';
      if (this._recognition) {
        this._recognition.lang = this._lang;
      }
    }

    start() {
      if (!this._recognition) {
        this._emitError('not-supported');
        return;
      }
      try {
        this._recognition.lang = this._lang;
        this._recognition.start();
      } catch (error) {
        if (error && error.name === 'InvalidStateError') {
          return;
        }
        this._emitError('start-failed', error);
      }
    }

    stop() {
      if (!this._recognition) {
        this._emit('onend');
        return;
      }
      try {
        this._recognition.stop();
      } catch (error) {
        console.warn('Falha ao parar reconhecimento de voz:', error);
      }
    }

    _emit(handlerName, payload) {
      const handler = this[handlerName];
      if (typeof handler === 'function') {
        handler(payload);
      }
    }

    _emitError(code, details) {
      if (typeof this.onerror === 'function') {
        this.onerror({ error: code, details });
      }
    }
  }

  window.KitSpeechRecognizer = KitSpeechRecognizer;
})();
