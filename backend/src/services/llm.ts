import { SYSTEM_PROMPTS } from "../agent/tools.js";
import type { LanguageCode } from "@ndumi/shared";

const GROQ_MODEL = "llama-3.3-70b-versatile";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const getApiKey = () => process.env.GROQ_API_KEY || "";

interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface GroqResponse {
  choices?: Array<{
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  error?: { message: string };
}

export async function generateResponse(
  systemPrompt: string,
  conversationHistory: { speaker: "customer" | "agent"; text: string }[],
  customerText: string,
  _retrievedContext?: string,
): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn("[LLM] No GROQ_API_KEY set, falling back to rule-based response");
    return "";
  }

  const messages: GroqMessage[] = [
    { role: "system", content: systemPrompt },
    ...conversationHistory.map((h) => ({
      role: (h.speaker === "customer" ? "user" : "assistant") as GroqMessage["role"],
      content: h.text,
    })),
    { role: "user", content: customerText },
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
      console.error("[LLM] Groq error:", data.error.message);
      return "";
    }

    const text = data.choices?.[0]?.message?.content || "";
    return text.trim();
  } catch (err) {
    console.error("[LLM] Groq fetch failed:", err);
    return "";
  }
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
