import os
import io
import re
import wave
import json
import time
import hmac
import hashlib
import base64
import secrets
import logging
from pathlib import Path
from typing import Optional, List, Dict, Any

import requests
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Response, Request
from fastapi.responses import FileResponse, StreamingResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("VoiceStudio")

# --- Load Environment Credentials ---
DEFAULT_CREDENTIALS_PATH = Path(r"C:\Users\acer nitro\.gemini\config\credentials.env")
SERVER_ENV = {}

if DEFAULT_CREDENTIALS_PATH.exists():
    try:
        content = DEFAULT_CREDENTIALS_PATH.read_text(encoding="utf-8")
        for line in content.splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, val = line.split("=", 1)
                SERVER_ENV[key.strip()] = val.strip().strip("\"'")
        logger.info(f"Loaded credentials from {DEFAULT_CREDENTIALS_PATH}")
    except Exception as e:
        logger.warning(f"Could not read credentials file: {e}")

DEFAULT_OPENROUTER_KEY = os.getenv("OPENROUTER_API_KEY") or SERVER_ENV.get("OPENROUTER_API_KEY", "")
DEFAULT_GROQ_KEY = os.getenv("GROQ_API_KEY") or SERVER_ENV.get("GROQ_API_KEY", "")
DEFAULT_DEEPGRAM_KEY = os.getenv("DEEPGRAM_API_KEY") or SERVER_ENV.get("DEEPGRAM_API_KEY", "")
DEFAULT_MISTRAL_KEY = os.getenv("MISTRAL_API_KEY") or SERVER_ENV.get("MISTRAL_API_KEY", "")
DEFAULT_GEMINI_KEY = os.getenv("GEMINI_API_KEY") or SERVER_ENV.get("GEMINI_API_KEY_1") or SERVER_ENV.get("GEMINI_API_KEY_2", "")
DEFAULT_CARTESIA_KEY = os.getenv("CARTESIA_API_KEY") or SERVER_ENV.get("CARTESIA_API_KEY", "")
DEFAULT_CF_TOKEN = os.getenv("CLOUDFLARE_API_TOKEN") or SERVER_ENV.get("CLOUDFLARE_API_TOKEN", "")
DEFAULT_CF_ACCOUNT_ID = os.getenv("CLOUDFLARE_ACCOUNT_ID") or SERVER_ENV.get("CLOUDFLARE_ACCOUNT_ID", "")
DEFAULT_ELEVENLABS_KEY = os.getenv("ELEVENLABS_API_KEY") or SERVER_ENV.get("ELEVENLABS_API_KEY_1") or SERVER_ENV.get("ELEVENLABS_API_KEY_2", "")
HMAC_SECRET = os.getenv("VOX_API_SECRET") or "voxflow_secret_master_key_2026_neural_audio"

# --- High-Performance Persistent HTTP Connection Pool ---
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

http_session = requests.Session()
adapter = HTTPAdapter(
    pool_connections=25,
    pool_maxsize=50,
    max_retries=Retry(total=2, backoff_factor=0.1, status_forcelist=[502, 503, 504])
)
http_session.mount("https://", adapter)
http_session.mount("http://", adapter)

# --- Voice Catalog Definition ---
VOXTRAL_VOICES = [
    # Paul (US English - Emotional Spectrum)
    {"id": "en_paul_happy", "name": "Paul - Happy", "gender": "Male", "accent": "US English", "tone": "Sunny, Easygoing, Happy", "emotion": "Happy", "provider": "Mistral Voxtral", "recommended": True},
    {"id": "en_paul_excited", "name": "Paul - Excited", "gender": "Male", "accent": "US English", "tone": "Bouncy, Spirited, Excited", "emotion": "Excited", "provider": "Mistral Voxtral", "recommended": True},
    {"id": "en_paul_confident", "name": "Paul - Confident", "gender": "Male", "accent": "US English", "tone": "Bold, Punchy, Confident", "emotion": "Confident", "provider": "Mistral Voxtral"},
    {"id": "en_paul_cheerful", "name": "Paul - Cheerful", "gender": "Male", "accent": "US English", "tone": "Upbeat, Breezy, Cheerful", "emotion": "Cheerful", "provider": "Mistral Voxtral"},
    {"id": "en_paul_neutral", "name": "Paul - Neutral", "gender": "Male", "accent": "US English", "tone": "Relaxed, Balanced, Neutral", "emotion": "Neutral", "provider": "Mistral Voxtral"},
    {"id": "en_paul_frustrated", "name": "Paul - Frustrated", "gender": "Male", "accent": "US English", "tone": "Edgy, Snappy, Frustrated", "emotion": "Frustrated", "provider": "Mistral Voxtral"},
    {"id": "en_paul_sad", "name": "Paul - Sad", "gender": "Male", "accent": "US English", "tone": "Heavy, Hushed, Sad", "emotion": "Sad", "provider": "Mistral Voxtral"},
    {"id": "en_paul_angry", "name": "Paul - Angry", "gender": "Male", "accent": "US English", "tone": "Raw, Gruff, Angry", "emotion": "Angry", "provider": "Mistral Voxtral"},

    # Jane (British English - Distinctive Emotions)
    {"id": "gb_jane_sarcasm", "name": "Jane - Sarcasm", "gender": "Female", "accent": "British English", "tone": "Dry, Wry, Sarcastic", "emotion": "Sarcastic", "provider": "Mistral Voxtral", "recommended": True},
    {"id": "gb_jane_confident", "name": "Jane - Confident", "gender": "Female", "accent": "British English", "tone": "Poised, Sharp, Confident", "emotion": "Confident", "provider": "Mistral Voxtral"},
    {"id": "gb_jane_curious", "name": "Jane - Curious", "gender": "Female", "accent": "British English", "tone": "Inquisitive, Intrigued", "emotion": "Curious", "provider": "Mistral Voxtral"},
    {"id": "gb_jane_neutral", "name": "Jane - Neutral", "gender": "Female", "accent": "British English", "tone": "Calm, Even, Neutral", "emotion": "Neutral", "provider": "Mistral Voxtral"},
    {"id": "gb_jane_confused", "name": "Jane - Confused", "gender": "Female", "accent": "British English", "tone": "Puzzled, Searching", "emotion": "Confused", "provider": "Mistral Voxtral"},
    {"id": "gb_jane_frustrated", "name": "Jane - Frustrated", "gender": "Female", "accent": "British English", "tone": "Exasperated, Tense", "emotion": "Frustrated", "provider": "Mistral Voxtral"},
    {"id": "gb_jane_jealousy", "name": "Jane - Jealousy", "gender": "Female", "accent": "British English", "tone": "Envious, Spiteful", "emotion": "Jealousy", "provider": "Mistral Voxtral"},
    {"id": "gb_jane_sad", "name": "Jane - Sad", "gender": "Female", "accent": "British English", "tone": "Sorrowful, Melancholy", "emotion": "Sad", "provider": "Mistral Voxtral"},
    {"id": "gb_jane_shameful", "name": "Jane - Shameful", "gender": "Female", "accent": "British English", "tone": "Regretful, Hesitant", "emotion": "Shameful", "provider": "Mistral Voxtral"},

    # Oliver (British English - Rich Expressiveness)
    {"id": "gb_oliver_confident", "name": "Oliver - Confident", "gender": "Male", "accent": "British English", "tone": "Assured, Articulate, Confident", "emotion": "Confident", "provider": "Mistral Voxtral", "recommended": True},
    {"id": "gb_oliver_cheerful", "name": "Oliver - Cheerful", "gender": "Male", "accent": "British English", "tone": "Pleasant, Engaging, Warm", "emotion": "Cheerful", "provider": "Mistral Voxtral"},
    {"id": "gb_oliver_excited", "name": "Oliver - Excited", "gender": "Male", "accent": "British English", "tone": "Enthusiastic, Animated", "emotion": "Excited", "provider": "Mistral Voxtral"},
    {"id": "gb_oliver_curious", "name": "Oliver - Curious", "gender": "Male", "accent": "British English", "tone": "Thoughtful, Inquiring", "emotion": "Curious", "provider": "Mistral Voxtral"},
    {"id": "gb_oliver_neutral", "name": "Oliver - Neutral", "gender": "Male", "accent": "British English", "tone": "Calm, Even, Neutral", "emotion": "Neutral", "provider": "Mistral Voxtral"},
    {"id": "gb_oliver_sad", "name": "Oliver - Sad", "gender": "Male", "accent": "British English", "tone": "Subdued, Heavy", "emotion": "Sad", "provider": "Mistral Voxtral"},
    {"id": "gb_oliver_angry", "name": "Oliver - Angry", "gender": "Male", "accent": "British English", "tone": "Stern, Sharp, Direct", "emotion": "Angry", "provider": "Mistral Voxtral"},

    # Marie (French / Multilingual)
    {"id": "fr_marie_happy", "name": "Marie - Happy", "gender": "Female", "accent": "French Accent", "tone": "Joyful, Radiant, Expressive", "emotion": "Happy", "provider": "Mistral Voxtral", "recommended": True},
    {"id": "fr_marie_excited", "name": "Marie - Excited", "gender": "Female", "accent": "French Accent", "tone": "Lively, Vibrant", "emotion": "Excited", "provider": "Mistral Voxtral"},
    {"id": "fr_marie_curious", "name": "Marie - Curious", "gender": "Female", "accent": "French Accent", "tone": "Intrigued, Playful", "emotion": "Curious", "provider": "Mistral Voxtral"},
    {"id": "fr_marie_neutral", "name": "Marie - Neutral", "gender": "Female", "accent": "French Accent", "tone": "Elegant, Natural", "emotion": "Neutral", "provider": "Mistral Voxtral"},
    {"id": "fr_marie_sad", "name": "Marie - Sad", "gender": "Female", "accent": "French Accent", "tone": "Gentle, Wistful", "emotion": "Sad", "provider": "Mistral Voxtral"},
    {"id": "fr_marie_angry", "name": "Marie - Angry", "gender": "Female", "accent": "French Accent", "tone": "Passionate, Fiery", "emotion": "Angry", "provider": "Mistral Voxtral"}
]

