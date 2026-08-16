import urllib.request, json, sys

API_BASE = "https://67-211-210-8.sslip.io/v1"
ORIGIN = "https://ndumi.vercel.app"

TESTS = [
    {"text": "Nnoo! Kedu ihe ichoro ka m mee?", "language": "ig", "label": "Igbo"},
    {"text": "E kaabo! Mo ti gbo, e jowo so ohun ti e nilo.", "language": "yo", "label": "Yoruba"},
    {"text": "Barka da zuwa! Na ji ka, don Allah gaya mini abin da kake bukata.", "language": "ha", "label": "Hausa"},
    {"text": "I dey here o. Talk wetin dey worry you make we sort am.", "language": "pcm", "label": "Pidgin"},
    {"text": "Hi there, I heard you. Go ahead and tell me what you need.", "language": "en", "label": "English"},
]

passed = 0
failed = 0

for i, t in enumerate(TESTS):
    data = json.dumps({"text": t["text"], "language": t["language"]}).encode()
    req = urllib.request.Request(
        f"{API_BASE}/tts",
        data=data,
        headers={"Content-Type": "application/json", "Origin": ORIGIN},
    )
    try:
        resp = urllib.request.urlopen(req, timeout=30)
        result = json.loads(resp.read())
        audio_url = result.get("audioUrl", "")
        mime = result.get("mimeType", "")
        duration = result.get("duration", 0)
        fallback = result.get("fallback", "none")

        has_audio = audio_url.startswith("data:audio")
        audio_size = len(audio_url)

        if has_audio:
            status = "AUDIO OK"
            passed += 1
        elif fallback:
            status = f"FALLBACK: {fallback}"
            passed += 1
        else:
            status = "NO AUDIO"
            failed += 1

        print(f"  [{i+1}/5] {t['label']:8s} | {status:20s} | size={audio_size:>6d} | mime={mime} | dur={duration}s")
    except urllib.error.HTTPError as e:
        print(f"  [{i+1}/5] {t['label']:8s} | HTTP {e.code}: {e.read().decode()[:100]}")
        failed += 1
    except Exception as e:
        print(f"  [{i+1}/5] {t['label']:8s} | ERROR: {e}")
        failed += 1

print(f"\n=== Results: {passed}/5 passed, {failed}/5 failed ===")
sys.exit(0 if failed == 0 else 1)
