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

  for (const trigger of GUARDRAILS.escalationTriggers) {
    if (lowerText.includes(trigger)) {
      return {
        passed: false,
        reason: `Escalation trigger detected: "${trigger}".`,
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
    "i want to cancel",
  ];
  return triggers.some((t) => lower.includes(t));
}
