import os
import json
import base64
import urllib.request
import urllib.error
import subprocess

ENV_PATH = r"C:\Users\acer nitro\.gemini\config\credentials.env"
PREVIEWS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static", "previews")
os.makedirs(PREVIEWS_DIR, exist_ok=True)

credentials = {}
if os.path.exists(ENV_PATH):
    with open(ENV_PATH, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                credentials[k.strip()] = v.strip().strip("\"'")

def convert_to_mp3(src_path, dest_path):
    cmd = ["ffmpeg", "-y", "-i", src_path, "-codec:a", "libmp3lame", "-b:a", "128k", dest_path]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if res.returncode != 0:
        raise RuntimeError(f"FFmpeg failed: {res.stderr.decode('utf-8')[:300]}")

def test_cloudflare():
    import requests
    url = "https://voxflow-809.pages.dev/api/tts"
    payload = {
        "text": "Hello, this is Melo TTS on Cloudflare Workers AI edge.",
        "model": "cloudflare/melotts",
        "voice": "en-us"
    }
    try:
        resp = requests.post(url, json=payload, timeout=15)
        print(f"[Cloudflare / en-us] Status {resp.status_code}, Bytes: {len(resp.content)}, Content-Type: {resp.headers.get('Content-Type')}")
    except Exception as e:
        print(f"[Cloudflare] Error: {e}")

test_cloudflare()

