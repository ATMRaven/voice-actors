/**
 * VoxFlow Online TTS MCP Server - Tool Definitions & Execution Handlers
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_BASE_URL = process.env.VOXFLOW_BASE_URL || 'https://voxflow-809.pages.dev';
const DEFAULT_API_KEY = process.env.VOXFLOW_API_KEY || '';

const TOOL_DEFINITIONS = [
  {
    name: 'tts_generate_speech',
    description: 'Synthesizes neural text-to-speech using Mistral Voxtral (30 emotional voices, e.g. en_paul_happy, gb_jane_sarcasm), Deepgram Flux (36 voices), or Fish Audio S2.1, saving high-fidelity MP3/WAV directly to a local file.',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'The text script or dialogue to synthesize into speech.'
        },
        voice: {
          type: 'string',
          description: 'Voice ID or name (e.g. "en_paul_happy", "gb_jane_sarcasm", "fr_marie_happy", "flux-alexis-en", "flux-bruce-en", "alloy"). Defaults to "flux-alexis-en".',
          default: 'flux-alexis-en'
        },
        model: {
          type: 'string',
          description: 'TTS Model ID ("mistral/voxtral-mini-tts", "deepgram/flux-tts:free", or "fish-audio/s2.1-pro-free:free"). Defaults to "deepgram/flux-tts:free".',
          default: 'deepgram/flux-tts:free'
        },
        outputFilePath: {
          type: 'string',
          description: 'Destination file path on disk (e.g. "./output.mp3" or "Z:/audio/sample.mp3"). Defaults to a timestamped file in current directory.'
        },
        speed: {
          type: 'number',
          description: 'Playback speed rate (e.g. 1.0, 1.25, 0.9). Defaults to 1.0.',
          default: 1.0
        },
        apiKey: {
          type: 'string',
          description: 'Optional VoxFlow or OpenRouter API key overriding the default environment key.'
        },
        mistralApiKey: {
          type: 'string',
          description: 'Optional Mistral API key (token) for direct Mistral Voxtral emotional TTS synthesis.'
        },
        deepgramApiKey: {
          type: 'string',
          description: 'Optional Deepgram API key (token) for direct ultra-low latency Deepgram Flux TTS synthesis.'
        }
      },
      required: ['text']
    }
  },
  {
    name: 'tts_list_voices',
    description: 'Lists all 37+ available neural voices with gender, accent, tone, and curation recommendations.',
    inputSchema: {
      type: 'object',
      properties: {
        filter: {
          type: 'string',
          description: 'Optional filter: "Female", "Male", "recommended", "British", "US", "Indian", "Irish", or "all".',
          default: 'all'
        }
      }
    }
  },
  {
    name: 'tts_transcribe',
    description: 'Transcribes an audio file on disk to text using Groq Whisper Large V3 Turbo with instant response time.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'Absolute or relative path to the audio file on disk (.mp3, .wav, .webm, .ogg, .m4a).'
        },
        apiKey: {
          type: 'string',
          description: 'Optional VoxFlow or Groq API key.'
        }
      },
      required: ['filePath']
    }
  },
  {
    name: 'tts_align_words',
    description: 'Performs forced alignment on an audio file against a text prompt, extracting precise millisecond word start and end timestamps.',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'Path to audio file on disk.'
        },
        prompt: {
          type: 'string',
          description: 'Optional ground-truth script/text prompt to anchor word alignment.'
        },
        apiKey: {
          type: 'string',
          description: 'Optional VoxFlow or Groq API key.'
        }
      },
      required: ['filePath']
    }
  },
  {
    name: 'tts_generate_api_key',
    description: 'Generates a new cryptographically signed VoxFlow API key for an agent or client application.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Human-readable client/agent label (e.g. "Claude Desktop", "Discord Bot"). Defaults to "AI Agent".',
          default: 'AI Agent'
        }
      }
    }
  },
  {
    name: 'tts_verify_api_key',
    description: 'Verifies an existing VoxFlow API key and returns its active permissions and client metadata.',
    inputSchema: {
      type: 'object',
      properties: {
        apiKey: {
          type: 'string',
          description: 'API key string to verify (defaults to active configured VOXFLOW_API_KEY).'
        }
      }
    }
  }
];

function getHeaders(customKey) {
  const key = customKey || DEFAULT_API_KEY;
  const headers = {};
  if (key) {
    headers['Authorization'] = `Bearer ${key}`;
    headers['X-API-Key'] = key;
  }
  return headers;
}

async function handleToolCall(name, args) {
  const baseUrl = (process.env.VOXFLOW_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');

  switch (name) {
    case 'tts_generate_speech': {
      const text = (args.text || '').trim();
      if (!text) {
        throw new Error('TTS text prompt cannot be empty.');
      }

      const voice = args.voice || 'flux-alexis-en';
      const model = args.model || 'deepgram/flux-tts';
      const speed = args.speed || 1.0;
      const headers = {
        'Content-Type': 'application/json',
        ...getHeaders(args.apiKey)
      };

      const dgKey = args.deepgramApiKey || process.env.DEEPGRAM_API_KEY;
      if (dgKey) {
        headers['X-Deepgram-Key'] = dgKey;
      }

      const mistralKey = args.mistralApiKey || process.env.MISTRAL_API_KEY;
      if (mistralKey) {
        headers['X-Mistral-Key'] = mistralKey;
      }

      const resp = await fetch(`${baseUrl}/api/tts`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          text,
          voice,
          model,
          speed,
          api_key: args.apiKey || undefined,
          deepgram_key: dgKey || undefined,
          mistral_key: mistralKey || undefined
        })
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`TTS synthesis failed (${resp.status}): ${errText}`);
      }

      const contentType = resp.headers.get('content-type') || 'audio/mpeg';
      const ext = contentType.includes('wav') ? '.wav' : '.mp3';

      let outPath = args.outputFilePath;
      if (!outPath) {
        const sanitizedVoice = voice.replace(/[^a-zA-Z0-9_-]/g, '_');
        outPath = path.resolve(process.cwd(), `vox_${sanitizedVoice}_${Date.now()}${ext}`);
      } else {
        outPath = path.resolve(outPath);
      }

      // Ensure directory exists
      const dir = path.dirname(outPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const arrayBuffer = await resp.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      fs.writeFileSync(outPath, buffer);

      return {
        success: true,
        savedTo: outPath,
        fileSizeBytes: buffer.length,
        contentType,
        voice,
        model,
        characterCount: text.length,
        message: `Successfully synthesized ${text.length} characters with voice '${voice}'. Saved to ${outPath} (${(buffer.length / 1024).toFixed(1)} KB).`
      };
    }

    case 'tts_list_voices': {
      const resp = await fetch(`${baseUrl}/api/voices`);
      if (!resp.ok) {
        throw new Error(`Failed to fetch voices catalog: ${await resp.text()}`);
      }

      const data = await resp.json();
      let list = data.voices || [];

      const filter = (args.filter || 'all').toLowerCase();
      if (filter && filter !== 'all') {
        if (filter === 'recommended') {
          list = list.filter(v => v.recommended);
        } else if (filter === 'female') {
          list = list.filter(v => v.gender && v.gender.toLowerCase() === 'female');
        } else if (filter === 'male') {
          list = list.filter(v => v.gender && v.gender.toLowerCase() === 'male');
        } else {
          list = list.filter(v =>
            (v.accent && v.accent.toLowerCase().includes(filter)) ||
            (v.tone && v.tone.toLowerCase().includes(filter)) ||
            (v.name && v.name.toLowerCase().includes(filter))
          );
        }
      }

      return {
        total: list.length,
        filter: args.filter || 'all',
        voices: list
      };
    }

    case 'tts_transcribe': {
      const filePath = path.resolve(args.filePath);
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const fileBuffer = fs.readFileSync(filePath);
      const fileName = path.basename(filePath);
      const mime = fileName.endsWith('.wav') ? 'audio/wav' : 'audio/mpeg';

      const formData = new FormData();
      formData.append('file', new Blob([fileBuffer], { type: mime }), fileName);
      if (args.apiKey) formData.append('api_key', args.apiKey);

      const resp = await fetch(`${baseUrl}/api/stt`, {
        method: 'POST',
        headers: getHeaders(args.apiKey),
        body: formData
      });

      if (!resp.ok) {
        throw new Error(`Transcription failed (${resp.status}): ${await resp.text()}`);
      }

      const result = await resp.json();
      return {
        success: true,
        text: result.text,
        durationSeconds: result.duration,
        language: result.language,
        filePath
      };
    }

    case 'tts_align_words': {
      const filePath = path.resolve(args.filePath);
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const fileBuffer = fs.readFileSync(filePath);
      const fileName = path.basename(filePath);
      const mime = fileName.endsWith('.wav') ? 'audio/wav' : 'audio/mpeg';

      const formData = new FormData();
      formData.append('file', new Blob([fileBuffer], { type: mime }), fileName);
      if (args.prompt) formData.append('prompt', args.prompt);
      if (args.apiKey) formData.append('api_key', args.apiKey);

      const resp = await fetch(`${baseUrl}/api/align`, {
        method: 'POST',
        headers: getHeaders(args.apiKey),
        body: formData
      });

      if (!resp.ok) {
        throw new Error(`Word alignment failed (${resp.status}): ${await resp.text()}`);
      }

      const result = await resp.json();
      return {
        success: true,
        text: result.text,
        wordCount: (result.words || []).length,
        durationSeconds: result.duration,
        words: result.words || []
      };
    }

    case 'tts_generate_api_key': {
      const resp = await fetch(`${baseUrl}/api/keys/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: args.name || 'AI Agent' })
      });

      if (!resp.ok) {
        throw new Error(`Key generation failed (${resp.status}): ${await resp.text()}`);
      }

      return await resp.json();
    }

    case 'tts_verify_api_key': {
      const key = args.apiKey || DEFAULT_API_KEY;
      if (!key) {
        throw new Error('No API key provided or configured in environment.');
      }

      const resp = await fetch(`${baseUrl}/api/keys/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${key}`,
          'X-API-Key': key
        }
      });

      if (!resp.ok) {
        throw new Error(`Verification failed (${resp.status}): ${await resp.text()}`);
      }

      return await resp.json();
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

module.exports = {
  TOOL_DEFINITIONS,
  handleToolCall
};
