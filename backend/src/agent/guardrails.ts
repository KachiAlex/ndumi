import { GUARDRAILS } from "./tools.js";

export interface GuardrailResult {
  passed: boolean;
  reason?: string;
}

export function checkGuardrails(input: {
  turnCount: number;
  toolCallsThisTurn: number;
  customerText: string;
}): GuardrailResult {
  if (input.turnCount >= GUARDRAILS.maxConversationTurns) {
    return {
      passed: false,
      reason: `Max conversation turns (${GUARDRAILS.maxConversationTurns}) reached. Escalating to human.`,
    };
  }

  if (input.toolCallsThisTurn >= GUARDRAILS.maxToolCallsPerTurn) {
    return {
      passed: false,
      reason: `Max tool calls per turn (${GUARDRAILS.maxToolCallsPerTurn}) reached.`,
    };
  }

  const lowerText = input.customerText.toLowerCase();
  for (const topic of GUARDRAILS.forbiddenTopics) {
    if (lowerText.includes(topic)) {
      return {
        passed: false,
        reason: `Topic "${topic}" is outside Ndumi's scope. Escalating to human.`,
      };
    }
  }

  return { passed: true };
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
  ];
  return triggers.some((t) => lower.includes(t));
}

// ── Affirmation / negation detection ────────────────────────────────
// Covers English + Nigerian Pidgin. Used by the confirmation flow.

const AFFIRMATIVE_PATTERNS = [
  "yes", "yeah", "yep", "yup", "confirm", "confirmed",
  "go ahead", "proceed", "do it", "okay", "ok", "sure",
  "correct", "that's right", "exactly",
  // Nigerian Pidgin
  "yes o", "yes oo", "na yes", "i agree", "abeg do am",
  "no problem", "go on", "continue", "send it", "send am",
];

const NEGATIVE_PATTERNS = [
  "no", "nope", "nah", "cancel", "don't", "do not", "stop",
  "never mind", "forget it", "decline",
  // Nigerian Pidgin
  "abeg no", "no do am", "no send", "no need", "cancel am",
  "i no want", "no o", "nooo",
];

export function isAffirmative(text: string): boolean {
  const lower = text.toLowerCase().trim();
  // Check "no" first to avoid false positives like "no, yes"
  if (NEGATIVE_PATTERNS.some((p) => lower.startsWith(p) || lower === p)) return false;
  return AFFIRMATIVE_PATTERNS.some((p) => lower === p || lower.startsWith(p) || lower.includes(` ${p} `));
}

export function isNegative(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return NEGATIVE_PATTERNS.some((p) => lower === p || lower.startsWith(p) || lower.includes(` ${p} `));
}
