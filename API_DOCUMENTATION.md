# VoxFlow Studio — REST API Documentation

> **Version**: 2.1.0  
> **Global Edge Base URL**: `https://voxflow-809.pages.dev`  
> **Local Base URL**: `http://127.0.0.1:8000`  
> **Interactive OpenAPI Spec**: `GET /api/docs`

---

## 🌟 Overview

VoxFlow Studio provides high-performance, studio-grade neural audio services powered by Cloudflare Pages Edge Workers, OpenRouter free neural TTS models, and Groq LPUs for Whisper transcription:

1. **Neural Speech Synthesis (TTS)**: 36+ human-like voices (Deepgram Flux & Fish Audio S2.1) returning instant streaming MP3/WAV audio.
2. **Speech-to-Text (STT)**: Instant transcription powered by Groq Whisper Large V3 Turbo.
3. **Forced Word Alignment**: Millisecond-accurate word start/end timestamps synchronized with audio playback.
4. **Developer & AI Agent API Keys**: Cryptographically signed HMAC-SHA256 tokens for rate-limited, authenticated API usage.

---

## 🔐 Authentication

All API endpoints accept authentication through two header formats:

```http
Authorization: Bearer <API_KEY>
```
or
```http
X-API-Key: <API_KEY>
```

### Supported API Key Formats:
- **VoxFlow Signed Token**: `vox_live_<base64url_payload>.<hmac_signature>` (obtained from `POST /api/keys/generate` or via the web UI).
- **Direct Deepgram Key**: `Token <DEEPGRAM_API_KEY>` or `X-Deepgram-Key: <key>` (powers direct native Deepgram Flux synthesis with zero OpenRouter dependency).
- **Direct OpenRouter Key**: `sk-or-v1-...` (used for Fish Audio S2.1 Pro or OpenRouter models).
- **Direct Groq Key**: `gsk_...` (used directly for Whisper transcription & alignment).

> **Note on OpenRouter Deepgram 404**: OpenRouter decommissioned the free community endpoint `deepgram/flux-tts:free` (404 No endpoints found). VoxFlow now natively connects directly to Deepgram's official API (`/v2/speak?model={voice}`) using your `DEEPGRAM_API_KEY`, bypassing OpenRouter completely for instant, broadcast-quality audio.

---

## 📡 Endpoints Reference

### 1. Generate an API Key
Generate a signed API key for your agent, bot, or application.

- **Method**: `POST`
- **Path**: `/api/keys/generate`
- **Headers**: `Content-Type: application/json`

#### Request Body (JSON, Optional):
```json
{
  "name": "Cursor Agent",
  "client": "desktop"
}
```

#### Response (`201 Created`):
```json
{
  "success": true,
  "api_key": "vox_live_eyJuIjoiQ3Vyc29yIEFnZW50IiwidCI6MTc5MDg3MjAwMDAwMCwiciI6IjdhOGYxZTJkYzA5YjRhOTIifQ.5f1d...7a9b",
  "name": "Cursor Agent",
  "created_at": "2026-10-01T17:28:00.000Z",
  "permissions": [
    "tts:synthesize",
    "tts:voices",
    "stt:transcribe",
    "stt:align"
  ],
  "rate_limit": "120 requests/minute",
  "usage": "Pass header 'Authorization: Bearer <api_key>' or 'X-API-Key: <api_key>'"
}
```

---

### 2. Verify an API Key
Verify that an API key is valid and inspect its permissions.

- **Method**: `GET`
- **Path**: `/api/keys/verify`
- **Headers**: `Authorization: Bearer <api_key>`

#### Response (`200 OK`):
```json
{
  "valid": true,
  "name": "Cursor Agent",
  "created_at": "2026-10-01T17:28:00.000Z",
  "permissions": [
    "tts:synthesize",
    "tts:voices",
    "stt:transcribe",
    "stt:align"
  ],
  "status": "active"
}
```

---

### 3. List Voices Catalog
Returns the complete catalog of all 37+ available voices across models and accents.

- **Method**: `GET`
- **Path**: `/api/voices`

#### Response (`200 OK`):
```json
{
  "success": true,
  "total": 37,
  "models": {
    "deepgram/flux-tts:free": {
      "provider": "Deepgram",
      "count": 36,
      "voices": [...]
    },
    "fish-audio/s2.1-pro-free:free": {
      "provider": "Fish Audio",
      "count": 1,
      "voices": [...]
    }
  },
  "voices": [
    {
      "id": "flux-alexis-en",
      "name": "Alexis",
      "gender": "Female",
      "accent": "US English",
      "tone": "Friendly & Clear",
      "recommended": true,
      "model": "deepgram/flux-tts:free"
    },
    {
      "id": "flux-bruce-en",
      "name": "Bruce",
      "gender": "Male",
      "accent": "US English",
      "tone": "Deep & Authoritative",
      "recommended": true,
      "model": "deepgram/flux-tts:free"
    },
    {
      "id": "flux-gemma-en",
      "name": "Gemma",
      "gender": "Female",
      "accent": "British English",
      "tone": "Crisp & Refined",
      "recommended": true,
      "model": "deepgram/flux-tts:free"
    }
  ]
}
```

