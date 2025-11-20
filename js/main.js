const settingsAPI = window.playtalkSettings || {};
const SETTINGS_FALLBACK = settingsAPI.DEFAULT_SETTINGS || {
  theme: 'light',
  retryWrongPhrases: false
};

const PHRASE_CONFIG_PATH = 'data/phrases/config.json';
const MODE_PROGRESS_KEY = 'modeProgress';
const ROUND_STATE_KEY = 'modeRoundState';
const GENERAL_PROGRESS_KEY = 'generalProgress';
const XP_BASE_VALUE = 15;
const MAX_LEVEL_CAP = 1000;
const LEVEL_SCORE_INCREMENT = 0.05;
const MODE_SCORE_FACTORS = {
  1: 0,
  2: 0.25,
  3: 0.5,
  4: 0.75,
  5: 1,
  6: 1.25
};

const ROUND_OPTIONS = [12];
const DEFAULT_ROUND_SIZE = ROUND_OPTIONS[0];
const MAX_PROGRESS_POINTS = DEFAULT_ROUND_SIZE;
const COLOR_STOP_RATIOS = [
  [0, '#ff0000'],
  [0.08, '#ff3b00'],
  [0.16, '#ff7f00'],
  [0.24, '#ffb300'],
  [0.32, '#ffe000'],
  [0.4, '#ffff66'],
  [0.48, '#ccff66'],
  [0.56, '#99ff99'],
  [0.64, '#00cc66'],
  [0.72, '#00994d'],
  [0.8, '#00ffff'],
  [0.88, '#66ccff'],
  [0.96, '#0099ff'],
  [1, '#0099ff']
];

const COLOR_STOPS = COLOR_STOP_RATIOS.map(([ratio, color]) => [
  Math.round(ratio * MAX_PROGRESS_POINTS * 100) / 100,
  color
]);

const MODE_DETAILS = {
  1: {
    title: 'Modo 1 — Aquecimento bilingue',
    description: 'Escute em inglês, visualize em português e aqueça sua mente traduzindo rapidamente antes de responder.',
    logo: 'selos%20modos%20de%20jogo/modo1.png'
  },
  2: {
    title: 'Modo 2 — Tradução direta',
    description: 'Veja a frase em português e responda em inglês sem hesitar para consolidar vocabulário ativo.',
    logo: 'selos%20modos%20de%20jogo/modo2.png'
  },
  3: {
    title: 'Modo 3 — Listening puro',
    description: 'Apenas o áudio em inglês e sua resposta. Foque na compreensão auditiva para dominar a estrutura das frases.',
    logo: 'selos%20modos%20de%20jogo/modo3.png'
  },
  4: {
    title: 'Modo 4 — Reading em inglês',
    description: 'Leia em inglês, pense em inglês. Esse modo solidifica leitura e pronúncia mental em ritmo acelerado.',
    logo: 'selos%20modos%20de%20jogo/modo4.png'
  },
  5: {
    title: 'Modo 5 — Tradução reversa',
    description: 'Escute em inglês e responda em português com precisão. Ideal para treinar compreensão e produção simultânea.',
    logo: 'selos%20modos%20de%20jogo/modo5.png'
  },
  6: {
    title: 'Modo 6 — Desafio final',
    description: 'Combine leitura, escuta e resposta em inglês em ritmo máximo para provar que você domina o idioma.',
    logo: 'selos%20modos%20de%20jogo/modo6.png'
  }
};

const MEDAL_RULES = [
  { min: 0, max: 45, image: 'medalhas/bronze.png', label: 'Medalha de Bronze', levelDelta: 0, status: 'Você permanece no nível.' },
  { min: 46, max: 77, image: 'medalhas/prata.png', label: 'Medalha de Prata', levelDelta: 0, status: 'Você permanece no nível.' },
  { min: 78, max: 89, image: 'medalhas/ouro.png', label: 'Medalha de Ouro', levelDelta: 1, status: 'Você subiu de nível!' },
  { min: 90, max: 100, image: 'medalhas/diamante.png', label: 'Medalha de Diamante', levelDelta: 1, status: 'Você subiu de nível!' }
];

const MEDAL_LABEL_TO_KEY = {
  'Medalha de Diamante': 'diamante',
  'Medalha de Ouro': 'ouro',
  'Medalha de Prata': 'prata',
  'Medalha de Bronze': 'bronze'
};

const MEDAL_KEYS = ['diamante', 'ouro', 'prata', 'bronze'];
const RECENT_PHRASE_LIMIT = 500;

function createEmptyMedalCounts() {
  return {
    diamante: 0,
    ouro: 0,
    prata: 0,
    bronze: 0
  };
}

function normalizeMedalCounts(entry) {
  const base = createEmptyMedalCounts();
  if (!entry || typeof entry !== 'object') {
    return base;
  }
  MEDAL_KEYS.forEach((key) => {
    const value = Number(entry[key]);
    base[key] = Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  });
  return base;
}

function createEmptyRecentPhraseStats() {
  return { entries: [], totalChars: 0, totalTime: 0 };
}

function normalizeRecentPhraseStatsValue(value) {
  if (!value || typeof value !== 'object') {
    return createEmptyRecentPhraseStats();
  }
  const normalized = createEmptyRecentPhraseStats();
  const sourceEntries = Array.isArray(value.entries)
    ? value.entries
    : Array.isArray(value)
      ? value
      : [];
  sourceEntries.forEach((entry) => {
    if (normalized.entries.length >= RECENT_PHRASE_LIMIT) {
      return;
    }
    let chars = 0;
    let duration = 0;
    if (Array.isArray(entry)) {
      chars = entry[0];
      duration = entry[1];
    } else if (entry && typeof entry === 'object') {
      chars = entry.chars ?? entry.c ?? 0;
      duration = entry.time ?? entry.t ?? 0;
    }
    const rawChars = Number.isFinite(chars) ? Math.floor(chars) : 0;
    const rawDuration = Number.isFinite(duration) ? Math.floor(duration) : 0;
    if (!rawChars && !rawDuration) {
      return;
    }
    const normalizedChars = Math.max(0, rawChars);
    const normalizedDuration = Math.max(1, rawDuration);
    normalized.entries.push([normalizedChars, normalizedDuration]);
    normalized.totalChars += normalizedChars;
    normalized.totalTime += normalizedDuration;
  });
  if (!normalized.entries.length) {
    normalized.totalChars = Math.max(0, Math.floor(Number(value.totalChars) || 0));
    normalized.totalTime = Math.max(0, Math.floor(Number(value.totalTime) || 0));
  }
  return normalized;
}

function loadRecentPhraseStatsFromStorage() {
  const stored = parseJSONStorage('recentPhraseStats', null);
  const normalized = normalizeRecentPhraseStatsValue(stored);
  localStorage.setItem('recentPhraseStats', JSON.stringify(normalized));
  return normalized;
}

function addRecentPhraseSample(chars, duration) {
  if (!recentPhraseStats || typeof recentPhraseStats !== 'object') {
    recentPhraseStats = createEmptyRecentPhraseStats();
  }
  if (!Array.isArray(recentPhraseStats.entries)) {
    recentPhraseStats.entries = [];
  }
  const rawChars = Math.max(0, Math.floor(Number(chars) || 0));
  const rawDuration = Math.max(0, Math.floor(Number(duration) || 0));
  if (!rawChars && !rawDuration) {
    return;
  }
  const normalizedChars = rawChars;
  const normalizedDuration = Math.max(1, rawDuration);
  while (recentPhraseStats.entries.length >= RECENT_PHRASE_LIMIT) {
    const removed = recentPhraseStats.entries.shift();
    if (removed) {
      recentPhraseStats.totalChars = Math.max(0, (recentPhraseStats.totalChars || 0) - removed[0]);
      recentPhraseStats.totalTime = Math.max(0, (recentPhraseStats.totalTime || 0) - removed[1]);
    }
  }
  recentPhraseStats.entries.push([normalizedChars, normalizedDuration]);
  recentPhraseStats.totalChars = Math.max(0, (recentPhraseStats.totalChars || 0) + normalizedChars);
  recentPhraseStats.totalTime = Math.max(0, (recentPhraseStats.totalTime || 0) + normalizedDuration);
  localStorage.setItem('recentPhraseStats', JSON.stringify(recentPhraseStats));
}

function getMedalForAccuracy(accuracy) {
  const perc = Math.max(0, Math.min(100, accuracy));
  for (const medal of MEDAL_RULES) {
    if (perc >= medal.min && perc <= medal.max) {
      return medal;
    }
  }
  return MEDAL_RULES[0];
}

let userSettings = { ...SETTINGS_FALLBACK };

const phraseLibrary = {
  config: {},
  modes: {},
  maxLevels: {},
  loaded: false
};

function normalizePhraseLine(line) {
  if (typeof line !== 'string') {
    return ['', []];
  }
  const parts = line.split('#').map(part => part.trim());
  const pt = parts.shift() || '';
  const en = parts.filter(Boolean);
  return [pt, en];
}

function ensurePhraseTuple(entry) {
  if (typeof entry === 'string') {
    return normalizePhraseLine(entry);
  }
  if (!Array.isArray(entry)) {
    return ['', []];
  }
  const pt = typeof entry[0] === 'string' ? entry[0] : String(entry[0] ?? '');
  const enRaw = entry[1];
  let enList = [];
  if (Array.isArray(enRaw)) {
    enList = enRaw.map(value => String(value ?? '').trim()).filter(Boolean);
  } else if (typeof enRaw === 'string') {
    const trimmed = enRaw.trim();
    enList = trimmed ? [trimmed] : [];
  }
  return [pt, enList];
}

function getPtFromPhrase(entry) {
  return ensurePhraseTuple(entry)[0];
}

function getEnVariantsFromPhrase(entry) {
  return ensurePhraseTuple(entry)[1];
}

function getPrimaryEnFromPhrase(entry) {
  const variants = getEnVariantsFromPhrase(entry);
  return variants[0] || '';
}

let generalProgress = { level: 1, xp: 0 };
let modeProgress = {};

function refreshUserSettings() {
  if (typeof settingsAPI.loadSettings === 'function') {
    userSettings = settingsAPI.loadSettings();
  } else {
    userSettings = { ...SETTINGS_FALLBACK };
  }
}

refreshUserSettings();

function getNormalizedLevelValue(level) {
  if (!Number.isFinite(level)) {
    return 1;
  }
  return Math.min(MAX_LEVEL_CAP, Math.max(1, Math.floor(level)));
}

function getLevelScoreFactor(level) {
  const normalized = getNormalizedLevelValue(level);
  return (normalized - 1) * LEVEL_SCORE_INCREMENT;
}

function getModeScoreFactor(mode) {
  return MODE_SCORE_FACTORS[mode] ?? 0;
}

function getScoreMultiplierFor(mode) {
  const levelFactor = getLevelScoreFactor(generalProgress.level);
  const modeFactor = getModeScoreFactor(mode);
  return 1 + levelFactor + modeFactor;
}

function applyScoreMultiplier(baseValue, mode) {
  const numeric = Number(baseValue);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 0;
  }
  const multiplier = getScoreMultiplierFor(mode);
  return Math.max(0, Math.round(numeric * multiplier));
}

function hexToRgb(hex) {
  const int = parseInt(hex.slice(1), 16);
  return [int >> 16 & 255, int >> 8 & 255, int & 255];
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

function calcularCor(pontos) {
  const max = COLOR_STOPS[COLOR_STOPS.length - 1][0];
  const p = Math.max(0, Math.min(pontos, max));
  for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
    const [p1, c1] = COLOR_STOPS[i];
    const [p2, c2] = COLOR_STOPS[i + 1];
    if (p >= p1 && p <= p2) {
      const ratio = (p - p1) / (p2 - p1);
      const [r1, g1, b1] = hexToRgb(c1);
      const [r2, g2, b2] = hexToRgb(c2);
      const r = Math.round(r1 + ratio * (r2 - r1));
      const g = Math.round(g1 + ratio * (g2 - g1));
      const b = Math.round(b1 + ratio * (b2 - b1));
      return rgbToHex(r, g, b);
    }
  }
  return COLOR_STOPS[COLOR_STOPS.length - 1][1];
}

