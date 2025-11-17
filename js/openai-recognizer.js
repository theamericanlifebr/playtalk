(function () {
  class OpenAISpeechRecognizer {
    constructor(options = {}) {
      this._lang = options.lang || 'en-US';
      this.segmentMs = options.segmentMs || 3500;
      this.minBytes = options.minBytes || 2048;
      this.onstart = null;
      this.onresult = null;
      this.onerror = null;
      this.onend = null;
      this.active = false;
      this.starting = false;
      this.stream = null;
      this.recorder = null;
      this.recordingTimer = null;
      this.chunks = [];
      this.pendingPromise = Promise.resolve();
      this.currentMimeType = 'audio/webm';
    }

    get lang() {
      return this._lang;
    }

    set lang(value) {
      this._lang = value || 'en-US';
    }

    async start() {
      if (this.active || this.starting) {
        return;
      }
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') {
        this.emitError('not-supported');
        return;
      }
      this.starting = true;
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.active = true;
        if (typeof this.onstart === 'function') {
          this.onstart();
        }
        this.beginSegment();
      } catch (error) {
        const code = error && (error.name === 'NotAllowedError' || error.name === 'SecurityError')
          ? 'not-allowed'
          : 'capture-error';
        this.emitError(code, error);
      } finally {
        this.starting = false;
      }
    }

    stop() {
      this.active = false;
      if (this.recordingTimer) {
        clearTimeout(this.recordingTimer);
        this.recordingTimer = null;
      }
      if (this.recorder && this.recorder.state === 'recording') {
        try {
          this.recorder.stop();
        } catch (error) {
          console.error('Erro ao parar o gravador:', error);
        }
        return;
      }
      this.releaseStream();
      if (typeof this.onend === 'function') {
        this.onend();
      }
    }

    beginSegment() {
      if (!this.active || !this.stream) {
        return;
      }
      this.chunks = [];
      const options = {};
      const preferredTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus'
      ];
      const supportedType = preferredTypes.find((type) => {
        if (typeof MediaRecorder.isTypeSupported !== 'function') {
          return type === 'audio/webm';
        }
        return MediaRecorder.isTypeSupported(type);
      });
      if (supportedType) {
        options.mimeType = supportedType;
      }
      try {
        this.recorder = new MediaRecorder(this.stream, options);
      } catch (error) {
        this.emitError('recorder-error', error);
        this.stop();
        return;
      }
      this.currentMimeType = this.recorder.mimeType || options.mimeType || 'audio/webm';
      this.recorder.ondataavailable = (event) => {
        if (event.data && event.data.size) {
          this.chunks.push(event.data);
        }
      };
      this.recorder.onerror = (event) => {
        this.emitError('recorder-error', event);
        this.stop();
      };
      this.recorder.onstop = () => {
        const blob = this.buildBlob();
        this.recorder = null;
        if (this.active) {
          this.beginSegment();
        } else {
          this.releaseStream();
          if (typeof this.onend === 'function') {
            this.onend();
          }
        }
        if (blob && blob.size >= this.minBytes) {
          this.queueChunk(blob);
        }
      };
      try {
        this.recorder.start();
      } catch (error) {
        this.emitError('recorder-error', error);
        this.stop();
        return;
      }
      this.recordingTimer = setTimeout(() => {
        this.recordingTimer = null;
        if (this.recorder && this.recorder.state === 'recording') {
          try {
            this.recorder.stop();
          } catch (error) {
            console.error('Erro ao encerrar o segmento de áudio:', error);
          }
        }
      }, this.segmentMs);
    }

    buildBlob() {
      if (!this.chunks.length) {
        return null;
      }
      const blob = new Blob(this.chunks, { type: this.currentMimeType });
      this.chunks = [];
      return blob;
    }

    releaseStream() {
      if (this.stream) {
        this.stream.getTracks().forEach((track) => track.stop());
        this.stream = null;
      }
      if (this.recordingTimer) {
        clearTimeout(this.recordingTimer);
        this.recordingTimer = null;
      }
    }

    queueChunk(blob) {
      this.pendingPromise = this.pendingPromise
        .then(() => this.uploadChunk(blob))
        .catch(() => {});
    }

    async uploadChunk(blob) {
      if (!blob || blob.size < this.minBytes) {
        return;
      }
      try {
        const audioBase64 = await this.blobToBase64(blob);
        if (!audioBase64) {
          return;
        }
        const payload = {
          audio: audioBase64,
          mimeType: blob.type || this.currentMimeType || 'audio/webm',
          language: this.lang && this.lang.toLowerCase().startsWith('pt') ? 'pt' : 'en'
        };
        const response = await fetch('/api/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        let data = null;
        try {
          data = await response.json();
        } catch (error) {
          data = null;
        }
        if (!response.ok || !data || !data.success) {
          const message = data && data.message ? data.message : 'Transcrição indisponível.';
          throw new Error(message);
        }
        const transcript = typeof data.text === 'string' ? data.text.trim() : '';
        if (!transcript || typeof this.onresult !== 'function') {
          return;
        }
        this.onresult({
          results: [
            [
              { transcript }
            ]
          ]
        });
      } catch (error) {
        this.emitError(error.message || 'transcription-error', error);
      }
    }

    blobToBase64(blob) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result || '';
          if (typeof result === 'string') {
            const base64 = result.includes(',') ? result.split(',')[1] : result;
            resolve(base64);
          } else {
            resolve('');
          }
        };
        reader.onerror = () => reject(new Error('Falha ao ler áudio.'));
        reader.readAsDataURL(blob);
      });
    }

    emitError(code, details) {
      if (typeof this.onerror === 'function') {
        this.onerror({ error: code, details });
      } else {
        console.error('OpenAI recognizer error:', code, details);
      }
    }
  }

  window.OpenAISpeechRecognizer = OpenAISpeechRecognizer;
})();
