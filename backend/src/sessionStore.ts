import { randomUUID } from "crypto";
import type { Session, TranscriptEntry, LanguageCode, AgentState, SessionStatus, ToolCall, AuthState } from "@ndumi/shared";

interface SessionRecord extends Session {
  transcripts: TranscriptEntry[];
  endedAt: number | null;
  pendingAction: { toolCall: ToolCall; confirmationPrompt: string; createdAt: number } | null;
}

class SessionStore {
  private sessions = new Map<string, SessionRecord>();

  create(opts?: { language?: LanguageCode; tenantId?: string }): Session {
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
      authState: "unauthenticated",
      customerId: null,
      lastActivityAt: now,
      tenantId: opts?.tenantId ?? "banking",
      transcripts: [],
      endedAt: null,
      pendingAction: null,
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

  setPendingAction(id: string, toolCall: ToolCall, confirmationPrompt: string): void {
    const rec = this.sessions.get(id);
    if (!rec) throw new Error(`Session ${id} not found`);
    rec.pendingAction = { toolCall, confirmationPrompt, createdAt: Date.now() };
    rec.updatedAt = Date.now();
  }

  getPendingAction(id: string): SessionRecord["pendingAction"] {
    const rec = this.sessions.get(id);
    return rec?.pendingAction ?? null;
  }

  clearPendingAction(id: string): void {
    const rec = this.sessions.get(id);
    if (!rec) return;
    rec.pendingAction = null;
    rec.updatedAt = Date.now();
  }

  setAuthState(id: string, authState: AuthState): void {
    const rec = this.sessions.get(id);
    if (!rec) throw new Error(`Session ${id} not found`);
    rec.authState = authState;
    rec.updatedAt = Date.now();
  }

  setCustomerId(id: string, customerId: string | null): void {
    const rec = this.sessions.get(id);
    if (!rec) throw new Error(`Session ${id} not found`);
    rec.customerId = customerId;
    rec.updatedAt = Date.now();
  }

  touchActivity(id: string): void {
    const rec = this.sessions.get(id);
    if (!rec) return;
    rec.lastActivityAt = Date.now();
    rec.updatedAt = Date.now();
  }

  /** Check if session has been inactive longer than the timeout (ms). */
  isSessionExpired(id: string, timeoutMs: number): boolean {
    const rec = this.sessions.get(id);
    if (!rec) return true;
    return Date.now() - rec.lastActivityAt > timeoutMs;
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
      authState: rec.authState,
      customerId: rec.customerId,
      lastActivityAt: rec.lastActivityAt,
      tenantId: rec.tenantId,
    };
  }
}

export const sessionStore = new SessionStore();