function colorFromPercent(perc) {
  const max = COLOR_STOPS[COLOR_STOPS.length - 1][0];
  return calcularCor((perc / 100) * max);
}

function sanitizePhraseForBalance(text) {
  if (typeof text !== 'string') {
    return '';
  }
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/gi, '');
}

function calculateBalanceReward(text) {
  const cleaned = sanitizePhraseForBalance(text);
  return cleaned.length > 0 ? cleaned.length : 0;
}

function normalizeForCharTiming(text) {
  if (typeof text !== 'string') {
    return '';
  }
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function countCorrectCharacters(expected, answer) {
  const normalizedExpected = normalizeForCharTiming(expected);
  const normalizedAnswer = normalizeForCharTiming(answer);
  const limit = Math.min(normalizedExpected.length, normalizedAnswer.length);
  let correct = 0;
  for (let i = 0; i < limit; i += 1) {
    if (normalizedExpected[i] === normalizedAnswer[i]) {
      correct += 1;
    }
  }
  return correct;
}

function updateGameBalanceDisplay(balanceValue) {
  const scoreEl = document.getElementById('score');
  if (!scoreEl) {
    return;
  }
  let value = balanceValue;
  if (!Number.isFinite(value) && window.playtalkBalance && typeof window.playtalkBalance.getBalance === 'function') {
    value = window.playtalkBalance.getBalance();
  }
  if (!Number.isFinite(value)) {
    value = 0;
  }
  scoreEl.textContent = `Saldo: ${Math.max(0, Math.floor(value)).toLocaleString('pt-BR')}`;
}

function rewardBalanceForPhrase(phrase, mode) {
  const reward = calculateBalanceReward(phrase);
  if (!phrase || reward <= 0) {
    updateGameBalanceDisplay();
    return 0;
  }
  const targetMode = Number.isFinite(mode) ? mode : 1;
  const finalReward = applyScoreMultiplier(reward, targetMode);
  if (window.playtalkBalance && typeof window.playtalkBalance.add === 'function') {
    const total = window.playtalkBalance.add(finalReward);
    updateGameBalanceDisplay(total);
  } else {
    updateGameBalanceDisplay();
  }
  return finalReward;
}

document.addEventListener('playtalk:balance-change', (event) => {
  const balance = event && event.detail ? event.detail.balance : undefined;
  if (Number.isFinite(balance)) {
    updateGameBalanceDisplay(balance);
  } else {
    updateGameBalanceDisplay();
  }
});

async function carregarPastas() {
  if (phraseLibrary.loaded) {
    return phraseLibrary;
  }

  try {
    const response = await fetch(PHRASE_CONFIG_PATH);
    if (!response.ok) {
      throw new Error(`Configuração de frases não encontrada (${response.status})`);
    }
    const config = await response.json();
    const modesConfig = config && config.modes ? config.modes : {};
    const modeEntries = Object.entries(modesConfig);
    phraseLibrary.config = modesConfig;
    phraseLibrary.modes = {};
    phraseLibrary.maxLevels = {};

    const fetches = [];
    modeEntries.forEach(([modeKey, modeConfig]) => {
      const filePath = modeConfig && typeof modeConfig.file === 'string' ? modeConfig.file : '';
      phraseLibrary.modes[modeKey] = {};
      phraseLibrary.maxLevels[modeKey] = 0;

      if (!filePath) {
        return;
      }

      fetches.push(
        fetch(filePath)
          .then(levelResponse => {
            if (!levelResponse.ok) {
              throw new Error(`Falha ao carregar ${filePath}`);
            }
            return levelResponse.json();
          })
          .then(modeData => {
            const rawLevels = modeData && modeData.levels ? modeData.levels : {};
            const normalizedLevels = [];
            Object.entries(rawLevels).forEach(([levelKey, entries]) => {
              const parsedLevel = parseInt(levelKey, 10);
              const levelNumber = Number.isFinite(parsedLevel)
                ? Math.max(1, Math.floor(parsedLevel))
                : normalizedLevels.length + 1;
              const normalizedEntries = Array.isArray(entries)
                ? entries.map(normalizePhraseLine)
                : [];
              normalizedLevels.push([levelNumber, normalizedEntries]);
            });
            normalizedLevels.sort((a, b) => a[0] - b[0]);
            normalizedLevels.forEach(([levelNumber, entries]) => {
              phraseLibrary.modes[modeKey][levelNumber] = entries.map(ensurePhraseTuple);
            });
            const levelNumbers = normalizedLevels.map(([levelNumber]) => levelNumber);
            const maxLevel = levelNumbers.length ? Math.max(...levelNumbers) : normalizedLevels.length;
            phraseLibrary.maxLevels[modeKey] = Math.max(phraseLibrary.maxLevels[modeKey] || 0, maxLevel);
          })
          .catch(err => {
            console.error('Erro ao carregar nível de frases:', err);
          })
      );
    });

    await Promise.all(fetches);
    phraseLibrary.loaded = true;
  } catch (error) {
    console.error('Erro ao carregar frases do jogo:', error);
    phraseLibrary.loaded = false;
    phraseLibrary.modes = {};
    phraseLibrary.maxLevels = {};
    throw error;
  }

  return phraseLibrary;
}

function ehQuaseCorreto(res, esp) {
  let i = 0, j = 0, dif = 0;
  while (i < res.length && j < esp.length) {
    if (res[i] === esp[j]) {
      i++; j++; continue;
    }
    if (i + 1 < res.length && res[i+1] === esp[j] && j + 1 < esp.length && res[i] === esp[j+1]) {
      return false; // ordem incorreta
    }
    if (i + 1 < res.length && res[i+1] === esp[j]) {
      i++; dif++; // letra extra
    } else if (j + 1 < esp.length && res[i] === esp[j+1]) {
      j++; dif++; // letra faltando
    } else {
      return false;
    }
    if (dif > 2) return false;
  }
  dif += (res.length - i) + (esp.length - j);
  return dif <= 2;
}

function ehQuaseCorretoPalavras(resp, esp) {
  const normWord = w => w.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/gi, '').toLowerCase();
  const rWords = resp.split(/\s+/).map(normWord).filter(Boolean);
  const eWords = esp.split(/\s+/).map(normWord).filter(Boolean);
  if (rWords.length < eWords.length || rWords.length - eWords.length > 3) return false;
  const rCounts = {};
  rWords.forEach(w => { rCounts[w] = (rCounts[w] || 0) + 1; });
  for (const w of eWords) {
    if (!rCounts[w]) return false;
    rCounts[w]--;
  }
  return true;
}


let reconhecimento;
let reconhecimentoAtivo = false;
let reconhecimentoRodando = false;
let listeningForCommand = false;
let microphonePaused = false;
let speechPauseToken = 0;

const SpeechRecognizerClass = window.KitSpeechRecognizer || window.OpenAISpeechRecognizer;
if (SpeechRecognizerClass) {
  reconhecimento = new SpeechRecognizerClass({
    segmentMs: 2400,
    minBytes: 2048,
    volumeThresholdDb: 46,
    silenceCutoffMs: 800
  });
  reconhecimento.lang = 'en-US';

  reconhecimento.onstart = () => {
    reconhecimentoRodando = true;
  };

  reconhecimento.onresult = (event) => {
    if (microphonePaused) {
      return;
    }
    const transcript = event.results[event.results.length - 1][0].transcript.trim();
    const normCmd = transcript.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (awaitingRetry && (normCmd.includes('try again') || normCmd.includes('tentar de novo'))) {
      awaitingRetry = false;
      if (retryCallback) {
        const cb = retryCallback;
        retryCallback = null;
        cb();
      }
    } else if (listeningForCommand) {
      if (normCmd.includes('play')) {
        listeningForCommand = false;
        startGame(getHighestUnlockedMode());
      }
    } else {
      if (
        normCmd.includes('reportar') ||
        normCmd.includes('report') ||
        normCmd.includes('my star') ||
        normCmd.includes('mystar') ||
        normCmd.includes('estrela')
      ) {
        reportLastError();
      } else {
        document.getElementById("pt").value = transcript;
        verificarResposta();
      }
    }
  };

  reconhecimento.onerror = (event) => {
    console.error('Erro no reconhecimento de voz:', event.error, event.details || '');
    if (event.error === 'not-allowed') alert('Permissão do microfone negada.');
  };

  reconhecimento.onend = () => {
    reconhecimentoRodando = false;
  };
} else {
  alert('Reconhecimento de voz não é suportado neste navegador. Use o Chrome.');
}


setInterval(() => {
  if (reconhecimento && reconhecimentoAtivo && !reconhecimentoRodando && !microphonePaused) {
    try { reconhecimento.start(); } catch (e) {}
  }
}, 4000);

let frasesArr = [], fraseIndex = 0;
let acertosTotais = 0;
let errosTotais = 0;
let tentativasTotais = 0;
let pastaAtual = 1;
let bloqueado = false;
let mostrarTexto = 'pt';
let voz = 'en';
let esperadoLang = 'pt';
let timerInterval = null;
let inputTimeout = null;
let lastExpected = '', lastInput = '', lastFolder = 1;
let selectedMode = 1;
let roundTarget = DEFAULT_ROUND_SIZE;
let roundAttempts = 0;
let roundWrongCount = 0;
let roundCorrectChars = 0;
let roundStartTime = 0;
let phraseStartTime = 0;
let roundActive = false;
let roundAdjustedTimeMs = 0;
let pendingModeStart = null;
const roundSelections = {};
const preGameLevelSelection = {};
const timeGoals = {1:1.8, 2:2.2, 3:2.2, 4:3.0, 5:3.5, 6:2.0};
const MAX_TIME = 6.0;
const ALL_MODES = [1, 2, 3, 4, 5, 6];
const DURATION_ANCHORS = [
  { length: 5, offset: -2200 },
  { length: 18, offset: 0 },
  { length: 24, offset: 500 },
  { length: 30, offset: 1000 }
];

function setMicrophoneSpeechState(active, token = null) {
  if (active) {
    speechPauseToken = token || Date.now();
  } else if (token !== null && token !== speechPauseToken) {
    return;
  }
  microphonePaused = false;
  if (reconhecimento && reconhecimentoAtivo && !reconhecimentoRodando) {
    try { reconhecimento.start(); } catch (e) {}
  }
}

function getCurrentThreshold() {
  return roundTarget;
}

function getRoundSelection(mode) {
  const key = String(mode);
  if (!roundSelections[key]) {
    roundSelections[key] = DEFAULT_ROUND_SIZE;
  }
  return roundSelections[key];
}

function setRoundSelection(mode, size) {
  if (!ROUND_OPTIONS.includes(size)) {
    return;
  }
  roundSelections[String(mode)] = size;
}

function interpolateDurationOffset(chars) {
  const count = Math.max(0, Math.floor(Number(chars) || 0));
  if (!DURATION_ANCHORS.length) {
    return 0;
  }
  if (count <= DURATION_ANCHORS[0].length) {
    return DURATION_ANCHORS[0].offset;
  }
  for (let i = 1; i < DURATION_ANCHORS.length; i++) {
    const prev = DURATION_ANCHORS[i - 1];
    const current = DURATION_ANCHORS[i];
    if (count <= current.length) {
      const span = Math.max(1, current.length - prev.length);
      const ratio = (count - prev.length) / span;
      return prev.offset + ratio * (current.offset - prev.offset);
    }
  }
  return DURATION_ANCHORS[DURATION_ANCHORS.length - 1].offset;
}

function getAdjustedDurationMs(chars, durationMs) {
  const rawDuration = Math.max(0, Math.floor(Number(durationMs) || 0));
  const offsetMs = Math.round(interpolateDurationOffset(chars));
  const adjusted = rawDuration + offsetMs;
  return Math.max(1, adjusted);
}

function persistRoundStateCache() {
  localStorage.setItem(ROUND_STATE_KEY, JSON.stringify(roundStateCache));
}

