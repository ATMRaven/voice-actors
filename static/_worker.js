// Cloudflare Pages Advanced Mode Edge Worker for VoxFlow Studio
// Provides High-Performance Neural TTS, Whisper STT/Alignment, and Cryptographic API Key Auth

const DEEPGRAM_VOICES = [
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

const VOXTRAL_VOICES = [
  // Paul (US English - Emotional Spectrum)
  { id: "en_paul_happy", name: "Paul - Happy", gender: "Male", accent: "US English", tone: "Sunny, Easygoing, Happy", emotion: "Happy", provider: "Mistral Voxtral", recommended: true },
  { id: "en_paul_excited", name: "Paul - Excited", gender: "Male", accent: "US English", tone: "Bouncy, Spirited, Excited", emotion: "Excited", provider: "Mistral Voxtral", recommended: true },
  { id: "en_paul_confident", name: "Paul - Confident", gender: "Male", accent: "US English", tone: "Bold, Punchy, Confident", emotion: "Confident", provider: "Mistral Voxtral" },
  { id: "en_paul_cheerful", name: "Paul - Cheerful", gender: "Male", accent: "US English", tone: "Upbeat, Breezy, Cheerful", emotion: "Cheerful", provider: "Mistral Voxtral" },
  { id: "en_paul_neutral", name: "Paul - Neutral", gender: "Male", accent: "US English", tone: "Relaxed, Balanced, Neutral", emotion: "Neutral", provider: "Mistral Voxtral" },
  { id: "en_paul_frustrated", name: "Paul - Frustrated", gender: "Male", accent: "US English", tone: "Edgy, Snappy, Frustrated", emotion: "Frustrated", provider: "Mistral Voxtral" },
  { id: "en_paul_sad", name: "Paul - Sad", gender: "Male", accent: "US English", tone: "Heavy, Hushed, Sad", emotion: "Sad", provider: "Mistral Voxtral" },
  { id: "en_paul_angry", name: "Paul - Angry", gender: "Male", accent: "US English", tone: "Raw, Gruff, Angry", emotion: "Angry", provider: "Mistral Voxtral" },

  // Jane (British English - Distinctive Emotions)
  { id: "gb_jane_sarcasm", name: "Jane - Sarcasm", gender: "Female", accent: "British English", tone: "Dry, Wry, Sarcastic", emotion: "Sarcastic", provider: "Mistral Voxtral", recommended: true },
  { id: "gb_jane_confident", name: "Jane - Confident", gender: "Female", accent: "British English", tone: "Poised, Sharp, Confident", emotion: "Confident", provider: "Mistral Voxtral" },
  { id: "gb_jane_curious", name: "Jane - Curious", gender: "Female", accent: "British English", tone: "Inquisitive, Intrigued", emotion: "Curious", provider: "Mistral Voxtral" },
  { id: "gb_jane_neutral", name: "Jane - Neutral", gender: "Female", accent: "British English", tone: "Calm, Even, Neutral", emotion: "Neutral", provider: "Mistral Voxtral" },
  { id: "gb_jane_confused", "name": "Jane - Confused", gender: "Female", accent: "British English", tone: "Puzzled, Searching", emotion: "Confused", provider: "Mistral Voxtral" },
  { id: "gb_jane_frustrated", name: "Jane - Frustrated", gender: "Female", accent: "British English", tone: "Exasperated, Tense", emotion: "Frustrated", provider: "Mistral Voxtral" },
  { id: "gb_jane_jealousy", name: "Jane - Jealousy", gender: "Female", accent: "British English", tone: "Envious, Spiteful", emotion: "Jealousy", provider: "Mistral Voxtral" },
  { id: "gb_jane_sad", name: "Jane - Sad", gender: "Female", accent: "British English", tone: "Sorrowful, Melancholy", emotion: "Sad", provider: "Mistral Voxtral" },
  { id: "gb_jane_shameful", name: "Jane - Shameful", gender: "Female", accent: "British English", tone: "Regretful, Hesitant", emotion: "Shameful", provider: "Mistral Voxtral" },

  // Oliver (British English - Rich Expressiveness)
  { id: "gb_oliver_confident", name: "Oliver - Confident", gender: "Male", accent: "British English", tone: "Assured, Articulate, Confident", emotion: "Confident", provider: "Mistral Voxtral", recommended: true },
  { id: "gb_oliver_cheerful", name: "Oliver - Cheerful", gender: "Male", accent: "British English", tone: "Pleasant, Engaging, Warm", emotion: "Cheerful", provider: "Mistral Voxtral" },
  { id: "gb_oliver_excited", name: "Oliver - Excited", gender: "Male", accent: "British English", tone: "Enthusiastic, Animated", emotion: "Excited", provider: "Mistral Voxtral" },
  { id: "gb_oliver_curious", name: "Oliver - Curious", gender: "Male", accent: "British English", tone: "Thoughtful, Inquiring", emotion: "Curious", provider: "Mistral Voxtral" },
  { id: "gb_oliver_neutral", name: "Oliver - Neutral", gender: "Male", accent: "British English", tone: "Calm, Even, Neutral", emotion: "Neutral", provider: "Mistral Voxtral" },
  { id: "gb_oliver_sad", name: "Oliver - Sad", gender: "Male", accent: "British English", tone: "Subdued, Heavy", emotion: "Sad", provider: "Mistral Voxtral" },
  { id: "gb_oliver_angry", name: "Oliver - Angry", gender: "Male", accent: "British English", tone: "Stern, Sharp, Direct", emotion: "Angry", provider: "Mistral Voxtral" },

  // Marie (French / Multilingual)
  { id: "fr_marie_happy", name: "Marie - Happy", gender: "Female", accent: "French Accent", tone: "Joyful, Radiant, Expressive", emotion: "Happy", provider: "Mistral Voxtral", recommended: true },
  { id: "fr_marie_excited", name: "Marie - Excited", gender: "Female", accent: "French Accent", tone: "Lively, Vibrant", emotion: "Excited", provider: "Mistral Voxtral" },
  { id: "fr_marie_curious", name: "Marie - Curious", gender: "Female", accent: "French Accent", tone: "Intrigued, Playful", emotion: "Curious", provider: "Mistral Voxtral" },
  { id: "fr_marie_neutral", name: "Marie - Neutral", gender: "Female", accent: "French Accent", tone: "Elegant, Natural", emotion: "Neutral", provider: "Mistral Voxtral" },
  { id: "fr_marie_sad", name: "Marie - Sad", gender: "Female", accent: "French Accent", tone: "Gentle, Wistful", emotion: "Sad", provider: "Mistral Voxtral" },
  { id: "fr_marie_angry", name: "Marie - Angry", gender: "Female", accent: "French Accent", tone: "Passionate, Fiery", emotion: "Angry", provider: "Mistral Voxtral" }
];

const FISH_VOICES = [
  { id: "alloy", name: "S2.1 Multi-Voice", gender: "Adaptive", accent: "Multilingual Neural", tone: "Expressive & High Fidelity", recommended: true }
];

const CARTESIA_VOICES = [
  { id: "95856005-0332-41b0-935f-352e296aa0df", name: "Sophie", gender: "Female", accent: "US English", tone: "Conversational & Natural", provider: "Cartesia", recommended: true },
  { id: "a0e99841-438c-4a64-b679-ae501e7d6091", name: "Barbershop Man", gender: "Male", accent: "US English", tone: "Rich & Resonant", provider: "Cartesia", recommended: true },
  { id: "694f9389-aac1-45b6-b726-9d9369183238", name: "Sarah", gender: "Female", accent: "US English", tone: "Calm & Professional", provider: "Cartesia" },
  { id: "79a125e8-cd45-4c13-8a67-188112f4dd22", name: "British Lady", gender: "Female", accent: "British English", tone: "Poised & Articulate", provider: "Cartesia", recommended: true },
  { id: "f39d8500-0d9b-4b8b-a080-38f5188f5892", name: "Commercial Lady", gender: "Female", accent: "US English", tone: "Dynamic & Upbeat", provider: "Cartesia" },
  { id: "829ccd10-f8b3-43cd-b8a0-4aeaa81f3b30", name: "Doctor", gender: "Male", accent: "US English", tone: "Authoritative & Trustworthy", provider: "Cartesia" },
  { id: "b7d50908-b17c-442d-ad8d-810c63997ed9", name: "California Girl", gender: "Female", accent: "US English", tone: "Youthful & Breezy", provider: "Cartesia" },
  { id: "5c42302c-194b-4d0c-ba1a-8cb485c84ab9", name: "Storyteller", gender: "Male", accent: "US English", tone: "Warm & Dramatic", provider: "Cartesia" }
];

const GEMINI_VOICES = [
  { id: "Puck", name: "Puck", gender: "Male", accent: "Natural Expressive", tone: "Lively & Engaging", provider: "Google Gemini", recommended: true },
  { id: "Charon", name: "Charon", gender: "Male", accent: "Deep Expressive", tone: "Informative & Grounded", provider: "Google Gemini", recommended: true },
  { id: "Kore", name: "Kore", gender: "Female", accent: "Warm Expressive", tone: "Empathetic & Conversational", provider: "Google Gemini", recommended: true },
  { id: "Fenrir", name: "Fenrir", gender: "Male", accent: "Bold Expressive", tone: "Strong & Radio-Clear", provider: "Google Gemini" },
  { id: "Aoede", name: "Aoede", gender: "Female", accent: "Melodic Expressive", tone: "Harmonic & Smooth", provider: "Google Gemini" }
];

const GROQ_ORPHEUS_VOICES = [
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

const CLOUDFLARE_MELOTTS_VOICES = [
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

const ELEVENLABS_VOICES = [
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

function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}


const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE",
  "Access-Control-Allow-Headers": "Authorization, X-API-Key, Content-Type, HTTP-Referer, X-Title",
  "Access-Control-Max-Age": "86400"
};

function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
      ...extraHeaders
    }
  });
}

