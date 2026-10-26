import { putAudio, listAudio } from './js/db.js';
import { buildFilename, extFromMime } from './js/filename.js';
import { listPresets, addPreset, removePreset, getPreset } from './js/presets.js';
import { readFavorites, toggleFavorite, renderFavorites, isFavorite } from './js/favorites.js';
import { initPalette, openPalette, closePalette, isPaletteOpen } from './js/palette.js';
import { initKeys } from './js/keys.js';
import { renderVault, replay, download, togglePlayPause } from './js/vault.js';

/* =====================================================================
   VOXFLOW — ELEVENLABS / APPLE CREATIVE STUDIO CONTROLLER
   Pure Vanilla JS • Web Audio API Waveform • Reactive Floating Dock
   ===================================================================== */

(() => {
  'use strict';

  // Native Android Capacitor Bridge & Edge API Proxy
  const isCapacitorNative = typeof window !== 'undefined' && (
    (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) ||
    window.location.origin === 'https://localhost'
  );

  const API_REMOTE_HOST = 'https://voxflow-809.pages.dev';

  if (isCapacitorNative) {
    const originalFetch = window.fetch;
    window.fetch = function(input, init) {
      if (typeof input === 'string' && input.startsWith('/api/')) {
        input = API_REMOTE_HOST + input;
      }
      return originalFetch.call(this, input, init);
    };
    console.log('[NativeBridge] Proxied /api calls to Cloudflare Pages edge:', API_REMOTE_HOST);
  }

  // Hide splash screen & init back navigation / update manager once runtime is ready
  function initNativeBridge() {
    if (window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform()) {
      try {
        window.Capacitor.Plugins?.SplashScreen?.hide();
      } catch (e) {}
      if (window.backNavigation && typeof window.backNavigation.init === 'function') {
        window.backNavigation.init();
      }
      if (window.updateManager && typeof window.updateManager.init === 'function') {
        window.updateManager.init();
      }
    }
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', initNativeBridge);
  } else {
    initNativeBridge();
  }

  // Pre-cached Deepgram Flux voice catalog for zero-latency instant startup
  const DEFAULT_DEEPGRAM_VOICES = [
    { id: "flux-alexis-en", name: "Alexis", gender: "Female", accent: "US English", tone: "Friendly & Clear", recommended: true },
    { id: "flux-bree-en", name: "Bree", gender: "Female", accent: "US English", tone: "Warm & Conversational" },
    { id: "flux-brittany-en", name: "Brittany", gender: "Female", accent: "US English", tone: "Professional & Articulate" },
    { id: "flux-brooke-en", name: "Brooke", gender: "Female", accent: "US English", tone: "Bright & Engaging" },
    { id: "flux-bruce-en", name: "Bruce", gender: "Male", accent: "US English", tone: "Deep & Authoritative", recommended: true },
    { id: "flux-cliff-en", name: "Cliff", gender: "Male", accent: "US English", tone: "Resonant & Calm" },
    { id: "flux-cole-en", name: "Cole", gender: "Male", accent: "US English", tone: "Smooth & Modern" },
    { id: "flux-colin-en", name: "Colin", gender: "Male", accent: "US English", tone: "Energetic & Direct" },
    { id: "flux-conor-en", name: "Conor", gender: "Male", accent: "US English", tone: "Confident & Clear" },
    { id: "flux-donovan-en", name: "Donovan", gender: "Male", accent: "US English", tone: "Rich & Narrative" },
    { id: "flux-drew-en", name: "Drew", gender: "Male", accent: "US English", tone: "Casual & Relatable" },
    { id: "flux-elise-en", name: "Elise", gender: "Female", accent: "US English", tone: "Soft & Empathetic" },
    { id: "flux-gemma-en", name: "Gemma", gender: "Female", accent: "British English", tone: "Crisp & Refined", recommended: true },
    { id: "flux-haley-en", name: "Haley", gender: "Female", accent: "US English", tone: "Youthful & Vibrant" },
    { id: "flux-hannah-en", name: "Hannah", gender: "Female", accent: "US English", tone: "Neutral & Informative" },
    { id: "flux-heather-en", name: "Heather", gender: "Female", accent: "US English", tone: "Warm & Reassuring" },
    { id: "flux-jack-en", name: "Jack", gender: "Male", accent: "US English", tone: "Classic & Radio-Ready" },
    { id: "flux-kai-en", name: "Kai", gender: "Male", accent: "US English", tone: "Contemporary & Crisp" },
    { id: "flux-kelsey-en", name: "Kelsey", gender: "Female", accent: "US English", tone: "Dynamic & Expressive" },
    { id: "flux-kit-en", name: "Kit", gender: "Non-binary", accent: "US English", tone: "Balanced & Modern" },
    { id: "flux-maeve-en", name: "Maeve", gender: "Female", accent: "Irish/US English", tone: "Elegant & Melodic" },
    { id: "flux-marcelo-en", name: "Marcelo", gender: "Male", accent: "Expressive", tone: "Warm & Charismatic" },
    { id: "flux-marcus-en", name: "Marcus", gender: "Male", accent: "US English", tone: "Powerful & Corporate" },
    { id: "flux-meena-en", name: "Meena", gender: "Female", accent: "Indian English", tone: "Caring & Polished" },
    { id: "flux-meghan-en", name: "Meghan", gender: "Female", accent: "US English", tone: "Upbeat & Commercial" },
    { id: "flux-miles-en", name: "Miles", gender: "Male", accent: "US English", tone: "Fast-Paced & Engaging" },
    { id: "flux-naveen-en", name: "Naveen", gender: "Male", accent: "Indian English", tone: "Clear & Articulate" },
    { id: "flux-paige-en", name: "Paige", gender: "Female", accent: "US English", tone: "Clean & Direct" },
    { id: "flux-priya-en", name: "Priya", gender: "Female", accent: "Indian English", tone: "Melodic & Expressive" },
    { id: "flux-rufus-en", name: "Rufus", gender: "Male", accent: "British English", tone: "Distinctive & Vintage" },
    { id: "flux-sean-en", name: "Sean", gender: "Male", accent: "Irish English", tone: "Friendly & Approachable" },
    { id: "flux-sharon-en", name: "Sharon", gender: "Female", accent: "US English", tone: "Mature & Trustworthy" },
    { id: "flux-sienna-en", name: "Sienna", gender: "Female", accent: "US English", tone: "Stylish & Natural" },
    { id: "flux-tanner-en", name: "Tanner", gender: "Male", accent: "US English", tone: "Youthful & Dynamic" },
    { id: "flux-wade-en", name: "Wade", gender: "Male", accent: "US English", tone: "Deep Bass & Steady" },
    { id: "flux-wes-en", name: "Wes", gender: "Male", accent: "US English", tone: "Warm & Conversational" }
  ];

  const DEFAULT_CARTESIA_VOICES = [
    { id: "95856005-0332-41b0-935f-352e296aa0df", name: "Sophie", gender: "Female", accent: "US English", tone: "Conversational & Natural", provider: "Cartesia", recommended: true },
    { id: "a0e99841-438c-4a64-b679-ae501e7d6091", name: "Barbershop Man", gender: "Male", accent: "US English", tone: "Rich & Resonant", provider: "Cartesia", recommended: true },
    { id: "694f9389-aac1-45b6-b726-9d9369183238", name: "Sarah", gender: "Female", accent: "US English", tone: "Calm & Professional", provider: "Cartesia" },
    { id: "79a125e8-cd45-4c13-8a67-188112f4dd22", name: "British Lady", gender: "Female", accent: "British English", tone: "Poised & Articulate", provider: "Cartesia", recommended: true },
    { id: "f39d8500-0d9b-4b8b-a080-38f5188f5892", name: "Commercial Lady", gender: "Female", accent: "US English", tone: "Dynamic & Upbeat", provider: "Cartesia" },
    { id: "829ccd10-f8b3-43cd-b8a0-4aeaa81f3b30", name: "Doctor", gender: "Male", accent: "US English", tone: "Authoritative & Trustworthy", provider: "Cartesia" },
    { id: "b7d50908-b17c-442d-ad8d-810c63997ed9", name: "California Girl", gender: "Female", accent: "US English", tone: "Youthful & Breezy", provider: "Cartesia" },
    { id: "5c42302c-194b-4d0c-ba1a-8cb485c84ab9", name: "Storyteller", gender: "Male", accent: "US English", tone: "Warm & Dramatic", provider: "Cartesia" }
  ];

  const DEFAULT_GEMINI_VOICES = [
    { id: "Puck", name: "Puck", gender: "Male", accent: "Natural Expressive", tone: "Lively & Engaging", provider: "Google Gemini", recommended: true },
    { id: "Charon", name: "Charon", gender: "Male", accent: "Deep Expressive", tone: "Informative & Grounded", provider: "Google Gemini", recommended: true },
    { id: "Kore", name: "Kore", gender: "Female", accent: "Warm Expressive", tone: "Empathetic & Conversational", provider: "Google Gemini", recommended: true },
    { id: "Fenrir", name: "Fenrir", gender: "Male", accent: "Bold Expressive", tone: "Strong & Radio-Clear", provider: "Google Gemini" },
    { id: "Aoede", name: "Aoede", gender: "Female", accent: "Melodic Expressive", tone: "Harmonic & Smooth", provider: "Google Gemini" }
  ];

  const DEFAULT_GROQ_ORPHEUS_VOICES = [
    // English Voices (canopylabs/orpheus-v1-english)
    { id: "autumn", name: "Autumn", gender: "Female", accent: "US English", tone: "Clear & Warm", provider: "Groq Orpheus", model: "canopylabs/orpheus-v1-english", recommended: true },
    { id: "diana", name: "Diana", gender: "Female", accent: "US English", tone: "Articulate & Professional", provider: "Groq Orpheus", model: "canopylabs/orpheus-v1-english" },
    { id: "hannah", name: "Hannah", gender: "Female", accent: "US English", tone: "Soft & Friendly", provider: "Groq Orpheus", model: "canopylabs/orpheus-v1-english" },
    { id: "austin", name: "Austin", gender: "Male", accent: "US English", tone: "Energetic & Direct", provider: "Groq Orpheus", model: "canopylabs/orpheus-v1-english", recommended: true },
    { id: "daniel", name: "Daniel", gender: "Male", accent: "US English", tone: "Resonant & Calm", provider: "Groq Orpheus", model: "canopylabs/orpheus-v1-english" },
    { id: "troy", name: "Troy", gender: "Male", accent: "US English", tone: "Casual & Conversational", provider: "Groq Orpheus", model: "canopylabs/orpheus-v1-english" },

    // Saudi Arabic Voices (canopylabs/orpheus-arabic-saudi)
    { id: "abdullah", name: "Abdullah (عبدالله)", gender: "Male", accent: "Saudi Arabic", tone: "Deep & Eloquent", provider: "Groq Orpheus", model: "canopylabs/orpheus-arabic-saudi", recommended: true },
    { id: "fahad", name: "Fahad (فهد)", gender: "Male", accent: "Saudi Arabic", tone: "Natural & Fluent", provider: "Groq Orpheus", model: "canopylabs/orpheus-arabic-saudi" },
    { id: "sultan", name: "Sultan (سلطان)", gender: "Male", accent: "Saudi Arabic", tone: "Prestigious & Authoritative", provider: "Groq Orpheus", model: "canopylabs/orpheus-arabic-saudi" },
    { id: "lulwa", name: "Lulwa (لولوة)", gender: "Female", accent: "Saudi Arabic", tone: "Sweet & Articulate", provider: "Groq Orpheus", model: "canopylabs/orpheus-arabic-saudi", recommended: true },
    { id: "noura", name: "Noura (نورة)", gender: "Female", accent: "Saudi Arabic", tone: "Clear & Professional", provider: "Groq Orpheus", model: "canopylabs/orpheus-arabic-saudi" },
    { id: "aisha", name: "Aisha (عائشة)", gender: "Female", accent: "Saudi Arabic", tone: "Warm & Expressive", provider: "Groq Orpheus", model: "canopylabs/orpheus-arabic-saudi" }
  ];

  const DEFAULT_CLOUDFLARE_VOICES = [
    { id: "en-us", name: "Melo US", gender: "Female", accent: "US English", tone: "Fast Edge Synthesis", provider: "Cloudflare MeloTTS", recommended: true },
    { id: "en-default", name: "Melo Default", gender: "Female", accent: "Standard English", tone: "Neutral & Clear", provider: "Cloudflare MeloTTS" },
    { id: "en-br", name: "Melo British", gender: "Female", accent: "British English", tone: "Crisp Accent", provider: "Cloudflare MeloTTS" },
    { id: "en-au", name: "Melo Australian", gender: "Female", accent: "Australian English", tone: "Natural Australian", provider: "Cloudflare MeloTTS" },
    { id: "es", name: "Melo Spanish", gender: "Female", accent: "Spanish", tone: "Natural Castilian", provider: "Cloudflare MeloTTS" },
    { id: "fr", name: "Melo French", gender: "Female", accent: "French", tone: "Parisian Accent", provider: "Cloudflare MeloTTS" },
    { id: "zh", name: "Melo Mandarin", gender: "Female", accent: "Mandarin Chinese", tone: "Standard Putonghua", provider: "Cloudflare MeloTTS" },
    { id: "jp", name: "Melo Japanese", gender: "Female", accent: "Japanese", tone: "Smooth Tokyo Cadence", provider: "Cloudflare MeloTTS" },
    { id: "kr", name: "Melo Korean", gender: "Female", accent: "Korean", tone: "Clear Seoul Accent", provider: "Cloudflare MeloTTS" }
  ];

  const DEFAULT_ELEVENLABS_VOICES = [
    { id: "CwhRBWXzGAHq8TQ4Fs17", name: "Roger", gender: "Male", accent: "American English", tone: "Classy & Conversational", provider: "ElevenLabs", recommended: true },
    { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", gender: "Female", accent: "American English", tone: "Professional & Media", provider: "ElevenLabs", recommended: true },
    { id: "FGY2WhTYpPnrIDTdsKH5", name: "Laura", gender: "Female", accent: "American English", tone: "Sassy & Social Media", provider: "ElevenLabs", recommended: true },
    { id: "IKne3meq5aSn9XLyUdCD", name: "Charlie", gender: "Male", accent: "Australian English", tone: "Hyped & Conversational", provider: "ElevenLabs" },
    { id: "JBFqnCBsd6RMkjVDRZzb", name: "George", gender: "Male", accent: "British English", tone: "Mature & Storyteller", provider: "ElevenLabs", recommended: true },
    { id: "N2lVS1w4EtoT3dr4eOWO", name: "Callum", gender: "Male", accent: "American English", tone: "Natural & Character", provider: "ElevenLabs" },
    { id: "SAz9YHcvj6GT2YYXdXww", name: "River", gender: "Neutral", accent: "American English", tone: "Calm & Relaxed", provider: "ElevenLabs" },
    { id: "SOYHLrjzK2X1ezoPC6cr", name: "Harry", gender: "Male", accent: "American English", tone: "Rough & Warrior", provider: "ElevenLabs" },
    { id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam", gender: "Male", accent: "American English", tone: "Confident & Creator", provider: "ElevenLabs" },
    { id: "Xb7hH8MSUJpSbSDYk0k2", name: "Alice", gender: "Female", accent: "British English", tone: "Professional & Educator", provider: "ElevenLabs", recommended: true },
    { id: "XrExE9yKIg1WjnnlVkGX", name: "Matilda", gender: "Female", accent: "American English", tone: "Upbeat & Informative", provider: "ElevenLabs" },
    { id: "bIHbv24MWmeRgasZH58o", name: "Will", gender: "Male", accent: "American English", tone: "Chill & Conversational", provider: "ElevenLabs" },
    { id: "cgSgspJ2msm6clMCkdW9", name: "Jessica", gender: "Female", accent: "American English", tone: "Cute & Conversational", provider: "ElevenLabs" },
    { id: "cjVigY5qzO86Huf0OWal", name: "Eric", gender: "Male", accent: "American English", tone: "Classy & Conversational", provider: "ElevenLabs" },
    { id: "hpp4J3VqNfWAUOO0d1Us", name: "Bella", gender: "Female", accent: "American English", tone: "Professional & Engaging", provider: "ElevenLabs" },
    { id: "iP95p4xoKVk53GoZ742B", name: "Chris", gender: "Male", accent: "American English", tone: "Casual & Conversational", provider: "ElevenLabs" },
    { id: "nPczCjzI2devNBz1zQrb", name: "Brian", gender: "Male", accent: "American English", tone: "Deep & Announcer", provider: "ElevenLabs" },
    { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel", gender: "Male", accent: "British English", tone: "Formal & Authoritative", provider: "ElevenLabs" },
    { id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily", gender: "Female", accent: "British English", tone: "Warm & Melodic", provider: "ElevenLabs" },
    { id: "pNInz6obpgDQGcFmaJgB", name: "Adam", gender: "Male", accent: "American English", tone: "Natural & Dynamic", provider: "ElevenLabs", recommended: true },
    { id: "pqHfZKP75CvOlQylNhV4", name: "Bill", gender: "Male", accent: "American English", tone: "Crisp & Commercial", provider: "ElevenLabs" }
  ];
 
  // --- Core Application State ---
  const state = {
    mode: 'tts', // 'tts' | 'stt'
    model: 'deepgram/flux-tts:free',
    voice: 'flux-alexis-en',
    speed: 1.0,
    voicesCatalog: [...DEFAULT_DEEPGRAM_VOICES, ...DEFAULT_CARTESIA_VOICES, ...DEFAULT_GEMINI_VOICES, ...DEFAULT_GROQ_ORPHEUS_VOICES, ...DEFAULT_CLOUDFLARE_VOICES, ...DEFAULT_ELEVENLABS_VOICES],
    voiceFilter: 'all',

    // Playback Engine
    audioElement: new Audio(),
    currentBlob: null,
    currentUrl: null,
    isPlaying: false,
    duration: 0,
    audioContext: null,
    analyserNode: null,
    sourceNode: null,
    animFrameId: null,
    waveformPeaks: null,

    // Voice Previews & Favorites
    favoriteVoices: new Set(JSON.parse(localStorage.getItem('voxflow_fav_voices') || '[]')),
    previewAudio: new Audio(),
    previewVoiceId: null,
    isPreviewPlaying: false,

    // STT Engine
    isRecording: false,
    mediaRecorder: null,
    recChunks: [],
    recTimer: null,
    recSecs: 0,
    micAudioCtx: null,
    micAnalyser: null,
    micAnimFrame: null,
    pickedFile: null,

    // Settings & Keys
    customDeepgramKey: localStorage.getItem('voxflow_deepgram_key') || '',
    customMistralKey: localStorage.getItem('voxflow_mistral_key') || '',
    customElevenLabsKey: localStorage.getItem('voxflow_elevenlabs_key') || '',
    customOpenRouterKey: localStorage.getItem('voxflow_openrouter_key') || '',
    customGroqKey: localStorage.getItem('voxflow_groq_key') || '',
    customGeminiKey: localStorage.getItem('voxflow_gemini_key') || '',
    customCartesiaKey: localStorage.getItem('voxflow_cartesia_key') || '',
    customCfToken: localStorage.getItem('voxflow_cf_token') || '',
    customCfAccount: localStorage.getItem('voxflow_cf_account') || '',
    serverConfig: {
      deepgram_ready: false,
      openrouter_ready: false,
      groq_ready: false,
      mistral_ready: false,
      gemini_ready: false,
      cartesia_ready: false,
      cloudflare_ready: false,
      elevenlabs_ready: false
    },
    autoPlay: localStorage.getItem('voxflow_autoplay') !== 'false',
    playbackQueue: null,

    // Real-Time Word & Sentence Synchronization
    timelineWords: [],
    timelineSentences: [],
    activeWordId: null,
    activeSentenceIdx: -1,
    syncRafId: null,
    continuousMasterBlob: null,
    continuousMasterUrl: null,
    continuousDuration: 0,
    isSyncStageVisible: false,
    currentAbortController: null,

    // Library
    library: JSON.parse(localStorage.getItem('voxflow_library') || '[]')
  };

  // Expose for testing & debug access
  window.voxAudio = state.audioElement;
  window.__VOX_STATE = state;

  // --- Element Selectors ---
  const el = {
    // Mode toggles
    btnModeTts: document.getElementById('btn-mode-tts'),
    btnModeStt: document.getElementById('btn-mode-stt'),
    viewTts: document.getElementById('view-tts'),
    viewStt: document.getElementById('view-stt'),
    btnTheme: document.getElementById('btn-toggle-theme'),
    btnOpenLib: document.getElementById('btn-open-library'),
    btnOpenSettings: document.getElementById('btn-open-settings'),
    btnInstallPwa: document.getElementById('btn-install-pwa'),
    btnGetApp: document.getElementById('btn-get-app'),
    getAppPanel: document.getElementById('get-app-panel'),
    getAppMeta: document.getElementById('get-app-meta'),
    globalStatusChip: document.getElementById('global-status-chip'),
    globalStatusText: document.getElementById('global-status-text'),
    favCountBadge: document.getElementById('fav-count-badge'),
    globalStatusDot: document.getElementById('global-status-dot'),
    libBadge: document.getElementById('lib-count-badge'),

    // TTS Canvas
    textInput: document.getElementById('text-input'),
    btnPaste: document.getElementById('btn-paste'),
    btnScanImage: document.getElementById('btn-scan-image'),
    modalScreenshotScan: document.getElementById('modal-screenshot-scan'),
    btnCloseScreenshotModal: document.getElementById('btn-close-screenshot-modal'),
    btnCancelScreenshot: document.getElementById('btn-cancel-screenshot'),
    screenshotDropzone: document.getElementById('screenshot-dropzone'),
    screenshotFileInput: document.getElementById('screenshot-file-input'),
    screenshotDropPrompt: document.getElementById('screenshot-drop-prompt'),
    screenshotPreviewWrap: document.getElementById('screenshot-preview-wrap'),
    screenshotPreviewImg: document.getElementById('screenshot-preview-img'),
    btnRemoveScreenshot: document.getElementById('btn-remove-screenshot'),
    btnExtractScreenshot: document.getElementById('btn-extract-screenshot'),
    labelExtractBtn: document.getElementById('label-extract-btn'),
    extractSpinnerIcon: document.getElementById('extract-spinner-icon'),
    btnClear: document.getElementById('btn-clear'),
    btnLoadFile: document.getElementById('btn-load-file'),
    inputScriptFile: document.getElementById('input-script-file'),
    genProgress: document.getElementById('gen-progress'),
    genProgressFill: document.getElementById('gen-progress__fill'),
    genProgressStage: document.getElementById('gen-progress__stage'),
    genProgressCount: document.getElementById('gen-progress__count'),
    presetPills: document.querySelectorAll('.preset-pill'),
    statWords: document.getElementById('stat-words'),
    statChars: document.getElementById('stat-chars'),
    statDuration: document.getElementById('stat-duration'),

    // Interactive Real-Time Sync & Karaoke Stage
    textareaStage: document.getElementById('textarea-stage'),
    interactiveStage: document.getElementById('interactive-stage'),
    btnToggleReader: document.getElementById('btn-toggle-reader'),
    labelReaderToggle: document.getElementById('label-reader-toggle'),
    btnBackToEditor: document.getElementById('btn-back-to-editor'),
    btnStageCancel: document.getElementById('btn-stage-cancel'),
    interactiveReadingBody: document.getElementById('interactive-reading-body'),
    continuousRibbon: document.getElementById('continuous-timeline-ribbon'),
    ribbonTrack: document.getElementById('ribbon-track'),
    ribbonProgress: document.getElementById('ribbon-progress'),
    ribbonPlayhead: document.getElementById('ribbon-playhead'),
    ribbonTimeDisplay: document.getElementById('ribbon-time-display'),
    ribbonSegmentsBadge: document.getElementById('ribbon-segments-badge'),
    interactiveStatusLabel: document.getElementById('interactive-status-label'),

    // Floating Dock
    floatingDockContainer: document.querySelector('.floating-dock-container'),
    dockVoicePill: document.getElementById('dock-voice-pill'),
    dockVoiceAvatar: document.getElementById('dock-voice-avatar'),
    dockVoiceName: document.getElementById('dock-voice-name'),
    dockVoiceAccent: document.getElementById('dock-voice-accent'),
    dockModelPill: document.getElementById('dock-model-pill'),
    dockModelName: document.getElementById('dock-model-name'),
    menuModelSelect: document.getElementById('menu-model-select'),
    dockSpeedPill: document.getElementById('dock-speed-pill'),
    dockSpeedLabel: document.getElementById('dock-speed-label'),
    menuSpeedSelect: document.getElementById('menu-speed-select'),
    dockQuickMic: document.getElementById('dock-quick-mic'),
    btnMainGenerate: document.getElementById('btn-main-generate'),
    labelGenerate: document.getElementById('label-generate'),
    btnCancelGenerate: document.getElementById('btn-cancel-generate'),

    // Floating Player Bar
    dockPlayer: document.getElementById('dock-player'),
    dockBtnPlay: document.getElementById('dock-btn-play'),
    playerLabelVoice: document.getElementById('player-label-voice'),
    playerLabelModel: document.getElementById('player-label-model'),
    dockWaveformCanvas: document.getElementById('dock-waveform-canvas'),
    waveformScrubZone: document.getElementById('waveform-scrub-zone'),
    dockPlayhead: document.getElementById('dock-playhead'),
    playerTimeDisplay: document.getElementById('player-time-display'),
    btnPlayerSpeed: document.getElementById('btn-player-speed'),
    playerSpeedText: document.getElementById('player-speed-text'),
    btnDockDownload: document.getElementById('btn-dock-download'),
    btnClosePlayer: document.getElementById('btn-close-player'),

    // Voice Drawer
    voiceDrawerBackdrop: document.getElementById('voice-drawer-backdrop'),
    btnCloseVoiceDrawer: document.getElementById('btn-close-voice-drawer'),
    voiceSearchField: document.getElementById('voice-search-field'),
    drawerVoicesList: document.getElementById('drawer-voices-list'),
    drawerVoiceCount: document.getElementById('drawer-voice-count'),
    drawerProviderBadge: document.getElementById('drawer-provider-badge'),
    drawerTitleText: document.getElementById('drawer-title-text'),
    drawerProviderTabs: document.getElementById('drawer-provider-tabs'),
    drawerFilters: document.getElementById('drawer-filters'),

    // STT Canvas
    btnBigRecord: document.getElementById('btn-big-record'),
    micHalo: document.getElementById('mic-halo'),
    sttTimerDisplay: document.getElementById('stt-timer-display'),
    sttHintDisplay: document.getElementById('stt-hint-display'),
    sttLiveCanvas: document.getElementById('stt-live-canvas'),
    sttDropzone: document.getElementById('stt-dropzone'),
    btnBrowseFile: document.getElementById('btn-browse-file'),
    inputAudioFile: document.getElementById('input-audio-file'),
    chipPickedFile: document.getElementById('chip-picked-file'),
    pickedFileName: document.getElementById('picked-file-name'),
    btnRemovePicked: document.getElementById('btn-remove-picked'),
    btnDoTranscribe: document.getElementById('btn-do-transcribe'),
    labelTranscribe: document.getElementById('label-transcribe'),
    sttResultCard: document.getElementById('stt-result-card'),
    sttTranscriptText: document.getElementById('stt-transcript-text'),
    btnCopyStt: document.getElementById('btn-copy-stt'),
    btnExportStt: document.getElementById('btn-export-stt'),
    btnSendSttToTts: document.getElementById('btn-send-stt-to-tts'),

    // Sample presets popover (legacy anchor, kept for the click-outside guard below)
    samplesPopover: document.getElementById('samples-popover'),
    btnSamplesMenu: document.getElementById('btn-samples-menu'),

    // Library Drawer
    libraryDrawerBackdrop: document.getElementById('library-drawer-backdrop'),
    btnCloseLibDrawer: document.getElementById('btn-close-library-drawer'),
    libraryItemsList: document.getElementById('library-items-list'),
    btnClearAllLib: document.getElementById('btn-clear-all-lib'),

    // Settings Modal
    settingsModalBackdrop: document.getElementById('settings-modal-backdrop'),
    btnCloseSettingsModal: document.getElementById('btn-close-settings-modal'),
    inputKeyDeepgram: document.getElementById('input-key-deepgram'),
    pillStatusDeepgram: document.getElementById('pill-status-deepgram'),
    inputKeyMistral: document.getElementById('input-key-mistral'),
    pillStatusMistral: document.getElementById('pill-status-mistral'),
    inputKeyElevenlabs: document.getElementById('input-key-elevenlabs'),
    pillStatusElevenlabs: document.getElementById('pill-status-elevenlabs'),
    inputKeyOpenRouter: document.getElementById('input-key-openrouter'),
    inputKeyGroq: document.getElementById('input-key-groq'),
    inputKeyGemini: document.getElementById('input-key-gemini'),
    pillStatusGemini: document.getElementById('pill-status-gemini'),
    inputKeyCartesia: document.getElementById('input-key-cartesia'),
    pillStatusCartesia: document.getElementById('pill-status-cartesia'),
    inputKeyCfToken: document.getElementById('input-key-cf-token'),
    inputKeyCfAccount: document.getElementById('input-key-cf-account'),
    pillStatusCloudflare: document.getElementById('pill-status-cloudflare'),
    pillStatusOpenRouter: document.getElementById('pill-status-openrouter'),
    pillStatusGroq: document.getElementById('pill-status-groq'),
    btnSaveCustomKeys: document.getElementById('btn-save-custom-keys'),
    btnResetDefaultKeys: document.getElementById('btn-reset-default-keys'),
    toggleAutoPlay: document.getElementById('toggle-autoplay'),

    // Developer API Modal
    btnOpenApi: document.getElementById('btn-open-api'),
    apiModalBackdrop: document.getElementById('api-modal-backdrop'),
    btnCloseApiModal: document.getElementById('btn-close-api-modal'),
    btnCloseApiModalDone: document.getElementById('btn-close-api-modal-done'),
    inputApiKeyName: document.getElementById('input-api-key-name'),
    btnGenerateApiKey: document.getElementById('btn-generate-api-key'),
    apiKeyDisplayArea: document.getElementById('api-key-display-area'),
    displayApiKey: document.getElementById('display-api-key'),
    btnCopyApiKey: document.getElementById('btn-copy-api-key'),
    btnRevokeApiKey: document.getElementById('btn-revoke-api-key'),
    apiSampleCurl: document.getElementById('api-sample-curl'),

    // Toast Deck
    toastDeck: document.getElementById('toast-deck')
  };

  // --- Initial Launch ---
  async function init() {
    setupTheme();
    setupModeToggle();
    setupGetAppMenu();
    setupGenerateButton();
    setupCanvasEvents();
    setupScreenshotEvents();
    setupUserScrollIntent();
    setupInteractiveReader();
    setupDockControls();
    setupAudioPlayer();
    setupVoiceDrawer();
    setupSTTEngine();
    setupLibrary();
    setupApiModal();
    setupSettingsModal();
    setupShortcuts();
    setupPreviewAudioListeners();
    setupPWA();
    setupModelsVoiceExplorer();

    await loadServerStatus();
    updateCanvasMetrics();
    restoreScriptDraft();
    renderLibraryItems();
    window.__VOXFLOW_STATE__ = state;
    console.log('%c VoxFlow Neural Audio %c Built by A.T.M.R %c', 'background:#18181b;color:#f59e0b;font-weight:700;padding:4px 8px;border-radius:4px 0 0 4px;font-family:sans-serif;', 'background:#f59e0b;color:#0e0f11;font-weight:800;padding:4px 8px;border-radius:0 4px 4px 0;font-family:sans-serif;', '');
  }

  // --- Toast Deck ---
  function showToast(text, type = 'info', ms = 3200) {
    const item = document.createElement('div');
    item.className = `toast-item ${type}`;
    item.textContent = text;
    el.toastDeck.appendChild(item);

    setTimeout(() => {
      item.style.opacity = '0';
      item.style.transform = 'translateY(-8px)';
      item.style.transition = 'all 160ms ease';
      setTimeout(() => item.remove(), 160);
    }, ms);
  }

  // --- Theme Toggle ---
  function setupTheme() {
    const saved = localStorage.getItem('voxflow_theme') || 'dark';
    document.body.className = `theme-${saved}`;

    if (el.btnTheme) {
      el.btnTheme.addEventListener('click', () => {
        const isDark = document.body.classList.contains('theme-dark');
        const next = isDark ? 'light' : 'dark';
        document.body.className = `theme-${next}`;
        localStorage.setItem('voxflow_theme', next);
        drawDockWaveform();
      });
    }
  }

  // --- Primary Generate button: spinner, platform-correct shortcut hint ---
  function setupGenerateButton() {
    // Show ⌘ on Apple platforms instead of a hardcoded "Ctrl"
    const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
    if (isMac) {
      document.body.classList.add('vx-mac');
      const kbd = document.getElementById('generate-kbd');
      if (kbd) kbd.textContent = '⌘ ↵';
    }

    // Preset row: drop the scroll fade once the end is reached
    const bar = document.getElementById('presets-quick-bar');
    if (bar) {
      const syncFade = () => {
        const atEnd = bar.scrollLeft + bar.clientWidth >= bar.scrollWidth - 2;
        bar.dataset.atEnd = atEnd ? 'true' : 'false';
      };
      bar.addEventListener('scroll', syncFade, { passive: true });
      window.addEventListener('resize', syncFade);
      syncFade();
    }
  }

  // --- 4-Pillar Obsidian Acoustic Navigation System ---
  function switchTab(tabId) {
    state.activeTab = tabId;
    state.mode = (tabId === 'transcribe') ? 'stt' : 'tts';

    const viewMap = {
      studio: document.getElementById('view-tts'),
      transcribe: document.getElementById('view-stt'),
      models: document.getElementById('view-models'),
      archive: document.getElementById('view-archive')
    };

    Object.entries(viewMap).forEach(([k, viewEl]) => {
      if (viewEl) {
        viewEl.classList.toggle('hidden', k !== tabId);
      }
    });

    if (tabId === 'archive') {
      const vList = document.getElementById('vault-list');
      if (vList && typeof renderVault === 'function') {
        renderVault(vList);
      }
    }

    // Update desktop nav pills in header
    document.querySelectorAll('.vx-nav__item').forEach(btn => {
      const match = btn.getAttribute('data-tab') === tabId;
      if (match) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    });

    // Legacy desktop nav pills (kept for any markup still using them)
    document.querySelectorAll('.nav-desktop-tab').forEach(btn => {
      const match = btn.getAttribute('data-tab') === tabId;
      btn.classList.toggle('active', match);
      if (match) {
        btn.classList.add('text-primary', 'bg-surface-container-highest', 'shadow-sm');
        btn.classList.remove('text-on-surface-variant');
      } else {
        btn.classList.remove('text-primary', 'bg-surface-container-highest', 'shadow-sm');
        btn.classList.add('text-on-surface-variant');
      }
    });

    // Update bottom dock tab buttons
    document.querySelectorAll('.dock-tab-btn').forEach(btn => {
      const match = btn.getAttribute('data-tab') === tabId;
      btn.classList.toggle('active', match);
      if (match) {
        btn.setAttribute('aria-current', 'page');
        btn.classList.add('text-primary');
        btn.classList.remove('text-on-surface-variant');
      } else {
        btn.removeAttribute('aria-current');
        btn.classList.remove('text-primary');
        btn.classList.add('text-on-surface-variant');
      }
    });

    // Update desktop header buttons if present
    if (el.btnModeTts && el.btnModeStt) {
      el.btnModeTts.classList.toggle('bg-surface-container-highest', tabId === 'studio');
      el.btnModeTts.classList.toggle('text-primary', tabId === 'studio');
      el.btnModeTts.classList.toggle('text-on-surface-variant', tabId !== 'studio');

      el.btnModeStt.classList.toggle('bg-surface-container-highest', tabId === 'transcribe');
      el.btnModeStt.classList.toggle('text-primary', tabId === 'transcribe');
      el.btnModeStt.classList.toggle('text-on-surface-variant', tabId !== 'transcribe');
    }

    if (tabId === 'archive') {
      renderLibraryItems();
    }
    if (tabId === 'models') {
      setupModelsVoiceExplorer();
    }
  }

  function setupNavigationTabs() {
    document.querySelectorAll('.dock-tab-btn, .nav-desktop-tab, .vx-nav__item').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        if (tab) switchTab(tab);
      });
    });

    if (el.btnModeTts) {
      el.btnModeTts.addEventListener('click', () => switchTab('studio'));
    }
    if (el.btnModeStt) {
      el.btnModeStt.addEventListener('click', () => switchTab('transcribe'));
    }
  }

  // --- "Get the app" header menu ---
  // Consolidates APK download, PWA install and release notes into one
  // disclosure instead of letting the download compete with navigation.
  function setupGetAppMenu() {
    if (!el.btnGetApp || !el.getAppPanel) return;

    const setOpen = (open) => {
      el.getAppPanel.dataset.open = open ? 'true' : 'false';
      el.btnGetApp.setAttribute('aria-expanded', open ? 'true' : 'false');
    };

    el.btnGetApp.addEventListener('click', (e) => {
      e.stopPropagation();
      setOpen(el.getAppPanel.dataset.open !== 'true');
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#get-app-menu')) setOpen(false);
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && el.getAppPanel.dataset.open === 'true') {
        setOpen(false);
        el.btnGetApp.focus();
      }
    });

    // Keep the version/size badge in sync with latest.json
    fetch('/latest.json', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        const vName = d.versionName || d.version;
        const sizeMb = d.sizeBytes ? (d.sizeBytes / (1024 * 1024)).toFixed(1) : null;
        const parts = [];
        if (vName) parts.push(`v${vName}`);
        if (sizeMb) parts.push(`${sizeMb} MB`);
        if (parts.length && el.getAppMeta) {
          el.getAppMeta.textContent = parts.join(' · ');
        }
        const vBadge = document.getElementById('download-version-badge');
        if (vBadge && vName) {
          vBadge.textContent = `v${vName} Release`;
        }
        const sBadge = document.getElementById('download-size-badge');
        if (sBadge && sizeMb) {
          sBadge.textContent = `${sizeMb} MB`;
        }
        const rLink = document.getElementById('download-release-link');
        if (rLink && vName) {
          rLink.href = `https://github.com/ATMRaven/voice-actors/releases/tag/v${vName}`;
        }
      })
      .catch(() => { /* keep the static fallback */ });
  }

  function setupModeToggle() {
    setupNavigationTabs();
  }

  function switchMode(mode) {
    switchTab(mode === 'stt' ? 'transcribe' : 'studio');
  }

  function getActiveVoicePreviewId() {
    return state.voice || 'flux-alexis-en';
  }

  // --- Server Status & Voice Catalog Fetch ---
  async function loadServerStatus() {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data = await res.json();
        state.serverConfig.deepgram_ready = !!data.deepgram_ready;
        state.serverConfig.openrouter_ready = !!data.openrouter_ready;
        state.serverConfig.groq_ready = !!data.groq_ready;
        state.serverConfig.mistral_ready = !!data.mistral_ready;
        state.serverConfig.gemini_ready = !!data.gemini_ready;
        state.serverConfig.cartesia_ready = !!data.cartesia_ready;
        state.serverConfig.cloudflare_ready = !!data.cloudflare_ready;
        state.serverConfig.elevenlabs_ready = !!data.elevenlabs_ready;

        // Fetch all voices from /api/voices
        try {
          const vRes = await fetch('/api/voices');
          if (vRes.ok) {
            const vData = await vRes.json();
            if (vData.voices && vData.voices.length > 0) {
              state.voicesCatalog = vData.voices;
            }
          }
        } catch (vErr) {
          console.warn('Could not fetch /api/voices:', vErr);
        }

        // Fallback to data.models if needed
        if (!state.voicesCatalog || state.voicesCatalog.length === 0) {
          const dg = data.models ? data.models.find(m => m.id.includes('deepgram') || m.id.includes('flux')) : null;
          if (dg && dg.voices) {
            state.voicesCatalog = dg.voices;
          }
        }

        updateStatusIndicators();
        syncVoicePill();
        renderDrawerVoices();
      }
    } catch (err) {
      console.warn('Failed to load status:', err);
      showToast('Could not reach backend server', 'error');
    }
  }

  function updateStatusIndicators() {
    const dgActive = state.customDeepgramKey || state.serverConfig.deepgram_ready;
    const mistralActive = state.customMistralKey || state.serverConfig.mistral_ready;
    const elevenActive = state.customElevenLabsKey || state.serverConfig.elevenlabs_ready;
    const orActive = state.customOpenRouterKey || state.serverConfig.openrouter_ready;
    const groqActive = state.customGroqKey || state.serverConfig.groq_ready;
    const geminiActive = state.customGeminiKey || state.serverConfig.gemini_ready;
    const cartesiaActive = state.customCartesiaKey || state.serverConfig.cartesia_ready;
    const cfActive = (state.customCfToken && state.customCfAccount) || state.serverConfig.cloudflare_ready;

    const anyVoiceReady = dgActive || orActive || mistralActive || elevenActive || geminiActive || cartesiaActive || cfActive;
    el.globalStatusDot.style.background = (anyVoiceReady && groqActive) ? 'var(--accent-teal)' : 'var(--accent-amber)';

    // The header status chip now says what is actually wrong, instead of a
    // bare dot the user has to decode.
    if (el.globalStatusText) {
      if (!anyVoiceReady) {
        el.globalStatusText.textContent = 'No Voice Engine';
        el.globalStatusDot.classList.add('vx-status__dot--degraded');
      } else if (!groqActive) {
        el.globalStatusText.textContent = 'Transcribe Offline';
        el.globalStatusDot.classList.add('vx-status__dot--degraded');
      } else {
        el.globalStatusText.textContent = 'Engines Ready';
        el.globalStatusDot.classList.remove('vx-status__dot--degraded');
      }
    }

    if (el.pillStatusDeepgram) {
      el.pillStatusDeepgram.textContent = state.customDeepgramKey ? 'Custom Key Active' : (state.serverConfig.deepgram_ready ? 'Server Key Active' : 'Key Optional');
      el.pillStatusDeepgram.className = `status-pill ${dgActive ? 'active' : ''}`;
    }
    if (el.pillStatusMistral) {
      el.pillStatusMistral.textContent = state.customMistralKey ? 'Custom Key Active' : (state.serverConfig.mistral_ready ? 'Server Key Active' : 'Key Optional');
      el.pillStatusMistral.className = `status-pill ${mistralActive ? 'active' : ''}`;
    }
    if (el.pillStatusElevenlabs) {
      el.pillStatusElevenlabs.textContent = state.customElevenLabsKey ? 'Custom Key Active' : (state.serverConfig.elevenlabs_ready ? 'Server Key Active' : 'Key Optional');
      el.pillStatusElevenlabs.className = `status-pill ${elevenActive ? 'active' : ''}`;
    }
    if (el.pillStatusGemini) {
      el.pillStatusGemini.textContent = state.customGeminiKey ? 'Custom Key Active' : (state.serverConfig.gemini_ready ? 'Server Key Active' : 'Key Optional');
      el.pillStatusGemini.className = `status-pill ${geminiActive ? 'active' : ''}`;
    }
    if (el.pillStatusCartesia) {
      el.pillStatusCartesia.textContent = state.customCartesiaKey ? 'Custom Key Active' : (state.serverConfig.cartesia_ready ? 'Server Key Active' : 'No Key Set');
      el.pillStatusCartesia.className = `status-pill ${cartesiaActive ? 'active' : ''}`;
    }
    if (el.pillStatusCloudflare) {
      el.pillStatusCloudflare.textContent = (state.customCfToken && state.customCfAccount) ? 'Custom Key Active' : (state.serverConfig.cloudflare_ready ? 'Edge Ready' : 'Key Optional');
      el.pillStatusCloudflare.className = `status-pill ${cfActive ? 'active' : ''}`;
    }
    if (el.pillStatusOpenRouter) {
      el.pillStatusOpenRouter.textContent = state.customOpenRouterKey ? 'Custom Key Active' : (state.serverConfig.openrouter_ready ? 'Server Key Active' : 'Key Optional');
    }
    if (el.pillStatusGroq) {
      el.pillStatusGroq.textContent = state.customGroqKey ? 'Custom Key Active' : 'Server Key Active';
      el.pillStatusGroq.className = "font-mono text-[9px] uppercase px-2 py-0.5 rounded bg-emerald-950/50 text-emerald-400 border border-emerald-500/20";
    }
  }


  // --- Multimodal Screenshot to Speech Engine ---
  let activeScreenshotFile = null;

  function openScreenshotModal(fileOrBlob = null) {
    if (!el.modalScreenshotScan) return;
    el.modalScreenshotScan.classList.remove('hidden');
    if (fileOrBlob) {
      handleImageSelection(fileOrBlob);
    }
  }

  function closeScreenshotModal() {
    if (!el.modalScreenshotScan) return;
    el.modalScreenshotScan.classList.add('hidden');
    resetScreenshotModal();
  }

  function resetScreenshotModal() {
    activeScreenshotFile = null;
    if (el.screenshotFileInput) el.screenshotFileInput.value = '';
    if (el.screenshotPreviewImg) el.screenshotPreviewImg.src = '';
    if (el.screenshotPreviewWrap) el.screenshotPreviewWrap.classList.add('hidden');
    if (el.screenshotDropPrompt) el.screenshotDropPrompt.classList.remove('hidden');
    if (el.btnExtractScreenshot) {
      el.btnExtractScreenshot.disabled = true;
      el.btnExtractScreenshot.removeAttribute('aria-busy');
    }
    if (el.labelExtractBtn) el.labelExtractBtn.textContent = 'Extract & Insert';
    if (el.extractSpinnerIcon) el.extractSpinnerIcon.textContent = 'auto_awesome';
  }

  function handleImageSelection(file) {
    if (!file || !file.type.startsWith('image/')) {
      showToast('Please choose a valid image file', 'error');
      return;
    }
    activeScreenshotFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      if (el.screenshotPreviewImg) el.screenshotPreviewImg.src = e.target.result;
      if (el.screenshotPreviewWrap) el.screenshotPreviewWrap.classList.remove('hidden');
      if (el.screenshotDropPrompt) el.screenshotDropPrompt.classList.add('hidden');
      if (el.btnExtractScreenshot) el.btnExtractScreenshot.disabled = false;
    };
    reader.readAsDataURL(file);
  }

  async function performImageExtraction() {
    if (!activeScreenshotFile) return;

    const selectedRadio = document.querySelector('input[name="extract-mode"]:checked');
    const mode = selectedRadio ? selectedRadio.value : 'clean';

    if (el.btnExtractScreenshot) {
      el.btnExtractScreenshot.disabled = true;
      el.btnExtractScreenshot.setAttribute('aria-busy', 'true');
    }
    if (el.labelExtractBtn) el.labelExtractBtn.textContent = 'Extracting text...';
    if (el.extractSpinnerIcon) el.extractSpinnerIcon.textContent = 'progress_activity';

    try {
      const formData = new FormData();
      formData.append('file', activeScreenshotFile);
      formData.append('mode', mode);

      const headers = {};
      if (state.customGeminiKey) {
        headers['X-Gemini-Key'] = state.customGeminiKey;
      }

      const res = await fetch('/api/extract-image', {
        method: 'POST',
        headers,
        body: formData
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || 'Text extraction failed');
      }

      const data = await res.json();
      const extractedText = (data.text || '').trim();

      if (!extractedText) {
        showToast('No readable text found in image', 'info', 2500);
        return;
      }

      // Populate textarea, update metrics, dispatch input event
      el.textInput.value = extractedText;
      updateCanvasMetrics();
      el.textInput.dispatchEvent(new Event('input', { bubbles: true }));
      closeScreenshotModal();
      el.textInput.focus();

      const wordCount = (data.stats && data.stats.words) || extractedText.split(/\s+/).filter(Boolean).length;
      showToast(`Extracted ${wordCount} words (${data.mode || mode})`, 'info', 2500);

    } catch (err) {
      console.error('Extraction error:', err);
      showToast(`Extraction failed: ${err.message}`, 'error', 4000);
    } finally {
      if (el.btnExtractScreenshot) {
        el.btnExtractScreenshot.disabled = !activeScreenshotFile;
        el.btnExtractScreenshot.removeAttribute('aria-busy');
      }
      if (el.labelExtractBtn) el.labelExtractBtn.textContent = 'Extract & Insert';
      if (el.extractSpinnerIcon) el.extractSpinnerIcon.textContent = 'auto_awesome';
    }
  }

  function setupScreenshotEvents() {
    if (el.btnScanImage) {
      el.btnScanImage.addEventListener('click', () => openScreenshotModal());
    }
    if (el.btnCloseScreenshotModal) {
      el.btnCloseScreenshotModal.addEventListener('click', () => closeScreenshotModal());
    }
    if (el.btnCancelScreenshot) {
      el.btnCancelScreenshot.addEventListener('click', () => closeScreenshotModal());
    }
    if (el.btnRemoveScreenshot) {
      el.btnRemoveScreenshot.addEventListener('click', (e) => {
        e.stopPropagation();
        resetScreenshotModal();
      });
    }

    // File input change
    if (el.screenshotFileInput) {
      el.screenshotFileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          handleImageSelection(e.target.files[0]);
        }
      });
    }

    // Drag and drop on dropzone
    if (el.screenshotDropzone) {
      ['dragenter', 'dragover'].forEach(eventName => {
        el.screenshotDropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          el.screenshotDropzone.classList.add('border-primary');
        }, false);
      });

      ['dragleave', 'drop'].forEach(eventName => {
        el.screenshotDropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          el.screenshotDropzone.classList.remove('border-primary');
        }, false);
      });

      el.screenshotDropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        if (dt && dt.files && dt.files[0]) {
          handleImageSelection(dt.files[0]);
        }
      }, false);
    }

    // Mode chips selection
    document.querySelectorAll('#screenshot-mode-selector .mode-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('#screenshot-mode-selector .mode-chip').forEach(c => {
          c.classList.remove('border-primary/40', 'bg-primary/10', 'text-primary');
          c.classList.add('border-white/[0.06]', 'bg-surface-container', 'text-on-surface');
        });
        chip.classList.remove('border-white/[0.06]', 'bg-surface-container', 'text-on-surface');
        chip.classList.add('border-primary/40', 'bg-primary/10', 'text-primary');
        const radio = chip.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
      });
    });

    // Extract CTA
    if (el.btnExtractScreenshot) {
      el.btnExtractScreenshot.addEventListener('click', () => performImageExtraction());
    }

    // Global Clipboard Image Paste: If user presses Ctrl+V with image, auto-open modal!
    window.addEventListener('paste', (e) => {
      if (!e.clipboardData || !e.clipboardData.items) return;
      for (const item of e.clipboardData.items) {
        if (item.type.startsWith('image/')) {
          const blob = item.getAsFile();
          if (blob) {
            e.preventDefault();
            openScreenshotModal(blob);
            break;
          }
        }
      }
    });

    // Close on Escape or click outside
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && el.modalScreenshotScan && !el.modalScreenshotScan.classList.contains('hidden')) {
        closeScreenshotModal();
      }
    });

    if (el.modalScreenshotScan) {
      el.modalScreenshotScan.addEventListener('click', (e) => {
        if (e.target === el.modalScreenshotScan) closeScreenshotModal();
      });
    }
  }

  // --- Text Canvas, Long-Script Import & Draft Recovery ---

  // Long scripts can be huge; keep per-keystroke work cheap by debouncing the
  // metrics pass and never re-laying-out the textarea on every character.
  const MAX_SCRIPT_CHARS = 180000;
  const DRAFT_KEY = 'voxflow_script_draft_v1';
  let metricsTimer = null;
  let draftTimer = null;

  function scheduleCanvasMetrics() {
    if (metricsTimer) clearTimeout(metricsTimer);
    metricsTimer = setTimeout(() => {
      metricsTimer = null;
      updateCanvasMetrics();
    }, 180);
  }

  function scheduleDraftSave() {
    if (draftTimer) clearTimeout(draftTimer);
    draftTimer = setTimeout(() => {
      draftTimer = null;
      saveScriptDraft();
    }, 700);
  }

  function saveScriptDraft() {
    try {
      const text = el.textInput ? el.textInput.value : '';
      if (!text) {
        localStorage.removeItem(DRAFT_KEY);
        return;
      }
      if (text.length > 120000) return; // localStorage cannot hold very large scripts
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ text, at: Date.now() }));
    } catch (e) {
      try { localStorage.removeItem(DRAFT_KEY); } catch (_) {}
    }
  }

  function restoreScriptDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (!draft || typeof draft.text !== 'string' || !draft.text.trim()) return;
      if (Date.now() - (draft.at || 0) > 7 * 24 * 60 * 60 * 1000) return;
      const current = el.textInput.value.trim();
      if (current && !current.startsWith('In the quiet corners of deep space')) return;
      el.textInput.value = draft.text;
      updateCanvasMetrics();
      showToast('Restored your last script', 'info', 2000);
    } catch (e) { /* corrupt draft: ignore */ }
  }

  // Accept .txt/.md/.csv/.srt/.vtt and turn subtitles or markdown into clean
  // speakable prose. Cue numbers and timecodes must never be read aloud.
  function normalizeScriptText(raw) {
    let text = String(raw || '').replace(/\r\n?/g, '\n');

    if (text.includes('-->')) {
      text = text.split('\n').filter(line => {
        const t = line.trim();
        if (!t) return false;
        if (/^\d+$/.test(t)) return false;
        if (/^\d{1,2}:\d{2}(:\d{2})?[.,]\d{3}\s*-->/.test(t)) return false;
        if (/^WEBVTT/i.test(t)) return false;
        return true;
      }).join(' ');
    }

    text = text
      .replace(/<[^>]+>/g, ' ')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/^[>*\-+]\s+/gm, '')
      .replace(/`{1,3}/g, '')
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return text;
  }

  async function loadScriptFromFile(file) {
    if (!file) return;
    const looksText = /^(text\/|application\/json)/.test(file.type || '') ||
      /\.(txt|md|markdown|csv|srt|vtt|log|text)$/i.test(file.name || '');
    if (!looksText) {
      showToast('That is not a text file — pick .txt, .md or .srt', true, 3200);
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      showToast('File is over 8 MB — split it into smaller parts', true, 3600);
      return;
    }

    try {
      const raw = await file.text();
      const cleaned = normalizeScriptText(raw);
      if (!cleaned) {
        showToast('No readable text found in that file', true, 3200);
        return;
      }

      const text = cleaned.slice(0, MAX_SCRIPT_CHARS);
      el.textInput.value = text;
      updateCanvasMetrics();
      saveScriptDraft();
      el.textInput.scrollTop = 0;
      el.textInput.focus();

      const words = text.trim().split(/\s+/).filter(Boolean).length;
      const estSec = Math.round((words / 150) * 60);
      const truncated = cleaned.length > text.length ? ' (trimmed to the studio limit)' : '';
      showToast('Loaded ' + file.name + ': ' + words.toLocaleString() + ' words, about ' + fmtTime(estSec) + ' of speech' + truncated, 'success', 4200);
    } catch (err) {
      console.error('Script file read failed', err);
      showToast('Could not read that file', true, 3200);
    }
  }

  function setupCanvasEvents() {
    el.textInput.addEventListener('input', () => {
      scheduleCanvasMetrics();
      scheduleDraftSave();
    });

    // Hide the pinned Generate bar only while an on-screen keyboard actually
    // covers the page — not merely because the script field has focus.
    const syncKeyboardInset = () => {
      const vv = window.visualViewport;
      const covered = vv ? (window.innerHeight - vv.height) > 140 : false;
      document.body.classList.toggle('keyboard-open', covered);
    };
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', syncKeyboardInset);
      window.visualViewport.addEventListener('scroll', syncKeyboardInset);
    }
    window.addEventListener('orientationchange', () => setTimeout(syncKeyboardInset, 250));

    // Load a long script straight from the device (no clipboard, no limits)
    if (el.btnLoadFile && el.inputScriptFile) {
      el.btnLoadFile.addEventListener('click', () => el.inputScriptFile.click());
      el.inputScriptFile.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) loadScriptFromFile(file);
        e.target.value = '';
      });
    }

    el.btnPaste.addEventListener('click', async () => {
      // 1. Immediately delete whatever is currently written in the text input
      el.textInput.value = '';
      updateCanvasMetrics();

      let pastedText = '';

      // 2. Check for Capacitor native clipboard plugin (bypasses browser permission popups)
      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Clipboard) {
        try {
          const res = await window.Capacitor.Plugins.Clipboard.read();
          if (res && typeof res.value === 'string') {
            pastedText = res.value;
          }
        } catch (capErr) {
          console.warn('Native clipboard read fallback:', capErr);
        }
      }

      // 3. Web Clipboard API fallback
      if (!pastedText && navigator.clipboard && navigator.clipboard.readText) {
        try {
          pastedText = await navigator.clipboard.readText();
        } catch (webErr) {
          console.warn('Web clipboard read permission rejected/restricted:', webErr);
        }
      }

      // 4. Update canvas with retrieved text or allow seamless manual paste
      if (pastedText) {
        el.textInput.value = pastedText;
        updateCanvasMetrics();
        el.textInput.dispatchEvent(new Event('input', { bubbles: true }));
        el.textInput.focus();
        showToast('Text replaced from clipboard', 'info', 1800);
      } else {
        el.textInput.focus();
        showToast('Input cleared — press Ctrl+V / Tap Paste', 'info', 2400);
      }
    });

    el.btnClear.addEventListener('click', () => {
      el.textInput.value = '';
      updateCanvasMetrics();
      el.textInput.focus();
    });

    // Drag-and-drop image file directly onto script input canvas
    if (el.textareaStage) {
      el.textareaStage.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        el.textareaStage.classList.add('is-dragover');
      });
      el.textareaStage.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        el.textareaStage.classList.remove('is-dragover');
      });
      el.textareaStage.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        el.textareaStage.classList.remove('is-dragover');
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          const file = e.dataTransfer.files[0];
          if (file.type && file.type.startsWith('image/')) {
            openScreenshotModal(file);
          }
        }
      });
    }

    document.querySelectorAll('.preset-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const text = pill.getAttribute('data-text');
        if (text && el.textInput) {
          el.textInput.value = text;
          updateCanvasMetrics();
          el.textInput.focus();
        }
      });
    });
  }

  function updateCanvasMetrics() {
    const text = el.textInput.value;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    const estSec = Math.max(1, Math.round((words / 150) * 60 / state.speed));

    if (el.statWords) el.statWords.textContent = words;
    if (el.statChars) el.statChars.textContent = chars;
    if (el.statDuration) el.statDuration.textContent = estSec;
  }

  // --- Floating Dock & Studio Interactions ---
  function setupDockControls() {
    // Open Voice Drawer
    if (el.dockVoicePill) {
      el.dockVoicePill.addEventListener('click', () => {
        openVoiceDrawer();
      });
    }

    // Active Persona Sample Preview
    const btnDockVoiceSample = document.getElementById('btn-dock-voice-sample');
    if (btnDockVoiceSample) {
      btnDockVoiceSample.addEventListener('click', (e) => {
        e.stopPropagation();
        const pId = getActiveVoicePreviewId();
        playVoicePreview(pId);
      });
    }

    // Model Selector Dropdown Popover
    if (el.dockModelPill && el.menuModelSelect) {
      el.dockModelPill.addEventListener('click', (e) => {
        e.stopPropagation();
        el.menuModelSelect.classList.toggle('hidden');
        if (el.menuSpeedSelect) el.menuSpeedSelect.classList.add('hidden');
      });

      el.menuModelSelect.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          const model = item.getAttribute('data-model');
          setModel(model);
          el.menuModelSelect.classList.add('hidden');
        });
      });
    }

    // Tactile Speech Rate Slider
    const sliderSpeed = document.getElementById('slider-speed');
    if (sliderSpeed) {
      sliderSpeed.addEventListener('input', (e) => {
        const spd = parseFloat(e.target.value);
        setSpeed(spd);
      });
    }

    // Speed Selector Dropdown (legacy compatibility)
    if (el.dockSpeedPill && el.menuSpeedSelect) {
      el.dockSpeedPill.addEventListener('click', (e) => {
        e.stopPropagation();
        el.menuSpeedSelect.classList.toggle('hidden');
        if (el.menuModelSelect) el.menuModelSelect.classList.add('hidden');
      });

      el.menuSpeedSelect.querySelectorAll('.speed-opt').forEach(opt => {
        opt.addEventListener('click', (e) => {
          e.stopPropagation();
          const spd = parseFloat(opt.getAttribute('data-speed'));
          setSpeed(spd);
          el.menuSpeedSelect.classList.add('hidden');
        });
      });
    }

    // Quick Mic Button (Jumps to STT)
    if (el.dockQuickMic) {
      el.dockQuickMic.addEventListener('click', () => {
        switchTab('transcribe');
      });
    }

    // Engine Audition Buttons in Models Tab
    document.querySelectorAll('.btn-audition-engine').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const auditionId = btn.getAttribute('data-audition-id');
        if (auditionId) playVoicePreview(auditionId);
      });
    });

    // Engine Category Filter in Models Tab
    document.querySelectorAll('.models-filter-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const cat = tab.getAttribute('data-cat');
        document.querySelectorAll('.models-filter-tab').forEach(t => {
          const match = t === tab;
          t.classList.toggle('bg-surface-container-highest', match);
          t.classList.toggle('text-primary', match);
          t.classList.toggle('text-on-surface-variant', !match);
        });

        document.querySelectorAll('.engine-card, .engine-row').forEach(row => {
          if (cat === 'all') {
            row.style.display = 'flex';
          } else if (cat === 'tts') {
            const isStt = row.textContent.includes('Whisper') || row.textContent.includes('Speech-to-Text');
            row.style.display = isStt ? 'none' : 'flex';
          } else if (cat === 'stt') {
            const isStt = row.textContent.includes('Whisper') || row.textContent.includes('Speech-to-Text') || row.textContent.includes('Deepgram Nova');
            row.style.display = isStt ? 'flex' : 'none';
          }
        });
      });
    });

    // Configure API Keys from Models Tab
    const btnOpenSettingsFromModels = document.getElementById('btn-open-settings-from-models');
    if (btnOpenSettingsFromModels) {
      btnOpenSettingsFromModels.addEventListener('click', () => {
        if (el.btnOpenSettings) el.btnOpenSettings.click();
      });
    }

    // STT Engine Toggle in Transcribe Tab (Silent & Fast)
    const btnEngWhisper = document.getElementById('btn-engine-whisper');
    const btnEngDeepgram = document.getElementById('btn-engine-deepgram');
    if (btnEngWhisper && btnEngDeepgram) {
      btnEngWhisper.addEventListener('click', () => {
        state.sttEngine = 'whisper';
        btnEngWhisper.className = 'flex-1 py-1.5 text-center font-mono text-xs tracking-widest uppercase transition-all duration-200 bg-surface-container-highest text-primary rounded-full shadow-sm cursor-pointer';
        btnEngDeepgram.className = 'flex-1 py-1.5 text-center font-mono text-xs tracking-widest uppercase transition-all duration-200 text-on-surface-variant hover:text-primary rounded-full cursor-pointer';
      });
      btnEngDeepgram.addEventListener('click', () => {
        state.sttEngine = 'deepgram';
        btnEngDeepgram.className = 'flex-1 py-1.5 text-center font-mono text-xs tracking-widest uppercase transition-all duration-200 bg-surface-container-highest text-primary rounded-full shadow-sm cursor-pointer';
        btnEngWhisper.className = 'flex-1 py-1.5 text-center font-mono text-xs tracking-widest uppercase transition-all duration-200 text-on-surface-variant hover:text-primary rounded-full cursor-pointer';
      });
    }

    // Archive Search Filtering
    const archiveSearch = document.getElementById('archiveSearchInput');
    if (archiveSearch) {
      archiveSearch.addEventListener('input', (e) => {
        renderLibraryItems(e.target.value.trim().toLowerCase());
      });
    }

    // Click outside to close popovers (guarded — a throw here would silently kill
    // every handler registered below it in this setup function)
    document.addEventListener('click', () => {
      try {
        if (el.menuModelSelect) el.menuModelSelect.classList.add('hidden');
        if (el.menuSpeedSelect) el.menuSpeedSelect.classList.add('hidden');
        if (el.samplesPopover) el.samplesPopover.classList.add('hidden');
      } catch (err) {
        console.warn('Popover close guard failed:', err);
      }
    });

    // Master Generate Button
    if (el.btnMainGenerate) {
      el.btnMainGenerate.addEventListener('click', synthesizeSpeech);
    }

    // Cancel Generation Buttons
    if (el.btnCancelGenerate) {
      el.btnCancelGenerate.addEventListener('click', cancelGeneration);
    }
    if (el.btnStageCancel) {
      el.btnStageCancel.addEventListener('click', cancelGeneration);
    }
  }

  // --- Dynamic Models Voice Explorer (Audition & Favorites for All Providers) ---
  function setupModelsVoiceExplorer() {
    const list = document.getElementById('engines-cards-list');
    if (!list) return;

    const providersData = [
      {
        id: 'cartesia',
        name: 'Cartesia Sonic 3.6',
        model: 'cartesia/sonic-3.6',
        badge: '90ms',
        badgeColor: 'text-pink-400 bg-pink-950/60',
        desc: 'Ultra low-latency neural synthesis • 8 Voices',
        icon: 'bolt',
        iconColor: 'bg-pink-500/15 text-pink-400',
        voices: DEFAULT_CARTESIA_VOICES
      },
      {
        id: 'elevenlabs',
        name: 'ElevenLabs Turbo v2.5',
        model: 'elevenlabs/multilingual-v2',
        badge: 'Studio',
        badgeColor: 'text-purple-400 bg-purple-950/60',
        desc: 'Studio realism & expressive timbre • 21 Voices',
        icon: 'auto_fix_high',
        iconColor: 'bg-purple-500/15 text-purple-400',
        voices: DEFAULT_ELEVENLABS_VOICES
      },
      {
        id: 'gemini',
        name: 'Google Gemini 2.5 Audio',
        model: 'google/gemini-2.5-flash-tts',
        badge: 'Multimodal',
        badgeColor: 'text-blue-400 bg-blue-950/60',
        desc: 'Expressive prosody & AI Studio • 5 Voices',
        icon: 'cognition',
        iconColor: 'bg-blue-500/15 text-blue-400',
        voices: DEFAULT_GEMINI_VOICES
      },
      {
        id: 'groq',
        name: 'Groq Orpheus LPU',
        model: 'groq/orpheus-english',
        badge: '85ms',
        badgeColor: 'text-emerald-400 bg-emerald-950/60',
        desc: 'English & Saudi Arabic Speech • 12 Voices',
        icon: 'speed',
        iconColor: 'bg-amber-500/15 text-amber-400',
        voices: DEFAULT_GROQ_ORPHEUS_VOICES
      },
      {
        id: 'deepgram',
        name: 'Deepgram Flux & Nova-2',
        model: 'deepgram/flux-tts:free',
        badge: 'Live Edge',
        badgeColor: 'text-emerald-400 bg-emerald-950/60',
        desc: '36 Broadcast TTS Voices • Live Whisper STT',
        icon: 'waves',
        iconColor: 'bg-emerald-500/15 text-emerald-400',
        voices: DEFAULT_DEEPGRAM_VOICES
      },
      {
        id: 'mistral',
        name: 'Mistral Voxtral Mini',
        model: 'mistral/voxtral-mini-tts',
        badge: 'Emotions',
        badgeColor: 'text-orange-400 bg-orange-950/60',
        desc: '4 Personas • 30 Emotional Shades',
        icon: 'theater_comedy',
        iconColor: 'bg-orange-500/15 text-orange-400',
        voices: MISTRAL_PERSONAS.map(p => ({
          id: p.previewId,
          name: p.name,
          gender: p.gender,
          accent: p.accent,
          tone: `${p.emotions.length} emotions`,
          recommended: p.recommended
        }))
      },
      {
        id: 'cloudflare',
        name: 'Cloudflare MeloTTS',
        model: 'cloudflare/melotts',
        badge: 'Edge AI',
        badgeColor: 'text-rose-400 bg-rose-950/60',
        desc: 'Global Multi-lingual Accents • 9 Accents',
        icon: 'public',
        iconColor: 'bg-rose-500/15 text-rose-400',
        voices: DEFAULT_CLOUDFLARE_VOICES
      }
    ];

    list.innerHTML = '';

    providersData.forEach(prov => {
      const card = document.createElement('div');
      card.className = 'engine-card flex flex-col p-4 rounded-xl bg-surface-container border border-white/[0.04] transition-all hover:border-white/[0.08]';
      
      const header = document.createElement('div');
      header.className = 'flex items-center justify-between cursor-pointer';
      header.innerHTML = `
        <div class="flex items-center gap-3.5 min-w-0">
          <div class="w-10 h-10 rounded-full ${prov.iconColor} flex items-center justify-center shrink-0 font-medium">
            <span class="material-symbols-outlined text-[20px]">${prov.icon}</span>
          </div>
          <div class="flex flex-col min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-medium text-sm text-primary">${prov.name}</span>
              <span class="font-mono text-[10px] ${prov.badgeColor} px-1.5 py-0.5 rounded-full font-medium">${prov.badge}</span>
            </div>
            <span class="text-xs text-on-surface-variant engine-desc">${prov.desc}</span>
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <button class="btn-toggle-voices px-3 py-1 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-primary font-mono text-[11px] uppercase tracking-wider flex items-center gap-1 transition-colors border border-white/[0.04] cursor-pointer" type="button">
            <span>${prov.voices.length} Voices</span>
            <span class="material-symbols-outlined text-[16px] transition-transform duration-200">expand_more</span>
          </button>
        </div>
      `;

      // Accordion voice list container
      const accordion = document.createElement('div');
      accordion.className = 'hidden grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-4 mt-3 border-t border-white/[0.04]';

      prov.voices.forEach(v => {
        const isFav = state.favoriteVoices.has(v.id);
        const isCurrentPreview = state.previewVoiceId === v.id && state.isPreviewPlaying;

        const voiceItem = document.createElement('div');
        voiceItem.className = 'flex items-center justify-between p-2.5 rounded-lg bg-surface-container-low hover:bg-surface-container-highest/60 border border-white/[0.03] transition-colors';
        voiceItem.innerHTML = `
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-7 h-7 rounded-full bg-surface-container-high text-primary flex items-center justify-center font-medium text-xs shrink-0">
              ${v.name[0]}
            </div>
            <div class="flex flex-col min-w-0">
              <span class="text-xs font-medium text-primary truncate">${v.name}</span>
              <span class="text-[10px] text-on-surface-variant truncate font-mono">${v.gender || ''} • ${v.accent || ''}</span>
            </div>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <button class="voice-preview-btn ${isCurrentPreview ? 'playing' : ''} w-7 h-7 rounded-full flex items-center justify-center hover:bg-surface-container-high text-primary transition-colors cursor-pointer" data-voice-id="${v.id}" title="Audition Voice">
              <svg class="preview-icon-play ${isCurrentPreview ? 'hidden' : ''} w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"/></svg>
              <svg class="preview-icon-pause ${isCurrentPreview ? '' : 'hidden'} w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            </button>
            <button class="voice-fav-btn ${isFav ? 'favorited' : ''} w-7 h-7 rounded-full flex items-center justify-center hover:bg-surface-container-high text-primary transition-colors cursor-pointer" data-voice-id="${v.id}" title="Favorite">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="${isFav ? '#f59e0b' : 'none'}" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </button>
            <button class="btn-use-voice px-2 py-0.5 rounded font-mono text-[9px] uppercase tracking-wider bg-surface-container hover:bg-primary hover:text-on-primary text-on-surface-variant transition-colors cursor-pointer ml-1" title="Use in Studio">Use</button>
          </div>
        `;

        // Audition
        const pBtn = voiceItem.querySelector('.voice-preview-btn');
        pBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          playVoicePreview(v.id, e);
        });

        // Favorite
        const fBtn = voiceItem.querySelector('.voice-fav-btn');
        fBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          toggleVoiceFavorite(v.id, e);
        });

        // Use in Studio
        const useBtn = voiceItem.querySelector('.btn-use-voice');
        useBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          state.voice = v.id;
          if (prov.model) setModel(prov.model);
          syncVoicePill();
          switchTab('studio');
        });

        accordion.appendChild(voiceItem);
      });

      // Toggle accordion on header or button click
      const toggleFn = () => {
        const isHidden = accordion.classList.contains('hidden');
        accordion.classList.toggle('hidden');
        const icon = header.querySelector('.material-symbols-outlined');
        if (icon) icon.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
      };

      header.addEventListener('click', toggleFn);

      card.appendChild(header);
      card.appendChild(accordion);
      list.appendChild(card);
    });
  }

  function cancelGeneration() {
    if (state.currentAbortController) {
      state.currentAbortController.abort();
      state.currentAbortController = null;
    }
    if (state.playbackQueue) {
      state.playbackQueue.generationId = null;
      state.playbackQueue.isPlayingQueue = false;
      if (typeof state.playbackQueue.stop === 'function') {
        state.playbackQueue.stop();
      }
    }
    state.audioElement.pause();
    state.isPlaying = false;
    stopSyncLoop();

    // Reset generate button & hide cancel buttons
    el.btnMainGenerate.disabled = false;
    el.btnMainGenerate.classList.remove('loading');
    el.btnMainGenerate.removeAttribute('aria-busy');
    el.labelGenerate.textContent = 'Generate Speech';
    if (el.btnCancelGenerate) el.btnCancelGenerate.classList.add('hidden');
    if (el.btnStageCancel) el.btnStageCancel.classList.add('hidden');

    if (el.interactiveStatusLabel) {
      el.interactiveStatusLabel.textContent = 'Generation Cancelled';
    }

    showToast('Generation cancelled', 'info', 2000);
  }

  function setModel(modelId) {
    state.model = modelId;
    const isFish = modelId && modelId.includes('fish');
    const isMistral = modelId && (modelId.includes('mistral') || modelId.includes('voxtral'));
    const isElevenLabs = modelId && modelId.includes('elevenlabs');
    const isCartesia = modelId && modelId.includes('cartesia');
    const isGemini = modelId && (modelId.includes('gemini') || modelId.includes('google'));
    const isGroqEn = modelId && modelId.includes('groq/orpheus-english');
    const isGroqAr = modelId && modelId.includes('groq/orpheus-arabic');
    const isCloudflare = modelId && (modelId.includes('cloudflare') || modelId.includes('melotts'));

    if (isFish) {
      el.dockModelName.textContent = 'Fish S2.1 Pro';
    } else if (isMistral) {
      el.dockModelName.textContent = 'Mistral Voxtral';
    } else if (isElevenLabs) {
      el.dockModelName.textContent = 'ElevenLabs Studio';
    } else if (isCartesia) {
      el.dockModelName.textContent = 'Cartesia Sonic';
    } else if (isGemini) {
      el.dockModelName.textContent = 'Google Gemini';
    } else if (isGroqEn) {
      el.dockModelName.textContent = 'Groq Orpheus EN';
    } else if (isGroqAr) {
      el.dockModelName.textContent = 'Groq Orpheus AR';
    } else if (isCloudflare) {
      el.dockModelName.textContent = 'Cloudflare Melo';
    } else {
      el.dockModelName.textContent = 'Deepgram Flux';
    }

    el.menuModelSelect.querySelectorAll('.dropdown-item').forEach(item => {
      const itemModel = item.getAttribute('data-model');
      item.classList.toggle('active', itemModel === modelId);
    });

    el.dockVoicePill.style.pointerEvents = 'auto';
    el.dockVoicePill.style.opacity = '1';

    if (isFish) {
      state.voice = 'alloy';
    } else if (isMistral) {
      if (!state.voice || (!state.voice.startsWith('en_paul') && !state.voice.startsWith('gb_') && !state.voice.startsWith('fr_marie'))) {
        state.voice = 'en_paul_happy';
      }
    } else if (isElevenLabs) {
      if (!state.voice || !DEFAULT_ELEVENLABS_VOICES.some(v => v.id === state.voice)) {
        state.voice = 'CwhRBWXzGAHq8TQ4Fs17'; // Roger
      }
    } else if (isCartesia) {
      if (!state.voice || !DEFAULT_CARTESIA_VOICES.some(v => v.id === state.voice)) {
        state.voice = '95856005-0332-41b0-935f-352e296aa0df';
      }
    } else if (isGemini) {
      if (!state.voice || !DEFAULT_GEMINI_VOICES.some(v => v.id === state.voice)) {
        state.voice = 'Puck';
      }
    } else if (isGroqEn) {
      if (!state.voice || !DEFAULT_GROQ_ORPHEUS_VOICES.some(v => v.id === state.voice && v.model.includes('english'))) {
        state.voice = 'autumn';
      }
    } else if (isGroqAr) {
      if (!state.voice || !DEFAULT_GROQ_ORPHEUS_VOICES.some(v => v.id === state.voice && v.model.includes('arabic'))) {
        state.voice = 'abdullah';
      }
    } else if (isCloudflare) {
      if (!state.voice || !DEFAULT_CLOUDFLARE_VOICES.some(v => v.id === state.voice)) {
        state.voice = 'en-us';
      }
    } else {
      if (!state.voice || !state.voice.startsWith('flux-')) {
        state.voice = 'flux-alexis-en';
      }
    }

    syncVoicePill();
    renderDrawerVoices();
  }

  function setSpeed(speedVal) {
    state.speed = speedVal;
    if (el.dockSpeedLabel) el.dockSpeedLabel.textContent = `${speedVal.toFixed(1)}x`;
    if (el.playerSpeedText) el.playerSpeedText.textContent = `${speedVal.toFixed(1)}x`;

    const sliderSpeed = document.getElementById('slider-speed');
    if (sliderSpeed && Math.abs(parseFloat(sliderSpeed.value) - speedVal) > 0.01) {
      sliderSpeed.value = speedVal;
    }

    if (el.menuSpeedSelect) {
      el.menuSpeedSelect.querySelectorAll('.speed-opt').forEach(opt => {
        opt.classList.toggle('active', parseFloat(opt.getAttribute('data-speed')) === speedVal);
      });
    }

    if (state.audioElement) {
      state.audioElement.playbackRate = speedVal;
      state.audioElement.preservesPitch = true;
    }
    updateCanvasMetrics();
  }

  // --- Mistral Voxtral 4-Persona Hierarchy ---
  const MISTRAL_PERSONAS = [
    {
      id: 'en_paul',
      name: 'Paul',
      gender: 'Male',
      accent: 'US English',
      tone: 'Sunny, easygoing & expressive',
      recommended: true,
      previewId: 'en_paul',
      defaultEmotion: 'en_paul_happy',
      emotions: [
        { id: 'en_paul_happy', label: 'Happy' },
        { id: 'en_paul_excited', label: 'Excited' },
        { id: 'en_paul_confident', label: 'Confident' },
        { id: 'en_paul_cheerful', label: 'Cheerful' },
        { id: 'en_paul_neutral', label: 'Neutral' },
        { id: 'en_paul_frustrated', label: 'Frustrated' },
        { id: 'en_paul_sad', label: 'Sad' },
        { id: 'en_paul_angry', label: 'Angry' }
      ]
    },
    {
      id: 'gb_jane',
      name: 'Jane',
      gender: 'Female',
      accent: 'British English',
      tone: 'Poised, sharp & sarcastic',
      recommended: true,
      previewId: 'gb_jane',
      defaultEmotion: 'gb_jane_confident',
      emotions: [
        { id: 'gb_jane_confident', label: 'Confident' },
        { id: 'gb_jane_sarcasm', label: 'Sarcastic' },
        { id: 'gb_jane_curious', label: 'Curious' },
        { id: 'gb_jane_neutral', label: 'Neutral' },
        { id: 'gb_jane_confused', label: 'Confused' },
        { id: 'gb_jane_frustrated', label: 'Frustrated' },
        { id: 'gb_jane_jealousy', label: 'Jealousy' },
        { id: 'gb_jane_sad', label: 'Sad' },
        { id: 'gb_jane_shameful', label: 'Shameful' }
      ]
    },
    {
      id: 'gb_oliver',
      name: 'Oliver',
      gender: 'Male',
      accent: 'British English',
      tone: 'Assured, articulate & warm',
      recommended: true,
      previewId: 'gb_oliver',
      defaultEmotion: 'gb_oliver_confident',
      emotions: [
        { id: 'gb_oliver_confident', label: 'Confident' },
        { id: 'gb_oliver_cheerful', label: 'Cheerful' },
        { id: 'gb_oliver_excited', label: 'Excited' },
        { id: 'gb_oliver_curious', label: 'Curious' },
        { id: 'gb_oliver_neutral', label: 'Neutral' },
        { id: 'gb_oliver_sad', label: 'Sad' },
        { id: 'gb_oliver_angry', label: 'Angry' }
      ]
    },
    {
      id: 'fr_marie',
      name: 'Marie',
      gender: 'Female',
      accent: 'French Accent',
      tone: 'Joyful, radiant & expressive',
      recommended: true,
      previewId: 'fr_marie',
      defaultEmotion: 'fr_marie_happy',
      emotions: [
        { id: 'fr_marie_happy', label: 'Happy' },
        { id: 'fr_marie_excited', label: 'Excited' },
        { id: 'fr_marie_curious', label: 'Curious' },
        { id: 'fr_marie_neutral', label: 'Neutral' },
        { id: 'fr_marie_sad', label: 'Sad' },
        { id: 'fr_marie_angry', label: 'Angry' }
      ]
    }
  ];

  function getActiveProvider() {
    if (state.model) {
      if (state.model.includes('mistral') || state.model.includes('voxtral')) return 'mistral';
      if (state.model.includes('elevenlabs')) return 'elevenlabs';
      if (state.model.includes('cartesia')) return 'cartesia';
      if (state.model.includes('gemini') || state.model.includes('google')) return 'gemini';
      if (state.model.includes('groq') || state.model.includes('orpheus')) return 'groq';
      if (state.model.includes('cloudflare') || state.model.includes('melotts')) return 'cloudflare';
      if (state.model.includes('fish')) return 'fish';
    }
    return 'deepgram';
  }

  function getPersonaForVoice(voiceId) {
    if (!voiceId) return null;
    return MISTRAL_PERSONAS.find(p => p.id === voiceId || p.emotions.some(e => e.id === voiceId)) || null;
  }

  function getActiveEmotionForPersona(persona) {
    if (!persona) return null;
    const match = persona.emotions.find(e => e.id === state.voice);
    if (match) return match;
    return persona.emotions.find(e => e.id === persona.defaultEmotion) || persona.emotions[0];
  }

  function syncVoicePill() {
    const provider = getActiveProvider();
    if (provider === 'mistral') {
      const persona = getPersonaForVoice(state.voice) || MISTRAL_PERSONAS[0];
      const emotion = getActiveEmotionForPersona(persona);
      el.dockVoiceName.textContent = persona.name;
      el.dockVoiceAccent.textContent = `${persona.accent.split(' ')[0]} · ${emotion ? emotion.label : 'Expressive'}`;
      el.dockVoiceAvatar.textContent = persona.name[0];
      return;
    }

    if (provider === 'fish') {
      el.dockVoiceName.textContent = 'S2.1 Multi';
      el.dockVoiceAccent.textContent = 'Expressive';
      el.dockVoiceAvatar.textContent = 'F';
      return;
    }

    if (provider === 'elevenlabs') {
      const v = DEFAULT_ELEVENLABS_VOICES.find(item => item.id === state.voice) || DEFAULT_ELEVENLABS_VOICES[0];
      el.dockVoiceName.textContent = v.name;
      el.dockVoiceAccent.textContent = `${v.accent.split(' ')[0]} · ${v.gender}`;
      el.dockVoiceAvatar.textContent = v.name[0];
      return;
    }

    if (provider === 'cartesia') {
      const v = DEFAULT_CARTESIA_VOICES.find(item => item.id === state.voice) || DEFAULT_CARTESIA_VOICES[0];
      el.dockVoiceName.textContent = v.name;
      el.dockVoiceAccent.textContent = `${v.accent.split(' ')[0]} · ${v.gender}`;
      el.dockVoiceAvatar.textContent = v.name[0];
      return;
    }

    if (provider === 'gemini') {
      const v = DEFAULT_GEMINI_VOICES.find(item => item.id === state.voice) || DEFAULT_GEMINI_VOICES[0];
      el.dockVoiceName.textContent = v.name;
      el.dockVoiceAccent.textContent = `${v.accent.split(' ')[0]} · ${v.gender}`;
      el.dockVoiceAvatar.textContent = v.name[0];
      return;
    }

    if (provider === 'groq') {
      const v = DEFAULT_GROQ_ORPHEUS_VOICES.find(item => item.id === state.voice) || DEFAULT_GROQ_ORPHEUS_VOICES[0];
      el.dockVoiceName.textContent = v.name.split(' ')[0];
      el.dockVoiceAccent.textContent = `${v.accent.split(' ')[0]} · ${v.gender}`;
      el.dockVoiceAvatar.textContent = v.name[0];
      return;
    }

    if (provider === 'cloudflare') {
      const v = DEFAULT_CLOUDFLARE_VOICES.find(item => item.id === state.voice) || DEFAULT_CLOUDFLARE_VOICES[0];
      el.dockVoiceName.textContent = v.name;
      el.dockVoiceAccent.textContent = `${v.accent.split(' ')[0]} · Edge`;
      el.dockVoiceAvatar.textContent = 'M';
      return;
    }

    // Deepgram
    const v = state.voicesCatalog.find(item => item.id === state.voice);
    if (v) {
      el.dockVoiceName.textContent = v.name;
      const subtitle = `${v.accent.split(' ')[0]} · ${v.gender}`;
      el.dockVoiceAccent.textContent = subtitle;
      el.dockVoiceAvatar.textContent = v.name[0];
    } else {
      el.dockVoiceName.textContent = 'Alexis';
      el.dockVoiceAccent.textContent = 'US · Female';
      el.dockVoiceAvatar.textContent = 'A';
    }
  }

  // --- Voice Drawer Slide-Over ---
  function setupVoiceDrawer() {
    el.btnCloseVoiceDrawer.addEventListener('click', closeVoiceDrawer);
    el.voiceDrawerBackdrop.addEventListener('click', (e) => {
      if (e.target === el.voiceDrawerBackdrop) closeVoiceDrawer();
    });

    el.voiceSearchField.addEventListener('input', renderDrawerVoices);

    // Strict Provider Switcher Tabs in Drawer
    if (el.drawerProviderTabs) {
      el.drawerProviderTabs.querySelectorAll('.provider-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const target = btn.getAttribute('data-provider');
          if (target === 'mistral') {
            setModel('mistral/voxtral-mini-tts');
          } else if (target === 'elevenlabs') {
            setModel('elevenlabs/multilingual-v2');
          } else if (target === 'cartesia') {
            setModel('cartesia/sonic-3.6');
          } else if (target === 'gemini') {
            setModel('google/gemini-2.5-flash-tts');
          } else if (target === 'groq') {
            setModel('groq/orpheus-english');
          } else if (target === 'cloudflare') {
            setModel('cloudflare/melotts');
          } else if (target === 'fish') {
            setModel('fish-audio/s2.1-pro-free:free');
          } else {
            setModel('deepgram/flux-tts:free');
          }
          state.voiceFilter = 'all';
          renderDrawerVoices();
        });
      });
    }

    // Dynamic Filter Pills delegation
    if (el.drawerFilters) {
      el.drawerFilters.addEventListener('click', (e) => {
        const pill = e.target.closest('.filter-pill');
        if (!pill) return;
        el.drawerFilters.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        state.voiceFilter = pill.getAttribute('data-filter');
        renderDrawerVoices();
      });
    }
  }

  function openVoiceDrawer() {
    el.voiceDrawerBackdrop.classList.remove('hidden');
    renderDrawerVoices();
    el.voiceSearchField.focus();
  }

  function closeVoiceDrawer() {
    el.voiceDrawerBackdrop.classList.add('hidden');
    // Stop any voice preview playback when drawer closes
    if (state.previewAudio && !state.previewAudio.paused) {
      state.previewAudio.pause();
      state.isPreviewPlaying = false;
      updatePreviewButtonStates();
    }
  }

  function updateFavBadge() {
    if (el.favCountBadge) {
      el.favCountBadge.textContent = state.favoriteVoices.size;
    }
  }

  function toggleVoiceFavorite(voiceId, e) {
    if (e) e.stopPropagation();
    if (state.favoriteVoices.has(voiceId)) {
      state.favoriteVoices.delete(voiceId);
      showToast('Removed from favorites', 'info', 1400);
    } else {
      state.favoriteVoices.add(voiceId);
      showToast('Added to favorites', 'success', 1400);
    }
    localStorage.setItem('voxflow_fav_voices', JSON.stringify([...state.favoriteVoices]));
    updateFavBadge();
    renderDrawerVoices();
  }

  function playVoicePreview(voiceOrPersonaId, e) {
    if (e) e.stopPropagation();

    // Map to preview ID (1 preview per persona for Mistral)
    let previewId = voiceOrPersonaId;
    if (voiceOrPersonaId.startsWith('en_paul')) previewId = 'en_paul';
    else if (voiceOrPersonaId.startsWith('gb_jane')) previewId = 'gb_jane';
    else if (voiceOrPersonaId.startsWith('gb_oliver')) previewId = 'gb_oliver';
    else if (voiceOrPersonaId.startsWith('fr_marie')) previewId = 'fr_marie';

    // If clicking current playing preview, toggle pause
    if (state.previewVoiceId === previewId && state.isPreviewPlaying) {
      state.previewAudio.pause();
      state.isPreviewPlaying = false;
      updatePreviewButtonStates();
      return;
    }

    // Stop main audio player if playing to prevent collision
    if (state.audioElement && !state.audioElement.paused) {
      state.audioElement.pause();
    }

    state.previewAudio.pause();
    state.previewVoiceId = previewId;
    state.previewAudio.src = `/previews/${previewId}.mp3`;
    state.previewAudio.currentTime = 0;

    state.isPreviewPlaying = true;
    updatePreviewButtonStates();

    state.previewAudio.play().then(() => {
      state.isPreviewPlaying = true;
      updatePreviewButtonStates();
    }).catch(err => {
      console.warn('Audio preview error:', err);
      state.isPreviewPlaying = false;
      updatePreviewButtonStates();
    });
  }

  function updatePreviewButtonStates() {
    // 1. Voice Drawer preview buttons
    document.querySelectorAll('.voice-preview-btn').forEach(btn => {
      const vId = btn.getAttribute('data-voice-id');
      const isCurrent = vId === state.previewVoiceId && state.isPreviewPlaying;
      btn.classList.toggle('playing', isCurrent);
      const playIcon = btn.querySelector('.preview-icon-play');
      const pauseIcon = btn.querySelector('.preview-icon-pause');
      if (playIcon && pauseIcon) {
        if (isCurrent) {
          playIcon.classList.add('hidden');
          pauseIcon.classList.remove('hidden');
        } else {
          playIcon.classList.remove('hidden');
          pauseIcon.classList.add('hidden');
        }
      }
    });

    // 2. Engine Audition buttons in Models tab
    document.querySelectorAll('.btn-audition-engine').forEach(btn => {
      const aId = btn.getAttribute('data-audition-id');
      const isCurrent = aId === state.previewVoiceId && state.isPreviewPlaying;
      btn.classList.toggle('playing', isCurrent);
      const icon = btn.querySelector('.material-symbols-outlined');
      if (icon) {
        icon.textContent = isCurrent ? 'pause' : 'play_arrow';
      }
    });

    // 3. Active Persona Quick Sample in Studio
    const dockSampleBtn = document.getElementById('btn-dock-voice-sample');
    if (dockSampleBtn) {
      const activePId = getActiveVoicePreviewId();
      const isCurrent = activePId === state.previewVoiceId && state.isPreviewPlaying;
      dockSampleBtn.classList.toggle('playing', isCurrent);
      const icon = dockSampleBtn.querySelector('#sample-icon') || dockSampleBtn.querySelector('.material-symbols-outlined');
      if (icon) icon.textContent = isCurrent ? 'pause' : 'play_arrow';
      const label = dockSampleBtn.querySelector('span:not(.material-symbols-outlined)');
      if (label) label.textContent = isCurrent ? 'Playing' : 'Sample';
    }
  }

  // Render filter pills specific to the active provider
  function renderProviderFilterPills(provider) {
    if (!el.drawerFilters) return;
    const current = state.voiceFilter || 'all';

    if (provider === 'mistral') {
      el.drawerFilters.innerHTML = `
        <button class="filter-pill ${current === 'all' ? 'active' : ''}" data-filter="all">All Personas (4)</button>
        <button class="filter-pill filter-pill-fav ${current === 'favorites' ? 'active' : ''}" data-filter="favorites" id="filter-pill-fav">
          <svg class="star-pill-icon" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          <span>Favorites</span>
          <span class="pill-count-badge" id="fav-count-badge">${state.favoriteVoices.size}</span>
        </button>
        <button class="filter-pill ${current === 'Female' ? 'active' : ''}" data-filter="Female">Female</button>
        <button class="filter-pill ${current === 'Male' ? 'active' : ''}" data-filter="Male">Male</button>
      `;
    } else if (provider === 'elevenlabs') {
      el.drawerFilters.innerHTML = `
        <button class="filter-pill ${current === 'all' ? 'active' : ''}" data-filter="all">All Voices (21)</button>
        <button class="filter-pill filter-pill-fav ${current === 'favorites' ? 'active' : ''}" data-filter="favorites" id="filter-pill-fav">
          <svg class="star-pill-icon" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          <span>Favorites</span>
          <span class="pill-count-badge" id="fav-count-badge">${state.favoriteVoices.size}</span>
        </button>
        <button class="filter-pill ${current === 'Female' ? 'active' : ''}" data-filter="Female">Female</button>
        <button class="filter-pill ${current === 'Male' ? 'active' : ''}" data-filter="Male">Male</button>
        <button class="filter-pill ${current === 'recommended' ? 'active' : ''}" data-filter="recommended">Curated Picks</button>
      `;
    } else if (provider === 'cartesia') {
      el.drawerFilters.innerHTML = `
        <button class="filter-pill ${current === 'all' ? 'active' : ''}" data-filter="all">All Voices (8)</button>
        <button class="filter-pill filter-pill-fav ${current === 'favorites' ? 'active' : ''}" data-filter="favorites" id="filter-pill-fav">
          <svg class="star-pill-icon" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          <span>Favorites</span>
          <span class="pill-count-badge" id="fav-count-badge">${state.favoriteVoices.size}</span>
        </button>
        <button class="filter-pill ${current === 'Female' ? 'active' : ''}" data-filter="Female">Female</button>
        <button class="filter-pill ${current === 'Male' ? 'active' : ''}" data-filter="Male">Male</button>
      `;
    } else if (provider === 'gemini') {
      el.drawerFilters.innerHTML = `
        <button class="filter-pill ${current === 'all' ? 'active' : ''}" data-filter="all">All Voices (5)</button>
        <button class="filter-pill filter-pill-fav ${current === 'favorites' ? 'active' : ''}" data-filter="favorites" id="filter-pill-fav">
          <svg class="star-pill-icon" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          <span>Favorites</span>
          <span class="pill-count-badge" id="fav-count-badge">${state.favoriteVoices.size}</span>
        </button>
        <button class="filter-pill ${current === 'Female' ? 'active' : ''}" data-filter="Female">Female</button>
        <button class="filter-pill ${current === 'Male' ? 'active' : ''}" data-filter="Male">Male</button>
      `;
    } else if (provider === 'groq') {
      el.drawerFilters.innerHTML = `
        <button class="filter-pill ${current === 'all' ? 'active' : ''}" data-filter="all">All Voices (12)</button>
        <button class="filter-pill filter-pill-fav ${current === 'favorites' ? 'active' : ''}" data-filter="favorites" id="filter-pill-fav">
          <svg class="star-pill-icon" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          <span>Favorites</span>
          <span class="pill-count-badge" id="fav-count-badge">${state.favoriteVoices.size}</span>
        </button>
        <button class="filter-pill ${current === 'English' ? 'active' : ''}" data-filter="English">English (6)</button>
        <button class="filter-pill ${current === 'Arabic' ? 'active' : ''}" data-filter="Arabic">Saudi Arabic (6)</button>
        <button class="filter-pill ${current === 'Female' ? 'active' : ''}" data-filter="Female">Female</button>
        <button class="filter-pill ${current === 'Male' ? 'active' : ''}" data-filter="Male">Male</button>
      `;
    } else if (provider === 'cloudflare') {
      el.drawerFilters.innerHTML = `
        <button class="filter-pill ${current === 'all' ? 'active' : ''}" data-filter="all">All Accents (9)</button>
        <button class="filter-pill filter-pill-fav ${current === 'favorites' ? 'active' : ''}" data-filter="favorites" id="filter-pill-fav">
          <svg class="star-pill-icon" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          <span>Favorites</span>
          <span class="pill-count-badge" id="fav-count-badge">${state.favoriteVoices.size}</span>
        </button>
      `;
    } else if (provider === 'fish') {
      el.drawerFilters.innerHTML = `
        <button class="filter-pill active" data-filter="all">All Voices (1)</button>
      `;
    } else {
      // Deepgram
      el.drawerFilters.innerHTML = `
        <button class="filter-pill ${current === 'all' ? 'active' : ''}" data-filter="all">All Voices (36)</button>
        <button class="filter-pill filter-pill-fav ${current === 'favorites' ? 'active' : ''}" data-filter="favorites" id="filter-pill-fav">
          <svg class="star-pill-icon" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          <span>Favorites</span>
          <span class="pill-count-badge" id="fav-count-badge">${state.favoriteVoices.size}</span>
        </button>
        <button class="filter-pill ${current === 'Female' ? 'active' : ''}" data-filter="Female">Female</button>
        <button class="filter-pill ${current === 'Male' ? 'active' : ''}" data-filter="Male">Male</button>
        <button class="filter-pill ${current === 'recommended' ? 'active' : ''}" data-filter="recommended">Curated Picks</button>
      `;
    }
  }

  // --- Strict Provider-Locked Voice Drawer Renderer ---
  function renderDrawerVoices() {
    const grid = el.drawerVoicesList;
    if (!grid) return;
    const query = (el.voiceSearchField.value || '').trim().toLowerCase();
    const filter = state.voiceFilter || 'all';
    const provider = getActiveProvider();

    updateFavBadge();

    // 1. Sync Provider Switcher Tabs in Drawer
    if (el.drawerProviderTabs) {
      el.drawerProviderTabs.querySelectorAll('.provider-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-provider') === provider);
      });
    }

    // 2. Sync Provider Header Badge & Title
    if (el.drawerProviderBadge) {
      if (provider === 'mistral') el.drawerProviderBadge.textContent = 'Mistral Voxtral';
      else if (provider === 'elevenlabs') el.drawerProviderBadge.textContent = 'ElevenLabs Studio';
      else if (provider === 'fish') el.drawerProviderBadge.textContent = 'Fish Audio';
      else if (provider === 'cartesia') el.drawerProviderBadge.textContent = 'Cartesia Sonic';
      else if (provider === 'gemini') el.drawerProviderBadge.textContent = 'Google Gemini';
      else if (provider === 'groq') el.drawerProviderBadge.textContent = 'Groq Orpheus';
      else if (provider === 'cloudflare') el.drawerProviderBadge.textContent = 'Cloudflare MeloTTS';
      else el.drawerProviderBadge.textContent = 'Deepgram Flux';
    }

    if (el.drawerTitleText) {
      if (provider === 'mistral') el.drawerTitleText.textContent = 'Select Persona & Emotion';
      else if (provider === 'elevenlabs') el.drawerTitleText.textContent = 'Select Studio Voice';
      else if (provider === 'fish') el.drawerTitleText.textContent = 'Select Fish Audio Voice';
      else if (provider === 'cartesia') el.drawerTitleText.textContent = 'Select Sonic Voice';
      else if (provider === 'gemini') el.drawerTitleText.textContent = 'Select Gemini Voice Actor';
      else if (provider === 'groq') el.drawerTitleText.textContent = 'Select Orpheus Voice';
      else if (provider === 'cloudflare') el.drawerTitleText.textContent = 'Select MeloTTS Accent';
      else el.drawerTitleText.textContent = 'Select Voice Actor';
    }

    // 3. Render Provider-Specific Filters
    renderProviderFilterPills(provider);

    grid.innerHTML = '';

    // =====================================================================
    // PROVIDER 1: MISTRAL VOXTRAL (Condensed 4-Persona Hierarchy)
    // =====================================================================
    if (provider === 'mistral') {
      const personas = MISTRAL_PERSONAS.filter(p => {
        if (filter === 'favorites' && !state.favoriteVoices.has(p.id) && !p.emotions.some(e => state.favoriteVoices.has(e.id))) return false;
        if (filter === 'Female' && p.gender !== 'Female') return false;
        if (filter === 'Male' && p.gender !== 'Male') return false;

        if (query) {
          const text = `${p.name} ${p.accent} ${p.gender} ${p.tone} ${p.emotions.map(e => e.label).join(' ')}`.toLowerCase();
          if (!text.includes(query)) return false;
        }
        return true;
      });

      el.drawerVoiceCount.textContent = `${personas.length} Personas • 30 Emotions Available`;

      if (personas.length === 0) {
        renderEmptyState(grid, filter);
        return;
      }

      personas.forEach(p => {
        const isFav = state.favoriteVoices.has(p.id);
        const isCurrentPreview = state.previewVoiceId === p.previewId && state.isPreviewPlaying;
        const currentActiveEmotion = getActiveEmotionForPersona(p);
        const isPersonaActive = getPersonaForVoice(state.voice)?.id === p.id;

        const card = document.createElement('div');
        card.className = `persona-card ${isPersonaActive ? 'active' : ''}`;

        // Header Row: Avatar, Persona details, Preview Button & Favorite Star
        const headerRow = document.createElement('div');
        headerRow.className = 'persona-header-row';
        headerRow.innerHTML = `
          <div class="persona-left">
            <div class="persona-avatar">${p.name[0]}</div>
            <div class="persona-info">
              <div class="persona-name-line">
                <span class="persona-name">${p.name}</span>
                <span class="persona-selected-emotion-tag">${currentActiveEmotion ? currentActiveEmotion.label : 'Default'}</span>
                ${p.recommended ? '<span class="card-pick">★ Pick</span>' : ''}
              </div>
              <span class="persona-meta">${p.gender} · ${p.accent}</span>
              <span class="persona-tone">${p.tone}</span>
            </div>
          </div>
          <div class="persona-actions">
            <button class="voice-preview-btn ${isCurrentPreview ? 'playing' : ''}" data-voice-id="${p.previewId}" title="Listen to ${p.name}'s voice sample">
              <svg class="preview-icon-play ${isCurrentPreview ? 'hidden' : ''}" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="6 4 20 12 6 20 6 4"/>
              </svg>
              <svg class="preview-icon-pause ${isCurrentPreview ? '' : 'hidden'}" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16"/>
                <rect x="14" y="4" width="4" height="16"/>
              </svg>
            </button>
            <button class="voice-fav-btn ${isFav ? 'favorited' : ''}" data-voice-id="${p.id}" title="Toggle Favorite">
              <svg viewBox="0 0 24 24" fill="${isFav ? '#f59e0b' : 'none'}" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </button>
          </div>
        `;

        // Secondary Emotion Selector Layer
        const emotionsDrawer = document.createElement('div');
        emotionsDrawer.className = 'persona-emotions-drawer';
        
        const emotionsLabel = document.createElement('div');
        emotionsLabel.className = 'emotions-header-label';
        emotionsLabel.innerHTML = `<span>Select Emotion / Tone</span><span style="font-size:0.62rem;color:var(--text-ghost)">${p.emotions.length} expressions</span>`;
        emotionsDrawer.appendChild(emotionsLabel);

        const chipsWrap = document.createElement('div');
        chipsWrap.className = 'persona-emotion-chips';

        p.emotions.forEach(emo => {
          const chip = document.createElement('button');
          const isSelected = state.voice === emo.id;
          chip.className = `emotion-chip ${isSelected ? 'active' : ''}`;
          chip.textContent = emo.label;
          chip.setAttribute('data-voice-id', emo.id);

          chip.addEventListener('click', (e) => {
            e.stopPropagation();
            state.voice = emo.id;
            syncVoicePill();

            // Update all emotion chips active states in this card
            chipsWrap.querySelectorAll('.emotion-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');

            // Update persona tag
            const tag = headerRow.querySelector('.persona-selected-emotion-tag');
            if (tag) tag.textContent = emo.label;

            // Mark persona card active
            document.querySelectorAll('.persona-card').forEach(pc => pc.classList.remove('active'));
            card.classList.add('active');

            // toast silenced for calm UX
          });

          chipsWrap.appendChild(chip);
        });

        emotionsDrawer.appendChild(chipsWrap);

        // Header click selects the persona with active emotion & closes drawer
        headerRow.addEventListener('click', (e) => {
          if (e.target.closest('.persona-actions')) return;
          const targetVoice = currentActiveEmotion ? currentActiveEmotion.id : p.defaultEmotion;
          state.voice = targetVoice;
          syncVoicePill();
          closeVoiceDrawer();
          // toast silenced for calm UX
        });

        const previewBtn = headerRow.querySelector('.voice-preview-btn');
        previewBtn.addEventListener('click', (e) => {
          playVoicePreview(p.previewId, e);
        });

        const favBtn = headerRow.querySelector('.voice-fav-btn');
        favBtn.addEventListener('click', (e) => {
          toggleVoiceFavorite(p.id, e);
        });

        card.appendChild(headerRow);
        card.appendChild(emotionsDrawer);
        grid.appendChild(card);
      });
      return;
    }

    // =====================================================================
    // PROVIDER 2: FISH AUDIO (S2.1 Multi-Voice)
    // =====================================================================
    if (provider === 'fish') {
      el.drawerVoiceCount.textContent = '1 Voice Available';
      const card = document.createElement('div');
      const isCurrentPreview = state.previewVoiceId === 'alloy' && state.isPreviewPlaying;
      card.className = `voice-select-card ${state.voice === 'alloy' ? 'active' : ''}`;
      card.innerHTML = `
        <div class="card-left">
          <div class="card-avatar" style="background:rgba(56,189,248,0.15);color:#38bdf8;">F</div>
          <div class="card-details">
            <div class="card-name-row">
              <span class="card-name">Fish Audio S2.1 Pro</span>
              <span class="card-pick" style="background:rgba(56,189,248,0.18);color:#38bdf8;border:1px solid rgba(56,189,248,0.3)">Expressive</span>
            </div>
            <span class="card-accent">Multilingual · Adaptive Neural</span>
            <span class="card-tone">Dynamic storytelling and high acoustic fidelity</span>
          </div>
        </div>
        <div class="card-actions">
          <button class="voice-preview-btn ${isCurrentPreview ? 'playing' : ''}" data-voice-id="alloy" title="Listen to Voice Sample">
            <svg class="preview-icon-play ${isCurrentPreview ? 'hidden' : ''}" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="6 4 20 12 6 20 6 4"/>
            </svg>
            <svg class="preview-icon-pause ${isCurrentPreview ? '' : 'hidden'}" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16"/>
              <rect x="14" y="4" width="4" height="16"/>
            </svg>
          </button>
        </div>
      `;

      card.addEventListener('click', (e) => {
        if (e.target.closest('.card-actions')) return;
        state.voice = 'alloy';
        syncVoicePill();
        closeVoiceDrawer();
        // toast silenced for calm UX
      });

      const previewBtn = card.querySelector('.voice-preview-btn');
      previewBtn.addEventListener('click', (e) => {
        playVoicePreview('alloy', e);
      });

      grid.appendChild(card);
      return;
    }

    // =====================================================================
    // PROVIDER: CARTESIA SONIC (Ultra-Realistic Low Latency)
    // =====================================================================
    if (provider === 'cartesia') {
      const cartesiaVoices = DEFAULT_CARTESIA_VOICES.filter(v => {
        if (filter === 'favorites' && !state.favoriteVoices.has(v.id)) return false;
        if (filter === 'Female' && v.gender !== 'Female') return false;
        if (filter === 'Male' && v.gender !== 'Male') return false;
        if (query) {
          const text = `${v.name} ${v.accent} ${v.gender} ${v.tone}`.toLowerCase();
          if (!text.includes(query)) return false;
        }
        return true;
      });

      el.drawerVoiceCount.textContent = `${cartesiaVoices.length} Sonic Voices Available`;

      if (cartesiaVoices.length === 0) {
        renderEmptyState(grid, filter);
        return;
      }

      cartesiaVoices.forEach(v => {
        const isFav = state.favoriteVoices.has(v.id);
        const isCurrentPreview = state.previewVoiceId === v.id && state.isPreviewPlaying;
        const card = document.createElement('div');
        card.className = `voice-select-card ${state.voice === v.id ? 'active' : ''}`;
        card.innerHTML = `
          <div class="card-left">
            <div class="card-avatar" style="background:rgba(236,72,153,0.15);color:#ec4899;">${v.name[0]}</div>
            <div class="card-details">
              <div class="card-name-row">
                <span class="card-name">${v.name}</span>
                ${v.recommended ? '<span class="card-pick" style="background:rgba(236,72,153,0.18);color:#ec4899;border:1px solid rgba(236,72,153,0.3)">★ Sonic</span>' : ''}
              </div>
              <span class="card-accent">${v.gender} · ${v.accent}</span>
              ${v.tone ? `<span class="card-tone">${v.tone}</span>` : ''}
            </div>
          </div>
          <div class="card-actions">
            <button class="voice-preview-btn ${isCurrentPreview ? 'playing' : ''}" data-voice-id="${v.id}" title="Listen to Voice Sample">
              <svg class="preview-icon-play ${isCurrentPreview ? 'hidden' : ''}" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="6 4 20 12 6 20 6 4"/>
              </svg>
              <svg class="preview-icon-pause ${isCurrentPreview ? '' : 'hidden'}" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16"/>
                <rect x="14" y="4" width="4" height="16"/>
              </svg>
            </button>
            <button class="voice-fav-btn ${isFav ? 'favorited' : ''}" data-voice-id="${v.id}" title="Toggle Favorite">
              <svg viewBox="0 0 24 24" fill="${isFav ? '#f59e0b' : 'none'}" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </button>
          </div>
        `;

        card.addEventListener('click', (e) => {
          if (e.target.closest('.card-actions')) return;
          state.voice = v.id;
          if (!state.model || !state.model.includes('cartesia')) {
            setModel('cartesia/sonic-3.6');
          }
          syncVoicePill();
          closeVoiceDrawer();
          // toast silenced for calm UX
        });

        const previewBtn = card.querySelector('.voice-preview-btn');
        previewBtn.addEventListener('click', (e) => {
          playVoicePreview(v.id, e);
        });

        const favBtn = card.querySelector('.voice-fav-btn');
        favBtn.addEventListener('click', (e) => {
          toggleVoiceFavorite(v.id, e);
        });

        grid.appendChild(card);
      });
      return;
    }

    // =====================================================================
    // PROVIDER: GOOGLE GEMINI (Multimodal Neural TTS)
    // =====================================================================
    if (provider === 'gemini') {
      const geminiVoices = DEFAULT_GEMINI_VOICES.filter(v => {
        if (filter === 'favorites' && !state.favoriteVoices.has(v.id)) return false;
        if (filter === 'Female' && v.gender !== 'Female') return false;
        if (filter === 'Male' && v.gender !== 'Male') return false;
        if (query) {
          const text = `${v.name} ${v.accent} ${v.gender} ${v.tone}`.toLowerCase();
          if (!text.includes(query)) return false;
        }
        return true;
      });

      el.drawerVoiceCount.textContent = `${geminiVoices.length} Gemini Voices Available`;

      if (geminiVoices.length === 0) {
        renderEmptyState(grid, filter);
        return;
      }

      geminiVoices.forEach(v => {
        const isFav = state.favoriteVoices.has(v.id);
        const isCurrentPreview = state.previewVoiceId === v.id && state.isPreviewPlaying;
        const card = document.createElement('div');
        card.className = `voice-select-card ${state.voice === v.id ? 'active' : ''}`;
        card.innerHTML = `
          <div class="card-left">
            <div class="card-avatar" style="background:rgba(59,130,246,0.15);color:#3b82f6;">${v.name[0]}</div>
            <div class="card-details">
              <div class="card-name-row">
                <span class="card-name">${v.name}</span>
                ${v.recommended ? '<span class="card-pick" style="background:rgba(59,130,246,0.18);color:#3b82f6;border:1px solid rgba(59,130,246,0.3)">★ Gemini</span>' : ''}
              </div>
              <span class="card-accent">${v.gender} · ${v.accent}</span>
              ${v.tone ? `<span class="card-tone">${v.tone}</span>` : ''}
            </div>
          </div>
          <div class="card-actions">
            <button class="voice-preview-btn ${isCurrentPreview ? 'playing' : ''}" data-voice-id="${v.id}" title="Listen to Voice Sample">
              <svg class="preview-icon-play ${isCurrentPreview ? 'hidden' : ''}" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="6 4 20 12 6 20 6 4"/>
              </svg>
              <svg class="preview-icon-pause ${isCurrentPreview ? '' : 'hidden'}" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16"/>
                <rect x="14" y="4" width="4" height="16"/>
              </svg>
            </button>
            <button class="voice-fav-btn ${isFav ? 'favorited' : ''}" data-voice-id="${v.id}" title="Toggle Favorite">
              <svg viewBox="0 0 24 24" fill="${isFav ? '#f59e0b' : 'none'}" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </button>
          </div>
        `;

        card.addEventListener('click', (e) => {
          if (e.target.closest('.card-actions')) return;
          state.voice = v.id;
          if (!state.model || !state.model.includes('gemini')) {
            setModel('google/gemini-2.5-flash-tts');
          }
          syncVoicePill();
          closeVoiceDrawer();
          // toast silenced for calm UX
        });

        const previewBtn = card.querySelector('.voice-preview-btn');
        previewBtn.addEventListener('click', (e) => {
          playVoicePreview(v.id, e);
        });

        const favBtn = card.querySelector('.voice-fav-btn');
        favBtn.addEventListener('click', (e) => {
          toggleVoiceFavorite(v.id, e);
        });

        grid.appendChild(card);
      });
      return;
    }

    // =====================================================================
    // PROVIDER: GROQ ORPHEUS (English & Saudi Arabic)
    // =====================================================================
    if (provider === 'groq') {
      const groqVoices = DEFAULT_GROQ_ORPHEUS_VOICES.filter(v => {
        if (filter === 'favorites' && !state.favoriteVoices.has(v.id)) return false;
        if (filter === 'Female' && v.gender !== 'Female') return false;
        if (filter === 'Male' && v.gender !== 'Male') return false;
        if (filter === 'English' && !v.model.includes('english')) return false;
        if (filter === 'Arabic' && !v.model.includes('arabic')) return false;
        if (query) {
          const text = `${v.name} ${v.accent} ${v.gender} ${v.tone}`.toLowerCase();
          if (!text.includes(query)) return false;
        }
        return true;
      });

      el.drawerVoiceCount.textContent = `${groqVoices.length} Orpheus Voices Available`;

      if (groqVoices.length === 0) {
        renderEmptyState(grid, filter);
        return;
      }

      groqVoices.forEach(v => {
        const isFav = state.favoriteVoices.has(v.id);
        const isCurrentPreview = state.previewVoiceId === v.id && state.isPreviewPlaying;
        const isArabic = v.model.includes('arabic');
        const card = document.createElement('div');
        card.className = `voice-select-card ${state.voice === v.id ? 'active' : ''}`;
        card.innerHTML = `
          <div class="card-left">
            <div class="card-avatar" style="background:rgba(249,115,22,0.15);color:#f97316;">${v.name[0]}</div>
            <div class="card-details">
              <div class="card-name-row">
                <span class="card-name">${v.name}</span>
                ${isArabic ? '<span class="card-pick" style="background:rgba(16,185,129,0.18);color:#10b981;border:1px solid rgba(16,185,129,0.3)">🇸🇦 Saudi</span>' : '<span class="card-pick" style="background:rgba(249,115,22,0.18);color:#f97316;border:1px solid rgba(249,115,22,0.3)">Groq LPU</span>'}
              </div>
              <span class="card-accent">${v.gender} · ${v.accent}</span>
              ${v.tone ? `<span class="card-tone">${v.tone}</span>` : ''}
            </div>
          </div>
          <div class="card-actions">
            <button class="voice-preview-btn ${isCurrentPreview ? 'playing' : ''}" data-voice-id="${v.id}" title="Listen to Voice Sample">
              <svg class="preview-icon-play ${isCurrentPreview ? 'hidden' : ''}" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="6 4 20 12 6 20 6 4"/>
              </svg>
              <svg class="preview-icon-pause ${isCurrentPreview ? '' : 'hidden'}" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16"/>
                <rect x="14" y="4" width="4" height="16"/>
              </svg>
            </button>
            <button class="voice-fav-btn ${isFav ? 'favorited' : ''}" data-voice-id="${v.id}" title="Toggle Favorite">
              <svg viewBox="0 0 24 24" fill="${isFav ? '#f59e0b' : 'none'}" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </button>
          </div>
        `;

        card.addEventListener('click', (e) => {
          if (e.target.closest('.card-actions')) return;
          state.voice = v.id;
          if (v.model.includes('arabic')) {
            setModel('groq/orpheus-arabic');
          } else {
            setModel('groq/orpheus-english');
          }
          syncVoicePill();
          closeVoiceDrawer();
          // toast silenced for calm UX
        });

        const previewBtn = card.querySelector('.voice-preview-btn');
        previewBtn.addEventListener('click', (e) => {
          playVoicePreview(v.id, e);
        });

        const favBtn = card.querySelector('.voice-fav-btn');
        favBtn.addEventListener('click', (e) => {
          toggleVoiceFavorite(v.id, e);
        });

        grid.appendChild(card);
      });
      return;
    }

    // =====================================================================
    // PROVIDER: CLOUDFLARE MELOTTS (Global Edge Fast Speech)
    // =====================================================================
    if (provider === 'cloudflare') {
      const cfVoices = DEFAULT_CLOUDFLARE_VOICES.filter(v => {
        if (filter === 'favorites' && !state.favoriteVoices.has(v.id)) return false;
        if (query) {
          const text = `${v.name} ${v.accent} ${v.tone}`.toLowerCase();
          if (!text.includes(query)) return false;
        }
        return true;
      });

      el.drawerVoiceCount.textContent = `${cfVoices.length} MeloTTS Accents Available`;

      if (cfVoices.length === 0) {
        renderEmptyState(grid, filter);
        return;
      }

      cfVoices.forEach(v => {
        const isFav = state.favoriteVoices.has(v.id);
        const isCurrentPreview = state.previewVoiceId === v.id && state.isPreviewPlaying;
        const card = document.createElement('div');
        card.className = `voice-select-card ${state.voice === v.id ? 'active' : ''}`;
        card.innerHTML = `
          <div class="card-left">
            <div class="card-avatar" style="background:rgba(245,158,11,0.15);color:#f59e0b;">M</div>
            <div class="card-details">
              <div class="card-name-row">
                <span class="card-name">${v.name}</span>
                <span class="card-pick" style="background:rgba(245,158,11,0.18);color:#f59e0b;border:1px solid rgba(245,158,11,0.3)">Edge Cloudflare</span>
              </div>
              <span class="card-accent">${v.accent}</span>
              ${v.tone ? `<span class="card-tone">${v.tone}</span>` : ''}
            </div>
          </div>
          <div class="card-actions">
            <button class="voice-preview-btn ${isCurrentPreview ? 'playing' : ''}" data-voice-id="${v.id}" title="Listen to Voice Sample">
              <svg class="preview-icon-play ${isCurrentPreview ? 'hidden' : ''}" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="6 4 20 12 6 20 6 4"/>
              </svg>
              <svg class="preview-icon-pause ${isCurrentPreview ? '' : 'hidden'}" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16"/>
                <rect x="14" y="4" width="4" height="16"/>
              </svg>
            </button>
            <button class="voice-fav-btn ${isFav ? 'favorited' : ''}" data-voice-id="${v.id}" title="Toggle Favorite">
              <svg viewBox="0 0 24 24" fill="${isFav ? '#f59e0b' : 'none'}" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </button>
          </div>
        `;

        card.addEventListener('click', (e) => {
          if (e.target.closest('.card-actions')) return;
          state.voice = v.id;
          if (!state.model || !state.model.includes('cloudflare') && !state.model.includes('melotts')) {
            setModel('cloudflare/melotts');
          }
          syncVoicePill();
          closeVoiceDrawer();
          // toast silenced for calm UX
        });

        const previewBtn = card.querySelector('.voice-preview-btn');
        previewBtn.addEventListener('click', (e) => {
          playVoicePreview(v.id, e);
        });

        const favBtn = card.querySelector('.voice-fav-btn');
        favBtn.addEventListener('click', (e) => {
          toggleVoiceFavorite(v.id, e);
        });

        grid.appendChild(card);
      });
      return;
    }

    // =====================================================================
    // PROVIDER: ELEVENLABS (21 Official Studio Voices)
    // =====================================================================
    if (provider === 'elevenlabs') {
      const elevenVoices = DEFAULT_ELEVENLABS_VOICES.filter(v => {
        if (filter === 'favorites' && !state.favoriteVoices.has(v.id)) return false;
        if (filter === 'Female' && v.gender !== 'Female') return false;
        if (filter === 'Male' && v.gender !== 'Male') return false;
        if (filter === 'recommended' && !v.recommended) return false;
        if (query) {
          const text = `${v.name} ${v.accent} ${v.gender} ${v.tone}`.toLowerCase();
          if (!text.includes(query)) return false;
        }
        return true;
      });

      el.drawerVoiceCount.textContent = `${elevenVoices.length} Studio Voices Available`;

      if (elevenVoices.length === 0) {
        renderEmptyState(grid, filter);
        return;
      }

      elevenVoices.forEach(v => {
        const isFav = state.favoriteVoices.has(v.id);
        const isCurrentPreview = state.previewVoiceId === v.id && state.isPreviewPlaying;
        const card = document.createElement('div');
        card.className = `voice-select-card ${state.voice === v.id ? 'active' : ''}`;
        card.innerHTML = `
          <div class="card-left">
            <div class="card-avatar" style="background:rgba(168,85,247,0.15);color:#a855f7;">${v.name[0]}</div>
            <div class="card-details">
              <div class="card-name-row">
                <span class="card-name">${v.name}</span>
                ${v.recommended ? '<span class="card-pick" style="background:rgba(168,85,247,0.18);color:#a855f7;border:1px solid rgba(168,85,247,0.3)">★ Studio</span>' : ''}
              </div>
              <span class="card-accent">${v.gender} · ${v.accent}</span>
              ${v.tone ? `<span class="card-tone">${v.tone}</span>` : ''}
            </div>
          </div>
          <div class="card-actions">
            <button class="voice-preview-btn ${isCurrentPreview ? 'playing' : ''}" data-voice-id="${v.id}" title="Listen to Voice Sample">
              <svg class="preview-icon-play ${isCurrentPreview ? 'hidden' : ''}" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="6 4 20 12 6 20 6 4"/>
              </svg>
              <svg class="preview-icon-pause ${isCurrentPreview ? '' : 'hidden'}" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16"/>
                <rect x="14" y="4" width="4" height="16"/>
              </svg>
            </button>
            <button class="voice-fav-btn ${isFav ? 'favorited' : ''}" data-voice-id="${v.id}" title="Toggle Favorite">
              <svg viewBox="0 0 24 24" fill="${isFav ? '#f59e0b' : 'none'}" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </button>
          </div>
        `;

        card.addEventListener('click', (e) => {
          if (e.target.closest('.card-actions')) return;
          state.voice = v.id;
          if (!state.model || !state.model.includes('elevenlabs')) {
            setModel('elevenlabs/multilingual-v2');
          }
          syncVoicePill();
          closeVoiceDrawer();
          // toast silenced for calm UX
        });

        const previewBtn = card.querySelector('.voice-preview-btn');
        previewBtn.addEventListener('click', (e) => {
          playVoicePreview(v.id, e);
        });

        const favBtn = card.querySelector('.voice-fav-btn');
        favBtn.addEventListener('click', (e) => {
          toggleVoiceFavorite(v.id, e);
        });

        grid.appendChild(card);
      });
      return;
    }

    // =====================================================================
    // PROVIDER 3: DEEPGRAM FLUX (36 Broadcast Voices)
    // =====================================================================
    const deepgramVoices = state.voicesCatalog.filter(v => {
      // STRICT FILTER: Only Deepgram voices starting with flux-
      if (!v.id.startsWith('flux-')) return false;

      if (filter === 'favorites' && !state.favoriteVoices.has(v.id)) return false;
      if (filter === 'Female' && v.gender !== 'Female') return false;
      if (filter === 'Male' && v.gender !== 'Male') return false;
      if (filter === 'recommended' && !v.recommended) return false;

      if (query) {
        const text = `${v.name} ${v.accent} ${v.gender} ${v.tone}`.toLowerCase();
        if (!text.includes(query)) return false;
      }
      return true;
    });

    el.drawerVoiceCount.textContent = `${deepgramVoices.length} Voices Available`;

    if (deepgramVoices.length === 0) {
      renderEmptyState(grid, filter);
      return;
    }

    deepgramVoices.forEach(v => {
      const isFav = state.favoriteVoices.has(v.id);
      const isCurrentPreview = state.previewVoiceId === v.id && state.isPreviewPlaying;

      const card = document.createElement('div');
      card.className = `voice-select-card ${state.voice === v.id ? 'active' : ''}`;
      card.innerHTML = `
        <div class="card-left">
          <div class="card-avatar">${v.name[0]}</div>
          <div class="card-details">
            <div class="card-name-row">
              <span class="card-name">${v.name}</span>
              ${v.recommended ? '<span class="card-pick">★ Pick</span>' : ''}
            </div>
            <span class="card-accent">${v.gender} · ${v.accent}</span>
            ${v.tone ? `<span class="card-tone">${v.tone}</span>` : ''}
          </div>
        </div>
        <div class="card-actions">
          <button class="voice-preview-btn ${isCurrentPreview ? 'playing' : ''}" data-voice-id="${v.id}" title="Listen to Voice Sample">
            <svg class="preview-icon-play ${isCurrentPreview ? 'hidden' : ''}" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="6 4 20 12 6 20 6 4"/>
            </svg>
            <svg class="preview-icon-pause ${isCurrentPreview ? '' : 'hidden'}" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16"/>
              <rect x="14" y="4" width="4" height="16"/>
            </svg>
          </button>
          <button class="voice-fav-btn ${isFav ? 'favorited' : ''}" data-voice-id="${v.id}" title="Toggle Favorite">
            <svg viewBox="0 0 24 24" fill="${isFav ? '#f59e0b' : 'none'}" stroke="currentColor" stroke-width="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </button>
        </div>
      `;

      card.addEventListener('click', (e) => {
        if (e.target.closest('.card-actions')) return;
        state.voice = v.id;
        syncVoicePill();
        closeVoiceDrawer();
        // toast silenced for calm UX
      });

      const previewBtn = card.querySelector('.voice-preview-btn');
      previewBtn.addEventListener('click', (e) => {
        playVoicePreview(v.id, e);
      });

      const favBtn = card.querySelector('.voice-fav-btn');
      favBtn.addEventListener('click', (e) => {
        toggleVoiceFavorite(v.id, e);
      });

      grid.appendChild(card);
    });
  }

  function renderEmptyState(grid, filter) {
    const empty = document.createElement('div');
    empty.className = 'empty-voice-state';
    empty.style.gridColumn = '1 / -1';
    empty.style.padding = '36px 20px';
    empty.style.textAlign = 'center';
    empty.style.color = 'var(--text-muted)';
    empty.style.fontSize = '0.86rem';
    empty.innerHTML = filter === 'favorites'
      ? '<div style="font-size:1.5rem;margin-bottom:8px">★</div><strong>No favorite voices saved yet.</strong><br><span style="font-size:0.75rem;color:var(--text-ghost);margin-top:4px;display:inline-block">Click the star button on any voice card to pin it here.</span>'
      : 'No voices found matching your search.';
    grid.appendChild(empty);
  }

  // --- Interactive Real-Time Sync & Karaoke Stage Setup ---
  function setupInteractiveReader() {
    if (el.btnToggleReader) {
      el.btnToggleReader.addEventListener('click', () => {
        if (state.isSyncStageVisible) {
          switchToEditor();
        } else {
          switchToSyncStage();
        }
      });
    }

    if (el.btnStageCancel) {
      el.btnStageCancel.addEventListener('click', () => {
        if (state.playbackQueue && typeof state.playbackQueue.stop === 'function') {
          state.playbackQueue.stop();
        }
        state.audioElement.pause();
        state.isPlaying = false;
        if (el.dockBtnPlay) el.dockBtnPlay.classList.remove('playing');
        showToast('Audio playback stopped', 'info', 1800);
      });
    }

    if (el.btnBackToEditor) {
      el.btnBackToEditor.addEventListener('click', () => {
        switchToEditor();
      });
    }

    // Continuous timeline ribbon scrubber
    if (el.ribbonTrack) {
      el.ribbonTrack.addEventListener('click', (e) => {
        const total = state.continuousDuration || (state.audioElement ? state.audioElement.duration : 0);
        if (!total) return;

        const rect = el.ribbonTrack.getBoundingClientRect();
        const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const seekTime = pos * total;

        const targetUrl = state.continuousMasterUrl || state.currentUrl;
        if (targetUrl && state.audioElement.src !== targetUrl) {
          if (state.playbackQueue) state.playbackQueue.isPlayingQueue = false;
          state.audioElement.src = targetUrl;
          state.audioElement.playbackRate = state.speed;
          state.audioElement.preservesPitch = true;

          state.audioElement.addEventListener('loadedmetadata', () => {
            state.audioElement.currentTime = seekTime;
            state.audioElement.play().catch(() => {});
            updateRibbonPlayhead(seekTime);
            updateWordAndSentenceHighlight(seekTime);
            drawDockWaveform();
          }, { once: true });
          return;
        }

        state.audioElement.currentTime = seekTime;
        if (state.audioElement.paused) state.audioElement.play().catch(() => {});

        updateRibbonPlayhead(seekTime);
        updateWordAndSentenceHighlight(seekTime);
        drawDockWaveform();
      });
    }
  }

  function switchToSyncStage() {
    state.isSyncStageVisible = true;
    document.body.classList.add('reader-mode');
    if (el.textareaStage) el.textareaStage.classList.add('hidden');
    if (el.interactiveStage) el.interactiveStage.classList.remove('hidden');
    if (el.labelReaderToggle) el.labelReaderToggle.textContent = 'Edit Prompt';
  }

  function switchToEditor() {
    state.isSyncStageVisible = false;
    document.body.classList.remove('reader-mode');
    if (el.interactiveStage) el.interactiveStage.classList.add('hidden');
    if (el.textareaStage) el.textareaStage.classList.remove('hidden');
    if (el.labelReaderToggle) el.labelReaderToggle.textContent = 'Live Sync';
    if (el.textInput) el.textInput.focus();
  }

  // --- Real-Time Word & Sentence Canvas Rendering ---
  // Phones choke on 10k <span> nodes with 10k listeners. Two modes:
  //   * per-word (short scripts)     -> karaoke highlight, delegated clicks
  //   * per-sentence (long scripts)  -> a few hundred nodes, tap a line to seek
  const READER_WORD_MODE_LIMIT = 2200;

  function splitChunkIntoLines(chunkText) {
    const parts = chunkText.match(/[^.!?\n]+[.!?]+["')\]]*\s*|[^.!?\n]+\s*$/g) || [chunkText];
    return parts.map(p => p.trim()).filter(Boolean);
  }

  function renderInteractiveText(chunks) {
    if (!el.interactiveReadingBody) return;
    el.interactiveReadingBody.innerHTML = '';
    state.timelineWords = [];
    state.timelineSentences = [];
    state.timelineLines = [];
    state.wordIndexById = new Map();
    state.activeWordId = null;
    state.activeWordIdx = -1;
    state.activeSentenceIdx = -1;
    state.activeLineIdx = -1;
    state.highlightClock = -1;

    const allWordsCount = chunks.reduce((acc, c) => acc + c.split(/\s+/).filter(Boolean).length, 0);
    const estTotalSec = Math.max(2, (allWordsCount / 150) * 60 / state.speed);
    const perWordMode = allWordsCount <= READER_WORD_MODE_LIMIT;
    state.readerPerWordMode = perWordMode;

    const frag = document.createDocumentFragment();
    let cumulativeEstTime = 0;

    chunks.forEach((chunkText, sIdx) => {
      const sentenceDiv = document.createElement('div');
      sentenceDiv.className = 'reader-sentence';
      sentenceDiv.setAttribute('data-sentence-idx', String(sIdx));
      sentenceDiv.setAttribute('data-start', cumulativeEstTime.toFixed(2));

      const words = chunkText.split(/\s+/).filter(Boolean);
      const sentenceWords = [];
      const sEstDur = (words.length / Math.max(1, allWordsCount)) * estTotalSec;
      const chunkFirstWordIdx = state.timelineWords.length;
      const wordFrag = document.createDocumentFragment();

      // Long scripts: one block per sentence, so the active highlight is a
      // readable phrase instead of a 900-character wall of text.
      if (!perWordMode) {
        let cursor = 0;
        splitChunkIntoLines(chunkText).forEach((lineText) => {
          const count = lineText.split(/\s+/).filter(Boolean).length;
          if (!count) return;
          const lineEl = document.createElement('div');
          lineEl.className = 'reader-line';
          lineEl.setAttribute('data-line-idx', String(state.timelineLines.length));
          lineEl.textContent = lineText + ' ';
          sentenceDiv.appendChild(lineEl);
          state.timelineLines.push({
            element: lineEl,
            firstWordIdx: chunkFirstWordIdx + cursor,
            lastWordIdx: chunkFirstWordIdx + cursor + count - 1,
            chunkIdx: sIdx
          });
          cursor += count;
        });
      }

      words.forEach((wText, wIdx) => {
        const wordId = 'w_' + sIdx + '_' + wIdx;
        const wEstStart = cumulativeEstTime + (wIdx / words.length) * sEstDur;
        const wEstEnd = cumulativeEstTime + ((wIdx + 1) / words.length) * sEstDur;

        const wordObj = {
          id: wordId,
          text: wText,
          sentenceIdx: sIdx,
          wordIdx: wIdx,
          globalStart: parseFloat(wEstStart.toFixed(2)),
          globalEnd: parseFloat(wEstEnd.toFixed(2)),
          element: null
        };

        if (perWordMode) {
          const wSpan = document.createElement('span');
          wSpan.className = 'reader-word pending-alignment';
          wSpan.setAttribute('data-word-id', wordId);
          wSpan.textContent = wText + ' ';
          wordObj.element = wSpan;
          wordFrag.appendChild(wSpan);
        }

        sentenceWords.push(wordObj);
        state.timelineWords.push(wordObj);
        state.wordIndexById.set(wordId, wordObj);
      });

      if (perWordMode) sentenceDiv.appendChild(wordFrag);

      cumulativeEstTime += sEstDur;
      frag.appendChild(sentenceDiv);

      state.timelineSentences.push({
        idx: sIdx,
        text: chunkText,
        words: sentenceWords,
        element: sentenceDiv,
        globalStart: null,
        globalEnd: null,
        duration: null
      });
    });

    el.interactiveReadingBody.appendChild(frag);

    if (!state.readerClickWired) {
      state.readerClickWired = true;
      el.interactiveReadingBody.addEventListener('click', (e) => {
        const wordEl = e.target.closest('[data-word-id]');
        if (wordEl) {
          const wordObj = state.wordIndexById && state.wordIndexById.get(wordEl.getAttribute('data-word-id'));
          if (wordObj) handleWordClick(wordObj);
          return;
        }
        const sentEl = e.target.closest('.reader-sentence');
        if (sentEl) {
          const sIdx = parseInt(sentEl.getAttribute('data-sentence-idx'), 10);
          const sentence = state.timelineSentences[sIdx];
          if (sentence && sentence.words && sentence.words.length) {
            handleWordClick(sentence.words[0]);
          }
        }
      });
    }

    if (el.ribbonSegmentsBadge) {
      const label = perWordMode ? 'Sentences' : 'Lines';
      el.ribbonSegmentsBadge.textContent = chunks.length + ' ' + (chunks.length === 1 ? label.slice(0, -1) : label) + ' Initialized';
    }
  }

  // --- Click on Any Word on Screen to Seek Audio ---
  function handleWordClick(wordObj) {
    if (!state.audioElement) return;

    const seekTime = Math.max(0, (wordObj.globalStart || 0) + 0.02);

    if (state.playbackQueue) {
      state.playbackQueue.isPlayingQueue = false;
      if (typeof state.playbackQueue.stop === 'function') {
        state.playbackQueue.stop();
      }
    }

    // If master unified continuous audio is ready, seek directly on master track
    if (state.continuousMasterUrl) {
      if (state.audioElement.src !== state.continuousMasterUrl) {
        state.audioElement.src = state.continuousMasterUrl;
        state.audioElement.playbackRate = state.speed;
        state.audioElement.preservesPitch = true;
        state.audioElement.addEventListener('loadedmetadata', () => {
          state.audioElement.currentTime = seekTime;
          playAudioSafe(state.audioElement, 'word seek');
          state.isPlaying = true;
          if (el.dockBtnPlay) el.dockBtnPlay.classList.add('playing');
          startSyncLoop();
          updateWordAndSentenceHighlight(seekTime);
          updateRibbonPlayhead(seekTime);
          drawDockWaveform();
        }, { once: true });
      } else {
        state.audioElement.currentTime = seekTime;
        if (state.audioElement.paused) {
          playAudioSafe(state.audioElement, 'word seek');
        }
        state.isPlaying = true;
        if (el.dockBtnPlay) el.dockBtnPlay.classList.add('playing');
        startSyncLoop();
        updateWordAndSentenceHighlight(seekTime);
        updateRibbonPlayhead(seekTime);
        drawDockWaveform();
      }
      // toast silenced for calm UX
      return;
    }

    // If streaming queue is actively playing individual buffered chunks:
    if (state.playbackQueue && state.playbackQueue.chunks && state.playbackQueue.chunks.length > 0) {
      let offsetSum = 0;
      let targetChunkIdx = 0;
      let targetLocalTime = seekTime;

      for (let k = 0; k < state.playbackQueue.chunks.length; k++) {
        const ch = state.playbackQueue.chunks[k];
        if (!ch) continue;
        const dur = ch.duration || 0;
        if (seekTime >= offsetSum && seekTime <= offsetSum + dur) {
          targetChunkIdx = k;
          targetLocalTime = seekTime - offsetSum;
          break;
        }
        offsetSum += dur;
      }

      state.playbackQueue.currentIndex = targetChunkIdx;
      state.playbackQueue.currentChunkOffset = offsetSum;
      const targetChunk = state.playbackQueue.chunks[targetChunkIdx];
      if (targetChunk) {
        if (state.audioElement.src !== targetChunk.url) {
          state.audioElement.src = targetChunk.url;
          state.audioElement.playbackRate = state.speed;
          state.audioElement.preservesPitch = true;
          state.audioElement.addEventListener('loadedmetadata', () => {
            state.audioElement.currentTime = targetLocalTime;
            playAudioSafe(state.audioElement, 'chunk seek');
            state.isPlaying = true;
            if (el.dockBtnPlay) el.dockBtnPlay.classList.add('playing');
            startSyncLoop();
          }, { once: true });
        } else {
          state.audioElement.currentTime = targetLocalTime;
          if (state.audioElement.paused) {
            playAudioSafe(state.audioElement, 'chunk seek');
          }
          state.isPlaying = true;
          if (el.dockBtnPlay) el.dockBtnPlay.classList.add('playing');
          startSyncLoop();
        }
      }
      updateWordAndSentenceHighlight(seekTime);
      updateRibbonPlayhead(seekTime);
      drawDockWaveform();
      // toast silenced for calm UX
      return;
    }

    // Single chunk fallback
    state.audioElement.currentTime = seekTime;
    if (state.audioElement.paused) {
      playAudioSafe(state.audioElement, 'word seek');
    }
    state.isPlaying = true;
    if (el.dockBtnPlay) el.dockBtnPlay.classList.add('playing');
    startSyncLoop();
    updateWordAndSentenceHighlight(seekTime);
    updateRibbonPlayhead(seekTime);
    drawDockWaveform();
    // toast silenced for calm UX
  }

  // --- Parallel Groq Whisper Word-Level Alignment (Track B) ---
  async function alignChunkWithWhisper(chunkBlob, groundTruthText, globalOffset, sentenceIdx, signal) {
    try {
      if (signal && signal.aborted) return;
      const isWav = Boolean(chunkBlob.type && (chunkBlob.type.includes('wav') || chunkBlob.type.includes('pcm')));
      const ext = isWav ? 'wav' : 'mp3';

      const fd = new FormData();
      fd.append('file', chunkBlob, `chunk.${ext}`);
      fd.append('prompt', groundTruthText);
      if (state.customGroqKey) {
        fd.append('api_key', state.customGroqKey);
      }

      let res;
      try {
        res = await fetch('/api/align', {
          method: 'POST',
          body: fd,
          signal
        });
      } catch (e) {
        if (signal && signal.aborted) return;
        if (state.customGroqKey) {
          fd.append('model', 'whisper-large-v3-turbo');
          fd.append('response_format', 'verbose_json');
          fd.append('timestamp_granularities[]', 'word');
          res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${state.customGroqKey}` },
            body: fd,
            signal
          });
        } else {
          throw e;
        }
      }

      if (signal && signal.aborted) return;
      if (!res || !res.ok) {
        console.warn('Alignment response non-ok, preserving estimated timing');
        return;
      }

      const data = await res.json();
      const whisperWords = data.words || [];
      if (whisperWords.length === 0) return;

      const sentenceObj = state.timelineSentences[sentenceIdx];
      if (!sentenceObj) return;

      const domWords = sentenceObj.words;
      const segDuration = data.duration || 3.0;

      // Smart alignment: map DOM tokens to Whisper tokens using normalized substring/sequence matching
      function cleanToken(str) {
        return (str || '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
      }

      let whIdx = 0;
      for (let i = 0; i < domWords.length; i++) {
        const wObj = domWords[i];
        const domClean = cleanToken(wObj.text);

        // Lookahead up to 4 tokens to find matching Whisper token
        let matchedWhisperIdx = -1;
        for (let j = whIdx; j < Math.min(whisperWords.length, whIdx + 4); j++) {
          const whClean = cleanToken(whisperWords[j].word);
          if (whClean && domClean && (whClean === domClean || domClean.includes(whClean) || whClean.includes(domClean))) {
            matchedWhisperIdx = j;
            break;
          }
        }

        if (matchedWhisperIdx !== -1) {
          const item = whisperWords[matchedWhisperIdx];
          wObj.globalStart = parseFloat((globalOffset + item.start).toFixed(2));
          wObj.globalEnd = parseFloat((globalOffset + item.end).toFixed(2));
          whIdx = matchedWhisperIdx + 1;
        } else if (whIdx < whisperWords.length) {
          const item = whisperWords[whIdx];
          wObj.globalStart = parseFloat((globalOffset + item.start).toFixed(2));
          wObj.globalEnd = parseFloat((globalOffset + item.end).toFixed(2));
          whIdx++;
        } else {
          const prevEnd = i > 0 ? domWords[i - 1].globalEnd : globalOffset;
          const step = (globalOffset + segDuration - prevEnd) / Math.max(1, domWords.length - i);
          wObj.globalStart = parseFloat(prevEnd.toFixed(2));
          wObj.globalEnd = parseFloat(Math.min(globalOffset + segDuration, prevEnd + step).toFixed(2));
        }

        if (wObj.element) {
          wObj.element.setAttribute('data-start', wObj.globalStart);
          wObj.element.setAttribute('data-end', wObj.globalEnd);
          wObj.element.classList.remove('pending-alignment');
          wObj.element.title = `▶ Jump to ${fmtTime(wObj.globalStart)}`;
        }
      }

      sentenceObj.globalStart = globalOffset;
      sentenceObj.globalEnd = globalOffset + segDuration;
      sentenceObj.duration = segDuration;

      if (el.interactiveStatusLabel) {
        const alignedCount = state.timelineWords.filter(w => !w.element.classList.contains('pending-alignment')).length;
        el.interactiveStatusLabel.textContent = `Groq Whisper Sync Active (${alignedCount} words aligned)`;
      }

    } catch (err) {
      console.warn('Whisper alignment error:', err);
    }
  }

  // --- Real-Time Word & Sentence Synchronization Loop ---
    // Container-isolated auto-scroll: strictly bounds scrolling to reading container, never window
  function scrollWordIntoContainerView(wordEl) {
    if (!wordEl || !el.interactiveReadingBody || state.userScrollIntent) return;
    const container = el.interactiveReadingBody;
    const containerRect = container.getBoundingClientRect();
    const wordRect = wordEl.getBoundingClientRect();

    const topMargin = containerRect.height * 0.20;
    const bottomMargin = containerRect.height * 0.40;

    const isAbove = wordRect.top < containerRect.top + topMargin;
    const isBelow = wordRect.bottom > containerRect.bottom - bottomMargin;

    if (isAbove || isBelow) {
      const targetScroll = container.scrollTop + (wordRect.top - containerRect.top) - topMargin;
      const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      container.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: prefersReduced ? 'auto' : 'smooth'
      });
    }
  }

  function showScrollResumeIndicator() {
    let pill = document.getElementById('reading-scroll-resume');
    if (!pill && el.interactiveStage) {
      pill = document.createElement('button');
      pill.id = 'reading-scroll-resume';
      pill.type = 'button';
      pill.className = 'reading-scroll-resume-pill';
      pill.innerHTML = '<span class="material-symbols-outlined text-[14px]">sync</span><span>Auto-scroll paused · Tap to sync</span>';
      pill.addEventListener('click', (e) => {
        e.stopPropagation();
        state.userScrollIntent = false;
        hideScrollResumeIndicator();
        if (state.activeWordId) {
          const w = document.querySelector(`[data-word-id="${state.activeWordId}"]`);
          if (w) scrollWordIntoContainerView(w);
        }
      });
      el.interactiveStage.appendChild(pill);
    }
    if (pill) pill.classList.add('visible');
  }

  function hideScrollResumeIndicator() {
    const pill = document.getElementById('reading-scroll-resume');
    if (pill) pill.classList.remove('visible');
  }

  function setupUserScrollIntent() {
    if (!el.interactiveReadingBody) return;
    state.userScrollIntent = false;
    state.userScrollTimer = null;

    const onUserTouchScroll = () => {
      if (!state.isPlaying && !state.isSyncStageVisible) return;
      state.userScrollIntent = true;
      showScrollResumeIndicator();
      clearTimeout(state.userScrollTimer);
      state.userScrollTimer = setTimeout(() => {
        state.userScrollIntent = false;
        hideScrollResumeIndicator();
      }, 1200);
    };

    el.interactiveReadingBody.addEventListener('touchstart', onUserTouchScroll, { passive: true });
    el.interactiveReadingBody.addEventListener('touchmove', onUserTouchScroll, { passive: true });
    el.interactiveReadingBody.addEventListener('wheel', onUserTouchScroll, { passive: true });
  }

  // Binary search keeps highlighting O(log n). A 10k-word script used to scan
  // the whole word list on every animation frame and lock the phone up.
  function findWordIndexAt(curTime) {
    const words = state.timelineWords;
    let lo = 0;
    let hi = words.length - 1;
    let res = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const st = words[mid].globalStart;
      if (st === null || st === undefined) return -1;
      if (st <= curTime) {
        res = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return res;
  }

  function paintWordState(wordObj, mode) {
    if (!wordObj || !wordObj.element) return;
    const cls = wordObj.element.classList;
    cls.remove('active-word');
    cls.remove('past-word');
    if (mode === 'active') cls.add('active-word');
    else if (mode === 'past') cls.add('past-word');
  }

  function findLineIndexAt(wordIdx) {
    const lines = state.timelineLines;
    if (!lines || lines.length === 0) return -1;
    let lo = 0;
    let hi = lines.length - 1;
    let res = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (lines[mid].firstWordIdx <= wordIdx) {
        res = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return res;
  }

  function updateActiveLine(lineIdx) {
    const lines = state.timelineLines;
    if (!lines || lineIdx < 0 || lineIdx >= lines.length) return;
    if (state.activeLineIdx === lineIdx) return;

    if (state.activeLineIdx >= 0) {
      const prev = lines[state.activeLineIdx];
      if (prev && prev.element) prev.element.classList.remove('active-line');
    }
    state.activeLineIdx = lineIdx;

    const line = lines[lineIdx];
    if (line && line.element) {
      line.element.classList.add('active-line');
      if (state.isSyncStageVisible && !state.userScrollIntent) {
        scrollWordIntoContainerView(line.element);
      }
    }
  }

  function updateWordAndSentenceHighlight(curTime) {
    const words = state.timelineWords;
    if (!words || words.length === 0) return;

    // The sync loop runs at 60fps; word changes read fine at ~25fps
    if (Math.abs(curTime - (state.highlightClock || 0)) < 0.04) return;
    state.highlightClock = curTime;

    const idx = findWordIndexAt(curTime);
    if (idx < 0) return;

    const perWordMode = state.readerPerWordMode !== false;
    const prevIdx = state.activeWordIdx;

    if (perWordMode) {
      const matchedWord = words[idx];
      const isSeek = prevIdx < 0 || Math.abs(idx - prevIdx) > 3;

      if (!isSeek && matchedWord.id === state.activeWordId) {
        if (matchedWord.sentenceIdx !== state.activeSentenceIdx) {
          updateActiveSentence(matchedWord.sentenceIdx);
        }
        return;
      }

      if (isSeek) {
        for (let i = 0; i < words.length; i++) {
          if (words[i].element) paintWordState(words[i], i < idx ? 'past' : null);
        }
      } else if (prevIdx >= 0) {
        paintWordState(words[prevIdx], 'past');
      }

      paintWordState(matchedWord, 'active');

      state.activeWordIdx = idx;
      state.activeWordId = matchedWord.id;

      if (matchedWord.sentenceIdx !== state.activeSentenceIdx) {
        updateActiveSentence(matchedWord.sentenceIdx);
      }

      if (matchedWord.element && state.isSyncStageVisible && el.interactiveReadingBody && !state.userScrollIntent) {
        scrollWordIntoContainerView(matchedWord.element);
      }
      return;
    }

    // Long-script mode: highlight the sentence the current word belongs to
    state.activeWordIdx = idx;
    updateActiveLine(findLineIndexAt(idx));
  }

  function updateRibbonPlayhead(curTime) {
    const total = state.continuousDuration || (state.audioElement ? state.audioElement.duration : 0) || 1;
    const pct = Math.max(0, Math.min(100, (curTime / total) * 100));

    if (el.ribbonProgress) el.ribbonProgress.style.width = `${pct}%`;
    if (el.ribbonPlayhead) el.ribbonPlayhead.style.left = `${pct}%`;
    if (el.ribbonTimeDisplay) {
      el.ribbonTimeDisplay.textContent = `${fmtTime(curTime)} / ${fmtTime(total)}`;
    }
  }

  function startSyncLoop() {
    if (state.syncRafId) cancelAnimationFrame(state.syncRafId);

    function loop() {
      let curTime = 0;
      let isAudPlaying = false;

      if (state.audioElement && !state.audioElement.paused) {
        curTime = (state.playbackQueue && state.playbackQueue.isPlayingQueue ? (state.playbackQueue.currentChunkOffset || 0) : 0) + state.audioElement.currentTime;
        isAudPlaying = true;
      }

      if (isAudPlaying) {
        const total = state.continuousDuration || (state.audioElement ? state.audioElement.duration : 0) || 1;
        updateWordAndSentenceHighlight(curTime);
        updateRibbonPlayhead(curTime);
        updateTimeDisplay(curTime, total);
        const pct = Math.max(0, Math.min(100, (curTime / total) * 100));
        el.dockPlayhead.style.left = `${pct}%`;
      }
      state.syncRafId = requestAnimationFrame(loop);
    }

    state.syncRafId = requestAnimationFrame(loop);
  }

  function stopSyncLoop() {
    if (state.syncRafId) {
      cancelAnimationFrame(state.syncRafId);
      state.syncRafId = null;
    }
  }

  // Combine multiple audio chunks (WAV PCM or MP3) into a single continuous valid audio blob
  async function combineAudioBlobs(blobs) {
    if (!blobs || blobs.length === 0) return null;
    if (blobs.length === 1) return blobs[0];

    const firstBlob = blobs[0];
    const isWav = (firstBlob.type && firstBlob.type.includes('wav')) || (firstBlob.type && firstBlob.type.includes('pcm'));

    if (!isWav) {
      return new Blob(blobs, { type: firstBlob.type || 'audio/mpeg' });
    }

    try {
      const buffers = await Promise.all(blobs.map(b => b.arrayBuffer()));

      // Verify RIFF WAVE header
      const dv0 = new DataView(buffers[0]);
      if (dv0.getUint32(0, false) !== 0x52494646) {
        return new Blob(blobs, { type: 'audio/wav' });
      }

      function getPcm(ab) {
        const dv = new DataView(ab);
        let offset = 12;
        while (offset < ab.byteLength - 8) {
          const chunkId = String.fromCharCode(
            dv.getUint8(offset), dv.getUint8(offset + 1), dv.getUint8(offset + 2), dv.getUint8(offset + 3)
          );
          const chunkSize = dv.getUint32(offset + 4, true);
          if (chunkId === 'data') {
            const dataStart = offset + 8;
            const dataLen = Math.min(chunkSize, ab.byteLength - dataStart);
            return new Uint8Array(ab, dataStart, dataLen);
          }
          offset += 8 + chunkSize;
        }
        return new Uint8Array(ab, 44);
      }

      const pcmParts = buffers.map(getPcm);
      const totalPcmLength = pcmParts.reduce((acc, p) => acc + p.byteLength, 0);

      // Create new 44-byte WAV header based on the first chunk
      const header = new Uint8Array(buffers[0].slice(0, 44));
      const hv = new DataView(header.buffer);
      hv.setUint32(4, 36 + totalPcmLength, true); // Total file size - 8
      hv.setUint32(40, totalPcmLength, true);      // Data chunk length

      return new Blob([header, ...pcmParts], { type: 'audio/wav' });
    } catch (e) {
      console.warn('WAV merge error, falling back to blob concatenation:', e);
      return new Blob(blobs, { type: 'audio/wav' });
    }
  }

  // --- High-Performance Web Audio API Singleton Engine ---
  function getOrCreateAudioContext() {
    if (!state.audioContext || state.audioContext.state === 'closed') {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) {
        state.audioContext = new Ctx();
        state.analyserNode = state.audioContext.createAnalyser();
        state.analyserNode.fftSize = 128;
      }
    }
    if (state.audioContext && state.audioContext.state === 'suspended') {
      state.audioContext.resume().catch(() => {});
    }
    return state.audioContext;
  }

  async function decodeAudioBlob(blob) {
    try {
      const ctx = getOrCreateAudioContext();
      if (!ctx) return { duration: 3.0, buffer: null };
      const ab = await blob.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(ab.slice(0));
      return {
        duration: audioBuffer.duration,
        buffer: audioBuffer
      };
    } catch (e) {
      console.warn('decodeAudioBlob error, fallback duration:', e);
      return { duration: 3.0, buffer: null };
    }
  }

  function extractPeaksFromAudioBuffer(audioBuffer, barCount = 56) {
    if (!audioBuffer) return generateNaturalSpeechPeaks(barCount);
    try {
      const channelData = audioBuffer.getChannelData(0);
      const totalSamples = channelData.length;
      const blockSize = Math.floor(totalSamples / barCount);
      const rawPeaks = [];

      for (let i = 0; i < barCount; i++) {
        const start = i * blockSize;
        const end = Math.min(start + blockSize, totalSamples);
        let sumSq = 0;
        let count = 0;
        const step = Math.max(1, Math.floor((end - start) / 40));
        for (let j = start; j < end; j += step) {
          sumSq += channelData[j] * channelData[j];
          count++;
        }
        const rms = count > 0 ? Math.sqrt(sumSq / count) : 0;
        rawPeaks.push(rms);
      }

      const maxRms = Math.max(...rawPeaks, 0.001);
      return rawPeaks.map(p => {
        const norm = p / maxRms;
        return Math.max(0.18, Math.min(1.0, Math.pow(norm, 0.65)));
      });
    } catch (e) {
      return generateNaturalSpeechPeaks(barCount);
    }
  }

  // --- Smart Progressive Ramp Clause Splitter for Instant Sub-Second TTFA & Gapless Streaming ---
  function segmentTextIntoChunks(text, targetLen = 600) {
    const trimmed = text.trim();
    if (!trimmed) return [];

    // Groq Orpheus free tier enforces strict 200 char limit per request
    const isGroq = state.model && (state.model.includes('orpheus') || state.model.includes('groq'));
    if (isGroq) {
      targetLen = 160;
    } else {
      // Adaptive chunking based on script volume: prevents HTTP request explosion
      if (trimmed.length > 6000) {
        targetLen = 1200;
      } else if (trimmed.length > 2000) {
        targetLen = 800;
      } else {
        targetLen = 600;
      }
    }

    let chunk0 = '';
    let restText = trimmed;

    // 1. Launchpad Micro-Chunk: isolate first brief clause for <800ms TTFA
    const firstSentenceMatch = trimmed.match(/^([^.!?\n]+[.!?\n]+)/);
    if (firstSentenceMatch && firstSentenceMatch[1].trim().length <= (isGroq ? 40 : 55)) {
      chunk0 = firstSentenceMatch[1].trim();
      restText = trimmed.slice(firstSentenceMatch[0].length).trim();
    } else {
      // Look for early clause boundary (, ; : — -- - ) within the first 14 to 70 chars
      const earlySub = trimmed.slice(0, 80);
      const clauseMatch = earlySub.match(/^([^,;:—–\n]+[,;:—–])\s*/);
      if (clauseMatch && clauseMatch[1].trim().length >= 14 && clauseMatch[1].trim().length <= (isGroq ? 55 : 65)) {
        chunk0 = clauseMatch[1].trim();
        restText = trimmed.slice(clauseMatch[0].length).trim();
      } else {
        // Fallback: natural word boundary around 28-48 chars
        const words = trimmed.split(/\s+/);
        if (words.length > 4) {
          let acc = '';
          let wordIdx = 0;
          for (let w of words) {
            if ((acc + ' ' + w).trim().length > (isGroq ? 35 : 48) && acc.length >= 20) {
              break;
            }
            acc = (acc + ' ' + w).trim();
            wordIdx++;
            if (wordIdx >= 8) break;
          }
          chunk0 = acc;
          restText = words.slice(wordIdx).join(' ').trim();
        } else {
          chunk0 = trimmed;
          restText = '';
        }
      }
    }

    chunk0 = chunk0.trim().replace(/^[,;:—–\s]+/, '');
    const chunks = [chunk0];
    if (!restText) return chunks.filter(c => c && c.trim().length > 0);

    // 2. Progressive Ramp Table:
    // Chunk 0: 40-55 chars (Instant Launchpad: TTFA < 800ms, plays ~2.5s)
    // Chunk 1: 160-220 chars (Bridge Ramp: synthesizes in ~1s, arrives before Chunk 0 finishes!)
    // Chunk 2: 350-450 chars (Expansion Ramp: synthesizes in ~1.8s, arrives while Chunk 1 plays)
    // Chunk 3+: Steady-State targetLen (Cruising: arrives with 20s+ buffer cushion)
    function getTargetLength(chunkIdx) {
      if (isGroq) return chunkIdx <= 1 ? 120 : 160;
      if (chunkIdx === 1) return 190;
      if (chunkIdx === 2) return 420;
      return targetLen;
    }

    // 3. Segment remaining text into natural sentences/clauses
    const sentenceRegex = /[^.!?\n]+(?:[.!?\n]+|$)/g;
    const rawSentences = (restText.match(sentenceRegex) || [restText])
      .map(s => s.trim())
      .filter(Boolean);

    function splitLongSentence(sentence, maxLen) {
      if (sentence.length <= maxLen) return [sentence];
      const subParts = sentence.split(/([,;:—–]\s+)/);
      const results = [];
      let curSub = '';
      for (let part of subParts) {
        if (!curSub) {
          curSub = part;
        } else if ((curSub + part).length <= maxLen) {
          curSub += part;
        } else {
          if (curSub.trim()) results.push(curSub.trim().replace(/^[,;:—–\s]+/, ''));
          curSub = part;
        }
      }
      if (curSub && curSub.trim()) results.push(curSub.trim().replace(/^[,;:—–\s]+/, ''));
      return results.length > 0 ? results : [sentence];
    }

    let cur = '';
    for (let s of rawSentences) {
      let activeTarget = getTargetLength(chunks.length);
      if (s.length > activeTarget) {
        if (cur) {
          chunks.push(cur.replace(/^[,;:—–\s]+/, ''));
          cur = '';
        }
        activeTarget = getTargetLength(chunks.length);
        const subs = splitLongSentence(s, activeTarget);
        for (let sub of subs) {
          if (sub) chunks.push(sub);
        }
        continue;
      }

      if (!cur) {
        cur = s;
      } else if ((cur + ' ' + s).length <= activeTarget) {
        cur += ' ' + s;
      } else {
        chunks.push(cur.replace(/^[,;:—–\s]+/, ''));
        cur = s;
      }
    }
    if (cur) chunks.push(cur.replace(/^[,;:—–\s]+/, ''));

    return chunks.filter(c => c && c.trim().length > 0);
  }

  // A blocked autoplay used to leave the UI claiming "playing" while the audio
  // sat paused. Start playback through this so the state always matches reality.
  function playAudioSafe(audio, label) {
    if (!audio) return;
    const attempt = audio.play();
    if (!attempt || typeof attempt.catch !== 'function') return;
    attempt.catch((err) => {
      if (err && err.name === 'NotAllowedError') {
        state.isPlaying = false;
        if (el.dockBtnPlay) {
          el.dockBtnPlay.classList.remove('playing');
          el.dockBtnPlay.classList.add('needs-tap');
        }
        const pi = document.getElementById('play-pause-icon');
        if (pi) pi.textContent = 'play_arrow';
        stopSyncLoop();
        showToast('Tap play to start the audio — this browser blocks autoplay', 'info', 3600);
      } else {
        console.warn('[Audio] play error' + (label ? ' (' + label + ')' : '') + ':', err && err.message);
      }
    });
  }

  // Bounded Whisper alignment: a 40-chunk script used to fire 40 parallel
  // uploads, which stalls the phone radio and keeps every chunk blob alive.
  const alignmentQueue = [];
  let alignInFlight = 0;
  const ALIGN_MAX_CONCURRENT = 2;

  function enqueueAlignment(task) {
    alignmentQueue.push(task);
    pumpAlignments();
  }

  function pumpAlignments() {
    while (alignInFlight < ALIGN_MAX_CONCURRENT && alignmentQueue.length) {
      const task = alignmentQueue.shift();
      alignInFlight++;
      Promise.resolve()
        .then(task)
        .catch((err) => console.warn('[Align] task note:', err && err.message))
        .finally(() => {
          alignInFlight--;
          pumpAlignments();
        });
    }
  }

  // One reusable element instead of a new Audio() per chunk (which leaked a
  // media element and a decoder per chunk on long scripts).
  function preloadChunkAudio(url) {
    try {
      if (!state.preloadAudio) {
        state.preloadAudio = new Audio();
        state.preloadAudio.preload = 'auto';
        state.preloadAudio.muted = true;
      }
      state.preloadAudio.src = url;
      state.preloadAudio.load();
    } catch (_) { /* preload is best-effort */ }
  }

  function showGenProgress(total, stage) {
    if (!el.genProgress) return;
    el.genProgress.classList.add('is-active');
    if (el.genProgressFill) el.genProgressFill.style.width = '0%';
    if (el.genProgressCount) el.genProgressCount.textContent = '0 / ' + total;
    if (el.genProgressStage) el.genProgressStage.textContent = stage || 'Starting';
  }

  function updateGenProgress(done, total, stage) {
    if (!el.genProgress) return;
    const pct = total > 0 ? Math.max(2, Math.min(100, (done / total) * 100)) : 0;
    if (el.genProgressFill) el.genProgressFill.style.width = pct.toFixed(1) + '%';
    if (el.genProgressCount) el.genProgressCount.textContent = done + ' / ' + total;
    if (stage && el.genProgressStage) el.genProgressStage.textContent = stage;
  }

  function hideGenProgress() {
    if (el.genProgress) el.genProgress.classList.remove('is-active');
  }

  async function fetchTtsChunk(chunkText, signal) {
    const payload = {
      text: chunkText,
      model: state.model,
      voice: state.voice,
      speed: state.speed,
      api_key: state.customOpenRouterKey || null,
      deepgram_key: state.customDeepgramKey || null,
      mistral_key: state.customMistralKey || null,
      elevenlabs_key: state.customElevenLabsKey || null,
      gemini_key: state.customGeminiKey || null,
      cartesia_key: state.customCartesiaKey || null,
      groq_key: state.customGroqKey || null,
      cloudflare_token: state.customCfToken || null,
      cloudflare_account_id: state.customCfAccount || null
    };

    const headers = { 'Content-Type': 'application/json' };
    if (state.customDeepgramKey) {
      headers['X-Deepgram-Key'] = state.customDeepgramKey;
    }
    if (state.customMistralKey) {
      headers['X-Mistral-Key'] = state.customMistralKey;
    }
    if (state.customElevenLabsKey) {
      headers['X-ElevenLabs-Key'] = state.customElevenLabsKey;
    }
    if (state.customGeminiKey) {
      headers['X-Gemini-Key'] = state.customGeminiKey;
    }
    if (state.customCartesiaKey) {
      headers['X-Cartesia-Key'] = state.customCartesiaKey;
    }
    if (state.customGroqKey) {
      headers['X-Groq-Key'] = state.customGroqKey;
    }
    if (state.customCfToken) {
      headers['X-Cloudflare-Token'] = state.customCfToken;
    }
    if (state.customCfAccount) {
      headers['X-Cloudflare-Account'] = state.customCfAccount;
    }
    if (state.customOpenRouterKey) {
      headers['Authorization'] = `Bearer ${state.customOpenRouterKey}`;
    }

    const retryDelays = [500, 1000, 2000, 4000];
    let lastError = null;

    for (let attempt = 0; attempt <= retryDelays.length; attempt++) {
      if (signal && signal.aborted) throw new DOMException('Aborted', 'AbortError');
      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ detail: res.statusText }));
          if ((res.status === 429 || res.status >= 500) && attempt < retryDelays.length) {
            console.warn(`[TTS Retry] Attempt ${attempt + 1} hit HTTP ${res.status}. Retrying in ${retryDelays[attempt]}ms...`);
            await new Promise(r => setTimeout(r, retryDelays[attempt]));
            continue;
          }
          throw new Error(err.detail || `Synthesis failed (HTTP ${res.status})`);
        }

        const contentType = res.headers.get('Content-Type') || 'audio/wav';
        const blob = await res.blob();
        return new Blob([blob], { type: contentType.split(';')[0].trim() });
      } catch (err) {
        if (err.name === 'AbortError' || (signal && signal.aborted)) throw err;
        lastError = err;
        if (attempt < retryDelays.length) {
          console.warn(`[TTS Network Retry] Attempt ${attempt + 1} error: ${err.message}. Retrying in ${retryDelays[attempt]}ms...`);
          await new Promise(r => setTimeout(r, retryDelays[attempt]));
        }
      }
    }

    throw lastError || new Error('Synthesis failed after multiple retries');
  }

  // --- TTS Synthesis Engine (Native HTML5 Streaming Pipeline with Rock-Solid Pitch Preservation) ---
  async function synthesizeSpeech() {
    const text = el.textInput.value.trim();
    if (!text) {
      showToast('Please type some text first', 'error');
      el.textInput.focus();
      return;
    }

    // Cancel any previous in-flight generation
    if (state.currentAbortController) {
      state.currentAbortController.abort();
    }
    const abortController = new AbortController();
    state.currentAbortController = abortController;
    const signal = abortController.signal;

    // Release the previous run's audio before allocating a new one — on a
    // phone this is the difference between a smooth second run and a crash.
    try {
      if (state.playbackQueue && Array.isArray(state.playbackQueue.chunks)) {
        state.playbackQueue.chunks.forEach(c => { if (c && c.url) URL.revokeObjectURL(c.url); });
      }
      if (state.continuousMasterUrl) {
        URL.revokeObjectURL(state.continuousMasterUrl);
        state.continuousMasterUrl = null;
      }
    } catch (_) { /* ignore */ }

    state.continuousMasterBlob = null;
    state.masterDeferred = false;

    el.btnMainGenerate.disabled = true;
    el.btnMainGenerate.classList.add('loading');
    el.btnMainGenerate.setAttribute('aria-busy', 'true');
    el.labelGenerate.textContent = 'Starting...';
    if (el.btnCancelGenerate) el.btnCancelGenerate.classList.remove('hidden');
    if (el.btnStageCancel) el.btnStageCancel.classList.remove('hidden');

    const t0 = performance.now();
    const chunks = segmentTextIntoChunks(text);
    const totalChunks = chunks.length;

    if (totalChunks > 1) showGenProgress(totalChunks, 'Streaming speech');

    // Switch to interactive reading stage and initialize words immediately
    switchToSyncStage();
    renderInteractiveText(chunks);

    const currentGenId = Date.now();

    // Stop any existing queue playback cleanly
    if (state.playbackQueue && typeof state.playbackQueue.stop === 'function') {
      state.playbackQueue.stop();
    }
    state.audioElement.pause();

    state.playbackQueue = {
      generationId: currentGenId,
      chunks: new Array(totalChunks),
      totalExpected: totalChunks,
      completedChunksCount: 0,
      currentIndex: 0,
      currentChunkOffset: 0,
      isPlayingQueue: totalChunks > 1,
      waitingForChunk: -1,

      stop() {
        this.isPlayingQueue = false;
        this.generationId = null;
      }
    };

    state.continuousDuration = 0;
    state.continuousMasterBlob = null;
    state.continuousMasterUrl = null;

    try {
      let inFlight = 0;
      let nextIndexToFetch = 0;
      const MAX_CONCURRENT = 2; // Sliding prefetch window

      function pumpQueue() {
        if (signal.aborted || state.playbackQueue.generationId !== currentGenId) return;
        while (inFlight < MAX_CONCURRENT && nextIndexToFetch < totalChunks) {
          const idx = nextIndexToFetch++;
          inFlight++;
          fetchAndProcessChunk(idx);
        }
      }

      async function fetchAndProcessChunk(idx) {
        try {
          if (signal.aborted || state.playbackQueue.generationId !== currentGenId) return;
          el.labelGenerate.textContent = totalChunks > 1 
            ? `Streaming ${Math.min(totalChunks, state.playbackQueue.completedChunksCount + 1)}/${totalChunks}...`
            : 'Generating...';

          const chunkBlob = await fetchTtsChunk(chunks[idx], signal);
          if (signal.aborted || state.playbackQueue.generationId !== currentGenId) return;

          // Single-pass decode: gets duration, audioBuffer, and peaks without re-decode
          const { duration, buffer } = await decodeAudioBlob(chunkBlob);
          if (signal.aborted || state.playbackQueue.generationId !== currentGenId) return;

          const chunkGlobalOffset = state.continuousDuration;
          state.continuousDuration += duration;
          const chunkUrl = URL.createObjectURL(chunkBlob);

          const chunkItem = {
            blob: chunkBlob,
            url: chunkUrl,
            duration: duration,
            offset: chunkGlobalOffset
          };

          state.playbackQueue.chunks[idx] = chunkItem;
          state.playbackQueue.completedChunksCount++;
          updateGenProgress(state.playbackQueue.completedChunksCount, totalChunks,
            state.playbackQueue.completedChunksCount >= totalChunks ? 'Buffered' : 'Streaming speech');

          // First chunk arrival: instant playback on native HTMLAudioElement with preserved pitch!
          if (idx === 0) {
            const elapsedFirst = ((performance.now() - t0) / 1000).toFixed(2);
            showToast(totalChunks > 1 ? `Instant stream started (${elapsedFirst}s)` : `Generated in ${elapsedFirst}s`, 'info', 2200);

            state.currentBlob = chunkBlob;
            state.currentUrl = chunkUrl;

            // Reveal Floating Player Bar!
            el.dockPlayer.classList.remove('hidden');
            if (el.floatingDockContainer) el.floatingDockContainer.classList.add('player-active');

            const persona = getPersonaForVoice(state.voice);
            if (persona) {
              const emo = getActiveEmotionForPersona(persona);
              el.playerLabelVoice.textContent = `${persona.name} (${emo ? emo.label : 'Natural'})`;
            } else {
              const v = state.voicesCatalog.find(item => item.id === state.voice)
                     || DEFAULT_ELEVENLABS_VOICES.find(item => item.id === state.voice)
                     || DEFAULT_CARTESIA_VOICES.find(item => item.id === state.voice)
                     || DEFAULT_GEMINI_VOICES.find(item => item.id === state.voice)
                     || DEFAULT_GROQ_ORPHEUS_VOICES.find(item => item.id === state.voice)
                     || DEFAULT_CLOUDFLARE_VOICES.find(item => item.id === state.voice);
              el.playerLabelVoice.textContent = v ? v.name : 'Voice';
            }
            let modelDisplayName = 'Deepgram Flux';
            if (state.model.includes('fish')) modelDisplayName = 'Fish S2.1';
            else if (state.model.includes('mistral') || state.model.includes('voxtral')) modelDisplayName = 'Mistral Voxtral';
            else if (state.model.includes('elevenlabs')) modelDisplayName = 'ElevenLabs Studio';
            else if (state.model.includes('cartesia')) modelDisplayName = 'Cartesia Sonic';
            else if (state.model.includes('gemini') || state.model.includes('google')) modelDisplayName = 'Google Gemini';
            else if (state.model.includes('groq/orpheus-english')) modelDisplayName = 'Groq Orpheus EN';
            else if (state.model.includes('groq/orpheus-arabic')) modelDisplayName = 'Groq Orpheus AR';
            else if (state.model.includes('cloudflare') || state.model.includes('melotts')) modelDisplayName = 'Cloudflare Melo';
            el.playerLabelModel.textContent = modelDisplayName + (totalChunks > 1 ? ' · Streaming' : '');

            // Instant peaks from decoded buffer for visualizer
            state.waveformPeaks = extractPeaksFromAudioBuffer(buffer);
            drawDockWaveform();

            // Native HTML5 Audio Playback: 100% true pitch preservation, zero low-pitch bugs!
            state.audioElement.src = chunkUrl;
            state.audioElement.playbackRate = state.speed;
            state.audioElement.preservesPitch = true;
            state.audioElement.currentTime = 0;
            state.playbackQueue.currentIndex = 0;
            state.playbackQueue.currentChunkOffset = 0;
            state.playbackQueue.isPlayingQueue = totalChunks > 1;

            if (state.autoPlay) {
              playAudioSafe(state.audioElement, 'first chunk');
              state.isPlaying = true;
              el.dockBtnPlay.classList.add('playing');
              startSyncLoop();
            }
          } else if (state.playbackQueue.waitingForChunk === idx) {
            // Audio was waiting for this chunk!
            state.playbackQueue.waitingForChunk = -1;
            state.playbackQueue.currentIndex = idx;

            // Safe offset accumulation
            let offsetSum = 0;
            for (let k = 0; k < idx; k++) {
              const ch = state.playbackQueue.chunks[k];
              offsetSum += (ch && ch.duration) || 0;
            }
            state.playbackQueue.currentChunkOffset = offsetSum;

            state.audioElement.src = chunkUrl;
            state.audioElement.playbackRate = state.speed;
            state.audioElement.preservesPitch = true;
            state.audioElement.currentTime = 0;
            playAudioSafe(state.audioElement, 'resume chunk');

            state.isPlaying = true;
            if (el.dockBtnPlay) el.dockBtnPlay.classList.add('playing');
            const pi = document.getElementById('play-pause-icon');
            if (pi) pi.textContent = 'pause';
            startSyncLoop();
          }

          // Keep the next segment warm for a gapless hand-off
          preloadChunkAudio(chunkUrl);

          if (el.ribbonSegmentsBadge) {
            el.ribbonSegmentsBadge.textContent = `${state.playbackQueue.completedChunksCount} of ${totalChunks} Buffered (${state.continuousDuration.toFixed(1)}s)`;
          }

          // Word-level alignment, queued so long scripts never flood the radio
          enqueueAlignment(() => alignChunkWithWhisper(chunkBlob, chunks[idx], chunkGlobalOffset, idx, signal));

        } catch (err) {
          if (err.name === 'AbortError' || signal.aborted) {
            return;
          }
          console.error(`Error processing chunk ${idx}:`, err);

          // Non-blocking recovery: mark chunk as skipped so queue playback is NEVER stalled or hung
          state.playbackQueue.chunks[idx] = { skipped: true, duration: 0.1, offset: state.continuousDuration };
          state.playbackQueue.completedChunksCount++;
          updateGenProgress(state.playbackQueue.completedChunksCount, totalChunks, 'Skipped a failed segment');

          // If playback was actively waiting for this failed chunk, advance immediately
          if (state.playbackQueue.waitingForChunk === idx) {
            state.playbackQueue.waitingForChunk = -1;
            // Advance to next available chunk
            for (let nextIdx = idx + 1; nextIdx < totalChunks; nextIdx++) {
              const nextChunk = state.playbackQueue.chunks[nextIdx];
              if (nextChunk && !nextChunk.skipped && nextChunk.url) {
                state.playbackQueue.currentIndex = nextIdx;
                let offsetSum = 0;
                for (let k = 0; k < nextIdx; k++) {
                  const ch = state.playbackQueue.chunks[k];
                  offsetSum += (ch && ch.duration) || 0;
                }
                state.playbackQueue.currentChunkOffset = offsetSum;
                state.audioElement.src = nextChunk.url;
                state.audioElement.playbackRate = state.speed;
                state.audioElement.preservesPitch = true;
                state.audioElement.currentTime = 0;
                playAudioSafe(state.audioElement, 'next chunk');
                state.isPlaying = true;
                if (el.dockBtnPlay) el.dockBtnPlay.classList.add('playing');
                const pi = document.getElementById('play-pause-icon');
                if (pi) pi.textContent = 'pause';
                startSyncLoop();
                break;
              } else if (!nextChunk) {
                // Next chunk is in flight, wait for it
                state.playbackQueue.waitingForChunk = nextIdx;
                state.playbackQueue.currentIndex = nextIdx;
                break;
              }
            }
          }

          showToast(`Segment ${idx + 1} skipped — playback continues`, 'info', 2200);
        } finally {
          inFlight--;
          pumpQueue();

          // Check if all chunks received
          if (state.playbackQueue && state.playbackQueue.completedChunksCount >= totalChunks) {
            onAllChunksCompleted();
          }
        }
      }

      async function onAllChunksCompleted() {
        if (signal.aborted || state.playbackQueue.generationId !== currentGenId) return;

        const allBlobs = state.playbackQueue.chunks.map(c => c && c.blob).filter(Boolean);
        const totalBytes = allBlobs.reduce((acc, b) => acc + (b.size || 0), 0);
        const isWavMaster = allBlobs.length > 0 && /wav|pcm/i.test(allBlobs[0].type || '');

        // Merging WAV in the browser means holding every PCM chunk in JS memory
        // at once (~2 MB per spoken minute). Above this budget we keep the
        // per-segment playback queue and only merge if a download is requested.
        const deferredMaster = isWavMaster && totalBytes > 48 * 1024 * 1024;
        const masterBlob = deferredMaster ? null : await combineAudioBlobs(allBlobs);
        state.masterDeferred = deferredMaster;
        if (signal.aborted || state.playbackQueue.generationId !== currentGenId) return;

        if (deferredMaster) {
          hideGenProgress();
          showToast('Long script buffered — segments play continuously; the download button packs them on demand', 'info', 4200);
          if (el.ribbonSegmentsBadge) {
            el.ribbonSegmentsBadge.textContent = state.playbackQueue.completedChunksCount + ' of ' + totalChunks + ' Buffered (' + state.continuousDuration.toFixed(1) + 's)';
          }
          if (el.interactiveStatusLabel) {
            el.interactiveStatusLabel.textContent = 'Speech Complete · Tap a word to jump';
          }
          el.btnMainGenerate.disabled = false;
          el.btnMainGenerate.classList.remove('loading');
          el.btnMainGenerate.removeAttribute('aria-busy');
          el.labelGenerate.textContent = 'Generate Speech';
          if (el.btnCancelGenerate) el.btnCancelGenerate.classList.add('hidden');
          if (el.btnStageCancel) el.btnStageCancel.classList.add('hidden');
          state.currentAbortController = null;
          return;
        }

        hideGenProgress();

        const masterUrl = URL.createObjectURL(masterBlob);
        state.continuousMasterBlob = masterBlob;
        state.continuousMasterUrl = masterUrl;
        state.currentBlob = masterBlob;

        // If audio finished playing or is paused, set master track
        if (state.audioElement.paused && !state.isPlaying) {
          state.currentUrl = masterUrl;
          state.audioElement.src = masterUrl;
          state.audioElement.currentTime = 0;
          state.duration = state.continuousDuration;
        }

        // Unified full-speech waveform peaks
        decodeAudioBlob(masterBlob).then(({ buffer }) => {
          if (buffer) {
            state.waveformPeaks = extractPeaksFromAudioBuffer(buffer);
            drawDockWaveform();
          }
        });

        if (el.interactiveStatusLabel) {
          el.interactiveStatusLabel.textContent = 'Speech Complete · Click any word to jump audio';
        }
        let modelDisplayName = 'Deepgram Flux';
        if (state.model.includes('fish')) modelDisplayName = 'Fish S2.1';
        else if (state.model.includes('mistral') || state.model.includes('voxtral')) modelDisplayName = 'Mistral Voxtral';
        else if (state.model.includes('elevenlabs')) modelDisplayName = 'ElevenLabs Studio';
        else if (state.model.includes('cartesia')) modelDisplayName = 'Cartesia Sonic';
        else if (state.model.includes('gemini') || state.model.includes('google')) modelDisplayName = 'Google Gemini';
        else if (state.model.includes('groq/orpheus-english')) modelDisplayName = 'Groq Orpheus EN';
        else if (state.model.includes('groq/orpheus-arabic')) modelDisplayName = 'Groq Orpheus AR';
        else if (state.model.includes('cloudflare') || state.model.includes('melotts')) modelDisplayName = 'Cloudflare Melo';
        el.playerLabelModel.textContent = modelDisplayName;

        const totalElapsed = ((performance.now() - t0) / 1000).toFixed(2);
        showToast(`Complete speech buffered (${totalElapsed}s)`, 'success', 2500);

        const v = state.voicesCatalog.find(item => item.id === state.voice)
               || DEFAULT_ELEVENLABS_VOICES.find(item => item.id === state.voice)
               || DEFAULT_CARTESIA_VOICES.find(item => item.id === state.voice)
               || DEFAULT_GEMINI_VOICES.find(item => item.id === state.voice)
               || DEFAULT_GROQ_ORPHEUS_VOICES.find(item => item.id === state.voice)
               || DEFAULT_CLOUDFLARE_VOICES.find(item => item.id === state.voice);
        addToLibrary({
          type: 'tts',
          model: state.model,
          voice: v ? v.name : state.voice,
          text: text,
          timestamp: new Date().toISOString()
        });
        if (typeof captureGeneratedAudio === 'function') {
          captureGeneratedAudio(masterBlob, text).catch((err) => {
            console.error('vault write failed', err);
            showToast('Could not save to vault', true);
          });
        }

        el.btnMainGenerate.disabled = false;
        el.btnMainGenerate.classList.remove('loading');
        el.btnMainGenerate.removeAttribute('aria-busy');
        el.labelGenerate.textContent = 'Generate Speech';
        if (el.btnCancelGenerate) el.btnCancelGenerate.classList.add('hidden');
        if (el.btnStageCancel) el.btnStageCancel.classList.add('hidden');
        state.currentAbortController = null;
      }

      // Kick off pipeline
      pumpQueue();

    } catch (err) {
      if (err.name === 'AbortError' || signal.aborted) {
        return;
      }
      console.error(err);
      let errMsg = err.message || 'Synthesis failed';
      if (errMsg.includes('"message":')) {
        try {
          const match = errMsg.match(/"message":"([^"]+)"/);
          if (match) errMsg = match[1];
        } catch(e) {}
      }
      showToast(errMsg, 'error', 5500);
      el.btnMainGenerate.disabled = false;
      el.btnMainGenerate.classList.remove('loading');
      el.btnMainGenerate.removeAttribute('aria-busy');
      el.labelGenerate.textContent = 'Generate Speech';
      if (el.btnCancelGenerate) el.btnCancelGenerate.classList.add('hidden');
      if (el.btnStageCancel) el.btnStageCancel.classList.add('hidden');
      state.currentAbortController = null;
    }
  }

  // --- Dock Audio Player Engine ---
  function setupAudioPlayer() {
    const audio = state.audioElement;

    audio.addEventListener('loadedmetadata', () => {
      state.duration = audio.duration;
      updateTimeDisplay(audio.currentTime, audio.duration);
      drawDockWaveform();
      updateRibbonPlayhead(audio.currentTime);
    });

    audio.addEventListener('timeupdate', () => {
      if (!audio.duration) return;
      let curTime = audio.currentTime;
      if (state.playbackQueue && state.playbackQueue.isPlayingQueue) {
        curTime = (state.playbackQueue.currentChunkOffset || 0) + audio.currentTime;
      }

      const total = state.continuousDuration || audio.duration;
      const pct = (curTime / total) * 100;
      el.dockPlayhead.style.left = `${pct}%`;
      updateTimeDisplay(curTime, total);
      updateRibbonPlayhead(curTime);
      updateWordAndSentenceHighlight(curTime);

      if (!state.isPlaying) {
        drawDockWaveform();
      }
    });

    audio.addEventListener('play', () => {
      state.isPlaying = true;
      el.dockBtnPlay.classList.remove('needs-tap');
      el.dockBtnPlay.classList.add('playing');
      const pi = document.getElementById('play-pause-icon');
      if (pi) pi.textContent = 'pause';
      drawDockWaveform();
      startSyncLoop();
    });

    audio.addEventListener('pause', () => {
      state.isPlaying = false;
      el.dockBtnPlay.classList.remove('playing');
      const pi = document.getElementById('play-pause-icon');
      if (pi) pi.textContent = 'play_arrow';
      drawDockWaveform();
      stopSyncLoop();
    });

    audio.addEventListener('ended', () => {
      // If progressive streaming queue is active, advance to next chunk
      if (state.playbackQueue && state.playbackQueue.isPlayingQueue) {
        let nextIdx = state.playbackQueue.currentIndex + 1;

        // Skip any slots marked as skipped/failed
        while (nextIdx < state.playbackQueue.totalExpected) {
          const slot = state.playbackQueue.chunks[nextIdx];
          if (slot && slot.skipped) {
            nextIdx++;
          } else {
            break;
          }
        }

        if (nextIdx < state.playbackQueue.totalExpected) {
          const nextChunk = state.playbackQueue.chunks[nextIdx];

          if (nextChunk && nextChunk.url) {
            // Next chunk is already buffered and ready!
            state.playbackQueue.currentIndex = nextIdx;
            state.playbackQueue.waitingForChunk = -1;

            // Safe offset accumulation
            let offsetSum = 0;
            for (let k = 0; k < nextIdx; k++) {
              const ch = state.playbackQueue.chunks[k];
              offsetSum += (ch && ch.duration) || 0;
            }
            state.playbackQueue.currentChunkOffset = offsetSum;

            audio.src = nextChunk.url;
            audio.playbackRate = state.speed;
            audio.preservesPitch = true;
            audio.currentTime = 0;
            playAudioSafe(audio, 'queue advance');

            state.isPlaying = true;
            if (el.dockBtnPlay) el.dockBtnPlay.classList.add('playing');
            const pi = document.getElementById('play-pause-icon');
            if (pi) pi.textContent = 'pause';
            startSyncLoop();
            return;
          } else {
            // Next chunk is still buffering / in flight!
            state.playbackQueue.waitingForChunk = nextIdx;
            state.playbackQueue.currentIndex = nextIdx;

            if (el.ribbonSegmentsBadge) {
              el.ribbonSegmentsBadge.textContent = `Buffering section ${nextIdx + 1} of ${state.playbackQueue.totalExpected}...`;
            }

            state.isPlaying = true;
            if (el.dockBtnPlay) el.dockBtnPlay.classList.add('playing');
            const pi = document.getElementById('play-pause-icon');
            if (pi) pi.textContent = 'pause';
            return;
          }
        } else {
          // Finished playing all chunks!
          state.playbackQueue.isPlayingQueue = false;
          state.playbackQueue.waitingForChunk = -1;
          if (state.continuousMasterUrl) {
            state.currentUrl = state.continuousMasterUrl;
            audio.src = state.continuousMasterUrl;
            audio.currentTime = 0;
            state.duration = state.continuousDuration || audio.duration;
          }
        }
      }

      state.isPlaying = false;
      el.dockBtnPlay.classList.remove('playing');
      const pi = document.getElementById('play-pause-icon');
      if (pi) pi.textContent = 'play_arrow';
      el.dockPlayhead.style.left = '0%';
      updateTimeDisplay(0, state.continuousDuration || state.duration);
      updateRibbonPlayhead(0);
      drawDockWaveform();
      stopSyncLoop();
    });

    // Play/Pause
    el.dockBtnPlay.addEventListener('click', () => {
      if (!state.currentUrl && !state.continuousMasterUrl) {
        if (el.textInput && el.textInput.value.trim()) {
          generateSpeech();
        }
        return;
      }
      if (audio.paused) {
        if (state.continuousMasterUrl && audio.src !== state.continuousMasterUrl) {
          audio.src = state.continuousMasterUrl;
          state.currentUrl = state.continuousMasterUrl;
        }
        audio.playbackRate = state.speed;
        audio.preservesPitch = true;
        playAudioSafe(audio, 'player');
      } else {
        audio.pause();
      }
    });

    // Waveform Scrubbing (maintains wave, updates position instantly across continuous stream)
    el.waveformScrubZone.addEventListener('click', (e) => {
      if (state.playbackQueue) {
        state.playbackQueue.isPlayingQueue = false;
      }
      if (state.continuousMasterUrl && audio.src !== state.continuousMasterUrl) {
        state.currentUrl = state.continuousMasterUrl;
        audio.src = state.continuousMasterUrl;
        audio.playbackRate = state.speed;
        audio.preservesPitch = true;
      }
      const total = state.continuousDuration || audio.duration;
      if (!total) return;

      const rect = el.waveformScrubZone.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const seekTime = pos * total;

      audio.currentTime = seekTime;
      audio.playbackRate = state.speed;
      audio.preservesPitch = true;
      audio.play().catch(() => {});
      drawDockWaveform();
      updateRibbonPlayhead(seekTime);
      updateWordAndSentenceHighlight(seekTime);
    });

    // Speed Cycle button
    el.btnPlayerSpeed.addEventListener('click', () => {
      const speeds = [0.75, 1.0, 1.25, 1.5, 2.0];
      const curIdx = speeds.indexOf(state.speed);
      const nextSpd = speeds[(curIdx + 1) % speeds.length];
      setSpeed(nextSpd);
    });

    // Download Audio Button
    el.btnDockDownload.addEventListener('click', downloadCurrentAudio);

    // Close Player Bar
    el.btnClosePlayer.addEventListener('click', () => {
      if (state.playbackQueue) {
        state.playbackQueue.stop();
      }
      audio.pause();
      stopSyncLoop();
      el.dockPlayer.classList.add('hidden');
      if (el.floatingDockContainer) {
        el.floatingDockContainer.classList.remove('player-active');
      }
    });
  }

  function updateTimeDisplay(cur, total) {
    el.playerTimeDisplay.textContent = `${fmtTime(cur)} / ${fmtTime(total)}`;
  }

  async function ensureMasterBlob() {
    if (state.continuousMasterBlob) return state.continuousMasterBlob;
    const chunks = (state.playbackQueue && state.playbackQueue.chunks) || [];
    const blobs = chunks.map(c => c && c.blob).filter(Boolean);
    if (blobs.length === 0) return state.currentBlob || null;
    const totalBytes = blobs.reduce((acc, b) => acc + (b.size || 0), 0);
    if (totalBytes > 140 * 1024 * 1024) return null;
    const master = await combineAudioBlobs(blobs);
    if (master) {
      state.continuousMasterBlob = master;
      state.currentBlob = master;
    }
    return master;
  }

  async function downloadCurrentAudio() {
    if (state.masterDeferred && !state.continuousMasterBlob) {
      showToast('Packing segments into one file…', 'info', 2600);
      const packed = await ensureMasterBlob();
      if (!packed) {
        showToast('This script is too long for a single file on this device — generate it in two parts', true, 5200);
        return;
      }
    }
    if (!state.currentBlob) return;
    const url = URL.createObjectURL(state.currentBlob);
    const a = document.createElement('a');
    a.href = url;
    const safeModel = state.model.split('/')[1].replace(':', '_');
    const stamp = new Date().toISOString().slice(0, 10);
    const isWav = state.currentBlob.type && state.currentBlob.type.includes('wav');
    const ext = isWav ? 'wav' : 'mp3';
    a.download = `voxflow_atmr_${safeModel}_${stamp}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Downloading ${ext.toUpperCase()} audio`, 'success');
  }

  // --- Waveform Peak Extraction & Speech Synthesis Envelope ---
  function generateNaturalSpeechPeaks(barCount = 56) {
    const peaks = [];
    for (let i = 0; i < barCount; i++) {
      const t = i / barCount;
      const phrase = Math.sin(t * Math.PI);
      const cadence = Math.abs(Math.sin(t * 11 * Math.PI) * Math.cos(t * 3 * Math.PI));
      const micro = Math.sin(i * 1.9) * 0.12;
      const val = 0.22 + (phrase * 0.44) + (cadence * 0.32) + micro;
      peaks.push(Math.max(0.18, Math.min(0.98, val)));
    }
    return peaks;
  }

  async function extractWaveformPeaks(blobOrBuffer, barCount = 56) {
    if (blobOrBuffer && typeof blobOrBuffer.getChannelData === 'function') {
      return extractPeaksFromAudioBuffer(blobOrBuffer, barCount);
    }
    try {
      const audioCtx = getOrCreateAudioContext();
      if (!audioCtx) return generateNaturalSpeechPeaks(barCount);
      let arrayBuffer;
      if (blobOrBuffer instanceof Blob) {
        arrayBuffer = await blobOrBuffer.arrayBuffer();
      } else if (blobOrBuffer instanceof ArrayBuffer) {
        arrayBuffer = blobOrBuffer;
      } else {
        const resp = await fetch(blobOrBuffer);
        arrayBuffer = await resp.arrayBuffer();
      }
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
      return extractPeaksFromAudioBuffer(audioBuffer, barCount);
    } catch (err) {
      console.warn('Using natural cadence peaks fallback:', err);
      return generateNaturalSpeechPeaks(barCount);
    }
  }

  // --- Dynamic Waveform Visualizer ---
  function drawDockWaveform() {
    const canvas = el.dockWaveformCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    const isLight = document.body.classList.contains('theme-light');
    const barActiveColor = isLight ? '#d97706' : '#f59e0b';
    const barBaseColor = isLight ? '#cbd5e1' : '#3f3f46';

    ctx.clearRect(0, 0, w, h);

    const audio = state.audioElement;
    let duration = state.continuousDuration || (audio && audio.duration && !isNaN(audio.duration) && audio.duration > 0 ? audio.duration : 1);
    let currentTime = 0;

    if (audio && !isNaN(audio.currentTime)) {
      currentTime = (state.playbackQueue && state.playbackQueue.isPlayingQueue ? (state.playbackQueue.currentChunkOffset || 0) : 0) + audio.currentTime;
    }

    const currentRatio = Math.max(0, Math.min(1, currentTime / duration));

    if (!state.waveformPeaks || state.waveformPeaks.length === 0) {
      state.waveformPeaks = generateNaturalSpeechPeaks(56);
    }

    const peaks = state.waveformPeaks;
    const bars = peaks.length;
    const gap = 2;
    const barW = Math.max(2, (w / bars) - gap);

    for (let i = 0; i < bars; i++) {
      const barRatio = (i + 0.5) / bars;
      const isPlayed = barRatio <= currentRatio;

      // WAVE HEIGHT MAINTAINED ALWAYS: derived from decoded speech peaks!
      const peakVal = peaks[i];
      const maxBarH = h - 6;
      const minBarH = 4;
      const bh = Math.max(minBarH, peakVal * maxBarH);

      const x = i * (barW + gap);
      const y = (h - bh) / 2;
      const r = barW / 2;

      ctx.fillStyle = isPlayed ? barActiveColor : barBaseColor;

      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(x, y, barW, bh, r);
      } else {
        ctx.rect(x, y, barW, bh);
      }
      ctx.fill();
    }

    // Smooth playhead line position
    el.dockPlayhead.style.left = `${currentRatio * 100}%`;

    if (state.isPlaying) {
      state.animFrameId = requestAnimationFrame(drawDockWaveform);
    }
  }

  // --- STT (Groq Whisper) Engine ---
  function setupSTTEngine() {
    // Big Mic Click
    el.btnBigRecord.addEventListener('click', toggleMicRecording);

    // File Drag & Drop
    el.btnBrowseFile.addEventListener('click', () => el.inputAudioFile.click());
    el.sttDropzone.addEventListener('click', (e) => {
      if (e.target !== el.btnBrowseFile && !e.target.closest('.file-picked-chip')) {
        el.inputAudioFile.click();
      }
    });

    el.inputAudioFile.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        selectAudioFile(e.target.files[0]);
      }
    });

    el.sttDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      el.sttDropzone.style.borderColor = 'var(--accent-coral)';
    });

    el.sttDropzone.addEventListener('dragleave', () => {
      el.sttDropzone.style.borderColor = 'var(--border-subtle)';
    });

    el.sttDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      el.sttDropzone.style.borderColor = 'var(--border-subtle)';
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        selectAudioFile(e.dataTransfer.files[0]);
      }
    });

    el.btnRemovePicked.addEventListener('click', (e) => {
      e.stopPropagation();
      state.pickedFile = null;
      el.inputAudioFile.value = '';
      el.chipPickedFile.classList.add('hidden');
      updateTranscribeBtnState();
    });

    // Transcribe Button Click
    el.btnDoTranscribe.addEventListener('click', executeTranscription);

    // Copy Transcript
    el.btnCopyStt.addEventListener('click', () => {
      const text = el.sttTranscriptText.textContent;
      if (!text) return;
      navigator.clipboard.writeText(text);
      showToast('Copied to clipboard', 'success');
    });

    // Export .txt
    el.btnExportStt.addEventListener('click', () => {
      const text = el.sttTranscriptText.textContent;
      if (!text) return;
      const b = new Blob([text], { type: 'text/plain' });
      const u = URL.createObjectURL(b);
      const a = document.createElement('a');
      a.href = u;
      a.download = `whisper_transcript_${new Date().toISOString().slice(0, 10)}.txt`;
      a.click();
      URL.revokeObjectURL(u);
      showToast('Exported .txt file', 'success');
    });

    // 1-Click Send to TTS
    el.btnSendSttToTts.addEventListener('click', () => {
      const text = el.sttTranscriptText.textContent;
      if (!text) return;
      el.textInput.value = text;
      updateCanvasMetrics();
      switchMode('tts');
      showToast('Transferred to speech canvas!', 'info');
      el.textInput.focus();
    });
  }

  function selectAudioFile(file) {
    state.pickedFile = file;
    el.pickedFileName.textContent = `${file.name} (${fmtBytes(file.size)})`;
    el.chipPickedFile.classList.remove('hidden');
    updateTranscribeBtnState();
  }

  function updateTranscribeBtnState() {
    const ready = state.pickedFile || (state.recChunks.length > 0 && !state.isRecording);
    el.btnDoTranscribe.classList.toggle('disabled', !ready);
  }

  async function toggleMicRecording() {
    if (state.isRecording) {
      stopMicRecording();
    } else {
      startMicRecording();
    }
  }

  async function startMicRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      state.isRecording = true;
      state.recChunks = [];
      state.recSecs = 0;

      el.micHalo.classList.add('recording');
      el.sttHintDisplay.textContent = 'Listening... Click to finish recording';

      state.mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      state.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) state.recChunks.push(e.data);
      };

      state.mediaRecorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        state.isRecording = false;
        el.micHalo.classList.remove('recording');
        el.sttHintDisplay.textContent = 'Recording finished. Click Transcribe below.';
        updateTranscribeBtnState();
        cancelAnimationFrame(state.micAnimFrame);
      };

      state.mediaRecorder.start(200);

      // Timer
      clearInterval(state.recTimer);
      state.recTimer = setInterval(() => {
        state.recSecs++;
        el.sttTimerDisplay.textContent = fmtTime(state.recSecs);
      }, 1000);

      // Mic level visualizer
      startLiveMicVisualizer(stream);

    } catch (e) {
      console.error(e);
      showToast('Microphone access denied', 'error');
    }
  }

  function stopMicRecording() {
    if (state.mediaRecorder && state.isRecording) {
      state.mediaRecorder.stop();
      clearInterval(state.recTimer);
    }
  }

  function startLiveMicVisualizer(stream) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;

    state.micAudioCtx = new Ctx();
    state.micAnalyser = state.micAudioCtx.createAnalyser();
    state.micAnalyser.fftSize = 64;

    const src = state.micAudioCtx.createMediaStreamSource(stream);
    src.connect(state.micAnalyser);

    const canvas = el.sttLiveCanvas;
    const ctx = canvas.getContext('2d');

    function draw() {
      if (!state.isRecording) return;
      const buf = new Uint8Array(state.micAnalyser.frequencyBinCount);
      state.micAnalyser.getByteFrequencyData(buf);

      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i];
      const avg = sum / buf.length / 255;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const bars = 20;
      const bw = (canvas.width / bars) - 2;

      for (let i = 0; i < bars; i++) {
        const bh = Math.max(3, avg * canvas.height * (0.6 + Math.random() * 0.4));
        const x = i * (bw + 2);
        const y = (canvas.height - bh) / 2;
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(x, y, bw, bh);
      }

      state.micAnimFrame = requestAnimationFrame(draw);
    }
    draw();
  }

  async function executeTranscription() {
    let upload = state.pickedFile;
    if (!upload) {
      if (state.recChunks.length === 0) {
        if (el.inputAudioFile) el.inputAudioFile.click();
        return;
      }
      upload = new Blob(state.recChunks, { type: 'audio/webm' });
    }

    el.btnDoTranscribe.disabled = true;
    el.btnDoTranscribe.classList.add('loading');
    el.labelTranscribe.textContent = 'Transcribing with Groq...';

    const formData = new FormData();
    formData.append('file', upload, upload.name || 'speech.webm');
    formData.append('model', 'whisper-large-v3-turbo');
    if (state.customGroqKey) formData.append('api_key', state.customGroqKey);

    try {
      const res = await fetch('/api/stt', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || 'Transcription failed');
      }

      const data = await res.json();
      const text = data.text || '';

      el.sttResultCard.classList.remove('hidden');
      el.sttTranscriptText.textContent = text;

      addToLibrary({
        type: 'stt',
        model: 'Whisper Large v3 Turbo',
        text: text,
        timestamp: new Date().toISOString()
      });

      showToast('Transcribed instantly!', 'success');

    } catch (err) {
      console.error(err);
      showToast(err.message, 'error', 4500);
    } finally {
      el.btnDoTranscribe.disabled = false;
      el.btnDoTranscribe.classList.remove('loading');
      el.labelTranscribe.textContent = 'Transcribe Audio with Groq';
    }
  }

  // --- Library Management ---
  // --- Library (Archive tab) ---
  // The standalone library drawer was folded into the Archive tab, so the
  // open/close button may no longer exist in the DOM. Guard every access.
  function setupLibrary() {
    if (el.btnOpenLib) el.btnOpenLib.addEventListener('click', openLibrary);
    if (el.btnCloseLibDrawer) el.btnCloseLibDrawer.addEventListener('click', closeLibrary);
    if (el.libraryDrawerBackdrop) {
      el.libraryDrawerBackdrop.addEventListener('click', (e) => {
        if (e.target === el.libraryDrawerBackdrop) closeLibrary();
      });
    }

    el.btnClearAllLib.addEventListener('click', () => {
      if (confirm('Clear all items from your library?')) {
        state.library = [];
        localStorage.setItem('voxflow_library', JSON.stringify([]));
        renderLibraryItems();
        showToast('Library cleared', 'info');
      }
    });
  }

  function openLibrary() {
    if (el.libraryDrawerBackdrop) el.libraryDrawerBackdrop.classList.remove('hidden');
  }

  function closeLibrary() {
    if (el.libraryDrawerBackdrop) el.libraryDrawerBackdrop.classList.add('hidden');
  }

  function addToLibrary(item) {
    state.library.unshift({ id: 'item_' + Date.now(), ...item });
    if (state.library.length > 30) state.library.pop();
    localStorage.setItem('voxflow_library', JSON.stringify(state.library));
    renderLibraryItems();
  }

  function renderLibraryItems(searchQuery = '') {
    if (el.libBadge) el.libBadge.textContent = state.library.length;
    
    // Update Vault telemetry
    const countLabel = document.getElementById('archive-count-label');
    if (countLabel) countLabel.textContent = `${state.library.length} Clips Saved`;

    const pBar = document.getElementById('archive-progress-bar');
    if (pBar) {
      const pct = Math.min(100, Math.round((state.library.length / 30) * 100));
      pBar.style.width = `${pct}%`;
    }

    const list = el.libraryItemsList;
    if (!list) return;
    list.innerHTML = '';

    const q = (typeof searchQuery === 'string') ? searchQuery.toLowerCase() : '';
    const filtered = q
      ? state.library.filter(i => 
          (i.text && i.text.toLowerCase().includes(q)) || 
          (i.voice && i.voice.toLowerCase().includes(q)) || 
          (i.model && i.model.toLowerCase().includes(q))
        )
      : state.library;

    if (filtered.length === 0) {
      list.innerHTML = `
        <div class="p-8 text-center text-on-surface-variant font-mono text-xs rounded-xl bg-surface-container-low border border-white/[0.04]">
          ${q ? 'No matching audio clips found in archive.' : 'No saved audio clips yet. Synthesize speech in Studio to build your personal archive.'}
        </div>
      `;
      return;
    }

    filtered.forEach(item => {
      const card = document.createElement('div');
      card.className = 'archive-card flex flex-col p-4 rounded-xl bg-surface-container border border-white/[0.04] hover:border-white/[0.08] transition-all gap-2.5';
      const time = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const badge = item.type === 'tts' ? `${item.model.split('/')[1] || 'TTS'} · ${item.voice || ''}` : 'Whisper STT';

      card.innerHTML = `
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="w-1.5 h-1.5 rounded-full bg-tertiary-fixed-dim"></span>
            <span class="font-mono text-xs text-primary font-medium uppercase tracking-wider">${badge}</span>
          </div>
          <span class="font-mono text-[10px] text-outline">${time}</span>
        </div>
        <p class="text-sm text-on-surface leading-relaxed line-clamp-2 select-text">${escapeHtml(item.text)}</p>
        <div class="flex items-center justify-between pt-2 border-t border-white/[0.04]">
          <button class="lib-btn-reuse px-3 py-1 rounded-full bg-surface-container-high text-xs text-primary hover:bg-surface-container-highest transition-colors font-mono uppercase tracking-wider" data-reuse-id="${item.id}">Load Script</button>
          <button class="lib-btn-del w-7 h-7 rounded-full flex items-center justify-center text-outline hover:text-error hover:bg-surface-container-high transition-colors" data-del-id="${item.id}" title="Delete clip">
            <span class="material-symbols-outlined text-[16px]">delete</span>
          </button>
        </div>
      `;

      card.querySelector('[data-reuse-id]').addEventListener('click', () => {
        if (el.textInput) el.textInput.value = item.text;
        updateCanvasMetrics();
        closeLibrary();
        switchTab('studio');
        showToast('Loaded script into Studio', 'info');
      });

      card.querySelector('[data-del-id]').addEventListener('click', () => {
        state.library = state.library.filter(i => i.id !== item.id);
        localStorage.setItem('voxflow_library', JSON.stringify(state.library));
        renderLibraryItems(searchQuery);
        showToast('Clip deleted from archive', 'info', 1500);
      });

      list.appendChild(card);
    });
  }

  // --- Settings Modal ---
  function setupSettingsModal() {
    el.btnOpenSettings.addEventListener('click', () => {
      if (el.inputKeyDeepgram) el.inputKeyDeepgram.value = state.customDeepgramKey;
      if (el.inputKeyMistral) el.inputKeyMistral.value = state.customMistralKey;
      if (el.inputKeyElevenlabs) el.inputKeyElevenlabs.value = state.customElevenLabsKey;
      if (el.inputKeyGemini) el.inputKeyGemini.value = state.customGeminiKey;
      if (el.inputKeyCartesia) el.inputKeyCartesia.value = state.customCartesiaKey;
      if (el.inputKeyCfToken) el.inputKeyCfToken.value = state.customCfToken;
      if (el.inputKeyCfAccount) el.inputKeyCfAccount.value = state.customCfAccount;
      el.inputKeyOpenRouter.value = state.customOpenRouterKey;
      el.inputKeyGroq.value = state.customGroqKey;
      if (el.toggleAutoPlay) el.toggleAutoPlay.checked = state.autoPlay;
      updateStatusIndicators();
      el.settingsModalBackdrop.classList.remove('hidden');
    });

    el.btnCloseSettingsModal.addEventListener('click', () => {
      el.settingsModalBackdrop.classList.add('hidden');
    });

    el.settingsModalBackdrop.addEventListener('click', (e) => {
      if (e.target === el.settingsModalBackdrop) el.settingsModalBackdrop.classList.add('hidden');
    });

    // Auto-play switch change
    if (el.toggleAutoPlay) {
      el.toggleAutoPlay.checked = state.autoPlay;
      el.toggleAutoPlay.addEventListener('change', () => {
        state.autoPlay = el.toggleAutoPlay.checked;
        localStorage.setItem('voxflow_autoplay', state.autoPlay ? 'true' : 'false');
        showToast(state.autoPlay ? 'Auto-play enabled' : 'Auto-play disabled', 'info', 1600);
      });
    }

    // Reveal toggle
    document.querySelectorAll('.btn-reveal').forEach(btn => {
      btn.addEventListener('click', () => {
        const inp = document.getElementById(btn.getAttribute('data-for'));
        inp.type = inp.type === 'password' ? 'text' : 'password';
      });
    });

    // Save
    el.btnSaveCustomKeys.addEventListener('click', () => {
      if (el.inputKeyDeepgram) state.customDeepgramKey = el.inputKeyDeepgram.value.trim();
      if (el.inputKeyMistral) state.customMistralKey = el.inputKeyMistral.value.trim();
      if (el.inputKeyElevenlabs) state.customElevenLabsKey = el.inputKeyElevenlabs.value.trim();
      if (el.inputKeyGemini) state.customGeminiKey = el.inputKeyGemini.value.trim();
      if (el.inputKeyCartesia) state.customCartesiaKey = el.inputKeyCartesia.value.trim();
      if (el.inputKeyCfToken) state.customCfToken = el.inputKeyCfToken.value.trim();
      if (el.inputKeyCfAccount) state.customCfAccount = el.inputKeyCfAccount.value.trim();
      state.customOpenRouterKey = el.inputKeyOpenRouter.value.trim();
      state.customGroqKey = el.inputKeyGroq.value.trim();
      if (el.toggleAutoPlay) {
        state.autoPlay = el.toggleAutoPlay.checked;
        localStorage.setItem('voxflow_autoplay', state.autoPlay ? 'true' : 'false');
      }

      if (state.customDeepgramKey) localStorage.setItem('voxflow_deepgram_key', state.customDeepgramKey);
      else localStorage.removeItem('voxflow_deepgram_key');

      if (state.customMistralKey) localStorage.setItem('voxflow_mistral_key', state.customMistralKey);
      else localStorage.removeItem('voxflow_mistral_key');

      if (state.customElevenLabsKey) localStorage.setItem('voxflow_elevenlabs_key', state.customElevenLabsKey);
      else localStorage.removeItem('voxflow_elevenlabs_key');

      if (state.customGeminiKey) localStorage.setItem('voxflow_gemini_key', state.customGeminiKey);
      else localStorage.removeItem('voxflow_gemini_key');

      if (state.customCartesiaKey) localStorage.setItem('voxflow_cartesia_key', state.customCartesiaKey);
      else localStorage.removeItem('voxflow_cartesia_key');

      if (state.customCfToken) localStorage.setItem('voxflow_cf_token', state.customCfToken);
      else localStorage.removeItem('voxflow_cf_token');

      if (state.customCfAccount) localStorage.setItem('voxflow_cf_account', state.customCfAccount);
      else localStorage.removeItem('voxflow_cf_account');

      if (state.customOpenRouterKey) localStorage.setItem('voxflow_openrouter_key', state.customOpenRouterKey);
      else localStorage.removeItem('voxflow_openrouter_key');

      if (state.customGroqKey) localStorage.setItem('voxflow_groq_key', state.customGroqKey);
      else localStorage.removeItem('voxflow_groq_key');

      updateStatusIndicators();
      el.settingsModalBackdrop.classList.add('hidden');
      showToast('Settings saved', 'success');
    });

    // Reset
    el.btnResetDefaultKeys.addEventListener('click', () => {
      state.customDeepgramKey = '';
      state.customMistralKey = '';
      state.customElevenLabsKey = '';
      state.customGeminiKey = '';
      state.customCartesiaKey = '';
      state.customCfToken = '';
      state.customCfAccount = '';
      state.customOpenRouterKey = '';
      state.customGroqKey = '';
      state.autoPlay = true;
      localStorage.setItem('voxflow_autoplay', 'true');
      if (el.toggleAutoPlay) el.toggleAutoPlay.checked = true;
      localStorage.removeItem('voxflow_deepgram_key');
      localStorage.removeItem('voxflow_mistral_key');
      localStorage.removeItem('voxflow_elevenlabs_key');
      localStorage.removeItem('voxflow_gemini_key');
      localStorage.removeItem('voxflow_cartesia_key');
      localStorage.removeItem('voxflow_cf_token');
      localStorage.removeItem('voxflow_cf_account');
      localStorage.removeItem('voxflow_openrouter_key');
      localStorage.removeItem('voxflow_groq_key');
      if (el.inputKeyDeepgram) el.inputKeyDeepgram.value = '';
      if (el.inputKeyMistral) el.inputKeyMistral.value = '';
      if (el.inputKeyElevenlabs) el.inputKeyElevenlabs.value = '';
      if (el.inputKeyGemini) el.inputKeyGemini.value = '';
      if (el.inputKeyCartesia) el.inputKeyCartesia.value = '';
      if (el.inputKeyCfToken) el.inputKeyCfToken.value = '';
      if (el.inputKeyCfAccount) el.inputKeyCfAccount.value = '';
      el.inputKeyOpenRouter.value = '';
      el.inputKeyGroq.value = '';
      updateStatusIndicators();
      showToast('Reset to server defaults', 'info');
    });
  }

  // --- Developer API Modal ---
  function setupApiModal() {
    if (!el.btnOpenApi) return;

    function refreshApiModalState() {
      const savedKey = localStorage.getItem('voxflow_api_key');
      if (savedKey) {
        el.displayApiKey.value = savedKey;
        el.apiKeyDisplayArea.classList.remove('hidden');
        if (el.apiSampleCurl) {
          el.apiSampleCurl.textContent = `curl -X POST https://voxflow-809.pages.dev/api/tts \\
  -H "Authorization: Bearer ${savedKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"text": "Hello world from VoxFlow API", "voice": "flux-alexis-en"}' \\
  --output speech.mp3`;
        }
      } else {
        el.displayApiKey.value = '';
        el.apiKeyDisplayArea.classList.add('hidden');
        if (el.apiSampleCurl) {
          el.apiSampleCurl.textContent = `curl -X POST https://voxflow-809.pages.dev/api/tts \\
  -H "Authorization: Bearer YOUR_VOX_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"text": "Hello world from VoxFlow API", "voice": "flux-alexis-en"}' \\
  --output speech.mp3`;
        }
      }
    }

    el.btnOpenApi.addEventListener('click', () => {
      refreshApiModalState();
      el.apiModalBackdrop.classList.remove('hidden');
    });

    const closeModal = () => el.apiModalBackdrop.classList.add('hidden');
    if (el.btnCloseApiModal) el.btnCloseApiModal.addEventListener('click', closeModal);
    if (el.btnCloseApiModalDone) el.btnCloseApiModalDone.addEventListener('click', closeModal);
    el.apiModalBackdrop.addEventListener('click', (e) => {
      if (e.target === el.apiModalBackdrop) closeModal();
    });

    // Generate Key
    if (el.btnGenerateApiKey) {
      el.btnGenerateApiKey.addEventListener('click', async () => {
        const name = (el.inputApiKeyName.value || 'VoxFlow Agent').trim();
        const origText = el.btnGenerateApiKey.textContent;
        el.btnGenerateApiKey.disabled = true;
        el.btnGenerateApiKey.textContent = 'Generating...';

        try {
          const resp = await fetch('/api/keys/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
          });
          const data = await resp.json();
          if (data && data.api_key) {
            localStorage.setItem('voxflow_api_key', data.api_key);
            refreshApiModalState();
            showToast('New API key generated & ready!', 'success');
          } else {
            showToast('Failed to generate key: ' + (data.detail || 'Unknown error'), 'error');
          }
        } catch (err) {
          showToast('Key generation error: ' + err.message, 'error');
        } finally {
          el.btnGenerateApiKey.disabled = false;
          el.btnGenerateApiKey.textContent = origText;
        }
      });
    }

    // Copy Key
    if (el.btnCopyApiKey) {
      el.btnCopyApiKey.addEventListener('click', () => {
        if (!el.displayApiKey.value) return;
        navigator.clipboard.writeText(el.displayApiKey.value).then(() => {
          showToast('API key copied to clipboard!', 'success');
        }).catch(() => {
          el.displayApiKey.select();
          document.execCommand('copy');
          showToast('API key copied!', 'success');
        });
      });
    }

    // Revoke / Clear
    if (el.btnRevokeApiKey) {
      el.btnRevokeApiKey.addEventListener('click', () => {
        localStorage.removeItem('voxflow_api_key');
        refreshApiModalState();
        showToast('Stored key cleared', 'info');
      });
    }
  }

  // --- Voice Preview Listeners ---
  function setupPreviewAudioListeners() {
    state.previewAudio.addEventListener('ended', () => {
      state.isPreviewPlaying = false;
      updatePreviewButtonStates();
    });
    state.previewAudio.addEventListener('pause', () => {
      state.isPreviewPlaying = false;
      updatePreviewButtonStates();
    });
  }

  // --- Progressive Web App (PWA) Controller ---
  function setupPWA() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then((reg) => {
          console.log('VoxFlow Service Worker registered:', reg.scope);
        }).catch((err) => {
          console.warn('Service Worker registration warning:', err);
        });
      });
    }

    let deferredPrompt = null;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      if (el.btnInstallPwa) {
        el.btnInstallPwa.classList.remove('hidden');
      }
    });

    if (el.btnInstallPwa) {
      el.btnInstallPwa.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          showToast('VoxFlow installed to home screen!', 'success');
        }
        deferredPrompt = null;
        el.btnInstallPwa.classList.add('hidden');
      });
    }

    window.addEventListener('appinstalled', () => {
      deferredPrompt = null;
      if (el.btnInstallPwa) el.btnInstallPwa.classList.add('hidden');
      showToast('VoxFlow PWA is installed!', 'success');
    });
  }

  // --- Keyboard Shortcuts ---
  function setupShortcuts() {
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (state.mode === 'tts' && !el.btnMainGenerate.disabled) {
          e.preventDefault();
          synthesizeSpeech();
        }
      }
      if (e.code === 'Space' && document.activeElement.tagName !== 'TEXTAREA' && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        if (state.currentUrl) {
          if (state.audioElement.paused) state.audioElement.play();
          else state.audioElement.pause();
        }
      }
    });
  }

  // --- Helper Formatters ---
  function fmtTime(sec) {
    if (isNaN(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function fmtBytes(b) {
    if (!b) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(b) / Math.log(k));
    return parseFloat((b / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // Run on ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();


/* === PERSONAL STUDIO ES MODULE EXTENSIONS === */

const studioState = {
  voices: [],
  currentVoiceId: localStorage.getItem('nas.lastVoice') || null,
  lastAudioId: null
};

function showToast(message, isError) {
  const stack = document.getElementById('toast-stack');
  if (!stack) return;
  const toast = document.createElement('div');
  toast.className = isError ? 'toast is-error' : 'toast';
  toast.setAttribute('role', 'status');
  toast.textContent = message;
  stack.appendChild(toast);
  while (stack.children.length > 3) stack.removeChild(stack.firstElementChild);
  setTimeout(() => toast.remove(), isError ? 8000 : 4000);
}

async function loadVoices() {
  try {
    const res = await fetch('/api/voices');
    if (!res.ok) throw new Error('voices');
    const data = await res.json();
    studioState.voices = Array.isArray(data) ? data : data.voices || [];
  } catch (err) {
    studioState.voices = [];
  }
  return studioState.voices;
}

function updateFavoriteToggleBtn() {
  const btn = document.getElementById('favorite-toggle');
  if (!btn) return;
  const isFav = isFavorite(studioState.currentVoiceId);
  btn.classList.toggle('text-tertiary-fixed-dim', isFav);
  btn.setAttribute('aria-pressed', isFav ? 'true' : 'false');
  btn.title = isFav ? 'Unpin from favorites' : 'Pin to favorites';
  const label = btn.querySelector('.font-mono');
  if (label) label.textContent = isFav ? 'Pinned' : 'Pin';
}

function wireFavoriteToggle() {
  const btn = document.getElementById('favorite-toggle');
  if (!btn) return;
  btn.addEventListener('click', () => {
    if (!studioState.currentVoiceId) return;
    toggleFavorite(studioState.currentVoiceId);
    updateFavoriteToggleBtn();
    renderFavorites(
      document.getElementById('favorites-strip'),
      studioState.voices,
      studioState.currentVoiceId,
      selectVoice
    );
  });
  updateFavoriteToggleBtn();
}

function selectVoice(voiceId) {
  studioState.currentVoiceId = voiceId;
  localStorage.setItem('nas.lastVoice', voiceId);
  const select = document.getElementById('voice-select');
  if (select) select.value = voiceId;
  updateFavoriteToggleBtn();
  renderFavorites(document.getElementById('favorites-strip'), studioState.voices, voiceId, selectVoice);
}

function renderPresets() {
  const container = document.getElementById('presets-list');
  if (!container) return;
  container.innerHTML = '';
  for (const preset of listPresets()) {
    const card = document.createElement('article');
    card.className = 'preset-card';
    card.dataset.presetId = preset.id;
    card.tabIndex = 0;

    const name = document.createElement('h3');
    name.className = 'preset-card-name';
    name.title = preset.name;
    name.textContent = preset.name;

    const preview = document.createElement('p');
    preview.className = 'preset-card-preview';
    preview.title = preset.text;
    preview.textContent = preset.text;

    card.appendChild(name);
    card.appendChild(preview);

    if (!preset.builtin) {
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'icon-button preset-card-delete';
      del.setAttribute('aria-label', `Delete preset ${preset.name}`);
      del.textContent = '×';
      del.addEventListener('click', (event) => {
        event.stopPropagation();
        removePreset(preset.id);
        renderPresets();
      });
      card.appendChild(del);
    }

    card.addEventListener('click', () => {
      const textarea = document.getElementById('script-input') || document.querySelector('textarea');
      if (textarea) textarea.value = preset.text;
    });
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        card.click();
      }
    });

    container.appendChild(card);
  }
}

function wirePresetForm() {
  const toggle = document.getElementById('preset-add-toggle');
  const form = document.getElementById('preset-form');
  const cancel = document.getElementById('preset-cancel');
  const errorEl = document.getElementById('preset-error');
  if (!toggle || !form) return;

  toggle.addEventListener('click', () => {
    form.hidden = !form.hidden;
    if (!form.hidden) document.getElementById('preset-name').focus();
  });

  if (cancel) {
    cancel.addEventListener('click', () => {
      form.hidden = true;
      if (errorEl) errorEl.hidden = true;
    });
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = document.getElementById('preset-name').value;
    const text = document.getElementById('preset-text').value;
    try {
      addPreset(name, text);
      form.reset();
      form.hidden = true;
      if (errorEl) errorEl.hidden = true;
      renderPresets();
      showToast('Preset saved', false);
    } catch (err) {
      if (errorEl) {
        errorEl.textContent = err.message;
        errorEl.hidden = false;
      }
    }
  });
}

async function refreshEngineStatus() {
  const el = document.getElementById('engine-status');
  if (!el) return;
  const label = el.querySelector('.engine-status-label');
  try {
    const res = await fetch('/api/status');
    if (!res.ok) throw new Error('status');
    const data = await res.json();
    const ready = data && (data.ready === true || data.status === 'ok' || data.status === 'ready' || data.engine === 'ready');
    el.classList.toggle('is-ready', !!ready);
    el.classList.toggle('is-error', !ready);
    if (label) label.textContent = ready ? 'Engine ready' : 'Engine idle';
  } catch (err) {
    el.classList.remove('is-ready');
    el.classList.add('is-error');
    if (label) label.textContent = 'Engine offline';
  }
}

async function captureGeneratedAudio(blob, text) {
  if (!studioState.voices || !studioState.voices.length) {
    await loadVoices();
  }
  const voice = studioState.voices.find((v) => v.id === studioState.currentVoiceId);
  const voiceName = voice ? voice.name : (studioState.currentVoiceId || 'voice');
  const createdAt = Date.now();
  const ext = extFromMime(blob.type);
  const filename = buildFilename({ voice: voiceName, text, createdAt, ext });
  const id = `clip-${createdAt}-${Math.random().toString(36).slice(2, 8)}`;
  const duration = await new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      const d = Number.isFinite(audio.duration) ? audio.duration : 0;
      URL.revokeObjectURL(url);
      resolve(d);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };
    audio.src = url;
  });
  await putAudio({ id, filename, voiceId: studioState.currentVoiceId, voiceName, text, createdAt, duration, mime: blob.type }, blob);
  studioState.lastAudioId = id;
  await renderVault(document.getElementById('vault-list'));
  return id;
}

window.__nas = {
  studioState,
  captureGeneratedAudio,
  showToast,
  selectVoice,
  renderPresets,
  refreshEngineStatus
};

async function boot() {
  await loadVoices();
  renderFavorites(document.getElementById('favorites-strip'), studioState.voices, studioState.currentVoiceId, selectVoice);
  renderPresets();
  wirePresetForm();
  wireFavoriteToggle();
  await renderVault(document.getElementById('vault-list'));
  await refreshEngineStatus();
  setInterval(refreshEngineStatus, 30000);

  initPalette({
    voicesProvider: async () => studioState.voices.length ? studioState.voices : await loadVoices(),
    onSelect: (voiceId) => {
      selectVoice(voiceId);
      showToast('Voice switched', false);
    }
  });

  initKeys({
    onPlayPause: () => togglePlayPause(),
    onDownload: () => {
      if (studioState.lastAudioId) download(studioState.lastAudioId);
      else showToast('Nothing to download yet', true);
    },
    onEscape: () => {
      const form = document.getElementById('preset-form');
      if (form && !form.hidden) form.hidden = true;
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
