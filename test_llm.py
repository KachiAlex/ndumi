import asyncio, json, urllib.request
import websockets

async def test_llm():
    data = json.dumps({"language": "ig"}).encode()
    req = urllib.request.Request("http://localhost:3011/v1/sessions", data=data, headers={"Content-Type": "application/json"})
    resp = urllib.request.urlopen(req)
    session = json.loads(resp.read())
    sid = session["session"]["id"]
    print(f"Session: {sid}")

    ws_url = f"ws://localhost:3011/v1/sessions/{sid}/stream"
    async with websockets.connect(ws_url) as ws:
        msg = json.dumps({
            "type": "audio_end",
            "data": {"text": "Gini bu Ndumi?", "language": "ig"}
        })
        await ws.send(msg)
        print(f"Sent: {msg}")

        for i in range(10):
            try:
                raw = await asyncio.wait_for(ws.recv(), timeout=20)
                event = json.loads(raw)
                etype = event["type"]
                edata = event.get("data", {})
                if etype == "agent_thinking":
                    reasoning = edata.get("reasoning", "")
                    print(f"  [{etype}] {reasoning}")
                elif etype == "agent_text":
                    text = edata.get("text", "")
                    lang = edata.get("language", "")
                    print(f"  [{etype}] text={text!r} lang={lang}")
                elif etype == "agent_audio_chunk":
                    chunk_len = len(edata.get("chunk", ""))
                    print(f"  [{etype}] chunk_size={chunk_len}")
                elif etype == "state_change":
                    prev = edata.get("previousState", "")
                    state = edata.get("state", "")
                    print(f"  [{etype}] {prev} -> {state}")
                elif etype == "language_detected":
                    lang = edata.get("language", "")
                    print(f"  [{etype}] lang={lang}")
                elif etype == "final_transcript":
                    text = edata.get("text", "")
                    print(f"  [{etype}] text={text!r}")
                else:
                    print(f"  [{etype}]")
                if etype == "state_change" and edata.get("state") == "idle":
                    print("\n=== Done! ===")
                    break
            except asyncio.TimeoutError:
                print("  (timeout)")
                break

asyncio.run(test_llm())
