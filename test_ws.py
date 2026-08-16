import asyncio, json, urllib.request
import websockets

async def test_ws():
    # 1. Create session
    data = json.dumps({"language": "ig"}).encode()
    req = urllib.request.Request("http://localhost:3011/v1/sessions", data=data, headers={"Content-Type": "application/json"})
    resp = urllib.request.urlopen(req)
    session = json.loads(resp.read())
    sid = session["session"]["id"]
    print(f"Session: {sid}")

    # 2. Connect WebSocket
    ws_url = f"ws://localhost:3011/v1/sessions/{sid}/stream"
    async with websockets.connect(ws_url) as ws:
        print("WebSocket connected")

        # 3. Send audio_end with text (simulating ASR result)
        msg = json.dumps({
            "type": "audio_end",
            "data": {"text": "Kedu, m choro igwu order m", "language": "ig"}
        })
        await ws.send(msg)
        print(f"Sent: {msg}")

        # 4. Receive events
        for i in range(10):
            try:
                raw = await asyncio.wait_for(ws.recv(), timeout=20)
                event = json.loads(raw)
                etype = event["type"]
                edata = event.get("data", {})

                if etype == "agent_thinking":
                    print(f"  [{etype}] {edata.get('reasoning', '')}")
                elif etype == "agent_text":
                    print(f"  [{etype}] text={edata.get('text', '')!r} lang={edata.get('language', '')}")
                elif etype == "agent_audio_chunk":
                    chunk_len = len(edata.get("chunk", ""))
                    print(f"  [{etype}] chunk_size={chunk_len} mime={edata.get('mimeType', '')}")
                elif etype == "state_change":
                    print(f"  [{etype}] {edata.get('previousState', '')} -> {edata.get('state', '')}")
                elif etype == "language_detected":
                    print(f"  [{etype}] lang={edata.get('language', '')} confidence={edata.get('confidence', '')}")
                elif etype == "final_transcript":
                    print(f"  [{etype}] text={edata.get('text', '')!r}")
                elif etype == "tool_call":
                    print(f"  [{etype}] {edata.get('name', '')} args={edata.get('args', {})}")
                elif etype == "tool_result":
                    print(f"  [{etype}] {edata.get('name', '')} success={edata.get('success', '')}")
                else:
                    print(f"  [{etype}] {str(edata)[:100]}")

                if etype == "state_change" and edata.get("state") == "idle":
                    print("\n=== Conversation complete! ===")
                    break
            except asyncio.TimeoutError:
                print("  (timeout waiting for event)")
                break

asyncio.run(test_ws())
