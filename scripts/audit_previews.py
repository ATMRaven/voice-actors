import os
import re

previews_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static", "previews")
existing_files = set(os.listdir(previews_dir))

with open(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static", "app.js"), "r", encoding="utf-8") as f:
    content = f.read()

# Extract IDs
deepgram = re.findall(r'id:\s*["\'](flux-[^"\']+)["\']', content)
# Deduplicate while preserving order
deepgram = list(dict.fromkeys(deepgram))

cartesia = [
    "95856005-0332-41b0-935f-352e296aa0df",
    "a0e99841-438c-4a64-b679-ae501e7d6091",
    "694f9389-aac1-45b6-b726-9d9369183238",
    "79a125e8-cd45-4c13-8a67-188112f4dd22",
    "f39d8500-0d9b-4b8b-a080-38f5188f5892",
    "829ccd10-f8b3-43cd-b8a0-4aeaa81f3b30",
    "b7d50908-b17c-442d-ad8d-810c63997ed9",
    "5c42302c-194b-4d0c-ba1a-8cb485c84ab9"
]

gemini = ["Puck", "Charon", "Kore", "Fenrir", "Aoede"]

groq = [
    "autumn", "diana", "hannah", "austin", "daniel", "troy",
    "abdullah", "fahad", "sultan", "lulwa", "noura", "aisha"
]

cloudflare = ["en-us", "en-default", "en-br", "en-au", "es", "fr", "zh", "jp", "kr"]

eleven = [
    "CwhRBWXzGAHq8TQ4Fs17", "EXAVITQu4vr4xnSDxMaL", "FGY2WhTYpPnrIDTdsKH5",
    "IKne3meq5aSn9XLyUdCD", "JBFqnCBsd6RMkjVDRZzb", "N2lVS1w4EtoT3dr4eOWO",
    "SAz9YHcvj6GT2YYXdXww", "SOYHLrjzK2X1ezoPC6cr", "TX3LPaxmHKxFdv7VOQHJ",
    "Xb7hH8MSUJpSbSDYk0k2", "XrExE9yKIg1WjnnlVkGX", "bIHbv24MWmeRgasZH58o",
    "cgSgspJ2msm6clMCkdW9", "cjVigY5qzO86Huf0OWal", "hpp4J3VqNfWAUOO0d1Us",
    "iP95p4xoKVk53GoZ742B", "nPczCjzI2devNBz1zQrb", "onwK4e9ZLuTAKqWW03F9",
    "pFZP5JQG7iQjIQuC4Bku", "pNInz6obpgDQGcFmaJgB", "pqHfZKP75CvOlQylNhV4"
]

mistral = ["en_paul", "gb_jane", "gb_oliver", "fr_marie"]
fish = ["alloy"]

all_expected = [
    ("Deepgram Flux", deepgram),
    ("Cartesia Sonic", cartesia),
    ("Google Gemini", gemini),
    ("Groq Orpheus", groq),
    ("Cloudflare MeloTTS", cloudflare),
    ("ElevenLabs", eleven),
    ("Mistral AI", mistral),
    ("Fish Audio", fish)
]

total = 0
missing = []

for group_name, ids in all_expected:
    print(f"\nChecking {group_name} ({len(ids)} voices):")
    for vid in ids:
        total += 1
        fn = f"{vid}.mp3"
        if fn in existing_files:
            sz = os.path.getsize(os.path.join(previews_dir, fn))
            print(f"  [OK] {vid} ({sz:,} bytes)")
        else:
            print(f"  [MISSING] {vid}")
            missing.append((group_name, vid))

print("\n" + "="*45)
print(f"TOTAL VOICES AUDITED: {total}")
print(f"TOTAL MISSING: {len(missing)}")
if missing:
    print("Missing list:", missing)
else:
    print("PERFECT: 100% OF ALL VOICES HAVE PREVIEW SAMPLES!")
print("="*45)
