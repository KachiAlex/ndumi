import { SYSTEM_PROMPTS, ALL_TOOL_SCHEMAS } from "../agent/tools.js";
import type { OpenAIToolSchema } from "../agent/tools.js";
import type { LanguageCode, ToolCall, ToolName } from "@ndumi/shared";

const GROQ_MODEL = "openai/gpt-oss-20b";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const getApiKey = () => process.env.GROQ_API_KEY || "";

interface GroqMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
}

interface GroqResponse {
  choices?: Array<{
    message: {
      role: string;
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: "function";
        function: { name: string; arguments: string };
      }>;
    };
    finish_reason: string;
  }>;
  error?: { message: string };
}

/** Discriminated union: either the LLM wants to call tools, or respond with text. */
export type LlmDecision =
  | { type: "text"; content: string }
  | { type: "tool_calls"; calls: ToolCall[]; toolCallIds: string[] };

/**
 * Call the LLM with optional tool schemas. The LLM may decide to call
 * one or more tools, or respond directly with text.
 */
export async function generateDecision(
  systemPrompt: string,
  conversationHistory: { speaker: "customer" | "agent"; text: string }[],
  customerText: string,
  tools?: OpenAIToolSchema[],
): Promise<LlmDecision> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn("[LLM] No GROQ_API_KEY set");
    return { type: "text", content: "" };
  }

  const messages: GroqMessage[] = [
    { role: "system", content: systemPrompt },
    ...conversationHistory.map((h) => ({
      role: (h.speaker === "customer" ? "user" : "assistant") as GroqMessage["role"],
      content: h.text,
    })),
    { role: "user", content: customerText },
  ];

  const body: Record<string, unknown> = {
    model: GROQ_MODEL,
    messages,
    temperature: 0.7,
    max_tokens: 512,
    top_p: 0.95,
  };

  if (tools && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = "auto";
  }

  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const data = (await res.json()) as GroqResponse;

    if (data.error) {
      console.error("[LLM] Groq error:", data.error.message);
      return { type: "text", content: "" };
    }

    const message = data.choices?.[0]?.message;
    if (!message) return { type: "text", content: "" };

    // LLM wants to call tools
    if (message.tool_calls && message.tool_calls.length > 0) {
      const calls: ToolCall[] = [];
      const toolCallIds: string[] = [];
      for (const tc of message.tool_calls) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(tc.function.arguments || "{}");
        } catch {
          console.warn("[LLM] Failed to parse tool args:", tc.function.arguments);
        }
        calls.push({ name: tc.function.name as ToolName, args });
        toolCallIds.push(tc.id);
      }
      return { type: "tool_calls", calls, toolCallIds };
    }

    // LLM responds with text
    const text = stripMarkdown((message.content || "").trim());
    return { type: "text", content: text };
  } catch (err) {
    console.error("[LLM] Groq fetch failed:", err);
    return { type: "text", content: "" };
  }
}

/**
 * Follow-up call after tool execution: feed tool results back to the LLM
 * so it can generate a natural-language response for the customer.
 */
export async function generateResponseFromToolResults(
  systemPrompt: string,
  conversationHistory: { speaker: "customer" | "agent"; text: string }[],
  customerText: string,
  toolResults: Array<{ toolCallId: string; toolName: ToolName; result: Record<string, unknown> }>,
): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn("[LLM] No GROQ_API_KEY set");
    return "";
  }

  const messages: GroqMessage[] = [
    { role: "system", content: systemPrompt },
    ...conversationHistory.map((h) => ({
      role: (h.speaker === "customer" ? "user" : "assistant") as GroqMessage["role"],
      content: h.text,
    })),
    { role: "user", content: customerText },
    // Assistant message with the tool calls that were executed
    {
      role: "assistant",
      content: null,
      tool_calls: toolResults.map((tr, i) => ({
        id: tr.toolCallId || `call_${i}`,
        type: "function" as const,
        function: { name: tr.toolName, arguments: JSON.stringify({}) },
      })),
    },
    // Tool result messages
    ...toolResults.map((tr) => ({
      role: "tool" as const,
      content: JSON.stringify(tr.result),
      tool_call_id: tr.toolCallId || `call_0`,
    })),
  ];

  const body = {
    model: GROQ_MODEL,
    messages,
    temperature: 0.7,
    max_tokens: 512,
    top_p: 0.95,
  };

  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const data = (await res.json()) as GroqResponse;
    if (data.error) {
      console.error("[LLM] Groq error in follow-up:", data.error.message);
      return "";
    }
    return stripMarkdown((data.choices?.[0]?.message?.content || "").trim());
  } catch (err) {
    console.error("[LLM] Groq follow-up failed:", err);
    return "";
  }
}

/**
 * Legacy plain-text response (used by guardrails/escalation paths
 * that don't need tool-calling).
 */
export async function generateResponse(
  systemPrompt: string,
  conversationHistory: { speaker: "customer" | "agent"; text: string }[],
  customerText: string,
): Promise<string> {
  const decision = await generateDecision(systemPrompt, conversationHistory, customerText);
  return decision.type === "text" ? decision.content : "";
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .trim();
}

export function buildContextString(
  _language: LanguageCode,
  _retrievedContext?: { results: Array<{ document: { title: string; content: string }; score: number }> },
): string {
  return "";
}

export function getSystemPrompt(lang: LanguageCode): string {
  return SYSTEM_PROMPTS[lang] || SYSTEM_PROMPTS.en;
}

export { ALL_TOOL_SCHEMAS };