DEEPGRAM_VOICES = [
    {"id": "flux-alexis-en", "name": "Alexis", "gender": "Female", "accent": "US English", "tone": "Friendly & Clear", "recommended": True},
    {"id": "flux-bree-en", "name": "Bree", "gender": "Female", "accent": "US English", "tone": "Warm & Conversational"},
    {"id": "flux-brittany-en", "name": "Brittany", "gender": "Female", "accent": "US English", "tone": "Professional & Articulate"},
    {"id": "flux-brooke-en", "name": "Brooke", "gender": "Female", "accent": "US English", "tone": "Bright & Engaging"},
    {"id": "flux-bruce-en", "name": "Bruce", "gender": "Male", "accent": "US English", "tone": "Deep & Authoritative", "recommended": True},
    {"id": "flux-cliff-en", "name": "Cliff", "gender": "Male", "accent": "US English", "tone": "Resonant & Calm"},
    {"id": "flux-cole-en", "name": "Cole", "gender": "Male", "accent": "US English", "tone": "Smooth & Modern"},
    {"id": "flux-colin-en", "name": "Colin", "gender": "Male", "accent": "US English", "tone": "Energetic & Direct"},
    {"id": "flux-conor-en", "name": "Conor", "gender": "Male", "accent": "US English", "tone": "Confident & Clear"},
    {"id": "flux-donovan-en", "name": "Donovan", "gender": "Male", "accent": "US English", "tone": "Rich & Narrative"},
    {"id": "flux-drew-en", "name": "Drew", "gender": "Male", "accent": "US English", "tone": "Casual & Relatable"},
    {"id": "flux-elise-en", "name": "Elise", "gender": "Female", "accent": "US English", "tone": "Soft & Empathetic"},
    {"id": "flux-gemma-en", "name": "Gemma", "gender": "Female", "accent": "British English", "tone": "Crisp & Refined", "recommended": True},
    {"id": "flux-haley-en", "name": "Haley", "gender": "Female", "accent": "US English", "tone": "Youthful & Vibrant"},
    {"id": "flux-hannah-en", "name": "Hannah", "gender": "Female", "accent": "US English", "tone": "Neutral & Informative"},
    {"id": "flux-heather-en", "name": "Heather", "gender": "Female", "accent": "US English", "tone": "Warm & Reassuring"},
    {"id": "flux-jack-en", "name": "Jack", "gender": "Male", "accent": "US English", "tone": "Classic & Radio-Ready"},
    {"id": "flux-kai-en", "name": "Kai", "gender": "Male", "accent": "US English", "tone": "Contemporary & Crisp"},
    {"id": "flux-kelsey-en", "name": "Kelsey", "gender": "Female", "accent": "US English", "tone": "Dynamic & Expressive"},
    {"id": "flux-kit-en", "name": "Kit", "gender": "Non-binary", "accent": "US English", "tone": "Balanced & Modern"},
    {"id": "flux-maeve-en", "name": "Maeve", "gender": "Female", "accent": "Irish/US English", "tone": "Elegant & Melodic"},
    {"id": "flux-marcelo-en", "name": "Marcelo", "gender": "Male", "accent": "Expressive", "tone": "Warm & Charismatic"},
    {"id": "flux-marcus-en", "name": "Marcus", "gender": "Male", "accent": "US English", "tone": "Powerful & Corporate"},
    {"id": "flux-meena-en", "name": "Meena", "gender": "Female", "accent": "Indian English", "tone": "Caring & Polished"},
    {"id": "flux-meghan-en", "name": "Meghan", "gender": "Female", "accent": "US English", "tone": "Upbeat & Commercial"},
    {"id": "flux-miles-en", "name": "Miles", "gender": "Male", "accent": "US English", "tone": "Fast-Paced & Engaging"},
    {"id": "flux-naveen-en", "name": "Naveen", "gender": "Male", "accent": "Indian English", "tone": "Clear & Articulate"},
    {"id": "flux-paige-en", "name": "Paige", "gender": "Female", "accent": "US English", "tone": "Clean & Direct"},
    {"id": "flux-priya-en", "name": "Priya", "gender": "Female", "accent": "Indian English", "tone": "Melodic & Expressive"},
    {"id": "flux-rufus-en", "name": "Rufus", "gender": "Male", "accent": "British English", "tone": "Distinctive & Vintage"},
    {"id": "flux-sean-en", "name": "Sean", "gender": "Male", "accent": "Irish English", "tone": "Friendly & Approachable"},
    {"id": "flux-sharon-en", "name": "Sharon", "gender": "Female", "accent": "US English", "tone": "Mature & Trustworthy"},
    {"id": "flux-sienna-en", "name": "Sienna", "gender": "Female", "accent": "US English", "tone": "Stylish & Natural"},
    {"id": "flux-tanner-en", "name": "Tanner", "gender": "Male", "accent": "US English", "tone": "Youthful & Dynamic"},
    {"id": "flux-wade-en", "name": "Wade", "gender": "Male", "accent": "US English", "tone": "Deep Bass & Steady"},
    {"id": "flux-wes-en", "name": "Wes", "gender": "Male", "accent": "US English", "tone": "Warm & Conversational"}
]

FISH_VOICES = [
    {"id": "alloy", "name": "S2.1 Multi-Voice", "gender": "Adaptive", "accent": "Multilingual Neural", "tone": "Expressive & High Fidelity", "recommended": True}
]

CARTESIA_VOICES = [
    {"id": "95856005-0332-41b0-935f-352e296aa0df", "name": "Sophie", "gender": "Female", "accent": "US English", "tone": "Conversational & Natural", "provider": "Cartesia", "recommended": True},
    {"id": "a0e99841-438c-4a64-b679-ae501e7d6091", "name": "Barbershop Man", "gender": "Male", "accent": "US English", "tone": "Rich & Resonant", "provider": "Cartesia", "recommended": True},
    {"id": "694f9389-aac1-45b6-b726-9d9369183238", "name": "Sarah", "gender": "Female", "accent": "US English", "tone": "Calm & Professional", "provider": "Cartesia"},
    {"id": "79a125e8-cd45-4c13-8a67-188112f4dd22", "name": "British Lady", "gender": "Female", "accent": "British English", "tone": "Poised & Articulate", "provider": "Cartesia", "recommended": True},
    {"id": "f39d8500-0d9b-4b8b-a080-38f5188f5892", "name": "Commercial Lady", "gender": "Female", "accent": "US English", "tone": "Dynamic & Upbeat", "provider": "Cartesia"},
    {"id": "829ccd10-f8b3-43cd-b8a0-4aeaa81f3b30", "name": "Doctor", "gender": "Male", "accent": "US English", "tone": "Authoritative & Trustworthy", "provider": "Cartesia"},
    {"id": "b7d50908-b17c-442d-ad8d-810c63997ed9", "name": "California Girl", "gender": "Female", "accent": "US English", "tone": "Youthful & Breezy", "provider": "Cartesia"},
    {"id": "5c42302c-194b-4d0c-ba1a-8cb485c84ab9", "name": "Storyteller", "gender": "Male", "accent": "US English", "tone": "Warm & Dramatic", "provider": "Cartesia"}
]