function sanitizeStoredPhrases(list) {
  if (!Array.isArray(list)) {
    return [];
  }
  return list
    .map(entry => ensurePhraseTuple(entry))
    .filter(entry => Array.isArray(entry) && entry.length === 2);
}

function getStoredRoundState(mode, expectedLevel) {
  const key = String(mode);
  const entry = roundStateCache && typeof roundStateCache === 'object' ? roundStateCache[key] : null;
  if (!entry || typeof entry !== 'object') {
    return null;
  }
  const storedLevel = Number.isFinite(entry.level) && entry.level > 0 ? Math.floor(entry.level) : null;
  if (Number.isFinite(expectedLevel) && expectedLevel > 0 && storedLevel !== Math.floor(expectedLevel)) {
    return null;
  }
  const frases = sanitizeStoredPhrases(entry.frases);
  if (!frases.length) {
    return null;
  }
  return {
    points: Number.isFinite(entry.points) ? entry.points : 0,
    roundTarget: Number.isFinite(entry.roundTarget) ? entry.roundTarget : DEFAULT_ROUND_SIZE,
    roundAttempts: Number.isFinite(entry.roundAttempts) ? entry.roundAttempts : 0,
    roundWrongCount: Number.isFinite(entry.roundWrongCount) ? entry.roundWrongCount : 0,
    roundCorrectChars: Number.isFinite(entry.roundCorrectChars) ? entry.roundCorrectChars : 0,
    fraseIndex: Number.isFinite(entry.fraseIndex) ? entry.fraseIndex : 0,
    frases,
    roundActive: Boolean(entry.roundActive),
    level: storedLevel,
    elapsedMs: Number.isFinite(entry.elapsedMs) ? entry.elapsedMs : 0,
    adjustedMs: Number.isFinite(entry.adjustedMs) ? entry.adjustedMs : null
  };
}

function saveRoundStateForMode(mode, state) {
  const key = String(mode);
  if (!state) {
    if (roundStateCache && typeof roundStateCache === 'object' && key in roundStateCache) {
      delete roundStateCache[key];
      persistRoundStateCache();
    }
    return;
  }
  if (!roundStateCache || typeof roundStateCache !== 'object') {
    roundStateCache = {};
  }
  roundStateCache[key] = { ...state, frases: sanitizeStoredPhrases(state.frases) };
  persistRoundStateCache();
}

function clearRoundState(mode) {
  saveRoundStateForMode(mode, null);
}

function persistCurrentRoundState() {
  if (!Array.isArray(frasesArr) || !frasesArr.length) {
    clearRoundState(selectedMode);
    return;
  }
  if (roundAttempts >= roundTarget) {
    clearRoundState(selectedMode);
    return;
  }
  const sanitizedPhrases = sanitizeStoredPhrases(frasesArr);
  if (!sanitizedPhrases.length) {
    clearRoundState(selectedMode);
    return;
  }
  const clampedTarget = Math.max(1, Math.floor(roundTarget));
  const clampedIndex = Math.max(0, Math.min(Math.floor(fraseIndex), sanitizedPhrases.length - 1));
  const snapshot = {
    points: Math.max(0, Math.min(clampedTarget, Math.floor(points))),
    roundTarget: clampedTarget,
    roundAttempts: Math.max(0, Math.floor(roundAttempts)),
    roundWrongCount: Math.max(0, Math.floor(roundWrongCount)),
    roundCorrectChars: Math.max(0, Math.floor(roundCorrectChars)),
    fraseIndex: clampedIndex,
    frases: sanitizedPhrases,
    roundActive: Boolean(roundActive),
    level: Math.max(1, Math.floor(pastaAtual || getSelectedPreGameLevel(selectedMode) || 1)),
    elapsedMs: roundStartTime ? Math.max(0, Date.now() - roundStartTime) : 0,
    adjustedMs: Math.max(0, Math.floor(roundAdjustedTimeMs))
  };
  saveRoundStateForMode(selectedMode, snapshot);
}

function restoreRoundState(saved, expectedLevel) {
  if (!saved) {
    return false;
  }
  const storedLevel = Number.isFinite(saved.level) && saved.level > 0 ? Math.floor(saved.level) : null;
  if (Number.isFinite(expectedLevel) && expectedLevel > 0 && storedLevel !== Math.floor(expectedLevel)) {
    return false;
  }
  const sanitizedPhrases = sanitizeStoredPhrases(saved.frases);
  if (!sanitizedPhrases.length) {
    return false;
  }
  const storedTarget = Number.isFinite(saved.roundTarget)
    ? Math.max(1, Math.floor(saved.roundTarget))
    : DEFAULT_ROUND_SIZE;
  roundTarget = storedTarget;
  setRoundSelection(selectedMode, storedTarget);
  frasesArr = sanitizedPhrases;
  roundAttempts = Math.max(0, Math.floor(saved.roundAttempts || 0));
  points = Math.max(0, Math.min(Math.floor(saved.points || 0), roundTarget));
  roundWrongCount = Math.max(0, Math.floor(saved.roundWrongCount || 0));
  roundCorrectChars = Math.max(0, Math.floor(saved.roundCorrectChars || 0));
  const nextIndex = Math.max(0, Math.min(roundAttempts, frasesArr.length - 1));
  fraseIndex = nextIndex;
  const elapsedMs = Number.isFinite(saved.elapsedMs) ? Math.max(0, Math.floor(saved.elapsedMs)) : 0;
  roundStartTime = Date.now() - elapsedMs;
  if (!Number.isFinite(roundStartTime) || roundStartTime <= 0) {
    roundStartTime = Date.now();
  }
  const savedAdjusted = Number.isFinite(saved.adjustedMs) ? Math.max(0, Math.floor(saved.adjustedMs)) : null;
  roundAdjustedTimeMs = savedAdjusted !== null ? savedAdjusted : elapsedMs;
  roundActive = true;
  pastaAtual = storedLevel || expectedLevel || pastaAtual;
  if (pastaAtual) {
    setSelectedPreGameLevel(selectedMode, pastaAtual);
  }
  if (roundAttempts >= roundTarget) {
    clearRoundState(selectedMode);
    return false;
  }
  atualizarBarraProgresso();
  dispatchModeProgressUpdate(selectedMode);
  setTimeout(() => mostrarFrase(), 100);
  return true;
}

function resetRoundState() {
  points = 0;
  roundAttempts = 0;
  roundWrongCount = 0;
  roundCorrectChars = 0;
  roundStartTime = 0;
  phraseStartTime = 0;
  roundActive = false;
  roundAdjustedTimeMs = 0;
}

function getXPRequirement(level) {
  const normalized = getNormalizedLevelValue(level);
  return Math.round(XP_BASE_VALUE * Math.pow(normalized, 1.5));
}

function ensureModeProgressStructure(mode) {
  const key = String(mode);
  if (!modeProgress[key] || typeof modeProgress[key] !== 'object') {
    modeProgress[key] = { level: 1, xp: 0 };
  }
  const entry = modeProgress[key];
  entry.level = Number.isFinite(entry.level) && entry.level > 0
    ? Math.min(MAX_LEVEL_CAP, Math.floor(entry.level))
    : 1;
  entry.xp = 0;
  return entry;
}

function getModeProgress(mode) {
  return ensureModeProgressStructure(mode);
}

function getModeLevel(mode) {
  return getModeProgress(mode).level;
}

function getMaxLevelForMode(mode) {
  const key = String(mode);
  const stored = phraseLibrary.maxLevels[key];
  return Number.isFinite(stored) && stored > 0 ? stored : 1;
}

function getLibraryLevelForMode(mode) {
  const progressLevel = getModeLevel(mode);
  const maxLevel = getMaxLevelForMode(mode);
  return Math.min(progressLevel, maxLevel);
}

function dispatchGeneralProgressUpdate() {
  const required = getXPRequirement(generalProgress.level);
  const ratio = required > 0 ? Math.max(0, Math.min(1, generalProgress.xp / required)) : 0;
  const detail = {
    level: generalProgress.level,
    xp: generalProgress.xp,
    required,
    ratio
  };
  document.dispatchEvent(new CustomEvent('playtalk:level-progress', { detail }));
  document.dispatchEvent(new CustomEvent('playtalk:general-progress', { detail }));
}

function dispatchModeProgressUpdate(mode) {
  const entry = getModeProgress(mode);
  const required = getXPRequirement(entry.level);
  const ratio = required > 0 ? Math.max(0, Math.min(1, entry.xp / required)) : 0;
  const detail = {
    mode,
    level: entry.level,
    xp: entry.xp,
    required,
    ratio
  };
  document.dispatchEvent(new CustomEvent('playtalk:mode-progress', { detail }));
}

function saveGeneralProgress(options = {}) {
  generalProgress.level = getNormalizedLevelValue(generalProgress.level);
  const normalizedXp = Math.max(0, Math.floor(generalProgress.xp));
  if (generalProgress.level >= MAX_LEVEL_CAP) {
    generalProgress.xp = Math.min(normalizedXp, getXPRequirement(MAX_LEVEL_CAP));
  } else {
    generalProgress.xp = normalizedXp;
  }
  localStorage.setItem(GENERAL_PROGRESS_KEY, JSON.stringify(generalProgress));
  if (!options || options.emit !== false) {
    dispatchGeneralProgressUpdate();
  }
}

function saveModeProgress(options = {}) {
  const normalized = {};
  Object.keys(modeProgress).forEach(key => {
    const entry = ensureModeProgressStructure(key);
    const cappedLevel = entry.level;
    const cappedXp = entry.level >= MAX_LEVEL_CAP
      ? Math.min(entry.xp, getXPRequirement(MAX_LEVEL_CAP))
      : Math.max(0, Math.floor(entry.xp));
    normalized[key] = { level: cappedLevel, xp: cappedXp };
  });
  localStorage.setItem(MODE_PROGRESS_KEY, JSON.stringify(normalized));
  if (!options || options.emit !== false) {
    Object.keys(normalized).forEach(modeKey => dispatchModeProgressUpdate(Number(modeKey)));
  }
}

function addGeneralExperience(amount) {
  const xp = Math.max(0, Math.floor(amount));
  if (xp <= 0) {
    return false;
  }
  generalProgress.xp += xp;
  let leveledUp = false;
  while (generalProgress.level < MAX_LEVEL_CAP && generalProgress.xp >= getXPRequirement(generalProgress.level)) {
    generalProgress.xp -= getXPRequirement(generalProgress.level);
    generalProgress.level += 1;
    leveledUp = true;
  }
  if (generalProgress.level >= MAX_LEVEL_CAP) {
    generalProgress.level = MAX_LEVEL_CAP;
    generalProgress.xp = Math.min(generalProgress.xp, getXPRequirement(MAX_LEVEL_CAP));
  }
  saveGeneralProgress({ emit: true });
  return leveledUp;
}

function grantExperience(amount, mode) {
  const leveledGeneral = addGeneralExperience(amount);
  if (leveledGeneral) {
    updateLevelIcon({ scope: 'general' });
  }
}

