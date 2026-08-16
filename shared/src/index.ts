export type LanguageCode = "ig" | "yo" | "ha" | "pcm" | "en";

export type AgentState = "idle" | "listening" | "thinking" | "speaking";

export interface Session {
  id: string;
  createdAt: number;
  language: LanguageCode | null;
  state: AgentState;
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
  | "session_end";

export interface WsEvent<T = unknown> {
  type: WsEventType;
  data: T;
  timestamp: number;
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
