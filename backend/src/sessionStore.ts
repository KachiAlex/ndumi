import { randomUUID } from "crypto";
import type { Session, TranscriptEntry, LanguageCode, AgentState, SessionStatus } from "@ndumi/shared";

interface SessionRecord extends Session {
  transcripts: TranscriptEntry[];
  endedAt: number | null;
}

class SessionStore {
  private sessions = new Map<string, SessionRecord>();

  create(opts?: { language?: LanguageCode }): Session {
    const id = randomUUID();
    const now = Date.now();
    const record: SessionRecord = {
      id,
      createdAt: now,
      updatedAt: now,
      language: opts?.language ?? null,
      state: "idle",
      status: "active",
      wsUrl: `/v1/sessions/${id}/stream`,
      transcripts: [],
      endedAt: null,
    };
    this.sessions.set(id, record);
    return this.toSession(record);
  }

  get(id: string): SessionRecord | undefined {
    return this.sessions.get(id);
  }

  updateState(id: string, state: AgentState): void {
    const rec = this.sessions.get(id);
    if (!rec) throw new Error(`Session ${id} not found`);
    rec.state = state;
    rec.updatedAt = Date.now();
  }

  updateStatus(id: string, status: SessionStatus): void {
    const rec = this.sessions.get(id);
    if (!rec) throw new Error(`Session ${id} not found`);
    rec.status = status;
    rec.updatedAt = Date.now();
  }

  setLanguage(id: string, language: LanguageCode): void {
    const rec = this.sessions.get(id);
    if (!rec) throw new Error(`Session ${id} not found`);
    rec.language = language;
    rec.updatedAt = Date.now();
  }

  addTranscript(id: string, entry: Omit<TranscriptEntry, "id" | "sessionId" | "timestamp">): TranscriptEntry {
    const rec = this.sessions.get(id);
    if (!rec) throw new Error(`Session ${id} not found`);
    const full: TranscriptEntry = {
      ...entry,
      id: randomUUID(),
      sessionId: id,
      timestamp: Date.now(),
    };
    rec.transcripts.push(full);
    rec.updatedAt = Date.now();
    return full;
  }

  getTranscripts(id: string): TranscriptEntry[] {
    const rec = this.sessions.get(id);
    return rec?.transcripts ?? [];
  }

  endSession(id: string): void {
    const rec = this.sessions.get(id);
    if (!rec) throw new Error(`Session ${id} not found`);
    rec.status = "ended";
    rec.state = "idle";
    rec.endedAt = Date.now();
    rec.updatedAt = Date.now();
  }

  delete(id: string): void {
    this.sessions.delete(id);
  }

  activeCount(): number {
    let count = 0;
    for (const rec of this.sessions.values()) {
      if (rec.status === "active" || rec.status === "awaiting_tool" || rec.status === "responding") count++;
    }
    return count;
  }

  private toSession(rec: SessionRecord): Session {
    return {
      id: rec.id,
      createdAt: rec.createdAt,
      updatedAt: rec.updatedAt,
      language: rec.language,
      state: rec.state,
      status: rec.status,
      wsUrl: rec.wsUrl,
    };
  }
}

export const sessionStore = new SessionStore();