GEMINI_VOICES = [
    {"id": "Puck", "name": "Puck", "gender": "Male", "accent": "Natural Expressive", "tone": "Lively & Engaging", "provider": "Google Gemini", "recommended": True},
    {"id": "Charon", "name": "Charon", "gender": "Male", "accent": "Deep Expressive", "tone": "Informative & Grounded", "provider": "Google Gemini", "recommended": True},
    {"id": "Kore", "name": "Kore", "gender": "Female", "accent": "Warm Expressive", "tone": "Empathetic & Conversational", "provider": "Google Gemini", "recommended": True},
    {"id": "Fenrir", "name": "Fenrir", "gender": "Male", "accent": "Bold Expressive", "tone": "Strong & Radio-Clear", "provider": "Google Gemini"},
    {"id": "Aoede", "name": "Aoede", "gender": "Female", "accent": "Melodic Expressive", "tone": "Harmonic & Smooth", "provider": "Google Gemini"}
]

GROQ_ORPHEUS_VOICES = [
    # English Voices (canopylabs/orpheus-v1-english)
    {"id": "autumn", "name": "Autumn", "gender": "Female", "accent": "US English", "tone": "Clear & Warm", "provider": "Groq Orpheus", "model": "canopylabs/orpheus-v1-english", "recommended": True},
    {"id": "diana", "name": "Diana", "gender": "Female", "accent": "US English", "tone": "Articulate & Professional", "provider": "Groq Orpheus", "model": "canopylabs/orpheus-v1-english"},
    {"id": "hannah", "name": "Hannah", "gender": "Female", "accent": "US English", "tone": "Soft & Friendly", "provider": "Groq Orpheus", "model": "canopylabs/orpheus-v1-english"},
    {"id": "austin", "name": "Austin", "gender": "Male", "accent": "US English", "tone": "Energetic & Direct", "provider": "Groq Orpheus", "model": "canopylabs/orpheus-v1-english", "recommended": True},
    {"id": "daniel", "name": "Daniel", "gender": "Male", "accent": "US English", "tone": "Resonant & Calm", "provider": "Groq Orpheus", "model": "canopylabs/orpheus-v1-english"},
    {"id": "troy", "name": "Troy", "gender": "Male", "accent": "US English", "tone": "Casual & Conversational", "provider": "Groq Orpheus", "model": "canopylabs/orpheus-v1-english"},

    # Saudi Arabic Voices (canopylabs/orpheus-arabic-saudi)
    {"id": "abdullah", "name": "Abdullah (عبدالله)", "gender": "Male", "accent": "Saudi Arabic", "tone": "Deep & Eloquent", "provider": "Groq Orpheus", "model": "canopylabs/orpheus-arabic-saudi", "recommended": True},
    {"id": "fahad", "name": "Fahad (فهد)", "gender": "Male", "accent": "Saudi Arabic", "tone": "Natural & Fluent", "provider": "Groq Orpheus", "model": "canopylabs/orpheus-arabic-saudi"},
    {"id": "sultan", "name": "Sultan (سلطان)", "gender": "Male", "accent": "Saudi Arabic", "tone": "Prestigious & Authoritative", "provider": "Groq Orpheus", "model": "canopylabs/orpheus-arabic-saudi"},
    {"id": "lulwa", "name": "Lulwa (لولوة)", "gender": "Female", "accent": "Saudi Arabic", "tone": "Sweet & Articulate", "provider": "Groq Orpheus", "model": "canopylabs/orpheus-arabic-saudi", "recommended": True},
    {"id": "noura", "name": "Noura (نورة)", "gender": "Female", "accent": "Saudi Arabic", "tone": "Clear & Professional", "provider": "Groq Orpheus", "model": "canopylabs/orpheus-arabic-saudi"},
    {"id": "aisha", "name": "Aisha (عائشة)", "gender": "Female", "accent": "Saudi Arabic", "tone": "Warm & Expressive", "provider": "Groq Orpheus", "model": "canopylabs/orpheus-arabic-saudi"}
]

CLOUDFLARE_MELOTTS_VOICES = [
    {"id": "en-us", "name": "Melo US", "gender": "Female", "accent": "US English", "tone": "Fast Edge Synthesis", "provider": "Cloudflare MeloTTS", "recommended": True},
    {"id": "en-default", "name": "Melo Default", "gender": "Female", "accent": "Standard English", "tone": "Neutral & Clear", "provider": "Cloudflare MeloTTS"},
    {"id": "en-br", "name": "Melo British", "gender": "Female", "accent": "British English", "tone": "Crisp Accent", "provider": "Cloudflare MeloTTS"},
    {"id": "en-au", "name": "Melo Australian", "gender": "Female", "accent": "Australian English", "tone": "Natural Australian", "provider": "Cloudflare MeloTTS"},
    {"id": "es", "name": "Melo Spanish", "gender": "Female", "accent": "Spanish", "tone": "Natural Castilian", "provider": "Cloudflare MeloTTS"},
    {"id": "fr", "name": "Melo French", "gender": "Female", "accent": "French", "tone": "Parisian Accent", "provider": "Cloudflare MeloTTS"},
    {"id": "zh", "name": "Melo Mandarin", "gender": "Female", "accent": "Mandarin Chinese", "tone": "Standard Putonghua", "provider": "Cloudflare MeloTTS"},
    {"id": "jp", "name": "Melo Japanese", "gender": "Female", "accent": "Japanese", "tone": "Smooth Tokyo Cadence", "provider": "Cloudflare MeloTTS"},
    {"id": "kr", "name": "Melo Korean", "gender": "Female", "accent": "Korean", "tone": "Clear Seoul Accent", "provider": "Cloudflare MeloTTS"}
]

ELEVENLABS_VOICES = [
    {"id": "CwhRBWXzGAHq8TQ4Fs17", "name": "Roger", "gender": "Male", "accent": "American English", "tone": "Classy & Conversational", "provider": "ElevenLabs", "recommended": True},
    {"id": "EXAVITQu4vr4xnSDxMaL", "name": "Sarah", "gender": "Female", "accent": "American English", "tone": "Professional & Media", "provider": "ElevenLabs", "recommended": True},
    {"id": "FGY2WhTYpPnrIDTdsKH5", "name": "Laura", "gender": "Female", "accent": "American English", "tone": "Sassy & Social Media", "provider": "ElevenLabs", "recommended": True},
    {"id": "IKne3meq5aSn9XLyUdCD", "name": "Charlie", "gender": "Male", "accent": "Australian English", "tone": "Hyped & Conversational", "provider": "ElevenLabs"},
    {"id": "JBFqnCBsd6RMkjVDRZzb", "name": "George", "gender": "Male", "accent": "British English", "tone": "Mature & Storyteller", "provider": "ElevenLabs", "recommended": True},
    {"id": "N2lVS1w4EtoT3dr4eOWO", "name": "Callum", "gender": "Male", "accent": "American English", "tone": "Natural & Character", "provider": "ElevenLabs"},
    {"id": "SAz9YHcvj6GT2YYXdXww", "name": "River", "gender": "Neutral", "accent": "American English", "tone": "Calm & Relaxed", "provider": "ElevenLabs"},
    {"id": "SOYHLrjzK2X1ezoPC6cr", "name": "Harry", "gender": "Male", "accent": "American English", "tone": "Rough & Warrior", "provider": "ElevenLabs"},
    {"id": "TX3LPaxmHKxFdv7VOQHJ", "name": "Liam", "gender": "Male", "accent": "American English", "tone": "Confident & Creator", "provider": "ElevenLabs"},
    {"id": "Xb7hH8MSUJpSbSDYk0k2", "name": "Alice", "gender": "Female", "accent": "British English", "tone": "Professional & Educator", "provider": "ElevenLabs", "recommended": True},
    {"id": "XrExE9yKIg1WjnnlVkGX", "name": "Matilda", "gender": "Female", "accent": "American English", "tone": "Upbeat & Informative", "provider": "ElevenLabs"},
    {"id": "bIHbv24MWmeRgasZH58o", "name": "Will", "gender": "Male", "accent": "American English", "tone": "Chill & Conversational", "provider": "ElevenLabs"},
    {"id": "cgSgspJ2msm6clMCkdW9", "name": "Jessica", "gender": "Female", "accent": "American English", "tone": "Cute & Conversational", "provider": "ElevenLabs"},
    {"id": "cjVigY5qzO86Huf0OWal", "name": "Eric", "gender": "Male", "accent": "American English", "tone": "Classy & Conversational", "provider": "ElevenLabs"},
    {"id": "hpp4J3VqNfWAUOO0d1Us", "name": "Bella", "gender": "Female", "accent": "American English", "tone": "Professional & Engaging", "provider": "ElevenLabs"},
    {"id": "iP95p4xoKVk53GoZ742B", "name": "Chris", "gender": "Male", "accent": "American English", "tone": "Casual & Conversational", "provider": "ElevenLabs"},
    {"id": "nPczCjzI2devNBz1zQrb", "name": "Brian", "gender": "Male", "accent": "American English", "tone": "Deep & Announcer", "provider": "ElevenLabs"},
    {"id": "onwK4e9ZLuTAKqWW03F9", "name": "Daniel", "gender": "Male", "accent": "British English", "tone": "Formal & Authoritative", "provider": "ElevenLabs"},
    {"id": "pFZP5JQG7iQjIQuC4Bku", "name": "Lily", "gender": "Female", "accent": "British English", "tone": "Warm & Melodic", "provider": "ElevenLabs"},
    {"id": "pNInz6obpgDQGcFmaJgB", "name": "Adam", "gender": "Male", "accent": "American English", "tone": "Natural & Dynamic", "provider": "ElevenLabs", "recommended": True},
    {"id": "pqHfZKP75CvOlQylNhV4", "name": "Bill", "gender": "Male", "accent": "American English", "tone": "Crisp & Commercial", "provider": "ElevenLabs"}
]