function loadProgressFromStorage() {
  const storedGeneral = parseJSONStorage(GENERAL_PROGRESS_KEY, null);
  if (storedGeneral && Number.isFinite(storedGeneral.level)) {
    generalProgress.level = getNormalizedLevelValue(storedGeneral.level);
    const normalizedXp = Math.max(0, Math.floor(storedGeneral.xp || 0));
    if (generalProgress.level >= MAX_LEVEL_CAP) {
      generalProgress.xp = Math.min(normalizedXp, getXPRequirement(MAX_LEVEL_CAP));
    } else {
      generalProgress.xp = normalizedXp;
    }
  } else {
    const legacyLevel = parseInt(localStorage.getItem('pastaAtual'), 10);
    const fallbackLevel = Number.isFinite(legacyLevel) && legacyLevel > 0 ? legacyLevel : 1;
    const legacyProgress = parseJSONStorage('levelProgress', null);
    if (legacyProgress && Number.isFinite(legacyProgress.level)) {
      generalProgress.level = getNormalizedLevelValue(legacyProgress.level);
    } else {
      generalProgress.level = getNormalizedLevelValue(fallbackLevel);
    }
    generalProgress.xp = 0;
  }

  const storedModes = parseJSONStorage(MODE_PROGRESS_KEY, null);
  modeProgress = {};
  if (storedModes && typeof storedModes === 'object') {
    Object.entries(storedModes).forEach(([modeKey, entry]) => {
      const level = entry && Number.isFinite(entry.level) && entry.level > 0
        ? Math.min(MAX_LEVEL_CAP, Math.floor(entry.level))
        : 1;
      let xp = entry && Number.isFinite(entry.xp) && entry.xp >= 0 ? Math.floor(entry.xp) : 0;
      if (level >= MAX_LEVEL_CAP) {
        xp = Math.min(xp, getXPRequirement(MAX_LEVEL_CAP));
      }
      modeProgress[String(modeKey)] = { level, xp };
    });
  }

  ALL_MODES.forEach(mode => ensureModeProgressStructure(mode));
  pastaAtual = getLibraryLevelForMode(selectedMode);

  saveGeneralProgress({ emit: false });
  saveModeProgress({ emit: false });
  dispatchGeneralProgressUpdate();
  ALL_MODES.forEach(mode => dispatchModeProgressUpdate(mode));
}

function getModeLibrary(mode) {
  const key = String(mode);
  return phraseLibrary.modes[key] || {};
}

function getModeLevels(mode) {
  return Object.keys(getModeLibrary(mode))
    .map(Number)
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
}

function resolveModeLevel(mode) {
  const levels = getModeLevels(mode);
  if (!levels.length) {
    return 1;
  }
  const target = getModeLevel(mode);
  const maxAvailable = levels[levels.length - 1];
  if (target <= levels[0]) {
    return levels[0];
  }
  if (target >= maxAvailable) {
    return maxAvailable;
  }
  if (levels.includes(target)) {
    return target;
  }
  for (let i = levels.length - 1; i >= 0; i--) {
    if (levels[i] <= target) {
      return levels[i];
    }
  }
  return levels[0];
}

function getAvailableLevelBounds(mode) {
  const levels = getModeLevels(mode);
  if (!levels.length) {
    return { min: 1, max: 1 };
  }
  return { min: levels[0], max: levels[levels.length - 1] };
}

function getSelectedPreGameLevel(mode) {
  const key = String(mode);
  if (!Number.isFinite(preGameLevelSelection[key])) {
    preGameLevelSelection[key] = resolveModeLevel(mode);
  }
  return preGameLevelSelection[key];
}

function setSelectedPreGameLevel(mode, level) {
  const { min, max } = getAvailableLevelBounds(mode);
  const normalized = Math.max(min, Math.min(max, Math.floor(level) || min));
  preGameLevelSelection[String(mode)] = normalized;
  return normalized;
}

function stepSelectedPreGameLevel(mode, delta) {
  const current = getSelectedPreGameLevel(mode);
  return setSelectedPreGameLevel(mode, current + delta);
}

let unlockedModes = {};
let points = 0;
let prizeStart = 0;
let prizeTimer = null;
let awaitingRetry = false;
let retryCallback = null;
let tryAgainColorInterval = null;
let sessionStart = null;
let modeStats = {};
let modeStartTimes = {};
let roundStateCache = {};
let currentStreak = 0;
let bestStreak = 0;
let monthlyStats = null;
let recentPhraseStats = createEmptyRecentPhraseStats();

function normalizePositiveInteger(value, fallback = 0) {
  if (!Number.isFinite(value)) {
    return Math.max(0, Math.floor(fallback));
  }
  return Math.max(0, Math.floor(value));
}

function saveStreakState({ emitEvent = true } = {}) {
  localStorage.setItem('currentStreak', String(currentStreak));
  localStorage.setItem('bestStreak', String(bestStreak));
  if (emitEvent) {
    document.dispatchEvent(new CustomEvent('playtalk:streak-change', {
      detail: { current: currentStreak, best: bestStreak }
    }));
  }
}

function loadStreakState() {
  currentStreak = normalizePositiveInteger(parseInt(localStorage.getItem('currentStreak') || '0', 10));
  const storedBest = normalizePositiveInteger(parseInt(localStorage.getItem('bestStreak') || '0', 10));
  bestStreak = Math.max(currentStreak, storedBest);
  saveStreakState({ emitEvent: false });
}

function handleCorrectStreak() {
  currentStreak += 1;
  if (currentStreak > bestStreak) {
    bestStreak = currentStreak;
  }
  saveStreakState();
}

function handleWrongStreak() {
  if (currentStreak === 0) {
    return;
  }
  currentStreak = 0;
  saveStreakState();
}

function getCurrentMonthKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function loadMonthlyStatsFromStorage() {
  const stored = parseJSONStorage('monthlyStats', null);
  const currentKey = getCurrentMonthKey();
  const stats = {
    month: currentKey,
    totalAttempts: 0,
    eligibleAttempts: 0,
    correctAttempts: 0
  };
  if (stored && typeof stored === 'object') {
    stats.month = typeof stored.month === 'string' ? stored.month : currentKey;
    stats.totalAttempts = normalizePositiveInteger(stored.totalAttempts);
    stats.eligibleAttempts = normalizePositiveInteger(stored.eligibleAttempts);
    stats.correctAttempts = normalizePositiveInteger(stored.correctAttempts);
  }
  if (stats.month !== currentKey) {
    stats.month = currentKey;
    stats.totalAttempts = 0;
    stats.eligibleAttempts = 0;
    stats.correctAttempts = 0;
  }
  return stats;
}

function persistMonthlyStats(stats, { emitEvent = true } = {}) {
  monthlyStats = stats;
  localStorage.setItem('monthlyStats', JSON.stringify(stats));
  if (emitEvent) {
    document.dispatchEvent(new CustomEvent('playtalk:monthly-stats-change', {
      detail: { ...stats }
    }));
  }
}

function updateMonthlyStatsProgress({ totalAttempts = 0, eligibleAttempts = 0, correctAttempts = 0 } = {}) {
  if (!monthlyStats) {
    monthlyStats = loadMonthlyStatsFromStorage();
  }
  const currentKey = getCurrentMonthKey();
  if (monthlyStats.month !== currentKey) {
    monthlyStats = {
      month: currentKey,
      totalAttempts: 0,
      eligibleAttempts: 0,
      correctAttempts: 0
    };
  }
  monthlyStats.totalAttempts += normalizePositiveInteger(totalAttempts);
  monthlyStats.eligibleAttempts += normalizePositiveInteger(eligibleAttempts);
  monthlyStats.correctAttempts += normalizePositiveInteger(correctAttempts);
  persistMonthlyStats(monthlyStats);
}

function cloneFallback(value) {
  if (Array.isArray(value)) {
    return [...value];
  }
  if (value && typeof value === 'object') {
    return { ...value };
  }
  return value;
}

function parseJSONStorage(key, fallback) {
  const raw = localStorage.getItem(key);
  if (!raw) {
    return cloneFallback(fallback);
  }
  try {
    const parsed = JSON.parse(raw);
    return parsed === null ? cloneFallback(fallback) : parsed;
  } catch (err) {
    console.warn(`Não foi possível analisar o conteúdo de ${key}:`, err);
    return cloneFallback(fallback);
  }
}

function getAllModesUnlockedState() {
  return ALL_MODES.reduce((acc, mode) => {
    acc[String(mode)] = true;
    return acc;
  }, {});
}

function ensureUnlockedModesStructure(raw) {
  const normalized = getAllModesUnlockedState();
  if (raw && typeof raw === 'object') {
    if (Array.isArray(raw)) {
      raw.forEach((value, index) => {
        const key = String(index);
        if (!normalized.hasOwnProperty(key)) {
          normalized[key] = Boolean(value);
        }
      });
    } else {
      Object.keys(raw).forEach(key => {
        if (!normalized.hasOwnProperty(key)) {
          normalized[key] = Boolean(raw[key]);
        }
      });
    }
  }
  localStorage.setItem('unlockedModes', JSON.stringify(normalized));
  return normalized;
}

function loadModeStatsFromStorage() {
  const stats = parseJSONStorage('modeStats', {});
  const legacy = parseJSONStorage('mode1Stats', null);
  if (legacy && !stats[1]) {
    stats[1] = legacy;
    localStorage.removeItem('mode1Stats');
    localStorage.setItem('modeStats', JSON.stringify(stats));
  }
  return stats;
}

function reloadPersistentProgress(initialLoad = false) {
  refreshUserSettings();
  acertosTotais = parseInt(localStorage.getItem('acertosTotais') || '0', 10);
  errosTotais = parseInt(localStorage.getItem('errosTotais') || '0', 10);
  tentativasTotais = parseInt(localStorage.getItem('tentativasTotais') || '0', 10);
  loadProgressFromStorage();
  roundStateCache = parseJSONStorage(ROUND_STATE_KEY, {});
  unlockedModes = ensureUnlockedModesStructure(parseJSONStorage('unlockedModes', {}));
  points = 0;
  modeStats = loadModeStatsFromStorage();
  Object.keys(modeStats).forEach(key => ensureModeStats(Number(key)));
  recentPhraseStats = loadRecentPhraseStatsFromStorage();
  loadStreakState();
  monthlyStats = loadMonthlyStatsFromStorage();
  if (initialLoad) {
    updateLevelIcon({ scope: 'general' });
  } else {
    updateLevelIcon({ scope: 'general' });
  }
  if (!initialLoad) {
    updateModeIcons();
    atualizarBarraProgresso();
    updateGeneralCircles();
  }
}

reloadPersistentProgress(true);

let lastWasError = false;
let paused = false;
let consecutiveErrors = 0;
let pauseInterval = null;
let downPlaying = false;
let downTimeout = null;

const levelStar = document.getElementById('nivel-indicador');
if (levelStar) {
  levelStar.addEventListener('click', () => {
    reportLastError();
  });
}

const MEDAL_DOUBLE_TAP_DELAY = 320;
let lastMedalTapTime = 0;

const modeImages = {
  1: 'selos%20modos%20de%20jogo/modo1.png',
  2: 'selos%20modos%20de%20jogo/modo2.png',
  3: 'selos%20modos%20de%20jogo/modo3.png',
  4: 'selos%20modos%20de%20jogo/modo4.png',
  5: 'selos%20modos%20de%20jogo/modo5.png',
  6: 'selos%20modos%20de%20jogo/modo6.png'
};

function getModeDetail(mode) {
  return MODE_DETAILS[mode] || {
    title: `Modo ${mode}`,
    description: 'Prepare-se para a rodada.',
    logo: modeImages[mode] || modeImages[1]
  };
}

function updatePreGameScreen(mode) {
  const overlay = document.getElementById('pre-game-screen');
  if (!overlay) {
    return;
  }
  const detail = getModeDetail(mode);
  const titleEl = document.getElementById('pre-game-title');
  const descEl = document.getElementById('pre-game-description');
  const logoEl = document.getElementById('pre-game-logo');
  const levelEl = document.getElementById('pre-game-level');
  if (titleEl) titleEl.textContent = detail.title;
  if (descEl) descEl.textContent = detail.description;
  if (logoEl) {
    logoEl.src = detail.logo;
    logoEl.alt = `Logo do ${detail.title}`;
  }
  const savedRound = getStoredRoundState(mode, getSelectedPreGameLevel(mode)) || getStoredRoundState(mode);
  if (savedRound && Number.isFinite(savedRound.level)) {
    setSelectedPreGameLevel(mode, savedRound.level);
  }
  if (savedRound && Number.isFinite(savedRound.roundTarget)) {
    setRoundSelection(mode, Math.max(1, Math.floor(savedRound.roundTarget)));
  }
  if (levelEl) {
    const level = setSelectedPreGameLevel(mode, getSelectedPreGameLevel(mode));
    levelEl.textContent = `Pasta ${level}`;
  }
  const targetLevel = getSelectedPreGameLevel(mode);
  const hasResume = Boolean(
    savedRound &&
    Number.isFinite(savedRound.roundTarget) &&
    Number.isFinite(savedRound.roundAttempts) &&
    savedRound.roundAttempts < savedRound.roundTarget &&
    (!Number.isFinite(targetLevel) || savedRound.level === targetLevel)
  );
  const bounds = getAvailableLevelBounds(mode);
  overlay.querySelectorAll('.pre-game-level__control').forEach(control => {
    const dir = control.dataset.direction === 'up' ? 1 : -1;
    const target = getSelectedPreGameLevel(mode) + dir;
    const clamped = Math.max(bounds.min, Math.min(bounds.max, target));
    control.disabled = hasResume || clamped === getSelectedPreGameLevel(mode);
  });
  const startBtn = document.getElementById('pre-game-start');
  if (startBtn) {
    startBtn.textContent = hasResume ? 'Continuar' : 'Jogar';
    startBtn.classList.toggle('game-overlay__primary--continue', hasResume);
    startBtn.setAttribute('data-resume', hasResume ? 'true' : 'false');
  }
  overlay.dataset.mode = String(mode);
}

