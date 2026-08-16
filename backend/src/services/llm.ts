import { SYSTEM_PROMPTS } from "../agent/tools.js";
import type { LanguageCode } from "@ndumi/shared";

const GEMINI_MODEL = "gemini-flash-latest";
const getApiKey = () => process.env.GEMINI_API_KEY || "";
const BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

interface GeminiPart {
  text: string;
}

interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

interface GeminiResponse {
  candidates?: Array<{
    content: { parts: GeminiPart[]; role: string };
    finishReason: string;
  }>;
  error?: { message: string };
}

export interface LlmResult {
  text: string;
  toolCalls: { name: string; args: Record<string, unknown> }[];
  finishReason: string;
}

export async function generateResponse(
  systemPrompt: string,
  conversationHistory: { speaker: "customer" | "agent"; text: string }[],
  customerText: string,
  retrievedContext?: string,
): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn("[LLM] No GEMINI_API_KEY set, falling back to rule-based response");
    return "";
  }

  const contents: GeminiContent[] = conversationHistory.map((h) => ({
    role: h.speaker === "customer" ? "user" : "model",
    parts: [{ text: h.text }],
  }));

  contents.push({ role: "user", parts: [{ text: customerText }] });

  const fullSystemPrompt = retrievedContext
    ? `${systemPrompt}\n\nRelevant knowledge context:\n${retrievedContext}`
    : systemPrompt;

  const body = {
    contents,
    systemInstruction: { parts: [{ text: fullSystemPrompt }] },
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 256,
      topP: 0.95,
    },
  };

  try {
    const res = await fetch(`${BASE_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = (await res.json()) as GeminiResponse;

    if (data.error) {
      console.error("[LLM] Gemini error:", data.error.message);
      return "";
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return text.trim();
  } catch (err) {
    console.error("[LLM] Gemini fetch failed:", err);
    return "";
  }
}

export function buildContextString(
  _language: LanguageCode,
  retrievedContext?: { results: Array<{ document: { title: string; content: string }; score: number }> },
): string {
  if (!retrievedContext || retrievedContext.results.length === 0) return "";
  const topDocs = retrievedContext.results
    .filter((r) => r.score > 0.1)
    .slice(0, 3)
    .map((r) => `${r.document.title}: ${r.document.content}`)
    .join("\n\n");
  return topDocs || "";
}

export function getSystemPrompt(lang: LanguageCode): string {
  return SYSTEM_PROMPTS[lang] || SYSTEM_PROMPTS.en;
}