---

### 4. Synthesize Neural Speech (TTS)
Converts text into audio binary (`audio/mpeg` or `audio/wav`).

- **Method**: `POST`
- **Path**: `/api/tts`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <api_key>` (or `X-API-Key: <api_key>`)

#### Request Body (JSON):
```json
{
  "text": "The golden sunrise illuminated the mountains, marking the dawn of a new era.",
  "voice": "flux-alexis-en",
  "model": "deepgram/flux-tts:free",
  "speed": 1.0
}
```

#### Response (`200 OK`):
- **Content-Type**: `audio/mpeg` (or `audio/wav`)
- **Headers**:
  - `Content-Disposition: inline; filename="vox_deepgram_flux-tts_free_flux-alexis-en.mp3"`
  - `X-Voice-Model: deepgram/flux-tts:free`
  - `X-Voice-Name: flux-alexis-en`
- **Body**: Binary audio bytes (playable directly in HTML5 Audio or saved to disk).

---

### 5. Forced Word Timestamp Alignment
Aligns speech audio with ground-truth text, producing precise start/end timestamps for each spoken word.

- **Method**: `POST`
- **Path**: `/api/align`
- **Headers**: `Authorization: Bearer <api_key>`
- **Content-Type**: `multipart/form-data`

#### Form Fields:
- `file`: Audio file binary (`.mp3` or `.wav`).
- `prompt`: (Optional) The ground-truth script string to anchor alignment.

#### Response (`200 OK`):
```json
{
  "text": "The golden sunrise illuminated the mountains.",
  "duration": 3.42,
  "words": [
    { "word": " The", "start": 0.08, "end": 0.22 },
    { "word": " golden", "start": 0.24, "end": 0.68 },
    { "word": " sunrise", "start": 0.70, "end": 1.18 },
    { "word": " illuminated", "start": 1.20, "end": 1.94 },
    { "word": " the", "start": 1.96, "end": 2.10 },
    { "word": " mountains.", "start": 2.12, "end": 2.76 }
  ],
  "segments": [...]
}
```

---

### 6. Speech-to-Text Transcription (STT)
Transcribes spoken audio into text using Groq Whisper.

- **Method**: `POST`
- **Path**: `/api/stt`
- **Headers**: `Authorization: Bearer <api_key>`
- **Content-Type**: `multipart/form-data`

#### Form Fields:
- `file`: Audio file binary (`.webm`, `.mp3`, `.wav`, `.m4a`).

#### Response (`200 OK`):
```json
{
  "text": "Welcome to VoxFlow studio. Generating ultra natural neural speech.",
  "duration": 4.12,
  "language": "english"
}
```

---

## 💻 Code Examples

### cURL
```bash
# 1. Generate an API Key
curl -X POST https://voxflow-809.pages.dev/api/keys/generate \
  -H "Content-Type: application/json" \
  -d '{"name": "CLI Script"}'

# 2. Synthesize Speech to MP3
curl -X POST https://voxflow-809.pages.dev/api/tts \
  -H "Authorization: Bearer YOUR_VOX_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello world from VoxFlow edge API!",
    "voice": "flux-bruce-en"
  }' \
  --output speech.mp3
```

### Node.js (Fetch API)
```javascript
import fs from 'fs/promises';

const API_KEY = 'vox_live_...';
const BASE_URL = 'https://voxflow-809.pages.dev';

async function generateSpeech(text, outputPath = 'output.mp3') {
  const resp = await fetch(`${BASE_URL}/api/tts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text,
      voice: 'flux-alexis-en',
      model: 'deepgram/flux-tts:free'
    })
  });

  if (!resp.ok) {
    throw new Error(`TTS Error: ${await resp.text()}`);
  }

  const arrayBuffer = await resp.arrayBuffer();
  await fs.writeFile(outputPath, Buffer.from(arrayBuffer));
  console.log(`Saved speech to ${outputPath}`);
}

generateSpeech('Welcome to programmatic neural audio synthesis.');
```

### Python (Requests)
```python
import requests

API_KEY = "vox_live_..."
BASE_URL = "https://voxflow-809.pages.dev"

def synthesize_speech(text: str, filename: str = "output.mp3"):
    response = requests.post(
        f"{BASE_URL}/api/tts",
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json"
        },
        json={
            "text": text,
            "voice": "flux-gemma-en",
            "model": "deepgram/flux-tts:free"
        }
    )
    response.raise_for_status()
    with open(filename, "wb") as f:
        f.write(response.content)
    print(f"Speech saved to {filename}")

synthesize_speech("Hello from Python integration with VoxFlow API!")
```