function openPreGameScreen(mode) {
  const overlay = document.getElementById('pre-game-screen');
  if (!overlay) {
    beginGame();
    return;
  }
  pendingModeStart = mode;
  roundTarget = getRoundSelection(mode);
  updatePreGameScreen(mode);
  overlay.classList.remove('hidden');
  overlay.setAttribute('aria-hidden', 'false');
}

function closePreGameScreen() {
  const overlay = document.getElementById('pre-game-screen');
  if (!overlay) {
    return;
  }
  overlay.classList.add('hidden');
  overlay.setAttribute('aria-hidden', 'true');
  overlay.removeAttribute('data-mode');
}

function openPostGameScreen(summary) {
  const overlay = document.getElementById('post-game-screen');
  if (!overlay) {
    return;
  }
  const medalEl = document.getElementById('post-game-medal');
  const statusEl = document.getElementById('post-game-level-status');
  const correctEl = document.getElementById('post-game-correct');
  const wrongEl = document.getElementById('post-game-wrong');
  const accuracyEl = document.getElementById('post-game-accuracy');
  const cpmEl = document.getElementById('post-game-cpm');
  if (medalEl) {
    medalEl.src = summary.medal.image;
    medalEl.alt = summary.medal.label;
  }
  if (statusEl) {
    let levelNote = '';
    if (Number.isFinite(summary.newLevel)) {
      const previous = Number.isFinite(summary.previousLevel) ? summary.previousLevel : summary.newLevel;
      if (summary.newLevel !== previous) {
        levelNote = ` Você foi da pasta ${previous} para a pasta ${summary.newLevel}.`;
      } else {
        levelNote = ` Você continua na pasta ${summary.newLevel}.`;
      }
    }
    statusEl.textContent = `${summary.medal.status}${levelNote}`;
  }
  if (correctEl) correctEl.textContent = summary.correct;
  if (wrongEl) wrongEl.textContent = summary.wrong;
  if (accuracyEl) accuracyEl.textContent = `${summary.accuracy.toFixed(1)}%`;
  if (cpmEl) cpmEl.textContent = summary.cpm.toFixed(1);
  overlay.classList.remove('hidden');
  overlay.setAttribute('aria-hidden', 'false');
}

function closePostGameScreen() {
  const overlay = document.getElementById('post-game-screen');
  if (!overlay) {
    return;
  }
  overlay.classList.add('hidden');
  overlay.setAttribute('aria-hidden', 'true');
}

function ensureModeStats(mode) {
  if (!modeStats[mode]) {
    modeStats[mode] = {
      totalPhrases: 0,
      totalTime: 0,
      totalChars: 0,
      correctChars: 0,
      correct: 0,
      wrong: 0,
      report: 0,
      medals: createEmptyMedalCounts(),
      wrongRanking: [],
      reportRanking: []
    };
  } else {
    const entry = modeStats[mode];
    if (!Array.isArray(entry.wrongRanking)) entry.wrongRanking = [];
    if (!Array.isArray(entry.reportRanking)) entry.reportRanking = [];
    const totalChars = Number(entry.totalChars);
    entry.totalChars = Number.isFinite(totalChars) && totalChars > 0 ? Math.floor(totalChars) : 0;
    const correctChars = Number(entry.correctChars);
    entry.correctChars = Number.isFinite(correctChars) && correctChars > 0 ? Math.floor(correctChars) : 0;
    entry.medals = normalizeMedalCounts(entry.medals);
  }
  return modeStats[mode];
}

function saveModeStats() {
  localStorage.setItem('modeStats', JSON.stringify(modeStats));
  if (typeof currentUser === 'object' && currentUser) {
    currentUser.stats = modeStats;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
  }
  if (typeof saveUserPerformance === 'function') {
    saveUserPerformance(modeStats);
  }
  updateGeneralCircles();
}

function saveTotals() {
  localStorage.setItem('acertosTotais', acertosTotais);
  localStorage.setItem('errosTotais', errosTotais);
  localStorage.setItem('tentativasTotais', tentativasTotais);
}

saveTotals();

function recordModeTime(mode) {
  if (modeStartTimes[mode]) {
    const stats = ensureModeStats(mode);
    stats.totalTime += Date.now() - modeStartTimes[mode];
    modeStartTimes[mode] = null;
    saveModeStats();
  }
}

function stopCurrentGame() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  if (prizeTimer) {
    clearInterval(prizeTimer);
    prizeTimer = null;
  }
  if (reconhecimento) {
    reconhecimentoAtivo = false;
    try { reconhecimento.stop(); } catch {}
  }
}

function pauseGame(noPenalty = false) {
  if (pauseInterval) {
    clearInterval(pauseInterval);
    pauseInterval = null;
  }
  if (paused && noPenalty) {
    persistCurrentRoundState();
    return;
  }
  paused = true;
  stopCurrentGame();
  persistCurrentRoundState();
  bloqueado = true;
  const texto = document.getElementById('texto-exibicao');
  if (texto) {
    texto.style.transition = 'opacity 500ms linear';
    texto.style.opacity = '0';
  }
  const input = document.getElementById('pt');
  if (input) input.disabled = true;
  if (!noPenalty) {
    pauseInterval = setInterval(() => {
      saveTotals();
      atualizarBarraProgresso();
    }, 1000);
  }
}

function resumeGame() {
  if (!paused) return;
  paused = false;
  consecutiveErrors = 0;
  if (pauseInterval) {
    clearInterval(pauseInterval);
    pauseInterval = null;
  }
  if (roundAttempts >= roundTarget) {
    finishMode();
    return;
  }
  const texto = document.getElementById('texto-exibicao');
  if (texto) {
    texto.style.transition = 'opacity 500ms linear';
    texto.style.opacity = '1';
  }
  const input = document.getElementById('pt');
  if (input) {
    input.disabled = false;
    input.value = '';
  }
  bloqueado = false;
  if (reconhecimento) {
    reconhecimentoAtivo = true;
    reconhecimento.start();
  }
  continuar();
}

function triggerDownPlay() {
  if (downPlaying) return;
  downPlaying = true;
  if (pauseInterval) {
    clearInterval(pauseInterval);
    pauseInterval = null;
  }
  stopCurrentGame();
  paused = true;
  bloqueado = true;
  const input = document.getElementById('pt');
  if (input) input.disabled = true;
  const texto = document.getElementById('texto-exibicao');
  if (texto) {
    texto.style.transition = 'opacity 2000ms linear';
    texto.style.opacity = '0';
  }
  const audio = new Audio('gamesounds/down.wav');
  audio.play();
  downTimeout = setTimeout(() => {
    document.getElementById('menu').style.display = 'flex';
    const visor = document.getElementById('visor');
    if (visor) visor.style.display = 'none';
    document.body.classList.remove('game-active');
    downPlaying = false;
  }, 4000);
}

function reportLastError() {
  if (!lastWasError) return;
  lastWasError = false;
  consecutiveErrors = 0;
  const audio = new Audio('gamesounds/report.wav');
  audio.play();
  acertosTotais++;
  const reward = rewardBalanceForPhrase(lastExpected || '', selectedMode);
  grantExperience(reward, selectedMode);
  errosTotais = Math.max(0, errosTotais - 1);
  points = Math.min(roundTarget, points + 1);
  if (roundWrongCount > 0) {
    roundWrongCount -= 1;
  }
  const expectedChars = countCorrectCharacters(lastExpected || '', lastExpected || '');
  roundCorrectChars += expectedChars;
  saveTotals();
  atualizarBarraProgresso();
  const stats = ensureModeStats(selectedMode);
  stats.correctChars += expectedChars;
  stats.correct++;
  stats.wrong = Math.max(0, stats.wrong - 1);
  stats.report++;
  const totals = Object.values(modeStats).reduce((acc, s) => {
    acc.report += s.report || 0;
    acc.total += s.totalPhrases || 0;
    return acc;
  }, { report: 0, total: 0 });
  const level = totals.total ? ((totals.report / totals.total) * 100).toFixed(2) : '0';
  stats.reportRanking.push({ expected: lastExpected, input: lastInput, folder: lastFolder, level });
  saveModeStats();
  persistCurrentRoundState();
  if (downPlaying) {
    downPlaying = false;
    if (downTimeout) {
      clearTimeout(downTimeout);
      downTimeout = null;
    }
    resumeGame();
  }
}

function setupModeIconInteractions() {
  const icon = document.getElementById('mode-icon');
  if (!icon || icon.dataset.reportBound === 'true') {
    return;
  }
  icon.dataset.reportBound = 'true';

  icon.addEventListener('click', () => {
    if (paused) {
      resumeGame();
    }
  });

  const triggerReport = (event) => {
    event.preventDefault();
    reportLastError();
  };

  icon.addEventListener('dblclick', triggerReport);
  icon.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'touch') {
      return;
    }
    const now = Date.now();
    if (now - lastMedalTapTime <= MEDAL_DOUBLE_TAP_DELAY) {
      lastMedalTapTime = 0;
      triggerReport(event);
    } else {
      lastMedalTapTime = now;
    }
  });

  const supportsPointerEvents = typeof window !== 'undefined' && 'onpointerdown' in window;
  if (!supportsPointerEvents) {
    icon.addEventListener('touchstart', (event) => {
      const now = Date.now();
      if (now - lastMedalTapTime <= MEDAL_DOUBLE_TAP_DELAY) {
        lastMedalTapTime = 0;
        triggerReport(event);
      } else {
        lastMedalTapTime = now;
      }
    }, { passive: false });
  }
}

function updateLevelIcon(options = {}) {
  const icon = document.getElementById('nivel-indicador');
  if (!icon) {
    return;
  }
  const scope = options.scope || (document.body.classList.contains('game-active') ? 'mode' : 'general');
  const levelValue = scope === 'mode' ? getModeLevel(selectedMode) : generalProgress.level;
  const normalizedLevel = Math.max(1, Math.floor(levelValue));
  icon.style.transition = '';
  icon.style.opacity = '1';
  icon.src = `selos_niveis/level%20${normalizedLevel}.png`;
  icon.dataset.levelScope = scope;
}

function unlockMode(mode, duration = 1000) {
  unlockedModes[mode] = true;
  localStorage.setItem('unlockedModes', JSON.stringify(unlockedModes));
  document.querySelectorAll(`#menu-modes [data-mode="${mode}"], #mode-buttons [data-mode="${mode}"]`).forEach(img => {
    img.style.transition = `opacity ${duration}ms linear`;
    img.style.opacity = '1';
  });
}

function updateModeIcons() {
  document.querySelectorAll('#mode-buttons [data-mode], #menu-modes [data-mode]').forEach(img => {
    img.style.opacity = '1';
    img.style.pointerEvents = 'auto';
  });
  checkForMenuLevelUp();
}

function getHighestUnlockedMode() {
  const modes = Object.keys(unlockedModes).filter(m => unlockedModes[m]).map(Number);
  return modes.length ? Math.max(...modes) : 1;
}