def pcm_to_wav(pcm_data: bytes, sample_rate: int = 24000, channels: int = 1, bit_depth: int = 16) -> bytes:
    buffer = io.BytesIO()
    with wave.open(buffer, 'wb') as wf:
        wf.setnchannels(channels)
        wf.setsampwidth(bit_depth // 8)
        wf.setframerate(sample_rate)
        wf.writeframes(pcm_data)
    return buffer.getvalue()


# --- Cryptographic API Key Helpers ---
def generate_vox_api_key(name: str = "VoxFlow Agent") -> Dict[str, Any]:
    payload = {
        "n": (name or "VoxFlow Agent").strip()[:60],
        "t": int(time.time() * 1000),
        "r": secrets.token_hex(8)
    }
    compact_json = json.dumps(payload, separators=(',', ':'))
    b64_payload = base64.urlsafe_b64encode(compact_json.encode()).decode().rstrip('=')
    sig = hmac.new(HMAC_SECRET.encode(), b64_payload.encode(), hashlib.sha256).hexdigest()
    api_key = f"vox_live_{b64_payload}.{sig}"
    return {
        "api_key": api_key,
        "name": payload["n"],
        "timestamp": payload["t"]
    }

def verify_vox_api_key(key: str) -> Dict[str, Any]:
    if not key or not isinstance(key, str):
        return {"valid": False, "reason": "Missing API key"}
    
    if key.startswith("sk-or-v1-"):
        return {"valid": True, "name": "OpenRouter Key", "is_provider": True, "provider": "openrouter"}
    if key.startswith("gsk_"):
        return {"valid": True, "name": "Groq Key", "is_provider": True, "provider": "groq"}
    if key.startswith("dg_") or (len(key) == 40 and not key.startswith("vox_")):
        return {"valid": True, "name": "Deepgram Direct Key", "is_provider": True, "provider": "deepgram"}

    if not key.startswith("vox_live_"):
        return {"valid": False, "reason": "Invalid key format"}

    parts = key[9:].split('.')
    if len(parts) != 2:
        return {"valid": False, "reason": "Malformed signature"}

    b64_payload, sig = parts
    expected = hmac.new(HMAC_SECRET.encode(), b64_payload.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(sig, expected):
        return {"valid": False, "reason": "Signature verification failed"}

    try:
        padded = b64_payload + '=' * ((4 - len(b64_payload) % 4) % 4)
        payload = json.loads(base64.urlsafe_b64decode(padded.encode()).decode())
        return {
            "valid": True,
            "name": payload.get("n", "VoxFlow Agent"),
            "timestamp": payload.get("t"),
            "permissions": ["tts:synthesize", "tts:voices", "stt:transcribe", "stt:align"]
        }
    except Exception as e:
        return {"valid": False, "reason": f"Payload decode error: {e}"}

def extract_api_key_from_req(request: Request, body_key: Optional[str] = None) -> Optional[str]:
    auth = request.headers.get("Authorization", "")
    if auth.lower().startswith("bearer "):
        return auth[7:].strip()
    x_key = request.headers.get("X-API-Key")
    if x_key:
        return x_key.strip()
    if body_key:
        return body_key.strip()
    return None

app = FastAPI(title="VoxFlow Studio API", version="2.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class KeyGenRequest(BaseModel):
    name: Optional[str] = "VoxFlow Agent"
    client: Optional[str] = None

class TTSRequest(BaseModel):
    text: str
    model: str = "deepgram/flux-tts"
    voice: Optional[str] = "flux-alexis-en"
    speed: Optional[float] = 1.0
    api_key: Optional[str] = None
    deepgram_key: Optional[str] = None
    mistral_key: Optional[str] = None
    groq_key: Optional[str] = None
    cartesia_key: Optional[str] = None
    gemini_key: Optional[str] = None
    cloudflare_token: Optional[str] = None
    cloudflare_account_id: Optional[str] = None
    elevenlabs_key: Optional[str] = None

@app.get("/api/status")
def get_status():
    return {
        "status": "ready",
        "version": "2.4.0",
        "service": "VoxFlow Studio API",
        "deepgram_ready": bool(DEFAULT_DEEPGRAM_KEY),
        "openrouter_ready": bool(DEFAULT_OPENROUTER_KEY),
        "groq_ready": bool(DEFAULT_GROQ_KEY),
        "mistral_ready": bool(DEFAULT_MISTRAL_KEY),
        "gemini_ready": bool(DEFAULT_GEMINI_KEY),
        "cartesia_ready": bool(DEFAULT_CARTESIA_KEY),
        "cloudflare_ready": bool(DEFAULT_CF_TOKEN and DEFAULT_CF_ACCOUNT_ID),
        "elevenlabs_ready": bool(DEFAULT_ELEVENLABS_KEY),
        "models": [
            {
                "id": "deepgram/flux-tts",
                "name": "Deepgram Flux TTS",
                "provider": "Deepgram",
                "features": ["36 Natural Voices", "Instant Low-Latency", "MP3 Native Output"],
                "badge": "Official Direct",
                "voices": DEEPGRAM_VOICES
            },
            {
                "id": "elevenlabs/multilingual-v2",
                "name": "ElevenLabs Multilingual v2",
                "provider": "ElevenLabs",
                "features": ["World-Leading Realism", "21 Studio Voices", "Multilingual Support"],
                "badge": "Premier Voice",
                "voices": ELEVENLABS_VOICES
            },
            {
                "id": "mistral/voxtral-mini-tts",
                "name": "Mistral Voxtral TTS",
                "provider": "Mistral AI",
                "features": ["30 Emotion Presets", "Tones (Sarcasm, Joy, Anger)", "Voxtral Architecture"],
                "badge": "Emotions & Tones",
                "voices": VOXTRAL_VOICES
            },
            {
                "id": "cartesia/sonic",
                "name": "Cartesia Sonic 3.6",
                "provider": "Cartesia",
                "features": ["Sonic 3.6 Ultra-Fast", "20,000 Free Credits/Mo", "Hyper-Realistic Voice"],
                "badge": "Hyper-Realistic",
                "voices": CARTESIA_VOICES
            },
            {
                "id": "google/gemini-2.5-flash-preview-tts",
                "name": "Google Gemini 2.5 Flash Audio",
                "provider": "Google",
                "features": ["Google AI Studio Free Tier", "Multimodal Audio Engine", "Expressive Natural Prosody"],
                "badge": "Google AI Studio",
                "voices": GEMINI_VOICES
            },
            {
                "id": "groq/orpheus-english",
                "name": "Groq Orpheus (English)",
                "provider": "Groq",
                "features": ["Groq LPU Speed", "200 Chars/Req Free", "6 English Voices"],
                "badge": "Groq LPU",
                "voices": [v for v in GROQ_ORPHEUS_VOICES if "english" in v.get("model", "")]
            },
            {
                "id": "groq/orpheus-arabic",
                "name": "Groq Orpheus (Saudi Arabic)",
                "provider": "Groq",
                "features": ["Groq LPU Speed", "200 Chars/Req Free", "6 Saudi Arabic Voices"],
                "badge": "Saudi Arabic",
                "voices": [v for v in GROQ_ORPHEUS_VOICES if "arabic" in v.get("model", "")]
            },
            {
                "id": "cloudflare/melotts",
                "name": "Cloudflare Workers AI (MeloTTS)",
                "provider": "Cloudflare",
                "features": ["10,000 Free Neurons/Day", "Edge Inference", "Multilingual Support"],
                "badge": "Cloudflare AI",
                "voices": CLOUDFLARE_MELOTTS_VOICES
            },
            {
                "id": "fish-audio/s2.1-pro-free:free",
                "name": "Fish Audio S2.1 Pro (Free)",
                "provider": "Fish Audio",
                "features": ["S2.1 Architecture", "Expressive Multilingual", "High Dynamics"],
                "badge": "Expressive",
                "voices": FISH_VOICES
            }
        ]
    }

@app.get("/api/voices")
def get_voices():
    groq_en = [v for v in GROQ_ORPHEUS_VOICES if "english" in v.get("model", "")]
    groq_ar = [v for v in GROQ_ORPHEUS_VOICES if "arabic" in v.get("model", "")]
    all_voices = [
        {**v, "model": "deepgram/flux-tts", "provider": "Deepgram"} for v in DEEPGRAM_VOICES
    ] + [
        {**v, "model": "elevenlabs/multilingual-v2", "provider": "ElevenLabs"} for v in ELEVENLABS_VOICES
    ] + [
        {**v, "model": "mistral/voxtral-mini-tts", "provider": "Mistral AI"} for v in VOXTRAL_VOICES
    ] + [
        {**v, "model": "cartesia/sonic", "provider": "Cartesia"} for v in CARTESIA_VOICES
    ] + [
        {**v, "model": "google/gemini-2.5-flash-preview-tts", "provider": "Google Gemini"} for v in GEMINI_VOICES
    ] + [
        {**v, "model": "groq/orpheus-english", "provider": "Groq Orpheus"} for v in groq_en
    ] + [
        {**v, "model": "groq/orpheus-arabic", "provider": "Groq Orpheus"} for v in groq_ar
    ] + [
        {**v, "model": "cloudflare/melotts", "provider": "Cloudflare MeloTTS"} for v in CLOUDFLARE_MELOTTS_VOICES
    ] + [
        {**v, "model": "fish-audio/s2.1-pro-free:free", "provider": "Fish Audio"} for v in FISH_VOICES
    ]

    dg_entry = {"provider": "Deepgram", "count": len(DEEPGRAM_VOICES), "voices": DEEPGRAM_VOICES}
    el_entry = {"provider": "ElevenLabs", "count": len(ELEVENLABS_VOICES), "voices": ELEVENLABS_VOICES}
    vox_entry = {"provider": "Mistral AI", "count": len(VOXTRAL_VOICES), "voices": VOXTRAL_VOICES}
    cartesia_entry = {"provider": "Cartesia", "count": len(CARTESIA_VOICES), "voices": CARTESIA_VOICES}
    gemini_entry = {"provider": "Google Gemini", "count": len(GEMINI_VOICES), "voices": GEMINI_VOICES}
    groq_en_entry = {"provider": "Groq Orpheus", "count": len(groq_en), "voices": groq_en}
    groq_ar_entry = {"provider": "Groq Orpheus", "count": len(groq_ar), "voices": groq_ar}
    cf_entry = {"provider": "Cloudflare MeloTTS", "count": len(CLOUDFLARE_MELOTTS_VOICES), "voices": CLOUDFLARE_MELOTTS_VOICES}
    fish_entry = {"provider": "Fish Audio", "count": len(FISH_VOICES), "voices": FISH_VOICES}

    return {
        "success": True,
        "total": len(all_voices),
        "models": {
            "deepgram/flux-tts": dg_entry,
            "deepgram/flux-tts:free": dg_entry,
            "elevenlabs/multilingual-v2": el_entry,
            "elevenlabs/turbo-v2.5": el_entry,
            "mistral/voxtral-mini-tts": vox_entry,
            "voxtral-mini-tts-latest": vox_entry,
            "cartesia/sonic": cartesia_entry,
            "google/gemini-2.5-flash-preview-tts": gemini_entry,
            "gemini/tts": gemini_entry,
            "groq/orpheus-english": groq_en_entry,
            "canopylabs/orpheus-v1-english": groq_en_entry,
            "groq/orpheus-arabic": groq_ar_entry,
            "canopylabs/orpheus-arabic-saudi": groq_ar_entry,
            "cloudflare/melotts": cf_entry,
            "@cf/myshell-ai/melotts": cf_entry,
            "fish-audio/s2.1-pro-free:free": fish_entry
        },
        "voices": all_voices
    }

@app.post("/api/keys/generate", status_code=201)
def generate_api_key(req: Optional[KeyGenRequest] = None):
    name = req.name if req and req.name else "VoxFlow Agent"
    gen = generate_vox_api_key(name)
    return {
        "success": True,
        "api_key": gen["api_key"],
        "name": gen["name"],
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(gen["timestamp"] / 1000)),
        "permissions": ["tts:synthesize", "tts:voices", "stt:transcribe", "stt:align"],
        "rate_limit": "120 requests/minute",
        "usage": "Pass header 'Authorization: Bearer <api_key>' or 'X-API-Key: <api_key>'"
    }

@app.get("/api/keys/verify")
def verify_api_key(request: Request):
    key = extract_api_key_from_req(request)
    if not key:
        raise HTTPException(status_code=401, detail="No API key provided. Use header Authorization: Bearer <key>.")
    
    check = verify_vox_api_key(key)
    if not check["valid"]:
        raise HTTPException(status_code=401, detail=check.get("reason", "Invalid API key."))
    
    return {
        "valid": True,
        "name": check.get("name"),
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(check["timestamp"] / 1000)) if "timestamp" in check else None,
        "permissions": check.get("permissions", ["tts:synthesize", "tts:voices", "stt:transcribe", "stt:align"]),
        "status": "active"
    }

@app.get("/api/docs")
def get_api_docs():
    return {
        "openapi": "3.0.3",
        "info": {
            "title": "VoxFlow Studio API",
            "version": "2.1.0",
            "description": "Neural TTS synthesis, Whisper transcription, and word timestamp alignment."
        },
        "servers": [
            {"url": "https://voxflow-809.pages.dev", "description": "Cloudflare Global Edge"},
            {"url": "http://127.0.0.1:8000", "description": "Local FastApi Server"}
        ],
        "endpoints": ["/api/keys/generate", "/api/keys/verify", "/api/voices", "/api/tts", "/api/align", "/api/stt", "/api/status"]
    }

@app.post("/api/tts")
def generate_tts(req: TTSRequest, request: Request):
    text = (req.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text prompt cannot be empty.")
    
    # Priority: Client Auth Header -> Body Key -> Server Environment Key
    client_key = extract_api_key_from_req(request, req.api_key)
    openrouter_key = DEFAULT_OPENROUTER_KEY
    deepgram_key = request.headers.get("X-Deepgram-Key") or req.deepgram_key or DEFAULT_DEEPGRAM_KEY
    mistral_key = request.headers.get("X-Mistral-Key") or req.mistral_key or DEFAULT_MISTRAL_KEY
    groq_key = request.headers.get("X-Groq-Key") or req.groq_key or DEFAULT_GROQ_KEY
    cartesia_key = request.headers.get("X-Cartesia-Key") or req.cartesia_key or DEFAULT_CARTESIA_KEY
    gemini_key = request.headers.get("X-Gemini-Key") or req.gemini_key or DEFAULT_GEMINI_KEY
    cf_token = request.headers.get("X-Cloudflare-Token") or req.cloudflare_token or DEFAULT_CF_TOKEN
    cf_account_id = request.headers.get("X-Cloudflare-Account") or req.cloudflare_account_id or DEFAULT_CF_ACCOUNT_ID
    elevenlabs_key = request.headers.get("X-ElevenLabs-Key") or req.elevenlabs_key or DEFAULT_ELEVENLABS_KEY

    if client_key:
        if client_key.startswith("sk-or-v1-"):
            openrouter_key = client_key
        elif client_key.startswith("sk_"):
            elevenlabs_key = client_key
        elif client_key.startswith("dg_") or (len(client_key) == 40 and not client_key.startswith("vox_")):
            deepgram_key = client_key
        elif client_key.startswith("mstrl_"):
            mistral_key = client_key
        elif client_key.startswith("gsk_"):
            groq_key = client_key
        elif client_key.startswith("AIzaSy"):
            gemini_key = client_key
        elif client_key.startswith("vox_live_"):
            check = verify_vox_api_key(client_key)
            if not check["valid"]:
                raise HTTPException(status_code=401, detail=f"Authentication failed: {check.get('reason')}")
            openrouter_key = DEFAULT_OPENROUTER_KEY

    model = req.model or "deepgram/flux-tts"
    voice = req.voice or "flux-alexis-en"

    # 1. Cartesia Sonic 3.6 (Hyper-Realistic, 20k free credits/mo)
    is_cartesia = (
        "cartesia" in model.lower()
        or (voice and any(v["id"] == voice for v in CARTESIA_VOICES))
    )
    if is_cartesia:
        if not cartesia_key:
            raise HTTPException(
                status_code=400,
                detail="Cartesia API key is required for Sonic 3.6 TTS. Please configure CARTESIA_API_KEY in Settings/environment."
            )
        if not voice or not any(v["id"] == voice for v in CARTESIA_VOICES):
            voice = "95856005-0332-41b0-935f-352e296aa0df"
        c_url = "https://api.cartesia.ai/tts/bytes"
        c_headers = {
            "X-API-Key": cartesia_key,
            "Cartesia-Version": "2024-06-10",
            "Content-Type": "application/json"
        }
        c_payload = {
            "model_id": "sonic-3.6",
            "transcript": text,
            "voice": {"mode": "id", "id": voice},
            "output_format": {"container": "mp3", "encoding": "mp3", "sample_rate": 44100}
        }
        logger.info(f"Synthesizing via Cartesia Sonic API: voice={voice}, length={len(text)} chars")
        try:
            resp = http_session.post(c_url, headers=c_headers, json=c_payload, timeout=35)
        except requests.exceptions.RequestException as e:
            logger.error(f"Cartesia connection error: {e}")
            raise HTTPException(status_code=502, detail=f"Failed to connect to Cartesia API: {str(e)}")

        if resp.status_code != 200:
            logger.error(f"Cartesia error ({resp.status_code}): {resp.text}")
            raise HTTPException(status_code=resp.status_code, detail=f"Cartesia API error: {resp.text}")

        filename = f"vox_atmr_cartesia_{voice[:8]}.mp3"
        return Response(
            content=resp.content,
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": f'inline; filename="{filename}"',
                "Cache-Control": "public, max-age=3600",
                "X-Voice-Model": "cartesia/sonic",
                "X-Voice-Name": voice,
                "X-Provider": "cartesia-official",
                "X-Watermark": "A.T.M.R",
                "X-Studio-Author": "A.T.M.R"
            }
        )

    # 2. Google Gemini 2.5 Flash Audio Output (Google AI Studio Free Tier)
    is_gemini = (
        "gemini" in model.lower()
        or "google" in model.lower()
        or (voice and any(v["id"] == voice for v in GEMINI_VOICES))
    )
    if is_gemini:
        if not gemini_key:
            raise HTTPException(
                status_code=400,
                detail="Google Gemini API key is required for Gemini Audio. Please configure GEMINI_API_KEY in Settings/environment."
            )
        if not voice or not any(v["id"] == voice for v in GEMINI_VOICES):
            voice = "Puck"
        g_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key={gemini_key}"
        g_headers = {"Content-Type": "application/json"}
        g_payload = {
            "contents": [{"parts": [{"text": f"Read the following text out loud in a natural, expressive voice: {text}"}]}],
            "generationConfig": {
                "responseModalities": ["AUDIO"],
                "speechConfig": {
                    "voiceConfig": {
                        "prebuiltVoiceConfig": {
                            "voiceName": voice
                        }
                    }
                }
            }
        }
        logger.info(f"Synthesizing via Google Gemini Audio API: voice={voice}, length={len(text)} chars")
        try:
            resp = http_session.post(g_url, headers=g_headers, json=g_payload, timeout=35)
        except requests.exceptions.RequestException as e:
            logger.error(f"Gemini connection error: {e}")
            raise HTTPException(status_code=502, detail=f"Failed to connect to Gemini API: {str(e)}")

        if resp.status_code != 200:
            logger.error(f"Gemini error ({resp.status_code}): {resp.text}")
            raise HTTPException(status_code=resp.status_code, detail=f"Gemini API error: {resp.text}")

        res_json = resp.json()
        try:
            cand = res_json.get("candidates", [{}])[0]
            part = cand.get("content", {}).get("parts", [{}])[0]
            inline = part.get("inlineData", {})
            mime_type = inline.get("mimeType", "")
            raw_audio = base64.b64decode(inline.get("data", ""))
        except Exception as e:
            logger.error(f"Failed to parse Gemini audio: {e}, payload: {resp.text[:300]}")
            raise HTTPException(status_code=502, detail="Gemini API did not return valid audio data.")

        # If raw PCM (L16 24kHz), convert to WAV
        if "pcm" in mime_type.lower() or "l16" in mime_type.lower() or not mime_type.startswith("audio/"):
            rate = 24000
            rate_match = re.search(r"rate=(\d+)", mime_type)
            if rate_match:
                rate = int(rate_match.group(1))
            final_audio = pcm_to_wav(raw_audio, sample_rate=rate, channels=1, bit_depth=16)
            out_mime = "audio/wav"
        else:
            final_audio = raw_audio
            out_mime = mime_type

        filename = f"vox_atmr_gemini_{voice}.wav"
        return Response(
            content=final_audio,
            media_type=out_mime,
            headers={
                "Content-Disposition": f'inline; filename="{filename}"',
                "Cache-Control": "public, max-age=3600",
                "X-Voice-Model": "google/gemini-2.5-flash-preview-tts",
                "X-Voice-Name": voice,
                "X-Provider": "google-gemini",
                "X-Watermark": "A.T.M.R",
                "X-Studio-Author": "A.T.M.R"
            }
        )

    # 3. Groq Orpheus LPU Speech API (canopylabs/orpheus-v1-english & canopylabs/orpheus-arabic-saudi)
    is_groq_orpheus = (
        "orpheus" in model.lower()
        or (model.startswith("groq/") and "whisper" not in model.lower())
        or (voice and any(v["id"] == voice for v in GROQ_ORPHEUS_VOICES))
    )
    if is_groq_orpheus:
        if not groq_key:
            raise HTTPException(
                status_code=400,
                detail="Groq API key is required for Groq Orpheus TTS. Please configure GROQ_API_KEY in Settings/environment."
            )
        orpheus_model = "canopylabs/orpheus-v1-english"
        if "arabic" in model.lower() or (voice and any(v["id"] == voice and "arabic" in v.get("model", "") for v in GROQ_ORPHEUS_VOICES)):
            orpheus_model = "canopylabs/orpheus-arabic-saudi"
            if not voice or not any(v["id"] == voice for v in GROQ_ORPHEUS_VOICES if "arabic" in v.get("model", "")):
                voice = "abdullah"
        else:
            if not voice or not any(v["id"] == voice for v in GROQ_ORPHEUS_VOICES if "english" in v.get("model", "")):
                voice = "autumn"

        sub_text = text[:200]
        g_url = "https://api.groq.com/openai/v1/audio/speech"
        g_headers = {
            "Authorization": f"Bearer {groq_key}",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        g_payload = {
            "model": orpheus_model,
            "voice": voice,
            "input": sub_text,
            "response_format": "wav"
        }
        logger.info(f"Synthesizing via Groq Orpheus API: model={orpheus_model}, voice={voice}, length={len(sub_text)} chars")
        try:
            resp = http_session.post(g_url, headers=g_headers, json=g_payload, timeout=35)
        except requests.exceptions.RequestException as e:
            logger.error(f"Groq connection error: {e}")
            raise HTTPException(status_code=502, detail=f"Failed to connect to Groq API: {str(e)}")

        if resp.status_code != 200:
            logger.error(f"Groq error ({resp.status_code}): {resp.text}")
            if "model_terms_required" in resp.text:
                raise HTTPException(
                    status_code=400,
                    detail=f"Groq requires one-time terms acceptance for Orpheus at https://console.groq.com/playground?model={orpheus_model}"
                )
            raise HTTPException(status_code=resp.status_code, detail=f"Groq Orpheus API error: {resp.text}")

        filename = f"vox_atmr_groq_{voice}.wav"
        return Response(
            content=resp.content,
            media_type="audio/wav",
            headers={
                "Content-Disposition": f'inline; filename="{filename}"',
                "Cache-Control": "public, max-age=3600",
                "X-Voice-Model": orpheus_model,
                "X-Voice-Name": voice,
                "X-Provider": "groq-orpheus",
                "X-Watermark": "A.T.M.R",
                "X-Studio-Author": "A.T.M.R"
            }
        )

    # 4. Cloudflare Workers AI MeloTTS (@cf/myshell-ai/melotts)
    is_cloudflare_melo = (
        "cloudflare" in model.lower()
        or "melotts" in model.lower()
        or (voice and any(v["id"] == voice for v in CLOUDFLARE_MELOTTS_VOICES))
    )
    if is_cloudflare_melo:
        if not cf_token or not cf_account_id:
            raise HTTPException(
                status_code=400,
                detail="Cloudflare API Token and Account ID are required for Workers AI MeloTTS. Please configure CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID in Settings/environment."
            )
        if not voice:
            voice = "en-us"
        melo_lang = "en"
        if voice.startswith("en"):
            melo_lang = "en"
        elif voice.startswith("es"):
            melo_lang = "es"
        elif voice.startswith("fr"):
            melo_lang = "fr"
        elif voice.startswith("zh"):
            melo_lang = "zh"
        elif voice.startswith("jp") or voice.startswith("ja"):
            melo_lang = "jp"
        elif voice.startswith("kr") or voice.startswith("ko"):
            melo_lang = "kr"
        else:
            melo_lang = voice

        cf_url = f"https://api.cloudflare.com/client/v4/accounts/{cf_account_id}/ai/run/@cf/myshell-ai/melotts"
        cf_headers = {
            "Authorization": f"Bearer {cf_token}",
            "Content-Type": "application/json"
        }
        cf_payload = {
            "prompt": text,
            "lang": melo_lang
        }
        logger.info(f"Synthesizing via Cloudflare Workers AI MeloTTS: lang={melo_lang} (voice={voice}), length={len(text)} chars")
        try:
            resp = http_session.post(cf_url, headers=cf_headers, json=cf_payload, timeout=35)
        except requests.exceptions.RequestException as e:
            logger.error(f"Cloudflare connection error: {e}")
            raise HTTPException(status_code=502, detail=f"Failed to connect to Cloudflare AI: {str(e)}")

        if resp.status_code != 200:
            logger.error(f"Cloudflare error ({resp.status_code}): {resp.text}")
            raise HTTPException(status_code=resp.status_code, detail=f"Cloudflare Workers AI error: {resp.text}")

        c_type = resp.headers.get("Content-Type", "audio/mpeg")
        filename = f"vox_atmr_cloudflare_{voice}.mp3"
        return Response(
            content=resp.content,
            media_type=c_type,
            headers={
                "Content-Disposition": f'inline; filename="{filename}"',
                "Cache-Control": "public, max-age=3600",
                "X-Voice-Model": "cloudflare/melotts",
                "X-Voice-Name": voice,
                "X-Provider": "cloudflare-ai",
                "X-Watermark": "A.T.M.R",
                "X-Studio-Author": "A.T.M.R"
            }
        )

    # 5. ElevenLabs Premier Multilingual v2 & Turbo v2.5
    is_elevenlabs = (
        "elevenlabs" in model.lower()
        or (voice and any(v["id"] == voice for v in ELEVENLABS_VOICES))
    )
    if is_elevenlabs:
        if not elevenlabs_key:
            raise HTTPException(
                status_code=400,
                detail="ElevenLabs API key is required. Please configure ELEVENLABS_API_KEY in credentials.env or Settings."
            )
        if not voice or not any(v["id"] == voice for v in ELEVENLABS_VOICES):
            voice = "CwhRBWXzGAHq8TQ4Fs17" # Roger default
        el_model_id = "eleven_turbo_v2_5" if "turbo" in model.lower() else "eleven_multilingual_v2"
        el_url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice}"
        el_headers = {
            "xi-api-key": elevenlabs_key,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
            "User-Agent": "Mozilla/5.0"
        }
        el_payload = {
            "text": text,
            "model_id": el_model_id,
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75
            }
        }
        logger.info(f"Synthesizing via ElevenLabs API: voice={voice}, model={el_model_id}, length={len(text)} chars")
        try:
            resp = http_session.post(el_url, headers=el_headers, json=el_payload, timeout=30)
        except requests.exceptions.RequestException as e:
            logger.error(f"ElevenLabs connection error: {e}")
            raise HTTPException(status_code=502, detail=f"Failed to connect to ElevenLabs API: {str(e)}")

        if resp.status_code != 200:
            logger.error(f"ElevenLabs error ({resp.status_code}): {resp.text}")
            raise HTTPException(status_code=resp.status_code, detail=f"ElevenLabs API error: {resp.text}")

        filename = f"vox_atmr_elevenlabs_{voice}.mp3"
        return Response(
            content=resp.content,
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": f'inline; filename="{filename}"',
                "Cache-Control": "public, max-age=3600",
                "X-Voice-Model": el_model_id,
                "X-Voice-Name": voice,
                "X-Provider": "elevenlabs",
                "X-Watermark": "A.T.M.R",
                "X-Studio-Author": "A.T.M.R"
            }
        )

    # 6. Direct Mistral Voxtral Speech API (30 Expressive Emotion Voices, MP3 format)
    is_mistral = (
        "mistral" in model.lower()
        or "voxtral" in model.lower()
        or (voice and any(v["id"] == voice for v in VOXTRAL_VOICES))
    )

    # 1. Direct Mistral Voxtral Speech API (30 Expressive Emotion Voices, MP3 format)
    if is_mistral:
        if not mistral_key:
            raise HTTPException(
                status_code=400,
                detail="Mistral API key is required for Mistral Voxtral TTS. Please configure MISTRAL_API_KEY in Settings/environment."
            )
        if not voice or not any(v["id"] == voice for v in VOXTRAL_VOICES):
            voice = "en_paul_happy"
        
        m_url = "https://api.mistral.ai/v1/audio/speech"
        m_headers = {
            "Authorization": f"Bearer {mistral_key}",
            "Content-Type": "application/json"
        }
        m_payload = {
            "model": "voxtral-mini-tts-latest",
            "voice": voice,
            "input": text
        }
        logger.info(f"Synthesizing via Mistral Voxtral Speech API: voice={voice}, length={len(text)} chars")
        try:
            resp = http_session.post(m_url, headers=m_headers, json=m_payload, timeout=35)
        except requests.exceptions.RequestException as e:
            logger.error(f"Mistral connection error: {e}")
            raise HTTPException(status_code=502, detail=f"Failed to connect to Mistral API: {str(e)}")

        if resp.status_code != 200:
            logger.error(f"Mistral error ({resp.status_code}): {resp.text}")
            raise HTTPException(status_code=resp.status_code, detail=f"Mistral API error: {resp.text}")

        res_json = resp.json()
        audio_b64 = res_json.get("audio_data", "")
        if not audio_b64:
            raise HTTPException(status_code=502, detail="Mistral API did not return audio data.")
        
        audio_bytes = base64.b64decode(audio_b64)
        filename = f"vox_atmr_mistral_{voice}.mp3"
        return Response(
            content=audio_bytes,
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": f'inline; filename="{filename}"',
                "Cache-Control": "public, max-age=3600",
                "X-Voice-Model": "mistral/voxtral-mini-tts",
                "X-Voice-Name": voice,
                "X-Provider": "mistral-official",
                "X-Watermark": "A.T.M.R",
                "X-Studio-Author": "A.T.M.R"
            }
        )

    is_deepgram = (
        model.startswith("deepgram")
        or "flux" in model.lower()
        or (voice and voice.startswith("flux-"))
        or any(v["id"] == voice for v in DEEPGRAM_VOICES)
    )

    # 2. Direct Official Deepgram V2 API (Zero-latency, native MP3 streaming)
    if is_deepgram and deepgram_key:
        if not voice or not voice.startswith("flux-"):
            voice = "flux-alexis-en"
        dg_url = f"https://api.deepgram.com/v2/speak?model={voice}"
        dg_headers = {
            "Authorization": f"Token {deepgram_key}",
            "Content-Type": "application/json"
        }
        logger.info(f"Synthesizing via Direct Deepgram V2 API: voice={voice}, length={len(text)} chars")
        try:
            resp = http_session.post(dg_url, headers=dg_headers, json={"text": text}, timeout=35)
        except requests.exceptions.RequestException as e:
            logger.error(f"Deepgram connection error: {e}")
            raise HTTPException(status_code=502, detail=f"Failed to connect to Deepgram API: {str(e)}")

        if resp.status_code != 200:
            logger.error(f"Deepgram error ({resp.status_code}): {resp.text}")
            raise HTTPException(status_code=resp.status_code, detail=f"Deepgram API error: {resp.text}")

        audio_bytes = resp.content
        content_type = resp.headers.get("Content-Type", "audio/mpeg")
        filename = f"vox_atmr_deepgram_{voice}.mp3"
        return Response(
            content=audio_bytes,
            media_type=content_type,
            headers={
                "Content-Disposition": f'inline; filename="{filename}"',
                "Cache-Control": "public, max-age=3600",
                "X-Voice-Model": "deepgram/flux-tts",
                "X-Voice-Name": voice,
                "X-Provider": "deepgram-official",
                "X-Watermark": "A.T.M.R",
                "X-Studio-Author": "A.T.M.R"
            }
        )

    # 2. If Deepgram requested but no Deepgram key and no OpenRouter key
    if is_deepgram and not deepgram_key and not openrouter_key:
        raise HTTPException(
            status_code=400,
            detail="Deepgram API key is required for Deepgram Flux voices because OpenRouter removed the free community endpoint. Please configure DEEPGRAM_API_KEY in Settings/environment or choose Fish Audio S2.1 Pro (Free)."
        )

    if not openrouter_key:
        raise HTTPException(
            status_code=401, 
            detail="OpenRouter API key is required. Please provide it in Settings, via header, or configure the server environment."
        )

    headers = {
        "Authorization": f"Bearer {openrouter_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://voxflow.local",
        "X-Title": "VoxFlow Studio"
    }

    # Normalize voice according to model
    if "fish" in model.lower():
        voice = "alloy"
        router_model = "fish-audio/s2.1-pro-free:free"
    else:
        router_model = model

    payload = {
        "model": router_model,
        "input": text,
        "voice": voice,
        "response_format": "mp3"
    }

    logger.info(f"Synthesizing speech with OpenRouter: model={router_model}, voice={voice}, length={len(text)} chars")

    try:
        resp = requests.post(
            "https://openrouter.ai/api/v1/audio/speech",
            headers=headers,
            json=payload,
            timeout=40
        )
    except requests.exceptions.RequestException as e:
        logger.error(f"OpenRouter connection error: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to connect to OpenRouter: {str(e)}")

    if resp.status_code != 200:
        logger.error(f"OpenRouter error ({resp.status_code}): {resp.text}")
        if resp.status_code == 404 and "flux-tts:free" in router_model:
            raise HTTPException(
                status_code=404,
                detail="OpenRouter has discontinued 'deepgram/flux-tts:free' (404 No endpoints found). Please configure a DEEPGRAM_API_KEY in Settings/environment for official direct Deepgram synthesis, or switch to Fish Audio S2.1 Pro (Free)."
            )
        try:
            err_json = resp.json()
            err_msg = err_json.get("error", {}).get("message") or resp.text
        except Exception:
            err_msg = resp.text
        raise HTTPException(status_code=resp.status_code, detail=f"OpenRouter TTS error: {err_msg}")

    content_type = resp.headers.get("Content-Type", "audio/mpeg")
    audio_bytes = resp.content

    # Handle raw PCM if returned by Fish Audio or Deepgram Flux
    if "pcm" in content_type.lower() or content_type == "audio/raw":
        rate = 24000
        rate_match = re.search(r"rate=(\d+)", content_type)
        if rate_match:
            rate = int(rate_match.group(1))
        elif "fish" in req.model.lower():
            rate = 44100

        logger.info(f"Converting raw PCM to standard WAV container (rate={rate}Hz, bytes={len(audio_bytes)})...")
        wav_io = io.BytesIO()
        with wave.open(wav_io, "wb") as wav_file:
            wav_file.setnchannels(1)  # Mono
            wav_file.setsampwidth(2)  # 16-bit
            wav_file.setframerate(rate)  # Exact sample rate from model stream
            wav_file.writeframes(audio_bytes)
        audio_bytes = wav_io.getvalue()
        content_type = "audio/wav"

    sanitized_model = req.model.replace("/", "_").replace(":", "_")
    filename = f"vox_atmr_{sanitized_model}_{voice}.mp3" if "mpeg" in content_type else f"vox_atmr_{sanitized_model}_{voice}.wav"

    return Response(
        content=audio_bytes,
        media_type=content_type,
        headers={
            "Content-Disposition": f'inline; filename="{filename}"',
            "Cache-Control": "public, max-age=3600",
            "X-Voice-Model": req.model,
            "X-Voice-Name": voice,
            "X-Watermark": "A.T.M.R",
            "X-Studio-Author": "A.T.M.R"
        }
    )

