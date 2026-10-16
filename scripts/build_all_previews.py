import os
import sys
import json
import base64
import subprocess
import requests

ENV_PATH = r"C:\Users\acer nitro\.gemini\config\credentials.env"
PREVIEWS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static", "previews")
os.makedirs(PREVIEWS_DIR, exist_ok=True)

# Load credentials
credentials = {}
if os.path.exists(ENV_PATH):
    with open(ENV_PATH, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                credentials[k.strip()] = v.strip().strip("\"'")

def convert_wav_to_mp3(src_path, dest_path):
    cmd = ["ffmpeg", "-y", "-i", src_path, "-codec:a", "libmp3lame", "-b:a", "128k", dest_path]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if res.returncode != 0:
        raise RuntimeError(f"FFmpeg conversion failed: {res.stderr.decode('utf-8')[:200]}")

def convert_pcm_to_mp3(pcm_bytes, sample_rate, dest_path):
    temp_pcm = dest_path + ".tmp.pcm"
    with open(temp_pcm, "wb") as f:
        f.write(pcm_bytes)
    try:
        cmd = [
            "ffmpeg", "-y",
            "-f", "s16le",
            "-ar", str(sample_rate),
            "-ac", "1",
            "-i", temp_pcm,
            "-codec:a", "libmp3lame",
            "-b:a", "128k",
            dest_path
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if res.returncode != 0:
            raise RuntimeError(f"FFmpeg PCM conversion failed: {res.stderr.decode('utf-8')[:200]}")
    finally:
        if os.path.exists(temp_pcm):
            os.remove(temp_pcm)

# =====================================================================
# 1. ELEVENLABS PREVIEWS (Official CDN Previews - Zero Quota Consumed)
# =====================================================================
def generate_elevenlabs_previews():
    print("\n--- 1. Generating ElevenLabs Voice Previews (Zero Quota) ---")
    key = credentials.get("ELEVENLABS_API_KEY_1") or credentials.get("ELEVENLABS_API_KEY_2")
    if not key:
        print("ElevenLabs API key missing!")
        return

    res = requests.get("https://api.elevenlabs.io/v1/voices", headers={"xi-api-key": key}, timeout=15)
    if res.status_code != 200:
        print(f"Failed to fetch ElevenLabs voices: {res.status_code} - {res.text}")
        return

    data = res.json()
    voices = data.get("voices", [])
    voice_map = {v["voice_id"]: v for v in voices}

    target_voices = [
        "CwhRBWXzGAHq8TQ4Fs17", "EXAVITQu4vr4xnSDxMaL", "FGY2WhTYpPnrIDTdsKH5",
        "IKne3meq5aSn9XLyUdCD", "JBFqnCBsd6RMkjVDRZzb", "N2lVS1w4EtoT3dr4eOWO",
        "SAz9YHcvj6GT2YYXdXww", "SOYHLrjzK2X1ezoPC6cr", "TX3LPaxmHKxFdv7VOQHJ",
        "Xb7hH8MSUJpSbSDYk0k2", "XrExE9yKIg1WjnnlVkGX", "bIHbv24MWmeRgasZH58o",
        "cgSgspJ2msm6clMCkdW9", "cjVigY5qzO86Huf0OWal", "hpp4J3VqNfWAUOO0d1Us",
        "iP95p4xoKVk53GoZ742B", "nPczCjzI2devNBz1zQrb", "onwK4e9ZLuTAKqWW03F9",
        "pFZP5JQG7iQjIQuC4Bku", "pNInz6obpgDQGcFmaJgB", "pqHfZKP75CvOlQylNhV4"
    ]

    for vid in target_voices:
        dest_file = os.path.join(PREVIEWS_DIR, f"{vid}.mp3")
        if os.path.exists(dest_file) and os.path.getsize(dest_file) > 1000:
            print(f"[ElevenLabs] {vid} already exists ({os.path.getsize(dest_file)} bytes). Skipping.")
            continue

        v_info = voice_map.get(vid)
        if not v_info:
            print(f"[ElevenLabs] Voice {vid} not found in voice map!")
            continue

        preview_url = v_info.get("preview_url")
        if not preview_url:
            print(f"[ElevenLabs] No preview_url for {vid} ({v_info.get('name')})!")
            continue

        print(f"[ElevenLabs] Downloading preview for {v_info.get('name')} ({vid})...")
        dl_headers = {"User-Agent": "Mozilla/5.0"}
        if "api.us.elevenlabs.io" in preview_url or "api.elevenlabs.io" in preview_url:
            dl_headers["xi-api-key"] = key

        dl_res = requests.get(preview_url, headers=dl_headers, timeout=20)
        if dl_res.status_code == 200:
            with open(dest_file, "wb") as f:
                f.write(dl_res.content)
            print(f" -> Saved {vid}.mp3 ({len(dl_res.content)} bytes)")
        else:
            print(f" -> Download failed for {vid} ({preview_url}): {dl_res.status_code}")

# =====================================================================
# 2. CARTESIA SONIC PREVIEWS
# =====================================================================
def generate_cartesia_previews():
    print("\n--- 2. Generating Cartesia Sonic Voice Previews ---")
    key = credentials.get("CARTESIA_API_KEY")
    if not key:
        print("Cartesia API key missing!")
        return

    voices = [
        {"id": "95856005-0332-41b0-935f-352e296aa0df", "name": "Sophie", "text": "Hello, I am Sophie on Cartesia Sonic."},
        {"id": "a0e99841-438c-4a64-b679-ae501e7d6091", "name": "Barbershop Man", "text": "Hello, this is the Barbershop Man voice on Cartesia."},
        {"id": "694f9389-aac1-45b6-b726-9d9369183238", "name": "Sarah", "text": "Hello, I am Sarah on Cartesia Sonic."},
        {"id": "79a125e8-cd45-4c13-8a67-188112f4dd22", "name": "British Lady", "text": "Hello, this is the British Lady voice on Cartesia."},
        {"id": "c45bc5ec-5968-4405-8946-b684cb3229b4", "name": "Commercial Lady", "text": "Hello, this is the Commercial Lady voice on Cartesia."},
        {"id": "829ccd10-f8b3-43cd-b8a0-4aeaa81f3b30", "name": "Doctor", "text": "Hello, I am the Doctor voice on Cartesia."},
        {"id": "b7d50908-b17c-442d-ad8d-810c63997ed9", "name": "California Girl", "text": "Hello, this is the California Girl voice on Cartesia."},
        {"id": "5c42302c-194b-4d0c-ba1a-8cb485c84ab9", "name": "Storyteller", "text": "Hello, I am the Storyteller voice on Cartesia."}
    ]

    url = "https://api.cartesia.ai/tts/bytes"
    headers = {
        "X-API-Key": key,
        "Cartesia-Version": "2024-06-10",
        "Content-Type": "application/json"
    }

    for v in voices:
        dest_file = os.path.join(PREVIEWS_DIR, f"{v['id']}.mp3")
        if os.path.exists(dest_file) and os.path.getsize(dest_file) > 1000:
            print(f"[Cartesia] {v['name']} ({v['id']}) already exists. Skipping.")
            continue

        print(f"[Cartesia] Synthesizing preview for {v['name']}...")
        payload = {
            "model_id": "sonic-3.6",
            "transcript": v["text"],
            "voice": {"mode": "id", "id": v["id"]},
            "output_format": {"container": "mp3", "encoding": "mp3", "sample_rate": 44100}
        }
        res = requests.post(url, headers=headers, json=payload, timeout=20)
        if res.status_code == 200:
            with open(dest_file, "wb") as f:
                f.write(res.content)
            print(f" -> Saved {v['id']}.mp3 ({len(res.content)} bytes)")
        else:
            print(f" -> Error {res.status_code} for {v['name']}: {res.text[:200]}")

# =====================================================================
# 3. GOOGLE GEMINI PREVIEWS
# =====================================================================
def generate_gemini_previews():
    print("\n--- 3. Generating Google Gemini Voice Previews ---")
    key = credentials.get("GEMINI_API_KEY_1") or credentials.get("GEMINI_API_KEY_2")
    if not key:
        print("Gemini API key missing!")
        return

    voices = [
        {"id": "Puck", "text": "Hello, I am Puck, an expressive voice in VoxFlow."},
        {"id": "Charon", "text": "Hello, I am Charon, a deep informative voice in VoxFlow."},
        {"id": "Kore", "text": "Hello, I am Kore, a warm and empathetic voice in VoxFlow."},
        {"id": "Fenrir", "text": "Hello, I am Fenrir, a strong and clear voice in VoxFlow."},
        {"id": "Aoede", "text": "Hello, I am Aoede, a smooth and melodic voice in VoxFlow."}
    ]

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key={key}"

    for v in voices:
        dest_file = os.path.join(PREVIEWS_DIR, f"{v['id']}.mp3")
        if os.path.exists(dest_file) and os.path.getsize(dest_file) > 1000:
            print(f"[Gemini] {v['id']} already exists. Skipping.")
            continue

        print(f"[Gemini] Synthesizing preview for {v['id']}...")
        payload = {
            "contents": [{"parts": [{"text": v["text"]}]}],
            "generationConfig": {
                "responseModalities": ["AUDIO"],
                "speechConfig": {
                    "voiceConfig": {
                        "prebuiltVoiceConfig": {
                            "voiceName": v["id"]
                        }
                    }
                }
            }
        }
        res = requests.post(url, json=payload, timeout=25)
        if res.status_code == 200:
            data = res.json()
            cand = data.get("candidates", [{}])[0]
            part = cand.get("content", {}).get("parts", [{}])[0]
            inline = part.get("inlineData", {})
            raw_audio = base64.b64decode(inline.get("data", ""))
            convert_pcm_to_mp3(raw_audio, 24000, dest_file)
            print(f" -> Saved {v['id']}.mp3 ({os.path.getsize(dest_file)} bytes)")
        else:
            print(f" -> Error {res.status_code} for {v['id']}: {res.text[:200]}")

# =====================================================================
# 4. GROQ ORPHEUS PREVIEWS (English + Saudi Arabic)
# =====================================================================
def generate_groq_previews():
    print("\n--- 4. Generating Groq Orpheus Voice Previews ---")
    key = credentials.get("GROQ_API_KEY")
    if not key:
        print("Groq API key missing!")
        return

    voices = [
        # English
        {"id": "autumn", "model": "canopylabs/orpheus-v1-english", "text": "Hello, this is Autumn on Groq LPU."},
        {"id": "diana", "model": "canopylabs/orpheus-v1-english", "text": "Hello, this is Diana on Groq LPU."},
        {"id": "hannah", "model": "canopylabs/orpheus-v1-english", "text": "Hello, this is Hannah on Groq LPU."},
        {"id": "austin", "model": "canopylabs/orpheus-v1-english", "text": "Hello, this is Austin on Groq LPU."},
        {"id": "daniel", "model": "canopylabs/orpheus-v1-english", "text": "Hello, this is Daniel on Groq LPU."},
        {"id": "troy", "model": "canopylabs/orpheus-v1-english", "text": "Hello, this is Troy on Groq LPU."},
        # Saudi Arabic
        {"id": "abdullah", "model": "canopylabs/orpheus-arabic-saudi", "text": "مرحبا، أنا عبد الله بصوت سعودي طبيعي."},
        {"id": "fahad", "model": "canopylabs/orpheus-arabic-saudi", "text": "مرحبا، أنا فهد بصوت سعودي طبيعي."},
        {"id": "sultan", "model": "canopylabs/orpheus-arabic-saudi", "text": "مرحبا، أنا سلطان بصوت سعودي فخم."},
        {"id": "lulwa", "model": "canopylabs/orpheus-arabic-saudi", "text": "مرحبا، أنا لولوة بصوت سعودي عذب."},
        {"id": "noura", "model": "canopylabs/orpheus-arabic-saudi", "text": "مرحبا، أنا نورة بصوت سعودي واضح."},
        {"id": "aisha", "model": "canopylabs/orpheus-arabic-saudi", "text": "مرحبا، أنا عائشة بصوت سعودي دافئ."}
    ]

    url = "https://api.groq.com/openai/v1/audio/speech"
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    for v in voices:
        dest_file = os.path.join(PREVIEWS_DIR, f"{v['id']}.mp3")
        if os.path.exists(dest_file) and os.path.getsize(dest_file) > 1000:
            print(f"[Groq] {v['id']} already exists. Skipping.")
            continue

        print(f"[Groq] Synthesizing preview for {v['id']} ({v['model']})...")
        payload = {
            "model": v["model"],
            "voice": v["id"],
            "input": v["text"],
            "response_format": "wav"
        }
        res = requests.post(url, headers=headers, json=payload, timeout=20)
        if res.status_code == 200:
            temp_wav = dest_file + ".tmp.wav"
            with open(temp_wav, "wb") as f:
                f.write(res.content)
            try:
                convert_wav_to_mp3(temp_wav, dest_file)
                print(f" -> Saved {v['id']}.mp3 ({os.path.getsize(dest_file)} bytes)")
            finally:
                if os.path.exists(temp_wav):
                    os.remove(temp_wav)
        else:
            print(f" -> Error {res.status_code} for {v['id']}: {res.text[:200]}")

# =====================================================================
# 5. CLOUDFLARE MELOTTS PREVIEWS
# =====================================================================
def generate_cloudflare_previews():
    print("\n--- 5. Generating Cloudflare MeloTTS Voice Previews ---")
    voices = [
        {"id": "en-us", "text": "Hello, this is Melo US on Cloudflare edge."},
        {"id": "en-default", "text": "Hello, this is Melo Default on Cloudflare edge."},
        {"id": "en-br", "text": "Hello, this is Melo British on Cloudflare edge."},
        {"id": "en-au", "text": "Hello, this is Melo Australian on Cloudflare edge."},
        {"id": "es", "text": "Hola, esta es la voz en español de Melo en Cloudflare."},
        {"id": "fr", "text": "Bonjour, voici la voix française de Melo sur Cloudflare."},
        {"id": "zh", "text": "你好，这是Cloudflare边缘的Melo中文语音。"},
        {"id": "jp", "text": "こんにちは、CloudflareのMelo日本語音声です。"},
        {"id": "kr", "text": "안녕하세요, 클라우드플레어의 멜로 한국어 음성입니다."}
    ]

    url = "https://voxflow-809.pages.dev/api/tts"

    for v in voices:
        dest_file = os.path.join(PREVIEWS_DIR, f"{v['id']}.mp3")
        if os.path.exists(dest_file) and os.path.getsize(dest_file) > 1000:
            print(f"[Cloudflare] {v['id']} already exists. Skipping.")
            continue

        print(f"[Cloudflare] Synthesizing preview for {v['id']}...")
        payload = {
            "text": v["text"],
            "model": "cloudflare/melotts",
            "voice": v["id"]
        }
        res = requests.post(url, json=payload, timeout=25)
        if res.status_code == 200:
            with open(dest_file, "wb") as f:
                f.write(res.content)
            print(f" -> Saved {v['id']}.mp3 ({len(res.content)} bytes)")
        else:
            print(f" -> Error {res.status_code} for {v['id']}: {res.text[:200]}")

if __name__ == "__main__":
    generate_elevenlabs_previews()
    generate_cartesia_previews()
    generate_gemini_previews()
    generate_groq_previews()
    generate_cloudflare_previews()
    print("\nAll preview generation tasks finished!")