function checkForMenuLevelUp() {
  // Level advancement is triggered only after finishing mode 6
}

function performMenuLevelUp() {
  generalProgress.level += 1;
  generalProgress.xp = 0;
  saveGeneralProgress();
  unlockedModes = getAllModesUnlockedState();
  localStorage.setItem('unlockedModes', JSON.stringify(unlockedModes));
  document.querySelectorAll('#menu-modes [data-mode="6"], #mode-buttons [data-mode="6"]').forEach(el => {
    const target = el.tagName === 'IMG' ? el : el.querySelector('img');
    if (target) {
      target.src = modeImages[6];
    }
  });
  updateLevelIcon();
  updateModeIcons();
  atualizarBarraProgresso();
}

function enforceStarClick() {
  const all = document.querySelectorAll('#menu-modes [data-mode], #mode-buttons [data-mode], #top-nav a');
  all.forEach(el => { el.style.pointerEvents = 'none'; });
  const stars = document.querySelectorAll('#menu-modes [data-mode="6"], #mode-buttons [data-mode="6"]');
  if (!stars.length) {
    all.forEach(el => { el.style.pointerEvents = ''; });
    return;
  }
  stars.forEach(st => { st.style.pointerEvents = 'auto'; });
  stars.forEach(st => {
    st.addEventListener('click', () => {
      all.forEach(el => { el.style.pointerEvents = ''; });
      performMenuLevelUp();
    }, { once: true });
  });
}

function startStatsSequence() {
  localStorage.setItem('statsSequence', 'true');
  window.location.href = 'play.html';
}

function menuLevelUpSequence() {
  goHome();
  performMenuLevelUp();
}

let transitioning = false;

function createStatCircle(perc, label, iconSrc, extraText) {
  const wrapper = document.createElement('div');
  wrapper.className = 'stat-circle';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 120 120');
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  bg.setAttribute('class', 'circle-bg');
  bg.setAttribute('cx', '60');
  bg.setAttribute('cy', '60');
  bg.setAttribute('r', radius);
  svg.appendChild(bg);
  const prog = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  prog.setAttribute('class', 'circle-progress');
  prog.setAttribute('cx', '60');
  prog.setAttribute('cy', '60');
  prog.setAttribute('r', radius);
  prog.setAttribute('stroke-dasharray', circumference);
  const clamped = Math.max(0, Math.min(perc, 100));
  prog.setAttribute('stroke-dashoffset', circumference);
  prog.style.stroke = colorFromPercent(perc);
  svg.appendChild(prog);
  wrapper.appendChild(svg);
  const icon = document.createElement('img');
  icon.className = 'circle-icon';
  icon.src = iconSrc;
  icon.alt = label;
  wrapper.appendChild(icon);
  setTimeout(() => {
    prog.setAttribute('stroke-dashoffset', circumference * (1 - clamped / 100));
  }, 50);
  const value = document.createElement('div');
  value.className = 'circle-value';
  value.textContent = `${Math.round(perc)}%`;
  wrapper.appendChild(value);
  const labelEl = document.createElement('div');
  labelEl.className = 'circle-label';
  labelEl.textContent = label;
  wrapper.appendChild(labelEl);
  if (extraText) {
    const extra = document.createElement('div');
    extra.className = 'circle-extra';
    extra.textContent = extraText;
    wrapper.appendChild(extra);
  }
  return wrapper;
}

function calcModeStats(mode) {
  const stats = modeStats[mode] || {};
  const total = stats.totalPhrases || 0;
  const correct = stats.correct || 0;
  const report = stats.report || 0;
  const totalTime = stats.totalTime || 0;
  const totalChars = stats.totalChars || 0;
  const correctChars = stats.correctChars || 0;
  const accPerc = total ? (correct / total * 100) : 0;
  const avg = total ? (totalTime / total / 1000) : 0;
  const goal = timeGoals[mode] || MAX_TIME;
  let timePerc = total ? ((MAX_TIME - avg) / (MAX_TIME - goal) * 100) : 0;
  if (avg >= MAX_TIME) timePerc = 0;
  if ([2, 3, 6].includes(mode) && total) timePerc += 20;
  const notReportPerc = total ? (100 - (report / total * 100)) : 100;
  const minutes = totalTime > 0 ? (totalTime / 60000) : 0;
  const cpm = minutes > 0 ? (correctChars / minutes) : 0;
  return { accPerc, timePerc, avg, notReportPerc, cpm, total, correct, totalChars, correctChars };
}

function calcGeneralStats() {
  const modes = [2, 3, 4, 5, 6];
  let totalPhrases = 0, totalCorrect = 0, totalTime = 0, totalReport = 0;
  let totalChars = 0, totalCorrectChars = 0;
  let timePercSum = 0, timePercCount = 0;
  modes.forEach(m => {
    const s = modeStats[m] || {};
    totalPhrases += s.totalPhrases || 0;
    totalCorrect += s.correct || 0;
    totalTime += s.totalTime || 0;
    totalReport += s.report || 0;
    totalChars += s.totalChars || 0;
    totalCorrectChars += s.correctChars || 0;
    const tp = calcModeStats(m).timePerc;
    if (tp >= 1) {
      timePercSum += tp;
      timePercCount++;
    }
  });
  const accPerc = totalPhrases ? (totalCorrect / totalPhrases * 100) : 0;
  const avg = totalPhrases ? (totalTime / totalPhrases / 1000) : 0;
  const timePerc = timePercCount ? (timePercSum / timePercCount) : 0;
  const notReportPerc = totalPhrases ? (100 - (totalReport / totalPhrases * 100)) : 100;
  const minutes = totalTime > 0 ? (totalTime / 60000) : 0;
  const cpm = minutes > 0 ? (totalCorrectChars / minutes) : 0;
  return {
    accPerc,
    timePerc,
    avg,
    notReportPerc,
    cpm,
    total: totalPhrases,
    correct: totalCorrect,
    totalChars,
    correctChars: totalCorrectChars
  };
}

function updateGeneralCircles() {
  const { accPerc, timePerc } = calcGeneralStats();
  const scoreWrapper = document.getElementById('general-score-circle');
  const speedWrapper = document.getElementById('general-speed-circle');
  if (scoreWrapper) {
    scoreWrapper.innerHTML = '';
    scoreWrapper.appendChild(
      createStatCircle(accPerc, 'Pontuação Geral', 'selos%20modos%20de%20jogo/precisao.png')
    );
  }
  if (speedWrapper) {
    speedWrapper.innerHTML = '';
    speedWrapper.appendChild(
      createStatCircle(timePerc, 'Velocidade Geral', 'selos%20modos%20de%20jogo/velocidade.png')
    );
  }
}

function startTryAgainAnimation() {
  const msg = document.getElementById('nivel-mensagem');
  if (!msg) return;
  if (tryAgainColorInterval) clearInterval(tryAgainColorInterval);
  const duration = 30000;
  const maxPoints = Math.max(1, getCurrentThreshold());
  const begin = Date.now();
  tryAgainColorInterval = setInterval(() => {
    const elapsed = (Date.now() - begin) % duration;
    const pts = (elapsed / duration) * maxPoints;
    msg.style.color = calcularCor(pts);
  }, 50);
}

function stopTryAgainAnimation() {
  if (tryAgainColorInterval) clearInterval(tryAgainColorInterval);
  tryAgainColorInterval = null;
}

function startGame(modo) {
  const prevMode = selectedMode;
  persistCurrentRoundState();
  if (prevMode !== modo) {
    recordModeTime(prevMode);
  }
  selectedMode = modo;
  refreshUserSettings();
  resetRoundState();
  roundTarget = getRoundSelection(modo);
  saveTotals();
  atualizarBarraProgresso();
  updateModeIcons();
  updateLevelIcon({ scope: 'mode' });
  listeningForCommand = false;
  const menu = document.getElementById('menu');
  if (menu) menu.style.display = 'none';
  document.body.classList.add('game-active');
  const visor = document.getElementById('visor');
  if (visor) visor.style.display = 'none';
  const icon = document.getElementById('mode-icon');
  if (icon) icon.style.display = 'none';
  if (reconhecimento) {
    reconhecimentoAtivo = false;
    reconhecimento.stop();
  }
  openPreGameScreen(modo);
}

function beginGame() {
  closePreGameScreen();
  closePostGameScreen();
  resetRoundState();
  roundTarget = getRoundSelection(selectedMode);
  const targetLevel = getSelectedPreGameLevel(selectedMode);
  sessionStart = Date.now();
  modeStartTimes[selectedMode] = Date.now();
  consecutiveErrors = 0;
  paused = false;
  roundStartTime = Date.now();
  roundActive = true;
  pastaAtual = targetLevel;
  const start = () => {
    const visor = document.getElementById('visor');
    if (visor) visor.style.display = 'flex';
    const icon = document.getElementById('mode-icon');
    if (icon) {
      icon.dataset.medalSrc = '';
      icon.style.display = 'block';
    }
    setupModeIconInteractions();
    updateModeMedalIcon(0);
    updateGeneralCircles();
    const texto = document.getElementById('texto-exibicao');
    if (texto) texto.style.opacity = '1';
    updateLevelIcon({ scope: 'mode' });
    updateModeIcons();
    let recognitionLanguage = 'en-US';
    switch (selectedMode) {
      case 1:
        mostrarTexto = 'pt';
        voz = null;
        esperadoLang = 'en';
        break;
      case 2:
        mostrarTexto = 'pt';
        voz = 'en';
        esperadoLang = 'en';
        break;
      case 3:
        mostrarTexto = 'none';
        voz = 'en';
        esperadoLang = 'en';
        break;
      case 4:
        mostrarTexto = 'en';
        voz = null;
        esperadoLang = 'en';
        break;
      case 5:
        mostrarTexto = 'none';
        voz = 'en';
        esperadoLang = 'pt';
        recognitionLanguage = 'pt-BR';
        break;
      case 6:
        mostrarTexto = 'pt';
        voz = null;
        esperadoLang = 'en';
        break;
    }
    if (reconhecimento) {
      reconhecimento.lang = recognitionLanguage;
    }
    const restored = restoreRoundState(getStoredRoundState(selectedMode, targetLevel), targetLevel);
    if (reconhecimento) {
      reconhecimentoAtivo = true;
      reconhecimento.start();
    }
    if (!restored) {
      carregarFrases();
    }
  };

  start();
  pendingModeStart = null;
}

function speakWithBrowserVoice(texto, locale) {
  if (typeof window === 'undefined' || typeof window.SpeechSynthesisUtterance !== 'function') {
    return;
  }
  const utter = new SpeechSynthesisUtterance(texto);
  utter.lang = locale;
  const token = Date.now();
  const stopSpeaking = () => setMicrophoneSpeechState(false, token);
  utter.onstart = () => setMicrophoneSpeechState(true, token);
  utter.onend = stopSpeaking;
  utter.onerror = stopSpeaking;
  if (typeof window.speechSynthesis !== 'undefined') {
    setMicrophoneSpeechState(true, token);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }
}

function falar(texto, lang) {
  if (!texto) {
    return;
  }
  const locale = lang === 'pt' ? 'pt-BR' : 'en-US';
  speakWithBrowserVoice(texto, locale);
}

function togglePt() {
  mostrarTexto = mostrarTexto === 'pt' ? 'en' : 'pt';
  mostrarFrase();
}

function toggleEn() {
  voz = voz ? null : 'en';
  mostrarFrase();
}

function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
}

function falarFrase() {
  if (selectedMode === 1) {
    return;
  }
  if (frasesArr[fraseIndex]) {
    const en = getPrimaryEnFromPhrase(frasesArr[fraseIndex]);
    falar(en, 'en');
  }
}

function falarPt() {
  if (frasesArr[fraseIndex]) {
    const pt = getPtFromPhrase(frasesArr[fraseIndex]);
    falar(pt, 'pt');
  }
}

function embaralhar(array) {
  return array.sort(() => Math.random() - 0.5);
}

