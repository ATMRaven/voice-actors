# Playback harness

Headless Chromium + a mock `/api/tts` that returns real (synthetic) WAV audio, so
the whole streaming pipeline in `static/app.js` runs without API keys or the
network. These are the regression loops for the long-script playback bugs.

```bash
node tests/harness/run-scenarios.mjs   # 11 invariants across 6 scenarios (~60s)
node tests/harness/run-longfile.mjs    # 9 segments, memory eviction path (~40s)
node tests/harness/run-verylong.mjs    # 41k chars / 42 segments / download packing (~60s)
```

Each script exits non-zero when an invariant fails and prints `PASS`/`FAIL` lines
with the observed numbers, so it can go red on exactly one symptom.

## What the mock controls

| Knob | Meaning |
| --- | --- |
| `stats.rate` | characters per second of synthesized audio (400 = fast mock, 12.5 ≈ real speech) |
| `stats.delay(i, text)` | per-request latency, to force buffering gaps |
| `stats.fail(i, text)` | return HTTP 500 forever for matching text |
| `stats.junk` | add a `JUNK` chunk before `fmt ` (some providers do; the WAV merge must survive it) |

Chunk payloads are canonical 48 kHz stereo WAVs, large enough to cross the app's
512 KB eviction threshold, so `releasePlayedChunks` actually runs.

## Invariants covered

- the merged master always covers every segment, or is explicitly deferred
- merged WAVs stay decodable when the source has extra RIFF chunks
- the player's total duration matches the synthesized timeline
- playback advances through every segment and reports "finished"
- pressing play after the end restarts the script (single segment and long queue)
- clicking a word seeks to that word (during generation, and after completion)
- a user pause is not overridden when a late segment finally arrives
- a permanently failing segment is skipped instead of wedging the queue
- a script keeps finalizing when segments are fetched on demand

Browser: set `CHROME_BIN` if the bundled Playwright download is not on
`A:/Caches/ms-playwright/chromium-1228/chrome-win64/chrome.exe`.