function pcmToWav(pcmBytes, sampleRate = 24000, numChannels = 1, bitsPerSample = 16) {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmBytes.byteLength;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + dataSize, true); // chunkSize
  view.setUint32(8, 0x57415645, false); // "WAVE"
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true); // subchunk1Size
  view.setUint16(20, 1, true); // audioFormat (PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, dataSize, true);

  new Uint8Array(buffer, 44).set(new Uint8Array(pcmBytes));
  return buffer;
}

// Base64URL Helpers
function base64UrlEncode(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str) {
  let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

function hexToBuffer(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes.buffer;
}

function bufferToHex(buf) {
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function getHmacKey(secretStr) {
  const enc = new TextEncoder();
  return await crypto.subtle.importKey(
    "raw",
    enc.encode(secretStr),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

const DEFAULT_HMAC_SECRET = "voxflow_secret_master_key_2026_neural_audio";

// Generate HMAC signed key: vox_live_<payload>.<signatureHex>
async function generateVoxApiKey(name = "Default Agent", secret = DEFAULT_HMAC_SECRET) {
  const payloadObj = {
    n: (name || "Agent").trim().slice(0, 64),
    t: Date.now(),
    r: crypto.randomUUID().replace(/-/g, '').slice(0, 16)
  };
  const payloadStr = JSON.stringify(payloadObj);
  const b64Payload = base64UrlEncode(payloadStr);

  const hmacKey = await getHmacKey(secret);
  const sigBuf = await crypto.subtle.sign("HMAC", hmacKey, new TextEncoder().encode(b64Payload));
  const sigHex = bufferToHex(sigBuf);

  return {
    apiKey: `vox_live_${b64Payload}.${sigHex}`,
    payload: payloadObj
  };
}

// Verify key
async function verifyVoxApiKey(keyStr, secret = DEFAULT_HMAC_SECRET) {
  if (!keyStr || typeof keyStr !== 'string') {
    return { valid: false, reason: "Missing API key." };
  }

  // 1. Direct third-party provider keys (Deepgram, OpenRouter, or Groq pass-through)
  if (keyStr.startsWith("sk-or-v1-")) {
    return { valid: true, name: "OpenRouter Direct Key", isProviderKey: true, provider: "openrouter", key: keyStr };
  }
  if (keyStr.startsWith("gsk_")) {
    return { valid: true, name: "Groq Direct Key", isProviderKey: true, provider: "groq", key: keyStr };
  }
  if (keyStr.startsWith("dg_") || (keyStr.length === 40 && !keyStr.startsWith("vox_"))) {
    return { valid: true, name: "Deepgram Direct Key", isProviderKey: true, provider: "deepgram", key: keyStr };
  }

  // 2. VoxFlow signed token
  if (!keyStr.startsWith("vox_live_")) {
    return { valid: false, reason: "Invalid key format. Must begin with 'vox_live_' or provider key." };
  }

  const parts = keyStr.slice(9).split('.');
  if (parts.length !== 2) {
    return { valid: false, reason: "Malformed token signature." };
  }

  const [b64Payload, sigHex] = parts;
  try {
    const hmacKey = await getHmacKey(secret);
    const sigBuf = hexToBuffer(sigHex);
    const isValid = await crypto.subtle.verify("HMAC", hmacKey, sigBuf, new TextEncoder().encode(b64Payload));
    if (!isValid) {
      return { valid: false, reason: "Invalid signature or tampered key." };
    }
    const payloadJson = JSON.parse(base64UrlDecode(b64Payload));
    return {
      valid: true,
      name: payloadJson.n || "VoxFlow Agent",
      createdAt: payloadJson.t,
      permissions: ["tts:synthesize", "tts:voices", "stt:transcribe", "stt:align"]
    };
  } catch (err) {
    return { valid: false, reason: `Verification error: ${err.message}` };
  }
}

function extractApiKey(request, bodyObj = null) {
  const auth = request.headers.get("Authorization") || "";
  if (auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  const xApiKey = request.headers.get("X-API-Key");
  if (xApiKey) return xApiKey.trim();
  if (bodyObj && bodyObj.api_key) return bodyObj.api_key.trim();
  return null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const secret = env.VOX_API_SECRET || DEFAULT_HMAC_SECRET;

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // POST /api/extract-image (Multimodal Screenshot & Image Vision Extractor)
    if (url.pathname === '/api/extract-image' && request.method === 'POST') {
      try {
        const geminiKey = request.headers.get("X-Gemini-Key") || env.GEMINI_API_KEY || env.GEMINI_API_KEY_1 || "";
        if (!geminiKey) {
          return jsonResponse({ detail: "Gemini API key is required for multimodal vision. Please configure GEMINI_API_KEY in Settings." }, 400);
        }

        const contentType = request.headers.get("content-type") || "";
        let imageBase64 = "";
        let mimeType = "image/png";
        let mode = "clean";

        if (contentType.includes("multipart/form-data")) {
          const formData = await request.formData();
          mode = formData.get("mode") || "clean";
          const file = formData.get("file");
          if (file && typeof file !== "string") {
            mimeType = file.type || "image/png";
            const buffer = await file.arrayBuffer();
            let binary = "";
            const bytes = new Uint8Array(buffer);
            const len = bytes.byteLength;
            for (let i = 0; i < len; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            imageBase64 = btoa(binary);
          } else {
            imageBase64 = formData.get("image_base64") || "";
          }
        } else if (contentType.includes("application/json")) {
          const body = await request.json();
          mode = body.mode || "clean";
          imageBase64 = body.image || body.image_base64 || "";
        }

        if (imageBase64.includes(",")) {
          const parts = imageBase64.split(",");
          if (parts[0].includes("image/")) {
            mimeType = parts[0].split(";")[0].replace("data:", "");
          }
          imageBase64 = parts[1];
        }

        if (!imageBase64) {
          return jsonResponse({ detail: "No image provided for text extraction." }, 400);
        }

        const modeInstructions = {
          clean: "You are a multimodal text extractor for a text-to-speech audio studio. Extract ONLY the primary human reading text from this image. STRICTLY IGNORE: status bar icons, battery, phone clock, notch, island, web address bars, and ads. Preserve natural reading punctuation so it is ready for speech. Output pure readable text only.",
          summary: "You are an executive audio briefing generator for a text-to-speech studio. Read this screenshot, ignore all UI chrome and ads, and synthesize the core points into 2 to 3 concise spoken paragraphs suitable for listening on headphones.",
          devlog: "You are a senior software systems engineer translating technical developer screenshots for an audio studio. Translate what failed into a plain-English explanation of what went wrong, why, and how to fix it, omitting raw memory addresses and hex dumps."
        };

        const instruction = modeInstructions[mode] || modeInstructions.clean;
        const visionModels = ["gemini-3-flash-preview", "gemini-3.5-flash", "gemini-flash-latest", "gemini-2.5-flash-image"];
        let gData = null;
        let lastErr = "";

        for (const vModel of visionModels) {
          const gUrl = `https://generativelanguage.googleapis.com/v1beta/models/${vModel}:generateContent?key=${geminiKey}`;
          const gPayload = {
            contents: [{
              parts: [
                { text: instruction },
                { inline_data: { mime_type: mimeType, data: imageBase64 } }
              ]
            }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 2048 }
          };

          try {
            const gRes = await fetch(gUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(gPayload)
            });
            if (gRes.ok) {
              gData = await gRes.json();
              break;
            } else {
              lastErr = `${vModel} HTTP ${gRes.status}`;
            }
          } catch (e) {
            lastErr = `${vModel} ${e.message}`;
          }
        }

        if (!gData) {
          return jsonResponse({ detail: `Gemini Vision failed across models: ${lastErr}` }, 502);
        }
        let extractedText = "";
        try {
          const cand = (gData.candidates && gData.candidates[0]) || {};
          const parts = (cand.content && cand.content.parts) || [];
          extractedText = parts.map(p => p.text || "").join("").trim();
        } catch (e) {
          return jsonResponse({ detail: "Failed to parse text from Gemini Vision response." }, 502);
        }

        return jsonResponse({
          text: extractedText,
          mode: mode,
          stats: {
            chars: extractedText.length,
            words: extractedText.split(/\s+/).filter(Boolean).length
          }
        });
      } catch (err) {
        return jsonResponse({ detail: `Vision extraction failed: ${err.message}` }, 500);
      }
    }

    // 1. GET /api/status
    if (url.pathname === '/api/status' && request.method === 'GET') {
      const deepgramReady = !!(env.DEEPGRAM_API_KEY);
      const openrouterReady = !!(env.OPENROUTER_API_KEY);
      const groqReady = !!(env.GROQ_API_KEY);
      const mistralReady = !!(env.MISTRAL_API_KEY || "mstrl_cqKTyDmtqC78qQ8jDigvc6MF50wItkSX_0MScVF");
      const geminiReady = !!(env.GEMINI_API_KEY || env.GEMINI_API_KEY_1);
      const cartesiaReady = !!(env.CARTESIA_API_KEY);
      const cloudflareReady = !!(env.AI || (env.CLOUDFLARE_API_TOKEN && env.CLOUDFLARE_ACCOUNT_ID));
      const elevenlabsReady = !!(env.ELEVENLABS_API_KEY);

      return jsonResponse({
        status: "ready",
        version: "2.4.0",
        service: "VoxFlow Studio Edge API",
        deepgram_ready: deepgramReady,
        openrouter_ready: openrouterReady,
        groq_ready: groqReady,
        mistral_ready: mistralReady,
        gemini_ready: geminiReady,
        cartesia_ready: cartesiaReady,
        cloudflare_ready: cloudflareReady,
        elevenlabs_ready: elevenlabsReady,
        models: [
          {
            id: "deepgram/flux-tts",
            name: "Deepgram Flux TTS",
            provider: "Deepgram",
            voice_count: DEEPGRAM_VOICES.length,
            voices: DEEPGRAM_VOICES
          },
          {
            id: "elevenlabs/multilingual-v2",
            name: "ElevenLabs Multilingual v2",
            provider: "ElevenLabs",
            voice_count: ELEVENLABS_VOICES.length,
            voices: ELEVENLABS_VOICES
          },
          {
            id: "mistral/voxtral-mini-tts",
            name: "Mistral Voxtral TTS",
            provider: "Mistral AI",
            voice_count: VOXTRAL_VOICES.length,
            voices: VOXTRAL_VOICES
          },
          {
            id: "cartesia/sonic",
            name: "Cartesia Sonic 3.6",
            provider: "Cartesia",
            voice_count: CARTESIA_VOICES.length,
            voices: CARTESIA_VOICES
          },
          {
            id: "google/gemini-2.5-flash-preview-tts",
            name: "Google Gemini 2.5 Flash Audio",
            provider: "Google",
            voice_count: GEMINI_VOICES.length,
            voices: GEMINI_VOICES
          },
          {
            id: "groq/orpheus-english",
            name: "Groq Orpheus (English)",
            provider: "Groq",
            voice_count: GROQ_ORPHEUS_VOICES.filter(v => v.model.includes("english")).length,
            voices: GROQ_ORPHEUS_VOICES.filter(v => v.model.includes("english"))
          },
          {
            id: "groq/orpheus-arabic",
            name: "Groq Orpheus (Saudi Arabic)",
            provider: "Groq",
            voice_count: GROQ_ORPHEUS_VOICES.filter(v => v.model.includes("arabic")).length,
            voices: GROQ_ORPHEUS_VOICES.filter(v => v.model.includes("arabic"))
          },
          {
            id: "cloudflare/melotts",
            name: "Cloudflare Workers AI (MeloTTS)",
            provider: "Cloudflare",
            voice_count: CLOUDFLARE_MELOTTS_VOICES.length,
            voices: CLOUDFLARE_MELOTTS_VOICES
          },
          {
            id: "fish-audio/s2.1-pro-free:free",
            name: "Fish Audio S2.1 Pro (Free)",
            provider: "Fish Audio",
            voice_count: FISH_VOICES.length,
            voices: FISH_VOICES
          }
        ]
      });
    }

    // 2. GET /api/voices
    if (url.pathname === '/api/voices' && request.method === 'GET') {
      const groqEn = GROQ_ORPHEUS_VOICES.filter(v => v.model.includes("english"));
      const groqAr = GROQ_ORPHEUS_VOICES.filter(v => v.model.includes("arabic"));

      const allVoices = [
        ...DEEPGRAM_VOICES.map(v => ({ ...v, model: "deepgram/flux-tts", provider: "Deepgram" })),
        ...ELEVENLABS_VOICES.map(v => ({ ...v, model: "elevenlabs/multilingual-v2", provider: "ElevenLabs" })),
        ...VOXTRAL_VOICES.map(v => ({ ...v, model: "mistral/voxtral-mini-tts", provider: "Mistral AI" })),
        ...CARTESIA_VOICES.map(v => ({ ...v, model: "cartesia/sonic", provider: "Cartesia" })),
        ...GEMINI_VOICES.map(v => ({ ...v, model: "google/gemini-2.5-flash-preview-tts", provider: "Google Gemini" })),
        ...groqEn.map(v => ({ ...v, model: "groq/orpheus-english", provider: "Groq Orpheus" })),
        ...groqAr.map(v => ({ ...v, model: "groq/orpheus-arabic", provider: "Groq Orpheus" })),
        ...CLOUDFLARE_MELOTTS_VOICES.map(v => ({ ...v, model: "cloudflare/melotts", provider: "Cloudflare MeloTTS" })),
        ...FISH_VOICES.map(v => ({ ...v, model: "fish-audio/s2.1-pro-free:free", provider: "Fish Audio" }))
      ];

      const dgCatalog = {
        provider: "Deepgram",
        description: "Official ultra low-latency speech synthesis with 36 high-fidelity character voices",
        count: DEEPGRAM_VOICES.length,
        voices: DEEPGRAM_VOICES
      };

      const elevenCatalog = {
        provider: "ElevenLabs",
        description: "World-leading neural voice generation with 21 expressive studio personas",
        count: ELEVENLABS_VOICES.length,
        voices: ELEVENLABS_VOICES
      };

      const voxCatalog = {
        provider: "Mistral AI",
        description: "Official Voxtral neural speech engine with 30 distinct emotional presets & tones",
        count: VOXTRAL_VOICES.length,
        voices: VOXTRAL_VOICES
      };

      const cartesiaCatalog = {
        provider: "Cartesia",
        description: "Sonic 3.6 hyper-realistic ultra-fast natural voice engine",
        count: CARTESIA_VOICES.length,
        voices: CARTESIA_VOICES
      };

      const geminiCatalog = {
        provider: "Google Gemini",
        description: "Google AI Studio multimodal expressive neural audio voices",
        count: GEMINI_VOICES.length,
        voices: GEMINI_VOICES
      };

      const groqEnCatalog = {
        provider: "Groq Orpheus",
        description: "Groq LPU high-speed English neural speech voices",
        count: groqEn.length,
        voices: groqEn
      };

      const groqArCatalog = {
        provider: "Groq Orpheus",
        description: "Groq LPU high-speed Saudi Arabic neural speech voices",
        count: groqAr.length,
        voices: groqAr
      };

      const cfCatalog = {
        provider: "Cloudflare MeloTTS",
        description: "Cloudflare Workers AI edge neural speech synthesis",
        count: CLOUDFLARE_MELOTTS_VOICES.length,
        voices: CLOUDFLARE_MELOTTS_VOICES
      };

      return jsonResponse({
        success: true,
        total: allVoices.length,
        models: {
          "deepgram/flux-tts": dgCatalog,
          "deepgram/flux-tts:free": dgCatalog,
          "elevenlabs/multilingual-v2": elevenCatalog,
          "elevenlabs/turbo-v2.5": elevenCatalog,
          "mistral/voxtral-mini-tts": voxCatalog,
          "voxtral-mini-tts-latest": voxCatalog,
          "cartesia/sonic": cartesiaCatalog,
          "google/gemini-2.5-flash-preview-tts": geminiCatalog,
          "gemini/tts": geminiCatalog,
          "groq/orpheus-english": groqEnCatalog,
          "canopylabs/orpheus-v1-english": groqEnCatalog,
          "groq/orpheus-arabic": groqArCatalog,
          "canopylabs/orpheus-arabic-saudi": groqArCatalog,
          "cloudflare/melotts": cfCatalog,
          "@cf/myshell-ai/melotts": cfCatalog,
          "fish-audio/s2.1-pro-free:free": {
            provider: "Fish Audio",
            description: "High dynamics multi-lingual neural speech generation",
            count: FISH_VOICES.length,
            voices: FISH_VOICES
          }
        },
        voices: allVoices
      });
    }

    // 3. POST /api/keys/generate
    if (url.pathname === '/api/keys/generate' && request.method === 'POST') {
      try {
        let body = {};
        try {
          body = await request.json();
        } catch (_) {}

        const name = (body.name || "VoxFlow Agent").trim().slice(0, 60);
        const generated = await generateVoxApiKey(name, secret);

        return jsonResponse({
          success: true,
          api_key: generated.apiKey,
          name: generated.payload.n,
          created_at: new Date(generated.payload.t).toISOString(),
          permissions: [
            "tts:synthesize",
            "tts:voices",
            "stt:transcribe",
            "stt:align"
          ],
          rate_limit: "120 requests/minute",
          usage: "Pass header 'Authorization: Bearer <api_key>' or 'X-API-Key: <api_key>'"
        }, 201);
      } catch (e) {
        return jsonResponse({ detail: `Key generation failed: ${e.message}` }, 500);
      }
    }

    // 4. GET /api/keys/verify
    if (url.pathname === '/api/keys/verify' && request.method === 'GET') {
      const key = extractApiKey(request);
      if (!key) {
        return jsonResponse({ valid: false, error: "No API key supplied. Provide header Authorization: Bearer <key> or X-API-Key." }, 401);
      }

      const verified = await verifyVoxApiKey(key, secret);
      if (!verified.valid) {
        return jsonResponse({ valid: false, error: verified.reason || "Invalid API key." }, 401);
      }

      return jsonResponse({
        valid: true,
        name: verified.name,
        created_at: verified.createdAt ? new Date(verified.createdAt).toISOString() : null,
        permissions: verified.permissions || ["tts:synthesize", "tts:voices", "stt:transcribe", "stt:align"],
        status: "active"
      });
    }

    // 5. GET /api/docs (OpenAPI 3.0 specification)
    if (url.pathname === '/api/docs' && request.method === 'GET') {
      return jsonResponse({
        openapi: "3.0.3",
        info: {
          title: "VoxFlow Neural Speech & Alignment API",
          version: "2.1.0",
          description: "Zero-latency neural TTS synthesis, whisper transcription, and word timestamp alignment."
        },
        servers: [
          { url: "https://voxflow-809.pages.dev", description: "Cloudflare Pages Global Edge" },
          { url: "http://127.0.0.1:8000", description: "Local FastApi Server" }
        ],
        paths: {
          "/api/keys/generate": {
            post: {
              summary: "Generate an API Key",
              description: "Generates a cryptographically signed VoxFlow API key for agents or apps.",
              requestBody: {
                content: { "application/json": { schema: { properties: { name: { type: "string", example: "Cursor Assistant" } } } } }
              },
              responses: { "201": { description: "API Key created" } }
            }
          },
          "/api/keys/verify": {
            get: {
              summary: "Verify an API Key",
              responses: { "200": { description: "Key valid" }, "401": { description: "Invalid key" } }
            }
          },
          "/api/voices": {
            get: {
              summary: "List all voices and models",
              responses: { "200": { description: "Voices catalog" } }
            }
          },
          "/api/tts": {
            post: {
              summary: "Synthesize speech",
              requestBody: {
                content: {
                  "application/json": {
                    schema: {
                      required: ["text"],
                      properties: {
                        text: { type: "string" },
                        voice: { type: "string", default: "flux-alexis-en" },
                        model: { type: "string", default: "deepgram/flux-tts:free" }
                      }
                    }
                  }
                }
              },
              responses: { "200": { description: "MP3 or WAV Audio binary" } }
            }
          },
          "/api/align": {
            post: {
              summary: "Align audio chunk with prompt for word timestamps",
              responses: { "200": { description: "Word timestamps array" } }
            }
          },
          "/api/stt": {
            post: {
              summary: "Transcribe audio file to text",
              responses: { "200": { description: "Transcript and segments" } }
            }
          }
        }
      });
    }

    // 6. POST /api/tts
    if (url.pathname === '/api/tts' && request.method === 'POST') {
      try {
        const body = await request.json();
        const text = (body.text || "").trim();
        if (!text) {
          return jsonResponse({ detail: "Text prompt cannot be empty." }, 400);
        }

        // Authentication resolution:
        // Priority 1: Authorization Header / X-API-Key / Provider Headers
        // Priority 2: Body parameters
        // Priority 3: Server env variables
        const clientKey = extractApiKey(request, body);
        let deepgramKey = env.DEEPGRAM_API_KEY;
        let openrouterKey = env.OPENROUTER_API_KEY;
        let mistralKey = env.MISTRAL_API_KEY || "mstrl_cqKTyDmtqC78qQ8jDigvc6MF50wItkSX_0MScVF";

        const customDgHeader = request.headers.get("X-Deepgram-Key");
        if (customDgHeader) {
          deepgramKey = customDgHeader.trim();
        } else if (body.deepgram_key) {
          deepgramKey = body.deepgram_key.trim();
        }

        const customMistralHeader = request.headers.get("X-Mistral-Key");
        if (customMistralHeader) {
          mistralKey = customMistralHeader.trim();
        } else if (body.mistral_key) {
          mistralKey = body.mistral_key.trim();
        }

        const customGroqHeader = request.headers.get("X-Groq-Key");
        let groqKey = env.GROQ_API_KEY || (customGroqHeader ? customGroqHeader.trim() : (body.groq_key ? body.groq_key.trim() : ""));

        const customCartesiaHeader = request.headers.get("X-Cartesia-Key");
        let cartesiaKey = env.CARTESIA_API_KEY || (customCartesiaHeader ? customCartesiaHeader.trim() : (body.cartesia_key ? body.cartesia_key.trim() : ""));

        const customGeminiHeader = request.headers.get("X-Gemini-Key");
        let geminiKey = env.GEMINI_API_KEY || env.GEMINI_API_KEY_1 || (customGeminiHeader ? customGeminiHeader.trim() : (body.gemini_key ? body.gemini_key.trim() : ""));

        const customCfToken = request.headers.get("X-Cloudflare-Token");
        let cfToken = env.CLOUDFLARE_API_TOKEN || (customCfToken ? customCfToken.trim() : (body.cloudflare_token ? body.cloudflare_token.trim() : ""));

        const customCfAccount = request.headers.get("X-Cloudflare-Account");
        let cfAccountId = env.CLOUDFLARE_ACCOUNT_ID || (customCfAccount ? customCfAccount.trim() : (body.cloudflare_account_id ? body.cloudflare_account_id.trim() : ""));

        const customElHeader = request.headers.get("X-ElevenLabs-Key");
        let elevenlabsKey = (customElHeader ? customElHeader.trim() : (body.elevenlabs_key ? body.elevenlabs_key.trim() : "")) || env.ELEVENLABS_API_KEY || "";

        if (clientKey) {
          if (clientKey.startsWith("sk-or-v1-")) {
            openrouterKey = clientKey;
          } else if (clientKey.startsWith("sk_car_")) {
            cartesiaKey = clientKey;
          } else if (clientKey.startsWith("sk_")) {
            elevenlabsKey = clientKey;
          } else if (clientKey.startsWith("dg_") || (clientKey.length === 40 && !clientKey.startsWith("vox_"))) {
            deepgramKey = clientKey;
          } else if (clientKey.startsWith("mstrl_")) {
            mistralKey = clientKey;
          } else if (clientKey.startsWith("gsk_")) {
            groqKey = clientKey;
          } else if (clientKey.startsWith("AIzaSy")) {
            geminiKey = clientKey;
          } else if (clientKey.startsWith("vox_live_")) {
            const check = await verifyVoxApiKey(clientKey, secret);
            if (!check.valid) {
              return jsonResponse({ detail: `Authentication failed: ${check.reason}` }, 401);
            }
          }
        }

        cartesiaKey = (cartesiaKey || "").trim().replace(/[\r\n\t]/g, "");
        groqKey = (groqKey || "").trim().replace(/[\r\n\t]/g, "");
        elevenlabsKey = (elevenlabsKey || "").trim().replace(/[\r\n\t]/g, "");
        deepgramKey = (deepgramKey || "").trim().replace(/[\r\n\t]/g, "");
        mistralKey = (mistralKey || "").trim().replace(/[\r\n\t]/g, "");
        geminiKey = (geminiKey || "").trim().replace(/[\r\n\t]/g, "");

        const model = body.model || "deepgram/flux-tts";
        let voice = body.voice;

        // 1. Cartesia Sonic 3.6 (Hyper-Realistic, 20k free credits/mo)
        const isCartesia = model.includes("cartesia") || (voice && CARTESIA_VOICES.some(v => v.id === voice));
        if (isCartesia) {
          if (!cartesiaKey) {
            return jsonResponse({
              detail: "Cartesia API key is required for Sonic 3.6 TTS. Please configure CARTESIA_API_KEY in Settings."
            }, 400);
          }
          if (!voice || !CARTESIA_VOICES.some(v => v.id === voice)) {
            voice = "95856005-0332-41b0-935f-352e296aa0df";
          }
          const cRes = await fetch("https://api.cartesia.ai/tts/bytes", {
            method: "POST",
            headers: {
              "X-API-Key": cartesiaKey,
              "Cartesia-Version": "2024-06-10",
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model_id: "sonic-3.6",
              transcript: text,
              voice: { mode: "id", id: voice },
              output_format: { container: "mp3", encoding: "mp3", sample_rate: 44100 }
            })
          });
          if (!cRes.ok) {
            const err = await cRes.text();
            return jsonResponse({ detail: `Cartesia API error (${cRes.status}): ${err}` }, cRes.status);
          }
          const audioBytes = await cRes.arrayBuffer();
          const filename = `vox_atmr_cartesia_${voice.slice(0, 8)}.mp3`;
          return new Response(audioBytes, {
            headers: {
              "Content-Type": "audio/mpeg",
              "Content-Disposition": `inline; filename="${filename}"`,
              "Cache-Control": "public, max-age=3600",
              "X-Voice-Model": "cartesia/sonic",
              "X-Voice-Name": voice,
              "X-Provider": "cartesia-official",
              "X-Watermark": "A.T.M.R",
              "X-Studio-Author": "A.T.M.R",
              ...CORS_HEADERS
            }
          });
        }

        // 2. Google Gemini 2.5 Flash Audio Output (Google AI Studio Free Tier)
        const isGemini = model.includes("gemini") || model.includes("google") || (voice && GEMINI_VOICES.some(v => v.id === voice));
        if (isGemini) {
          if (!geminiKey) {
            return jsonResponse({
              detail: "Google Gemini API key is required for Gemini Audio. Please configure GEMINI_API_KEY in Settings."
            }, 400);
          }
          if (!voice || !GEMINI_VOICES.some(v => v.id === voice)) {
            voice = "Puck";
          }
          const gUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${geminiKey}`;
          const gRes = await fetch(gUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `Read the following text out loud in a natural, expressive voice: ${text}` }] }],
              generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: voice }
                  }
                }
              }
            })
          });
          if (!gRes.ok) {
            const err = await gRes.text();
            return jsonResponse({ detail: `Gemini API error (${gRes.status}): ${err}` }, gRes.status);
          }
          const gJson = await gRes.json();
          try {
            const inline = gJson.candidates[0].content.parts[0].inlineData;
            const mimeType = inline.mimeType || "";
            const rawBuffer = base64ToArrayBuffer(inline.data);
            let finalBuffer = rawBuffer;
            let outMime = mimeType;
            if (mimeType.toLowerCase().includes("pcm") || mimeType.toLowerCase().includes("l16") || !mimeType.startsWith("audio/")) {
              let rate = 24000;
              const rateMatch = mimeType.match(/rate=(\d+)/);
              if (rateMatch) rate = parseInt(rateMatch[1], 10);
              finalBuffer = pcmToWav(rawBuffer, rate, 1, 16);
              outMime = "audio/wav";
            }
            const filename = `vox_atmr_gemini_${voice}.wav`;
            return new Response(finalBuffer, {
              headers: {
                "Content-Type": outMime,
                "Content-Disposition": `inline; filename="${filename}"`,
                "Cache-Control": "public, max-age=3600",
                "X-Voice-Model": "google/gemini-2.5-flash-preview-tts",
                "X-Voice-Name": voice,
                "X-Provider": "google-gemini",
                "X-Watermark": "A.T.M.R",
                "X-Studio-Author": "A.T.M.R",
                ...CORS_HEADERS
              }
            });
          } catch (e) {
            return jsonResponse({ detail: `Failed to parse Gemini audio: ${e.message}` }, 502);
          }
        }

        // 3. Groq Orpheus LPU Speech API
        const isGroqOrpheus = model.includes("orpheus") || (model.startsWith("groq/") && !model.includes("whisper")) || (voice && GROQ_ORPHEUS_VOICES.some(v => v.id === voice));
        if (isGroqOrpheus) {
          if (!groqKey) {
            return jsonResponse({
              detail: "Groq API key is required for Groq Orpheus TTS. Please configure GROQ_API_KEY in Settings."
            }, 400);
          }
          let orpheusModel = "canopylabs/orpheus-v1-english";
          if (model.includes("arabic") || (voice && GROQ_ORPHEUS_VOICES.some(v => v.id === voice && v.model.includes("arabic")))) {
            orpheusModel = "canopylabs/orpheus-arabic-saudi";
            if (!voice || !GROQ_ORPHEUS_VOICES.some(v => v.id === voice && v.model.includes("arabic"))) {
              voice = "abdullah";
            }
          } else {
            if (!voice || !GROQ_ORPHEUS_VOICES.some(v => v.id === voice && v.model.includes("english"))) {
              voice = "autumn";
            }
          }
          const subText = text.slice(0, 200);
          const gRes = await fetch("https://api.groq.com/openai/v1/audio/speech", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${groqKey}`,
              "Content-Type": "application/json",
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            },
            body: JSON.stringify({
              model: orpheusModel,
              voice: voice,
              input: subText,
              response_format: "wav"
            })
          });
          if (!gRes.ok) {
            const err = await gRes.text();
            if (err.includes("model_terms_required")) {
              return jsonResponse({
                detail: `Groq requires one-time terms acceptance for Orpheus at https://console.groq.com/playground?model=${orpheusModel}`
              }, 400);
            }
            return jsonResponse({ detail: `Groq Orpheus API error (${gRes.status}): ${err}` }, gRes.status);
          }
          const audioBytes = await gRes.arrayBuffer();
          const filename = `vox_atmr_groq_${voice}.wav`;
          return new Response(audioBytes, {
            headers: {
              "Content-Type": "audio/wav",
              "Content-Disposition": `inline; filename="${filename}"`,
              "Cache-Control": "public, max-age=3600",
              "X-Voice-Model": orpheusModel,
              "X-Voice-Name": voice,
              "X-Provider": "groq-orpheus",
              "X-Watermark": "A.T.M.R",
              "X-Studio-Author": "A.T.M.R",
              ...CORS_HEADERS
            }
          });
        }

        // 4. Cloudflare Workers AI MeloTTS
        const isCloudflareMelo = model.includes("cloudflare") || model.includes("melotts") || (voice && CLOUDFLARE_MELOTTS_VOICES.some(v => v.id === voice));
        if (isCloudflareMelo) {
          if (!voice) voice = "en-us";
          let meloLang = "en";
          if (voice.startsWith("en")) meloLang = "en";
          else if (voice.startsWith("es")) meloLang = "es";
          else if (voice.startsWith("fr")) meloLang = "fr";
          else if (voice.startsWith("zh")) meloLang = "zh";
          else if (voice.startsWith("jp") || voice.startsWith("ja")) meloLang = "jp";
          else if (voice.startsWith("kr") || voice.startsWith("ko")) meloLang = "kr";
          else meloLang = voice;

          if (env.AI) {
            try {
              const aiRes = await env.AI.run("@cf/myshell-ai/melotts", {
                prompt: text,
                lang: meloLang
              });
              let audioBuffer;
              if (aiRes && aiRes.audio) {
                audioBuffer = typeof aiRes.audio === 'string' ? base64ToArrayBuffer(aiRes.audio) : aiRes.audio;
              } else if (aiRes instanceof ArrayBuffer) {
                audioBuffer = aiRes;
              } else if (aiRes && aiRes.buffer) {
                audioBuffer = aiRes.buffer;
              } else {
                audioBuffer = await new Response(aiRes).arrayBuffer();
              }
              const filename = `vox_atmr_cloudflare_${voice}.mp3`;
              return new Response(audioBuffer, {
                headers: {
                  "Content-Type": "audio/mpeg",
                  "Content-Disposition": `inline; filename="${filename}"`,
                  "Cache-Control": "public, max-age=3600",
                  "X-Voice-Model": "cloudflare/melotts",
                  "X-Voice-Name": voice,
                  "X-Provider": "cloudflare-ai",
                  "X-Watermark": "A.T.M.R",
                  "X-Studio-Author": "A.T.M.R",
                  ...CORS_HEADERS
                }
              });
            } catch (aiErr) {
              console.warn("Workers AI binding invocation failed, falling back to REST:", aiErr);
              if (!cfToken || !cfAccountId) {
                return jsonResponse({
                  detail: `Workers AI error: ${aiErr.message || String(aiErr)}`
                }, 500);
              }
            }
          }

          if (!cfToken || !cfAccountId) {
            return jsonResponse({
              detail: "Cloudflare API Token and Account ID are required for Workers AI MeloTTS. Please configure them in Settings."
            }, 400);
          }

          const cfRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/run/@cf/myshell-ai/melotts`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${cfToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ prompt: text, lang: meloLang })
          });

          if (!cfRes.ok) {
            const err = await cfRes.text();
            return jsonResponse({ detail: `Cloudflare Workers AI error (${cfRes.status}): ${err}` }, cfRes.status);
          }

          const audioBytes = await cfRes.arrayBuffer();
          const cType = cfRes.headers.get("Content-Type") || "audio/mpeg";
          const filename = `vox_atmr_cloudflare_${voice}.mp3`;
          return new Response(audioBytes, {
            headers: {
              "Content-Type": cType,
              "Content-Disposition": `inline; filename="${filename}"`,
              "Cache-Control": "public, max-age=3600",
              "X-Voice-Model": "cloudflare/melotts",
              "X-Voice-Name": voice,
              "X-Provider": "cloudflare-ai",
              "X-Watermark": "A.T.M.R",
              "X-Studio-Author": "A.T.M.R",
              ...CORS_HEADERS
            }
          });
        }

        // 5. ElevenLabs Premier Multilingual v2 & Turbo v2.5
        const isElevenLabs = model.includes("elevenlabs") || (voice && ELEVENLABS_VOICES.some(v => v.id === voice));
        if (isElevenLabs) {
          if (!elevenlabsKey) {
            return jsonResponse({
              detail: "ElevenLabs API key is required. Please configure ELEVENLABS_API_KEY in server secrets or Settings."
            }, 400);
          }
          if (!voice || !ELEVENLABS_VOICES.some(v => v.id === voice)) {
            voice = "CwhRBWXzGAHq8TQ4Fs17"; // Roger default
          }
          const elModelId = model.includes("turbo") ? "eleven_turbo_v2_5" : "eleven_multilingual_v2";
          const elRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
            method: "POST",
            headers: {
              "xi-api-key": elevenlabsKey,
              "Content-Type": "application/json",
              "Accept": "audio/mpeg",
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
            },
            body: JSON.stringify({
              text: text,
              model_id: elModelId,
              voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75
              }
            })
          });

          if (!elRes.ok) {
            const err = await elRes.text();
            return jsonResponse({ detail: `ElevenLabs API error (${elRes.status}): ${err}` }, elRes.status);
          }

          const audioBytes = await elRes.arrayBuffer();
          const filename = `vox_atmr_elevenlabs_${voice}.mp3`;
          return new Response(audioBytes, {
            headers: {
              "Content-Type": "audio/mpeg",
              "Content-Disposition": `inline; filename="${filename}"`,
              "Cache-Control": "public, max-age=3600",
              "X-Voice-Model": elModelId,
              "X-Voice-Name": voice,
              "X-Provider": "elevenlabs",
              "X-Watermark": "A.T.M.R",
              "X-Studio-Author": "A.T.M.R",
              ...CORS_HEADERS
            }
          });
        }

        // 6. Direct Mistral Voxtral Speech API (30 Expressive Emotion Voices, MP3 format)
        const isMistral = model.includes("mistral") || model.includes("voxtral") || (voice && VOXTRAL_VOICES.some(v => v.id === voice));
        if (isMistral) {
          if (!mistralKey) {
            return jsonResponse({
              detail: "Mistral API key is required for Mistral Voxtral TTS. Please configure MISTRAL_API_KEY in Settings."
            }, 400);
          }
          if (!voice || !VOXTRAL_VOICES.some(v => v.id === voice)) {
            voice = "en_paul_happy";
          }

          const mUrl = "https://api.mistral.ai/v1/audio/speech";
          const mRes = await fetch(mUrl, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${mistralKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: "voxtral-mini-tts-latest",
              voice: voice,
              input: text
            })
          });

          if (!mRes.ok) {
            const errText = await mRes.text();
            return jsonResponse({ detail: `Mistral API Error (${mRes.status}): ${errText}` }, mRes.status);
          }

          const mJson = await mRes.json();
          if (!mJson.audio_data) {
            return jsonResponse({ detail: "Mistral API did not return audio data." }, 502);
          }

          const audioBytes = base64ToArrayBuffer(mJson.audio_data);
          const filename = `vox_atmr_mistral_${voice}.mp3`;

          return new Response(audioBytes, {
            headers: {
              "Content-Type": "audio/mpeg",
              "Content-Disposition": `inline; filename="${filename}"`,
              "Cache-Control": "public, max-age=3600",
              "X-Voice-Model": "mistral/voxtral-mini-tts",
              "X-Voice-Name": voice,
              "X-Provider": "mistral-official",
              "X-Watermark": "A.T.M.R",
              "X-Studio-Author": "A.T.M.R",
              ...CORS_HEADERS
            }
          });
        }

        const isDeepgram = model.includes("deepgram") || model.includes("flux") || (voice && voice.startsWith("flux-")) || DEEPGRAM_VOICES.some(v => v.id === voice);

        // 2. Direct Official Deepgram V2 Speak API (Zero-latency, native streaming MP3)
        if (isDeepgram && deepgramKey) {
          if (!voice || !voice.startsWith("flux-")) {
            voice = "flux-alexis-en";
          }
          const dgUrl = `https://api.deepgram.com/v2/speak?model=${encodeURIComponent(voice)}`;
          const dgRes = await fetch(dgUrl, {
            method: "POST",
            headers: {
              "Authorization": `Token ${deepgramKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ text })
          });

          if (!dgRes.ok) {
            const errText = await dgRes.text();
            return jsonResponse({ detail: `Deepgram API Error (${dgRes.status}): ${errText}` }, dgRes.status);
          }

          const audioBytes = await dgRes.arrayBuffer();
          const contentType = dgRes.headers.get("Content-Type") || "audio/mpeg";
          const filename = `vox_atmr_deepgram_${voice}.mp3`;

          return new Response(audioBytes, {
            headers: {
              "Content-Type": contentType,
              "Content-Disposition": `inline; filename="${filename}"`,
              "Cache-Control": "public, max-age=3600",
              "X-Voice-Model": "deepgram/flux-tts",
              "X-Voice-Name": voice,
              "X-Provider": "deepgram-official",
              "X-Watermark": "A.T.M.R",
              "X-Studio-Author": "A.T.M.R",
              ...CORS_HEADERS
            }
          });
        }

        // 2. Deepgram requested but no Deepgram key and no OpenRouter key
        if (isDeepgram && !deepgramKey && !openrouterKey) {
          return jsonResponse({
            detail: "Deepgram API key is required for Deepgram Flux voices because OpenRouter removed the free community endpoint. Please configure DEEPGRAM_API_KEY in Settings, or select Fish Audio S2.1 Pro (Free)."
          }, 400);
        }

        // 3. Fallback to OpenRouter (for fish-audio or custom OpenRouter keys)
        if (!openrouterKey) {
          return jsonResponse({ detail: "OpenRouter API key is required. Please provide an API key or configure server secrets." }, 401);
        }

        let routerModel = model;
        if (model.includes("fish")) {
          voice = "alloy";
          routerModel = "fish-audio/s2.1-pro-free:free";
        } else if (!voice) {
          voice = "flux-alexis-en";
        }

        const openRouterPayload = {
          model: routerModel,
          input: text,
          voice: voice,
          response_format: "mp3"
        };

        const orRes = await fetch("https://openrouter.ai/api/v1/audio/speech", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openrouterKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://voxflow.pages.dev",
            "X-Title": "VoxFlow Studio"
          },
          body: JSON.stringify(openRouterPayload)
        });

        if (!orRes.ok) {
          const errText = await orRes.text();
          if (orRes.status === 404 && (routerModel.includes("flux-tts:free") || routerModel.includes("deepgram"))) {
            return jsonResponse({
              detail: "OpenRouter has discontinued 'deepgram/flux-tts:free' (404 No endpoints found). Please use a Direct Deepgram API Key in Settings for official direct Deepgram synthesis, or select Fish Audio S2.1 Pro (Free)."
            }, 404);
          }
          return jsonResponse({ detail: `OpenRouter Error (${orRes.status}): ${errText}` }, orRes.status);
        }

        let contentType = orRes.headers.get("Content-Type") || "audio/mpeg";
        let audioBytes = await orRes.arrayBuffer();

        if (contentType.toLowerCase().includes("pcm") || contentType === "audio/raw") {
          let rate = 24000;
          const match = contentType.match(/rate=(\d+)/);
          if (match) rate = parseInt(match[1]);
          else if (body.model && body.model.includes("fish")) rate = 44100;
          audioBytes = pcmToWav(audioBytes, rate);
          contentType = "audio/wav";
        }

        const sanitizedModel = routerModel.replace(/[\/:]/g, '_');
        const filename = contentType.includes("mpeg") ? `vox_atmr_${sanitizedModel}_${voice}.mp3` : `vox_atmr_${sanitizedModel}_${voice}.wav`;

        return new Response(audioBytes, {
          headers: {
            "Content-Type": contentType,
            "Content-Disposition": `inline; filename="${filename}"`,
            "Cache-Control": "public, max-age=3600",
            "X-Voice-Model": routerModel,
            "X-Voice-Name": voice,
            "X-Watermark": "A.T.M.R",
            "X-Studio-Author": "A.T.M.R",
            ...CORS_HEADERS
          }
        });
      } catch (e) {
        return jsonResponse({ detail: e.message }, 500);
      }
    }

    // 7. POST /api/align (Groq Whisper Word Timestamp Alignment)
    if (url.pathname === '/api/align' && request.method === 'POST') {
      try {
        const formData = await request.formData();
        const file = formData.get("file") || formData.get("audio");
        const prompt = formData.get("prompt") || formData.get("text");

        const clientKey = extractApiKey(request) || formData.get("api_key");
        let groqKey = env.GROQ_API_KEY;

        if (clientKey) {
          if (clientKey.startsWith("gsk_")) {
            groqKey = clientKey;
          } else if (clientKey.startsWith("vox_live_")) {
            const check = await verifyVoxApiKey(clientKey, secret);
            if (!check.valid) {
              return jsonResponse({ detail: `Authentication failed: ${check.reason}` }, 401);
            }
            groqKey = env.GROQ_API_KEY;
          }
        }

        if (!groqKey) {
          return jsonResponse({ detail: "Groq API key required for alignment." }, 401);
        }

        if (!file) {
          return jsonResponse({ detail: "No audio chunk provided." }, 400);
        }

        const groqForm = new FormData();
        groqForm.append("file", file);
        groqForm.append("model", "whisper-large-v3-turbo");
        groqForm.append("response_format", "verbose_json");
        groqForm.append("timestamp_granularities[]", "word");
        if (prompt) {
          groqForm.append("prompt", prompt);
        }

        const groqRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${groqKey}`
          },
          body: groqForm
        });

        if (!groqRes.ok) {
          const errText = await groqRes.text();
          return jsonResponse({ detail: `Groq Whisper Alignment Error (${groqRes.status}): ${errText}` }, groqRes.status);
        }

        const result = await groqRes.json();
        return jsonResponse({
          text: result.text || "",
          duration: result.duration || 0,
          words: result.words || [],
          segments: result.segments || []
        });
      } catch (e) {
        return jsonResponse({ detail: e.message }, 500);
      }
    }

    // 8. POST /api/stt
    if (url.pathname === '/api/stt' && request.method === 'POST') {
      try {
        const formData = await request.formData();
        const file = formData.get("file");

        const clientKey = extractApiKey(request) || formData.get("api_key");
        let groqKey = env.GROQ_API_KEY;

        if (clientKey) {
          if (clientKey.startsWith("gsk_")) {
            groqKey = clientKey;
          } else if (clientKey.startsWith("vox_live_")) {
            const check = await verifyVoxApiKey(clientKey, secret);
            if (!check.valid) {
              return jsonResponse({ detail: `Authentication failed: ${check.reason}` }, 401);
            }
            groqKey = env.GROQ_API_KEY;
          }
        }

        if (!groqKey) {
          return jsonResponse({ detail: "Groq API key required for transcription." }, 401);
        }

        if (!file) {
          return jsonResponse({ detail: "No audio file provided." }, 400);
        }

        const groqForm = new FormData();
        groqForm.append("file", file);
        groqForm.append("model", "whisper-large-v3-turbo");
        groqForm.append("response_format", "verbose_json");

        const groqRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${groqKey}`
          },
          body: groqForm
        });

        if (!groqRes.ok) {
          const errText = await groqRes.text();
          return jsonResponse({ detail: `Groq Whisper Error (${groqRes.status}): ${errText}` }, groqRes.status);
        }

        const result = await groqRes.json();
        return jsonResponse({
          text: result.text || "",
          duration: result.duration || 0,
          language: result.language || "auto"
        });
      } catch (e) {
        return jsonResponse({ detail: e.message }, 500);
      }
    }

    // 9. Handle /static/ prefix fallback
    if (url.pathname.startsWith('/static/')) {
      const strippedUrl = new URL(request.url);
      strippedUrl.pathname = url.pathname.replace(/^\/static/, '');
      return env.ASSETS.fetch(new Request(strippedUrl, request));
    }

    // 10. Default: Serve static assets from Cloudflare Pages ASSETS
    return env.ASSETS.fetch(request);
  }
};