function allocatePhraseCounts(total, plan) {
  const safeTotal = Math.max(1, Math.floor(total));
  const normalizedPlan = plan
    .map(entry => ({ key: entry.key, ratio: Number(entry.ratio) }))
    .filter(entry => entry.key && Number.isFinite(entry.ratio) && entry.ratio > 0);
  if (!normalizedPlan.length) {
    return {};
  }
  const ratioSum = normalizedPlan.reduce((sum, entry) => sum + entry.ratio, 0);
  const weighted = normalizedPlan.map(entry => ({
    ...entry,
    raw: (safeTotal * entry.ratio) / ratioSum
  }));
  const baseCounts = weighted.map(entry => Math.floor(entry.raw));
  let remainder = safeTotal - baseCounts.reduce((sum, value) => sum + value, 0);
  const fractions = weighted
    .map((entry, index) => ({ index, fraction: entry.raw - Math.floor(entry.raw) }))
    .sort((a, b) => b.fraction - a.fraction);
  let cursor = 0;
  while (remainder > 0 && fractions.length) {
    const { index } = fractions[cursor % fractions.length];
    baseCounts[index] += 1;
    remainder -= 1;
    cursor += 1;
  }
  const counts = {};
  weighted.forEach((entry, index) => {
    counts[entry.key] = (counts[entry.key] || 0) + baseCounts[index];
  });
  return counts;
}

function normalizeWrongRankingEntry(entry) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }
  const folder = Number(entry.folder);
  if (!Number.isFinite(folder)) {
    return null;
  }
  const expected = typeof entry.expected === 'string' ? entry.expected : '';
  const phrase = typeof entry.phrase === 'string' ? entry.phrase : expected;
  const pt = typeof entry.pt === 'string' ? entry.pt : '';
  let en = [];
  if (Array.isArray(entry.en)) {
    en = entry.en.map(value => String(value || '').trim()).filter(Boolean);
  }
  return { folder, expected, phrase, pt, en };
}

function resolveLibraryPhrase(libraryEntries, expected) {
  if (!expected) {
    return null;
  }
  const match = libraryEntries.find(item => {
    const [pt, enList] = ensurePhraseTuple(item);
    return pt === expected || enList.includes(expected);
  });
  return match ? ensurePhraseTuple(match) : null;
}

function getWrongPhrasePool(mode, folder) {
  const stats = ensureModeStats(mode);
  const entries = Array.isArray(stats.wrongRanking) ? stats.wrongRanking : [];
  const library = getModeLibrary(mode);
  const folderLibrary = Array.isArray(library[folder]) ? library[folder] : [];
  const seen = new Set();
  const pool = [];

  entries.forEach(entry => {
    const normalized = normalizeWrongRankingEntry(entry);
    if (!normalized || normalized.folder !== folder) {
      return;
    }
    let phraseTuple = ensurePhraseTuple([normalized.pt, normalized.en]);
    const hasContent = getPtFromPhrase(phraseTuple) || getPrimaryEnFromPhrase(phraseTuple);
    if (!hasContent) {
      phraseTuple = resolveLibraryPhrase(folderLibrary, normalized.expected || normalized.phrase);
    }
    if (!phraseTuple) {
      return;
    }
    const key = `${getPtFromPhrase(phraseTuple)}#${getPrimaryEnFromPhrase(phraseTuple)}`;
    if (key.trim() && !seen.has(key)) {
      seen.add(key);
      pool.push(ensurePhraseTuple(phraseTuple));
    }
  });

  return pool;
}

function carregarFrases() {
  const library = getModeLibrary(selectedMode);
  const levelToUse = getSelectedPreGameLevel(selectedMode);
  pastaAtual = levelToUse;
  const principais = Array.isArray(library[levelToUse]) ? [...library[levelToUse]] : [];
  const anteriores = [];

  const totalNecessario = Math.max(1, roundTarget);
  const erradas = userSettings.retryWrongPhrases
    ? getWrongPhrasePool(selectedMode, levelToUse)
    : [];

  const allocationPlan = userSettings.retryWrongPhrases
    ? [
        { key: 'principais', ratio: 0.85 },
        { key: 'erradas', ratio: 0.15 }
      ]
    : [
        { key: 'principais', ratio: 1 }
      ];

  const desiredCounts = allocatePhraseCounts(totalNecessario, allocationPlan);
  const pools = {
    principais: embaralhar([...principais]),
    anteriores: embaralhar([...anteriores]),
    erradas: embaralhar([...erradas])
  };
  const originalPools = {
    principais: [...principais],
    anteriores: [...anteriores],
    erradas: [...erradas]
  };

  const selecionadas = [];

  function consumeFromPool(key, amount, { allowReuse = false } = {}) {
    if (amount <= 0) return 0;
    const pool = pools[key];
    let remaining = amount;
    if (Array.isArray(pool) && pool.length) {
      const take = pool.splice(0, Math.min(remaining, pool.length));
      selecionadas.push(...take);
      remaining -= take.length;
    }
    if (allowReuse && remaining > 0) {
      const source = originalPools[key];
      if (Array.isArray(source) && source.length) {
        const refill = embaralhar([...source]).slice(0, Math.min(remaining, source.length));
        selecionadas.push(...refill);
        remaining -= refill.length;
      }
    }
    return remaining;
  }

  let leftover = 0;
  Object.entries(desiredCounts).forEach(([key, amount]) => {
    leftover += consumeFromPool(key, amount);
  });

  const fallbackOrder = ['principais', 'erradas', 'anteriores'];
  fallbackOrder.forEach(key => {
    if (leftover > 0) {
      leftover = consumeFromPool(key, leftover, { allowReuse: true });
    }
  });

  if (!selecionadas.length && principais.length) {
    selecionadas.push(...embaralhar([...principais]).slice(0, totalNecessario));
  }

  if (!selecionadas.length) {
    selecionadas.push(['', '']);
  }

  frasesArr = embaralhar(selecionadas).slice(0, totalNecessario);
  fraseIndex = 0;
  points = 0;
  setTimeout(() => mostrarFrase(), 300);
  atualizarBarraProgresso();
  dispatchModeProgressUpdate(selectedMode);
  persistCurrentRoundState();
}

function updateModeMedalIcon(ratio) {
  const icon = document.getElementById('mode-icon');
  if (!icon) {
    return;
  }
  const clampedRatio = Math.max(0, Math.min(1, Number.isFinite(ratio) ? ratio : 0));
  const perc = clampedRatio * 100;
  const medal = getMedalForAccuracy(perc);
  const src = medal && medal.image ? medal.image : 'medalhas/gesso.png';
  if (icon.dataset.medalSrc !== src) {
    icon.dataset.medalSrc = src;
    icon.src = src;
    icon.classList.remove('medal-slide-active');
    void icon.offsetWidth;
    icon.classList.add('medal-slide-active');
  }
  icon.style.display = 'block';
  icon.style.opacity = 1;
}

function mostrarFrase() {
  refreshUserSettings();
  if (inputTimeout) clearTimeout(inputTimeout);
  if (timerInterval) clearInterval(timerInterval);
  if (roundAttempts >= roundTarget) {
    finishMode();
    return;
  }
  if (fraseIndex >= frasesArr.length) {
    fraseIndex = fraseIndex % Math.max(1, frasesArr.length);
  }
  const pt = getPtFromPhrase(frasesArr[fraseIndex]);
  const en = getPrimaryEnFromPhrase(frasesArr[fraseIndex]);
  const texto = document.getElementById("texto-exibicao");
  if (mostrarTexto === 'pt') texto.textContent = pt;
  else if (mostrarTexto === 'en') texto.textContent = en;
  else texto.textContent = '';
  if (texto) {
    texto.dataset.expectedPt = pt;
    texto.dataset.expectedEn = en;
    const expected = esperadoLang === 'pt' ? pt : en;
    texto.dataset.expectedPhrase = expected;
  }
  document.getElementById("pt").value = '';
  document.getElementById("pt").disabled = false;
  if (voz === 'en') falar(en, 'en');
  else if (voz === 'pt') falar(pt, 'pt');
  bloqueado = false;
  const timerEl = document.getElementById('timer');
  const start = Date.now();
  phraseStartTime = start;
  timerEl.textContent = 'Tempo: 0s';
  timerInterval = setInterval(() => {
    const secs = Math.floor((Date.now() - start) / 1000);
    timerEl.textContent = `Tempo: ${secs}s`;
  }, 1000);
  if (prizeTimer) clearInterval(prizeTimer);
  prizeStart = Date.now();
  prizeTimer = setInterval(atualizarBarraProgresso, 50);
  atualizarBarraProgresso();
  persistCurrentRoundState();
}

function flashSuccess(callback) {
  const texto = document.getElementById('texto-exibicao');
  const limite = Math.max(1, getCurrentThreshold());
  const perc = Math.min(100, (points / limite) * 100);
  const color = colorFromPercent(perc);
  texto.style.transition = 'color 500ms linear';
  texto.style.color = color;
  setTimeout(() => {
    texto.style.transition = 'color 500ms linear';
    texto.style.color = '#333';
    setTimeout(() => {
      document.getElementById('resultado').textContent = '';
      callback();
    }, 500);
  }, 500);
}

function flashError(expected, callback) {
  const texto = document.getElementById('texto-exibicao');
  if (!texto) {
    callback();
    return;
  }
  const previousText = texto.textContent;
  const previousColor = window.getComputedStyle(texto).color;
  const resultadoEl = document.getElementById('resultado');
  texto.textContent = expected;
  texto.style.transition = 'color 280ms ease';
  texto.style.color = '#ff4d4f';
  const HIGHLIGHT_DURATION = 2100;
  const RESET_DURATION = 500;
  setTimeout(() => {
    texto.style.transition = 'color 240ms ease';
    texto.style.color = previousColor;
    setTimeout(() => {
      texto.textContent = previousText;
      texto.style.transition = '';
      if (resultadoEl) {
        resultadoEl.textContent = '';
      }
      callback();
    }, RESET_DURATION);
  }, HIGHLIGHT_DURATION);
}

function handleNoInput() {
  if (bloqueado || selectedMode === 1) return;
  const input = document.getElementById('pt');
  input.value = '[no input]';
  verificarResposta();
}

