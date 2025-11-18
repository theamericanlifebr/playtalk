(function () {
  class OpenAISpeechRecognizer {
    constructor(options = {}) {
      this._lang = options.lang || 'en-US';
      this.segmentMs = options.segmentMs || 3500;
      this.minBytes = options.minBytes || 2048;
      this.volumeThresholdDb = typeof options.volumeThresholdDb === 'number' ? options.volumeThresholdDb : 0;
      this.silenceCutoffMs = typeof options.silenceCutoffMs === 'number'
        ? Math.max(200, options.silenceCutoffMs)
        : 900;
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
      this.audioContext = null;
      this.analyser = null;
      this.sourceNode = null;
      this.volumeDataArray = null;
      this.volumeMonitorId = null;
      this.currentVolumeDb = 0;
      this.segmentLoudEnough = false;
      this.lastLoudTimestamp = 0;
      this.forceStopPending = false;
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
        this.segmentLoudEnough = false;
        await this.setupAudioMonitoring();
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
      this.teardownAudioContext();
      if (typeof this.onend === 'function') {
        this.onend();
      }
    }

    beginSegment() {
      if (!this.active || !this.stream) {
        return;
      }
      this.chunks = [];
      this.segmentLoudEnough = false;
      this.lastLoudTimestamp = 0;
      this.forceStopPending = false;
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
        const loudEnough = this.segmentLoudEnough;
        this.segmentLoudEnough = false;
        this.forceStopPending = false;
        if (this.active) {
          this.beginSegment();
        } else {
          this.releaseStream();
          this.teardownAudioContext();
          if (typeof this.onend === 'function') {
            this.onend();
          }
        }
        if (blob && blob.size >= this.minBytes && loudEnough) {
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

    async setupAudioMonitoring() {
      if (!this.stream || this.audioContext) {
        return;
      }
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (typeof AudioContextClass !== 'function') {
        return;
      }
      try {
        this.audioContext = new AudioContextClass();
        if (this.audioContext.state === 'suspended' && typeof this.audioContext.resume === 'function') {
          await this.audioContext.resume().catch(() => {});
        }
        this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 2048;
        this.sourceNode.connect(this.analyser);
        this.volumeDataArray = new Float32Array(this.analyser.fftSize);
        this.monitorVolume();
      } catch (error) {
        console.warn('Falha ao inicializar monitoramento do microfone:', error);
        this.teardownAudioContext();
      }
    }

    monitorVolume() {
      if (!this.analyser || !this.volumeDataArray) {
        return;
      }
      const analyze = () => {
        if (!this.analyser || !this.volumeDataArray) {
          return;
        }
        this.analyser.getFloatTimeDomainData(this.volumeDataArray);
        let sumSquares = 0;
        for (let i = 0; i < this.volumeDataArray.length; i++) {
          const sample = this.volumeDataArray[i] || 0;
          sumSquares += sample * sample;
        }
        const rms = Math.sqrt(sumSquares / this.volumeDataArray.length) || 0;
        const approxDb = Math.max(0, 20 * Math.log10(Math.max(rms, 1e-8)) + 100);
        this.currentVolumeDb = approxDb;
        if (approxDb >= this.volumeThresholdDb) {
          this.segmentLoudEnough = true;
          this.lastLoudTimestamp = (typeof performance !== 'undefined' && performance.now)
            ? performance.now()
            : Date.now();
        } else if (
          this.segmentLoudEnough &&
          this.silenceCutoffMs > 0 &&
          this.recorder &&
          this.recorder.state === 'recording'
        ) {
          const now = (typeof performance !== 'undefined' && performance.now)
            ? performance.now()
            : Date.now();
          if (!this.lastLoudTimestamp) {
            this.lastLoudTimestamp = now;
          }
          if (now - this.lastLoudTimestamp >= this.silenceCutoffMs) {
            this.forceSegmentStop();
          }
        }
        this.volumeMonitorId = window.requestAnimationFrame(analyze);
      };
      this.volumeMonitorId = window.requestAnimationFrame(analyze);
    }

    stopVolumeMonitoring() {
      if (this.volumeMonitorId) {
        window.cancelAnimationFrame(this.volumeMonitorId);
        this.volumeMonitorId = null;
      }
    }

    teardownAudioContext() {
      this.stopVolumeMonitoring();
      if (this.sourceNode) {
        try { this.sourceNode.disconnect(); } catch (e) {}
        this.sourceNode = null;
      }
      this.analyser = null;
      this.volumeDataArray = null;
      if (this.audioContext) {
        try { this.audioContext.close(); } catch (e) {}
        this.audioContext = null;
      }
    }

    forceSegmentStop() {
      if (!this.recorder || this.recorder.state !== 'recording' || this.forceStopPending) {
        return;
      }
      this.forceStopPending = true;
      try {
        this.recorder.stop();
      } catch (error) {
        console.warn('Erro ao encerrar segmento por silêncio:', error);
        this.forceStopPending = false;
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
