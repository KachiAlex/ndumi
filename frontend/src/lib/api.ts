import type {
  Session,
  TranscriptEntry,
  CreateSessionRequest,
  CreateSessionResponse,
  GetTranscriptResponse,
  TtsRequest,
  TtsResponse,
  WsEvent,
  LanguageCode,
} from "@ndumi/shared";

const API_BASE = import.meta.env.VITE_API_BASE || "/v1";
const WS_BASE = import.meta.env.VITE_WS_BASE || "";

function wsUrl(path: string): string {
  if (WS_BASE) {
    if (WS_BASE.endsWith("/v1") && path.startsWith("/v1/")) {
      return `${WS_BASE}${path.slice(3)}`;
    }
    return `${WS_BASE}${path}`;
  }
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}${path}`;
}

export const api = {
  async createSession(req?: CreateSessionRequest): Promise<Session> {
    const res = await fetch(`${API_BASE}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req ?? {}),
    });
    if (!res.ok) throw new Error(`Failed to create session: ${res.status}`);
    const data: CreateSessionResponse = await res.json();
    return data.session;
  },

  async getSession(id: string): Promise<Session> {
    const res = await fetch(`${API_BASE}/sessions/${id}`);
    if (!res.ok) throw new Error(`Failed to get session: ${res.status}`);
    const data = await res.json();
    return data.session;
  },

  async getTranscript(sessionId: string): Promise<TranscriptEntry[]> {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/transcript`);
    if (!res.ok) throw new Error(`Failed to get transcript: ${res.status}`);
    const data: GetTranscriptResponse = await res.json();
    return data.entries;
  },

  async endSession(id: string): Promise<void> {
    await fetch(`${API_BASE}/sessions/${id}`, { method: "DELETE" });
  },

  async tts(req: TtsRequest): Promise<TtsResponse> {
    const res = await fetch(`${API_BASE}/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    if (!res.ok) throw new Error(`TTS failed: ${res.status}`);
    return await res.json();
  },
};

export type WsEventHandler = (event: WsEvent) => void;

export class SessionStream {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, Set<WsEventHandler>>();

  connect(session: Session): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = wsUrl(session.wsUrl);
      this.ws = new WebSocket(url);

      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onclose = (ev) => {
        this.emit("_ws_close", { type: "_ws_close" as any, data: { code: ev.code, reason: ev.reason }, timestamp: Date.now() });
      };
      this.ws.onmessage = (raw) => {
        try {
          const event: WsEvent = JSON.parse(raw.data);
          this.emit(event.type, event);
        } catch {
          console.error("Failed to parse WS message");
        }
      };
    });
  }

  on(type: string, handler: WsEventHandler): () => void {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type)!.add(handler);
    return () => this.handlers.get(type)?.delete(handler);
  }

  private emit(type: string, event: WsEvent): void {
    this.handlers.get(type)?.forEach((h) => h(event));
    this.handlers.get("*")?.forEach((h) => h(event));
  }

  sendAudioChunk(chunk: string): void {
    this.ws?.send(JSON.stringify({ type: "audio_chunk", data: { chunk } }));
  }

  sendAudioEnd(text?: string, language?: LanguageCode): void {
    this.ws?.send(
      JSON.stringify({ type: "audio_end", data: { text, language } })
    );
  }

  endSession(): void {
    this.ws?.send(JSON.stringify({ type: "end_session" }));
  }

  close(): void {
    this.ws?.close();
    this.ws = null;
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export type { Session, TranscriptEntry, WsEvent, LanguageCode };