function verificarResposta() {
  if (bloqueado) return;
  if (inputTimeout) clearTimeout(inputTimeout);
  if (timerInterval) clearInterval(timerInterval);
  const input = document.getElementById("pt");
  const resposta = input.value.trim();
  const resultado = document.getElementById("resultado");
  tentativasTotais++;
  saveTotals();
  lastWasError = false;

  const stats = ensureModeStats(selectedMode);
  stats.totalPhrases++;

  const currentEntry = Array.isArray(frasesArr[fraseIndex]) ? frasesArr[fraseIndex] : ['', []];
  const pt = getPtFromPhrase(currentEntry);
  const enVariants = getEnVariantsFromPhrase(currentEntry);
  const expectedOptions = esperadoLang === 'pt' ? [pt] : (enVariants.length ? enVariants : ['']);
  const expectedPhrase = expectedOptions[0] || '';
  const phraseLength = expectedPhrase ? expectedPhrase.length : 0;
  const norm = t => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/gi, "").toLowerCase();
  let normalizadoResp = norm(resposta);
  const correto = expectedOptions.some(opcao => {
    const normalizadoEsp = norm(opcao || '');
    return normalizadoResp === normalizadoEsp ||
      ehQuaseCorreto(normalizadoResp, normalizadoEsp) ||
      ehQuaseCorretoPalavras(resposta, opcao || '');
  });

  const expectedChars = countCorrectCharacters(expectedPhrase, expectedPhrase);
  const correctChars = countCorrectCharacters(expectedPhrase, resposta);
  stats.totalChars += expectedChars;
  stats.correctChars += correctChars;
  roundCorrectChars += correctChars;
  const phraseDuration = phraseStartTime ? Date.now() - phraseStartTime : 0;
  const adjustedDuration = getAdjustedDurationMs(phraseLength, phraseDuration);
  roundAdjustedTimeMs = Math.max(0, roundAdjustedTimeMs + adjustedDuration);
  addRecentPhraseSample(correctChars, adjustedDuration);
  phraseStartTime = 0;
  if (!roundActive) {
    roundActive = true;
  }
  roundAttempts++;
  const reachedRoundEnd = roundAttempts >= roundTarget;

  if (correto) {
    stats.correct++;
    saveModeStats();
    document.getElementById("somAcerto").play();
    acertosTotais++;
    points = Math.min(roundTarget, points + 1);
    saveTotals();
    handleCorrectStreak();
    const reward = rewardBalanceForPhrase(expectedPhrase, selectedMode);
    grantExperience(reward, selectedMode);
    consecutiveErrors = 0;
    resultado.textContent = '';
    persistCurrentRoundState();
    flashSuccess(() => {
      if (reachedRoundEnd) finishMode();
      else continuar();
    });
  } else {
    stats.wrong++;
    handleWrongStreak();
    const wr = stats.wrongRanking;
    const existing = wr.find(e => e.expected === expectedPhrase && e.input === resposta && e.folder === pastaAtual);
    if (existing) {
      existing.count++;
      if (!existing.phrase) existing.phrase = expectedPhrase;
      if (!existing.pt) existing.pt = pt;
      if (!Array.isArray(existing.en) || !existing.en.length) existing.en = enVariants;
    } else {
      wr.push({
        expected: expectedPhrase,
        input: resposta,
        folder: pastaAtual,
        count: 1,
        phrase: expectedPhrase,
        pt,
        en: enVariants
      });
    }
    saveModeStats();
    document.getElementById("somErro").play();
    errosTotais++;
    roundWrongCount++;
    lastExpected = expectedPhrase;
    lastInput = resposta;
    lastFolder = pastaAtual;
    saveTotals();
    lastWasError = true;
    resultado.textContent = "";
    resultado.style.color = "red";
    input.value = '';
    input.disabled = true;
    bloqueado = true;
    if (selectedMode !== 1) {
      falar(expectedPhrase, esperadoLang);
    }
    consecutiveErrors++;
    persistCurrentRoundState();
      flashError(expectedPhrase, () => {
      input.disabled = false;
      bloqueado = false;
      if (reachedRoundEnd) {
        finishMode();
      } else {
        continuar();
      }
    });
  }
  atualizarBarraProgresso();
  }

function continuar() {
  if (transitioning) {
    return;
  }
  if (roundAttempts >= roundTarget) {
    finishMode();
    return;
  }
  fraseIndex++;
  mostrarFrase();
}

function atualizarBarraProgresso() {
  updateGameBalanceDisplay();
  const filled = document.getElementById('barra-preenchida');
  const limite = Math.max(1, getCurrentThreshold());
  const currentPoints = Math.max(0, Math.min(points, limite));
  const accuracyRatio = currentPoints / limite;
  const perc = accuracyRatio * 100;
  let segmentRatio = accuracyRatio;
  const medal = getMedalForAccuracy(perc);
  if (medal) {
    const currentIndex = MEDAL_RULES.indexOf(medal);
    if (currentIndex >= 0) {
      const start = Number.isFinite(medal.min) ? medal.min : 0;
      const nextMedal = MEDAL_RULES[currentIndex + 1];
      if (nextMedal) {
        const end = nextMedal.min;
        const span = Math.max(1, end - start);
        segmentRatio = Math.max(0, Math.min(1, (perc - start) / span));
      } else {
        segmentRatio = 1;
      }
    }
  }
  if (filled) {
    filled.style.width = (segmentRatio * 100) + '%';
    filled.style.backgroundColor = colorFromPercent(perc);
  }
  updateModeMedalIcon(accuracyRatio);
}

function finishMode() {
  stopCurrentGame();
  roundActive = false;
  clearRoundState(selectedMode);
  const icon = document.getElementById('mode-icon');
  if (icon) {
    icon.style.display = 'none';
  }
  const visor = document.getElementById('visor');
  if (visor) {
    visor.style.display = 'none';
  }
  recordModeTime(selectedMode);
  const totalAttempts = Math.max(roundAttempts, points + roundWrongCount);
  const correct = Math.min(points, roundTarget);
  const wrong = Math.max(0, totalAttempts - correct);
  const attemptsForAccuracy = correct + wrong;
  const accuracy = attemptsForAccuracy > 0 ? (correct / attemptsForAccuracy) * 100 : 0;
  const elapsedMs = roundAdjustedTimeMs > 0
    ? roundAdjustedTimeMs
    : (roundStartTime ? Date.now() - roundStartTime : 0);
  const minutes = elapsedMs > 0 ? (elapsedMs / 60000) : 0;
  const cpm = minutes > 0 ? (roundCorrectChars / minutes) : 0;

  const medal = getMedalForAccuracy(accuracy);
  const stats = ensureModeStats(selectedMode);
  const medalKey = medal && MEDAL_LABEL_TO_KEY[medal.label];
  if (medalKey) {
    stats.medals[medalKey] += 1;
  }
  saveModeStats();
  const progress = getModeProgress(selectedMode);
  const baseLevel = Math.max(progress.level || 1, getSelectedPreGameLevel(selectedMode));
  const previousLevel = baseLevel;
  let nextLevel = previousLevel + medal.levelDelta;
  nextLevel = Math.max(1, Math.min(MAX_LEVEL_CAP, nextLevel));
  progress.level = nextLevel;
  progress.xp = 0;
  modeProgress[String(selectedMode)] = progress;
  saveModeProgress({ emit: true });
  pastaAtual = setSelectedPreGameLevel(selectedMode, nextLevel);
  updateLevelIcon({ scope: 'mode' });
  dispatchModeProgressUpdate(selectedMode);
  updateModeIcons();
  updateMonthlyStatsProgress({
    totalAttempts,
    eligibleAttempts: roundTarget,
    correctAttempts: correct
  });
  if (window.playtalkAuth && typeof window.playtalkAuth.persistProgress === 'function') {
    window.playtalkAuth.persistProgress();
  }

  openPostGameScreen({
    correct,
    wrong,
    accuracy,
    cpm,
    medal,
    previousLevel,
    newLevel: nextLevel
  });
}

function nextMode() {
  if (transitioning) return;
  persistCurrentRoundState();
  stopCurrentGame();
  transitioning = true;
  if (selectedMode < 6) {
    const current = selectedMode;
    recordModeTime(current);
    const next = current + 1;
    selectedMode = next;
    startGame(next);
    transitioning = false;
  } else {
    recordModeTime(selectedMode);
    selectedMode = 1;
    startGame(1);
    transitioning = false;
  }
}


function goHome() {
  pauseGame(true);
  paused = false;
  consecutiveErrors = 0;
  bloqueado = false;
  if (sessionStart) {
    const total = parseInt(localStorage.getItem('totalTime') || '0', 10);
    localStorage.setItem('totalTime', total + (Date.now() - sessionStart));
    sessionStart = null;
  }
  recordModeTime(selectedMode);
  resetRoundState();
  saveTotals();
  atualizarBarraProgresso();
  const visor = document.getElementById('visor');
  if (visor) visor.style.display = 'none';
  const menu = document.getElementById('menu');
  if (menu) menu.style.display = 'flex';
  document.body.classList.remove('game-active');
  closePreGameScreen();
  closePostGameScreen();
  const icon = document.getElementById('mode-icon');
  if (icon) icon.style.display = 'none';
  if (reconhecimento) {
    reconhecimentoAtivo = false;
    try { reconhecimento.stop(); } catch {}
  }
  listeningForCommand = false;
  pendingModeStart = null;
  updateModeIcons();
  updateLevelIcon({ scope: 'general' });
}

function updateClock() {
  const el = document.getElementById('clock');
  if (!el) return;
  const now = new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour12: false });
  el.textContent = now;
}

async function initGame() {
  reloadPersistentProgress();
  try {
    await carregarPastas();
  } catch (error) {
    console.error('Não foi possível carregar as frases do jogo.', error);
  }
  updateLevelIcon({ scope: 'general' });
  updateModeIcons();
  const menu = document.getElementById('menu');
  if (menu) menu.style.display = 'flex';
  document.body.classList.remove('game-active');
  listeningForCommand = false;
  if (reconhecimento) {
    reconhecimentoAtivo = false;
    try { reconhecimento.stop(); } catch {}
  }
  resetRoundState();
  saveTotals();
  atualizarBarraProgresso();
  const levelIcon = document.getElementById('nivel-indicador');
  if (levelIcon) levelIcon.style.display = 'block';

  document.querySelectorAll('#mode-buttons [data-mode], #menu-modes [data-mode]').forEach(img => {
    img.addEventListener('click', () => {
      stopCurrentGame();
      const modo = parseInt(img.dataset.mode, 10);
      if (!unlockedModes[modo]) {
        const lock = document.getElementById('somLock');
        if (lock) {
          lock.currentTime = 0;
          const playPromise = lock.play();
          if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {});
          }
        }
        return;
      }
      startGame(modo);
    });
  });

  setupModeIconInteractions();

  const preGameStartBtn = document.getElementById('pre-game-start');
  if (preGameStartBtn) {
    preGameStartBtn.addEventListener('click', () => {
      const mode = pendingModeStart ?? selectedMode;
      setRoundSelection(mode, roundTarget);
      beginGame();
    });
  }

  const preGameCancelBtn = document.getElementById('pre-game-cancel');
  if (preGameCancelBtn) {
    preGameCancelBtn.addEventListener('click', () => {
      closePreGameScreen();
      goHome();
    });
  }

  document.querySelectorAll('#pre-game-screen .pre-game-level__control').forEach(button => {
    button.addEventListener('click', () => {
      const mode = pendingModeStart ?? selectedMode;
      const delta = button.dataset.direction === 'up' ? 1 : -1;
      stepSelectedPreGameLevel(mode, delta);
      updatePreGameScreen(mode);
    });
  });

  const postReplayBtn = document.getElementById('post-game-replay');
  if (postReplayBtn) {
    postReplayBtn.addEventListener('click', () => {
      closePostGameScreen();
      startGame(selectedMode);
    });
  }

  const postMenuBtn = document.getElementById('post-game-menu');
  if (postMenuBtn) {
    postMenuBtn.addEventListener('click', () => {
      closePostGameScreen();
      goHome();
    });
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'r') falarFrase();
    if (e.key.toLowerCase() === 'h') toggleDarkMode();
    if (e.key.toLowerCase() === 'i') {
      const currentEntry = frasesArr[fraseIndex] || ['', []];
      const esperado = esperadoLang === 'pt'
        ? getPtFromPhrase(currentEntry)
        : getPrimaryEnFromPhrase(currentEntry);
      document.getElementById('pt').value = esperado;
      verificarResposta();
      return;
    }
  });
}

document.addEventListener('playtalk:user-change', () => {
  reloadPersistentProgress();
  selectedMode = 1;
  goHome();
});

let homePageInitialized = false;

async function bootstrapHomePage() {
  if (homePageInitialized) {
    return;
  }
  homePageInitialized = true;
  updateGameBalanceDisplay();
  document.querySelectorAll('#top-nav a').forEach(a => {
    a.addEventListener('click', stopCurrentGame);
  });
  document.querySelectorAll('#main-nav a.nav-item').forEach(link => {
    link.addEventListener('click', () => {
      stopCurrentGame();
    });
  });
  const homeLink = document.getElementById('home-link');
  if (homeLink && homeLink.dataset.external !== 'true') {
    homeLink.addEventListener('click', (e) => {
      e.preventDefault();
      stopCurrentGame();
      goHome();
    });
  }
  await initGame();
  window.addEventListener('beforeunload', () => {
    recordModeTime(selectedMode);
    saveModeStats();
    persistCurrentRoundState();
    stopCurrentGame();
  });
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  bootstrapHomePage();
} else {
  window.addEventListener('load', bootstrapHomePage, { once: true });
}

if (typeof window !== 'undefined' && typeof window.registerPlaytalkPage === 'function') {
  window.registerPlaytalkPage('page-home', bootstrapHomePage);
}