@app.post("/api/stt")
async def speech_to_text(
    request: Request,
    file: UploadFile = File(...),
    api_key: Optional[str] = Form(None),
    model: Optional[str] = Form("whisper-large-v3-turbo")
):
    client_key = extract_api_key_from_req(request, api_key)
    groq_key = DEFAULT_GROQ_KEY

    if client_key:
        if client_key.startswith("gsk_"):
            groq_key = client_key
        elif client_key.startswith("vox_live_"):
            check = verify_vox_api_key(client_key)
            if not check["valid"]:
                raise HTTPException(status_code=401, detail=f"Authentication failed: {check.get('reason')}")
            groq_key = DEFAULT_GROQ_KEY

    if not groq_key:
        raise HTTPException(
            status_code=401,
            detail="Groq API key is required for transcription. Please provide it in Settings or configure the server environment."
        )

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Empty audio file uploaded.")

    filename = file.filename or "recording.webm"
    content_type = file.content_type or "audio/webm"

    logger.info(f"Transcribing audio file '{filename}' ({len(file_bytes)} bytes) with Groq Whisper...")

    files = {
        "file": (filename, file_bytes, content_type)
    }
    data = {
        "model": model or "whisper-large-v3-turbo",
        "response_format": "verbose_json",
        "timestamp_granularities[]": "word"
    }
    headers = {
        "Authorization": f"Bearer {groq_key}"
    }

    try:
        resp = requests.post(
            "https://api.groq.com/openai/v1/audio/transcriptions",
            headers=headers,
            files=files,
            data=data,
            timeout=30
        )
    except requests.exceptions.RequestException as e:
        logger.error(f"Groq API connection error: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to connect to Groq Whisper: {str(e)}")

    if resp.status_code != 200:
        logger.error(f"Groq error ({resp.status_code}): {resp.text}")
        try:
            err_json = resp.json()
            err_msg = err_json.get("error", {}).get("message") or resp.text
        except Exception:
            err_msg = resp.text
        raise HTTPException(status_code=resp.status_code, detail=f"Groq Whisper error: {err_msg}")

    result = resp.json()
    return {
        "text": result.get("text", "").strip(),
        "duration": result.get("duration", 0),
        "language": result.get("language", "auto"),
        "segments": result.get("segments", []),
        "words": result.get("words", [])
    }

