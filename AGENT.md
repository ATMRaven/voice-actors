# AGENT.md — VoxFlow Neural TTS & Alignment Integration Guide for AI Agents

> **Role & Purpose**: You are an AI assistant integrating with **VoxFlow Studio**, a zero-latency, studio-grade neural voice synthesis, Whisper transcription, and word timestamp alignment engine deployed globally on Cloudflare Pages edge.
> Use this guide to synthesize lifelike speech audio files, transcribe user audio recordings, or compute millisecond-accurate word timestamps for videos and karaoke playback.

---

## 🚀 Quick Setup: Connecting via Model Context Protocol (MCP)

If your client supports **Model Context Protocol (MCP)** (e.g. Claude Desktop, Cursor, Antigravity, Windsurf), connect directly to the stdio MCP server:

### Configuration (`claude_desktop_config.json` / `antigravity.json`):
```json
{
  "mcpServers": {
    "voxflow-tts": {
      "command": "node",
      "args": [
        "Z:\\code\\vibe code\\online tts\\mcp-server\\index.js"
      ],
      "env": {
        "VOXFLOW_BASE_URL": "https://voxflow-809.pages.dev",
        "VOXFLOW_API_KEY": "YOUR_VOX_API_KEY_HERE"
      }
    }
  }
}
```

> **Note**: If you don't have an API key yet, you can leave `VOXFLOW_API_KEY` empty (the edge server provides default access), or generate one with the `tts_generate_api_key` tool!

---

## 🛠️ Available MCP Tools

| Tool Name | Purpose | Parameters |
| :--- | :--- | :--- |
| `tts_generate_speech` | Synthesizes text into high-fidelity speech audio saved directly to a local disk file (`.mp3` or `.wav`). | `text` (string, required), `voice` (string, default: `"flux-alexis-en"`), `model` (string, default: `"deepgram/flux-tts"`), `outputFilePath` (string), `speed` (number, default: `1.0`), `apiKey` (string), `mistralApiKey` (string), `deepgramApiKey` (string) |
| `tts_list_voices` | Returns all 67+ available neural voices with emotion presets, accent, gender, and tone descriptions. | `filter` (string: `"all"`, `"Mistral"`, `"recommended"`, `"Female"`, `"Male"`, `"British"`, `"US"`, `"Indian"`, `"Irish"`) |
| `tts_transcribe` | Transcribes any local audio file on disk to text using Groq Whisper Large V3 Turbo. | `filePath` (string, required), `apiKey` (string) |
| `tts_align_words` | Extracts precise word-level start and end timestamps (in seconds) synchronized to speech audio. | `filePath` (string, required), `prompt` (string, ground-truth script), `apiKey` (string) |
| `tts_generate_api_key` | Generates a cryptographically signed VoxFlow API key with 120 req/min quota. | `name` (string, default: `"AI Agent"`) |
| `tts_verify_api_key` | Verifies active key status and client permissions. | `apiKey` (string) |

---

## 🎙️ Curated Voice Recommendations

| Voice ID | Name | Gender | Accent / Emotion | Tone / Best Use Case |
| :--- | :--- | :--- | :--- | :--- |
| `en_paul_happy` | Paul (Happy) | Male | US English · **Happy** | Upbeat, sunny, approachable assistant |
| `en_paul_excited` | Paul (Excited) | Male | US English · **Excited** | High energy, dynamic announcements |
| `gb_jane_sarcasm` | Jane (Sarcasm) | Female | British English · **Sarcastic** | Dry, witty, ironic British personality |
| `gb_oliver_confident` | Oliver (Confident) | Male | British English · **Confident** | Assured, articulate documentary narration |
| `fr_marie_happy` | Marie (Happy) | Female | French Accent · **Happy** | Joyful, radiant, international flair |
| `flux-alexis-en` | Alexis | Female | US English | Friendly, warm, natural assistant tone |
| `flux-bruce-en` | Bruce | Male | US English | Deep, authoritative, documentary narration |
| `flux-gemma-en` | Gemma | Female | British English | Crisp, refined, BBC-style professional |
| `flux-bree-en` | Bree | Female | US English | Conversational, approachable podcast host |
| `flux-wade-en` | Wade | Male | US English | Deep resonant bass, cinematic voiceover |
| `alloy` | S2.1 Multi-Voice | Adaptive | Multilingual | Fish Audio expressive multilingual neural model |

---

## 💡 Typical Agent Workflows

### Scenario 1: The User Asks "Read this text aloud / create a voiceover"
1. Choose an appropriate voice (e.g. `flux-alexis-en` for assistants, `flux-bruce-en` for deep narration).
2. Call `tts_generate_speech`:
   ```json
   {
     "text": "Welcome to our presentation. Today we will explore recent advances in neural acoustics.",
     "voice": "flux-bruce-en",
     "outputFilePath": "./audio/intro.mp3"
   }
   ```
3. Report the saved file path and duration to the user.

### Scenario 2: Synchronized Video Subtitles / Karaoke
1. Synthesize audio with `tts_generate_speech` saving to `audio.mp3`.
2. Call `tts_align_words` with `filePath: "audio.mp3"` and `prompt: "<original script>"`.
3. The tool returns an array of words with exact `start` and `end` second offsets.
4. Use the timestamps to generate `.srt` or `.vtt` subtitle files.

### Scenario 3: Audio Transcription
1. Call `tts_transcribe` with `filePath: "recording.mp3"`.
2. Inspect the returned transcript text and detected language.

---

## 🌐 Fallback: Direct REST API (Without MCP)

If your environment does not support MCP stdio, make standard HTTP requests:
- **Base URL**: `https://voxflow-809.pages.dev`
- **Header**: `Authorization: Bearer <API_KEY>` or `X-API-Key: <API_KEY>`

### 1. Synthesize Speech
```bash
POST /api/tts
Content-Type: application/json
Authorization: Bearer YOUR_VOX_KEY

{
  "text": "Hello world from the VoxFlow edge API.",
  "voice": "flux-alexis-en",
  "model": "deepgram/flux-tts:free"
}
```
*Returns raw `audio/mpeg` or `audio/wav` binary.*

### 2. Forced Alignment (Word Timestamps)
```bash
POST /api/align
Authorization: Bearer YOUR_VOX_KEY
Content-Type: multipart/form-data

file: <audio_file_binary>
prompt: "Hello world from the VoxFlow edge API."
```
*Returns JSON with word timestamp array.*

### 3. Generate New Key
```bash
POST /api/keys/generate
Content-Type: application/json

{
  "name": "My Agent"
}
```
