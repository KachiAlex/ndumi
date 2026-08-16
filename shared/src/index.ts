export type LanguageCode = "ig" | "yo" | "ha" | "pcm" | "en";

export type AgentState = "idle" | "listening" | "thinking" | "speaking";

export type SessionStatus = "active" | "awaiting_tool" | "responding" | "escalated" | "resolved" | "ended";

export interface Session {
  id: string;
  createdAt: number;
  updatedAt: number;
  language: LanguageCode | null;
  state: AgentState;
  status: SessionStatus;
  wsUrl: string;
}

export interface TranscriptEntry {
  id: string;
  sessionId: string;
  timestamp: number;
  speaker: "customer" | "agent";
  language: LanguageCode;
  text: string;
  isFinal: boolean;
}

export type WsEventType =
  | "partial_transcript"
  | "final_transcript"
  | "agent_thinking"
  | "agent_audio_chunk"
  | "agent_text"
  | "tool_call"
  | "tool_result"
  | "language_detected"
  | "state_change"
  | "error"
  | "session_end";

export interface WsEvent<T = unknown> {
  type: WsEventType;
  data: T;
  timestamp: number;
}

export interface PartialTranscriptData {
  text: string;
  language: LanguageCode;
  isFinal: false;
}

export interface FinalTranscriptData {
  text: string;
  language: LanguageCode;
  speaker: "customer" | "agent";
  transcriptId: string;
}

export interface AgentThinkingData {
  reasoning: string;
  toolsConsidered: string[];
}

export interface AgentAudioChunkData {
  chunk: string;
  sequence: number;
  mimeType: string;
}

export interface AgentTextData {
  text: string;
  language: LanguageCode;
}

export interface LanguageDetectedData {
  language: LanguageCode;
  confidence: number;
}

export interface StateChangeData {
  state: AgentState;
  previousState: AgentState;
}

export interface ErrorData {
  code: string;
  message: string;
}

export interface SessionEndData {
  sessionId: string;
  duration: number;
  transcriptCount: number;
}

export type ToolName =
  | "check_order"
  | "create_ticket"
  | "get_account"
  | "escalate_to_human";

export interface ToolCall {
  name: ToolName;
  args: Record<string, unknown>;
}

export interface ToolResult {
  name: ToolName;
  success: boolean;
  data: Record<string, unknown>;
}

export interface ToolCallData {
  name: ToolName;
  args: Record<string, unknown>;
}

export interface ToolResultData {
  name: ToolName;
  success: boolean;
  data: Record<string, unknown>;
  durationMs: number;
}

export interface CreateSessionRequest {
  language?: LanguageCode;
  metadata?: Record<string, unknown>;
}

export interface CreateSessionResponse {
  session: Session;
}

export interface GetTranscriptResponse {
  sessionId: string;
  entries: TranscriptEntry[];
}

export interface TtsRequest {
  text: string;
  language: LanguageCode;
  voice?: string;
}

export interface TtsResponse {
  audioUrl: string;
  duration: number;
  mimeType: string;
}
