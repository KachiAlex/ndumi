import Redis from "ioredis";
import type { Session, TranscriptEntry, AgentState, SessionStatus, LanguageCode } from "@ndumi/shared";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const KEY_PREFIX = "ndumi";
const SESSION_TTL = 86400;

let redis: Redis | null = null;
let connected = false;

function getClient(): Redis {
  if (!redis) {
    redis = new Redis(REDIS_URL, { maxRetriesPerRequest: 2, lazyConnect: true });
    redis.on("connect", () => {
      connected = true;
      console.log("[Redis] Connected");
    });
    redis.on("error", (err) => {
      console.warn("[Redis] Error:", err.message);
      connected = false;
    });
  }
  return redis;
}

async function ensureConnected(): Promise<boolean> {
  const client = getClient();
  if (connected) return true;
  try {
    await client.connect();
    connected = true;
    return true;
  } catch {
    return false;
  }
}

function sessionKey(id: string): string {
  return `${KEY_PREFIX}:session:${id}`;
}

function transcriptKey(id: string): string {
  return `${KEY_PREFIX}:transcript:${id}`;
}

function historyKey(id: string): string {
  return `${KEY_PREFIX}:history:${id}`;
}

function handoffQueueKey(): string {
  return `${KEY_PREFIX}:handoff:queue`;
}

function handoffKey(sessionId: string): string {
  return `${KEY_PREFIX}:handoff:${sessionId}`;
}

export interface HandoffRecord {
  sessionId: string;
  reason: string;
  urgency: string;
  transcriptSnapshot: TranscriptEntry[];
  createdAt: number;
}

export const redisStore = {
  async isAvailable(): Promise<boolean> {
    return await ensureConnected();
  },

  async saveSession(session: Session): Promise<void> {
    if (!(await ensureConnected())) return;
    const client = getClient();
    await client.setex(sessionKey(session.id), SESSION_TTL, JSON.stringify(session));
  },

  async getSession(id: string): Promise<Session | null> {
    if (!(await ensureConnected())) return null;
    const client = getClient();
    const raw = await client.get(sessionKey(id));
    return raw ? (JSON.parse(raw) as Session) : null;
  },

  async deleteSession(id: string): Promise<void> {
    if (!(await ensureConnected())) return;
    const client = getClient();
    await client.del(sessionKey(id));
    await client.del(transcriptKey(id));
    await client.del(historyKey(id));
  },

  async addTranscript(sessionId: string, entry: TranscriptEntry): Promise<void> {
    if (!(await ensureConnected())) return;
    const client = getClient();
    await client.rpush(transcriptKey(sessionId), JSON.stringify(entry));
    await client.expire(transcriptKey(sessionId), SESSION_TTL);
  },

  async getTranscripts(sessionId: string): Promise<TranscriptEntry[]> {
    if (!(await ensureConnected())) return [];
    const client = getClient();
    const raw = await client.lrange(transcriptKey(sessionId), 0, -1);
    return raw.map((r) => JSON.parse(r) as TranscriptEntry);
  },

  async addToHistory(sessionId: string, speaker: "customer" | "agent", text: string): Promise<void> {
    if (!(await ensureConnected())) return;
    const client = getClient();
    await client.rpush(historyKey(sessionId), JSON.stringify({ speaker, text, timestamp: Date.now() }));
    await client.expire(historyKey(sessionId), SESSION_TTL);
  },

  async getHistory(sessionId: string): Promise<{ speaker: string; text: string; timestamp: number }[]> {
    if (!(await ensureConnected())) return [];
    const client = getClient();
    const raw = await client.lrange(historyKey(sessionId), 0, -1);
    return raw.map((r) => JSON.parse(r));
  },

  async updateSessionState(id: string, state: AgentState): Promise<void> {
    const session = await this.getSession(id);
    if (session) {
      session.state = state;
      session.updatedAt = Date.now();
      await this.saveSession(session);
    }
  },

  async updateSessionStatus(id: string, status: SessionStatus): Promise<void> {
    const session = await this.getSession(id);
    if (session) {
      session.status = status;
      session.updatedAt = Date.now();
      await this.saveSession(session);
    }
  },

  async setSessionLanguage(id: string, language: LanguageCode): Promise<void> {
    const session = await this.getSession(id);
    if (session) {
      session.language = language;
      session.updatedAt = Date.now();
      await this.saveSession(session);
    }
  },

  async createHandoff(
    sessionId: string,
    reason: string,
    urgency: string,
    transcripts: TranscriptEntry[]
  ): Promise<HandoffRecord> {
    const record: HandoffRecord = {
      sessionId,
      reason,
      urgency,
      transcriptSnapshot: transcripts,
      createdAt: Date.now(),
    };
    if (await ensureConnected()) {
      const client = getClient();
      await client.setex(handoffKey(sessionId), SESSION_TTL, JSON.stringify(record));
      await client.rpush(handoffQueueKey(), sessionId);
    }
    return record;
  },

  async getHandoff(sessionId: string): Promise<HandoffRecord | null> {
    if (!(await ensureConnected())) return null;
    const client = getClient();
    const raw = await client.get(handoffKey(sessionId));
    return raw ? (JSON.parse(raw) as HandoffRecord) : null;
  },

  async getHandoffQueue(): Promise<string[]> {
    if (!(await ensureConnected())) return [];
    const client = getClient();
    return await client.lrange(handoffQueueKey(), 0, -1);
  },

  async resolveHandoff(sessionId: string): Promise<void> {
    if (!(await ensureConnected())) return;
    const client = getClient();
    await client.del(handoffKey(sessionId));
    await client.lrem(handoffQueueKey(), 0, sessionId);
  },
};
