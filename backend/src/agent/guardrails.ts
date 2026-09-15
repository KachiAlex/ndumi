import type { TenantGuardrails } from "./tenantConfig.js";
import { generateDecision } from "../services/llm.js";

export interface GuardrailResult {
  passed: boolean;
  reason?: string;
}

// ── Fast structural checks (no LLM needed) ──────────────────────────

export function checkStructuralGuardrails(input: {
  turnCount: number;
  toolCallsThisTurn: number;
  guardrails: TenantGuardrails;
}): GuardrailResult {
  if (input.turnCount >= input.guardrails.maxConversationTurns) {
    return {
      passed: false,
      reason: `Max conversation turns (${input.guardrails.maxConversationTurns}) reached. Escalating to human.`,
    };
  }

  if (input.toolCallsThisTurn >= input.guardrails.maxToolCallsPerTurn) {
    return {
      passed: false,
      reason: `Max tool calls per turn (${input.guardrails.maxToolCallsPerTurn}) reached.`,
    };
  }

  return { passed: true };
}

// ── LLM-based intent classification ─────────────────────────────────
// Instead of substring matching (which breaks for banking — "financial
// investment recommendations" is forbidden but banking discusses finance),
// we ask the LLM to classify whether the customer's request is in-scope.

const CLASSIFIER_SYSTEM_PROMPT = `You are a safety classifier for a voice banking assistant. Classify the customer's message into one of these categories:

- "in_scope": The message is a normal banking request or general conversation (balance, transfer, airtime, bills, account info, greetings, small talk).
- "out_of_scope": The message asks for political opinions, religious beliefs, medical diagnosis, or legal advice.
- "escalate": The message indicates frustration, requests a human agent, reports fraud, or contains sensitive security concerns.

Respond with ONLY the category name, nothing else.`;

export async function classifyIntent(
  customerText: string,
  _guardrails: TenantGuardrails,
): Promise<{ category: "in_scope" | "out_of_scope" | "escalate"; reason?: string }> {
  // Fast path: check for explicit escalation keywords first (no LLM call needed)
  const lower = customerText.toLowerCase();
  const escalateKeywords = ["human agent", "speak to a person", "talk to someone", "manager", "supervisor", "fraud", "scam", "hacked", "stolen"];
  if (escalateKeywords.some((k) => lower.includes(k))) {
    return { category: "escalate", reason: "Customer requested escalation or reported a security concern." };
  }

  // For very short messages (greetings, yes/no), skip LLM classification
  if (customerText.trim().length < 10) {
    return { category: "in_scope" };
  }

  // LLM-based classification for longer messages
  try {
    const decision = await generateDecision(
      CLASSIFIER_SYSTEM_PROMPT,
      [],
      customerText,
      undefined, // no tools — just text classification
    );

    if (decision.type === "text") {
      const content = decision.content.toLowerCase().trim();
      if (content.includes("out_of_scope") || content.includes("out of scope")) {
        return { category: "out_of_scope", reason: "Customer's request is outside the banking assistant's scope." };
      }
      if (content.includes("escalate")) {
        return { category: "escalate", reason: "Customer's message indicates frustration or a sensitive concern." };
      }
    }
  } catch (err) {
    console.warn("[Guardrails] Intent classification failed, defaulting to in_scope:", (err as Error).message);
  }

  return { category: "in_scope" };
}

// ── Legacy sync guardrail check (for backward compat) ───────────────

export function checkGuardrails(input: {
  turnCount: number;
  toolCallsThisTurn: number;
  customerText: string;
}): GuardrailResult {
  // This is now a thin wrapper — structural checks only.
  // Intent classification is async and called separately by the orchestrator.
  return checkStructuralGuardrails({
    turnCount: input.turnCount,
    toolCallsThisTurn: input.toolCallsThisTurn,
    guardrails: {
      forbiddenTopics: [],
      escalationTriggers: [],
      maxToolCallsPerTurn: 3,
      maxConversationTurns: 20,
    },
  });
}

export function shouldEscalate(customerText: string): boolean {
  const lower = customerText.toLowerCase();
  const triggers = [
    "human agent",
    "speak to a person",
    "talk to someone",
    "manager",
    "supervisor",
    "i'm frustrated",
    "this is ridiculous",
    "i want to cancel my account",
    "fraud",
    "scam",
    "hacked",
    "stolen",
  ];
  return triggers.some((t) => lower.includes(t));
}

// ── Affirmation / negation detection ────────────────────────────────
// Covers English + Nigerian Pidgin. Used by the confirmation flow.

const AFFIRMATIVE_PATTERNS = [
  "yes", "yeah", "yep", "yup", "confirm", "confirmed",
  "go ahead", "proceed", "do it", "okay", "ok", "sure",
  "correct", "that's right", "exactly",
  "yes o", "yes oo", "na yes", "i agree", "abeg do am",
  "no problem", "go on", "continue", "send it", "send am",
];

const NEGATIVE_PATTERNS = [
  "no", "nope", "nah", "cancel", "don't", "do not", "stop",
  "never mind", "forget it", "decline",
  "abeg no", "no do am", "no send", "no need", "cancel am",
  "i no want", "no o", "nooo",
];

export function isAffirmative(text: string): boolean {
  const lower = text.toLowerCase().trim();
  if (NEGATIVE_PATTERNS.some((p) => lower.startsWith(p) || lower === p)) return false;
  return AFFIRMATIVE_PATTERNS.some((p) => lower === p || lower.startsWith(p) || lower.includes(` ${p} `));
}

export function isNegative(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return NEGATIVE_PATTERNS.some((p) => lower === p || lower.startsWith(p) || lower.includes(` ${p} `));
}