@app.post("/api/align")
async def align_speech_words(
    request: Request,
    file: UploadFile = File(...),
    prompt: Optional[str] = Form(None),
    api_key: Optional[str] = Form(None)
):
    client_key = extract_api_key_from_req(request, api_key)
    groq_key = DEFAULT_GROQ_KEY

    if client_key:
        if client_key.startswith("gsk_"):
            groq_key = client_key
        elif client_key.startswith("vox_live_"):
            check = verify_vox_api_key(client_key)
            if not check["valid"]:
                raise HTTPException(status_code=401, detail=f"Authentication failed: {check.get('reason')}")
            groq_key = DEFAULT_GROQ_KEY

    if not groq_key:
        raise HTTPException(
            status_code=401,
            detail="Groq API key is required for word alignment."
        )

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Empty audio chunk uploaded.")

    # Detect actual audio format from magic bytes or incoming metadata
    is_wav = file_bytes.startswith(b"RIFF") or (file.filename and file.filename.endswith(".wav"))
    filename = file.filename or ("chunk.wav" if is_wav else "chunk.mp3")
    content_type = "audio/wav" if is_wav else (file.content_type or "audio/mpeg")

    files = {
        "file": (filename, file_bytes, content_type)
    }
    data = {
        "model": "whisper-large-v3-turbo",
        "response_format": "verbose_json",
        "timestamp_granularities[]": "word"
    }
    if prompt:
        data["prompt"] = prompt  # Guides Whisper with known ground-truth text

    headers = {
        "Authorization": f"Bearer {groq_key}"
    }

    try:
        resp = requests.post(
            "https://api.groq.com/openai/v1/audio/transcriptions",
            headers=headers,
            files=files,
            data=data,
            timeout=20
        )
    except Exception as e:
        logger.error(f"Groq align error: {e}")
        raise HTTPException(status_code=502, detail=f"Groq alignment connection failed: {e}")

    if resp.status_code != 200:
        logger.error(f"Groq align failed ({resp.status_code}): {resp.text}")
        raise HTTPException(status_code=resp.status_code, detail=f"Groq alignment error: {resp.text}")

    result = resp.json()
    return {
        "text": result.get("text", "").strip(),
        "duration": result.get("duration", 0),
        "words": result.get("words", []),
        "segments": result.get("segments", [])
    }

# Mount static files directory
STATIC_DIR = Path(__file__).parent / "static"
STATIC_DIR.mkdir(parents=True, exist_ok=True)

@app.get("/{filename:path}")
def serve_static(filename: str):
    if filename.startswith("api/"):
        raise HTTPException(status_code=404, detail="API endpoint not found")
    target = STATIC_DIR / filename
    if target.is_file():
        return FileResponse(str(target))
    index_path = STATIC_DIR / "index.html"
    if index_path.exists():
        return FileResponse(str(index_path))
    raise HTTPException(status_code=404, detail="File not found")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=True)
