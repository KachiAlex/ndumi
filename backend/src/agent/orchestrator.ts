import type {
  LanguageCode,
  ToolCall,
  ToolResult,
  AgentThinkingData,
} from "@ndumi/shared";
import { executeToolWithRetry } from "./executor.js";
import { checkGuardrails, shouldEscalate } from "./guardrails.js";
import { GUARDRAILS } from "./tools.js";
import { canTransition } from "./stateMachine.js";
import type { SessionStatus } from "@ndumi/shared";
import { generateResponse, getSystemPrompt } from "../services/llm.js";

export interface AgentContext {
  sessionId: string;
  language: LanguageCode;
  turnCount: number;
  toolCallsThisTurn: number;
  conversationHistory: { speaker: "customer" | "agent"; text: string }[];
}

export interface AgentDecision {
  thinking: AgentThinkingData;
  toolCalls: ToolCall[];
  responseText: string;
  responseLanguage: LanguageCode;
  newStatus: SessionStatus;
  escalate: boolean;
}

export async function reason(ctx: AgentContext, customerText: string): Promise<AgentDecision> {
  const guardrail = checkGuardrails({
    turnCount: ctx.turnCount,
    toolCallsThisTurn: ctx.toolCallsThisTurn,
    customerText,
  });

  if (!guardrail.passed) {
    return {
      thinking: {
        reasoning: guardrail.reason || "Guardrail triggered",
        toolsConsidered: ["escalate_to_human"],
      },
      toolCalls: [{ name: "escalate_to_human", args: { reason: guardrail.reason } }],
      responseText: "I'll connect you with a human agent who can help further.",
      responseLanguage: ctx.language,
      newStatus: "escalated",
      escalate: true,
    };
  }

  if (shouldEscalate(customerText)) {
    return {
      thinking: {
        reasoning: "Customer requested human agent. Escalating.",
        toolsConsidered: ["escalate_to_human"],
      },
      toolCalls: [{ name: "escalate_to_human", args: { reason: "Customer requested human agent" } }],
      responseText: "I understand. Let me connect you with a human agent right away.",
      responseLanguage: ctx.language,
      newStatus: "escalated",
      escalate: true,
    };
  }

  // No specific context — use Gemini for natural conversation
  const systemPrompt = getSystemPrompt(ctx.language);
  const llmResponse = await generateResponse(
    systemPrompt,
    ctx.conversationHistory,
    customerText,
  );

  if (llmResponse) {
    return {
      thinking: {
        reasoning: "Used Gemini to generate a conversational response.",
        toolsConsidered: [],
      },
      toolCalls: [],
      responseText: llmResponse,
      responseLanguage: ctx.language,
      newStatus: "responding",
      escalate: false,
    };
  }

  return {
    thinking: {
      reasoning: "LLM unavailable — responding with greeting.",
      toolsConsidered: [],
    },
    toolCalls: [],
    responseText: generateGreeting(ctx.language),
    responseLanguage: ctx.language,
    newStatus: "responding",
    escalate: false,
  };
}

export async function act(
  decision: AgentDecision,
  ctx: AgentContext
): Promise<{ results: ToolResult[]; finalResponseText: string; finalStatus: SessionStatus }> {
  const results: ToolResult[] = [];

  for (const call of decision.toolCalls) {
    if (ctx.toolCallsThisTurn + results.length >= GUARDRAILS.maxToolCallsPerTurn) {
      break;
    }
    const result = await executeToolWithRetry(call.name, call.args);
    results.push(result);
  }

  let finalResponseText = decision.responseText;
  let finalStatus: SessionStatus = decision.newStatus;

  if (results.length > 0) {
    const firstResult = results[0];
    if (firstResult.success) {
      finalResponseText = formatToolResponse(firstResult, decision.responseLanguage);
      finalStatus = canTransition(decision.newStatus, "responding") ? "responding" : decision.newStatus;
    } else {
      finalResponseText = `I wasn't able to complete that. ${firstResult.data.error || "Please try again."}`;
      finalStatus = "active";
    }
  }

  if (decision.escalate) {
    finalStatus = "escalated";
  }

  return { results, finalResponseText, finalStatus };
}

function generateGreeting(lang: LanguageCode): string {
  const greetings: Record<LanguageCode, string> = {
    ig: "Nnọọ! Kedu ihe ị chọrọ ka m mee?",
    yo: "Ẹ káàbọ̀! Mo ti gbọ́, ẹ jọ̀wọ́ ẹ sọ ohun tí ẹ nílò.",
    ha: "Barka da zuwa! Na ji ka, don Allah gaya mini abin da kake bukata.",
    pcm: "I dey here o. Talk wetin dey worry you make we sort am.",
    en: "Hi there, I heard you — go ahead and tell me what you need.",
  };
  return greetings[lang];
}

function formatToolResponse(result: ToolResult, _lang: LanguageCode): string {
  const d = result.data;
  switch (result.name) {
    case "check_order":
      return `Your order ${d.orderId} is ${d.status}. Estimated delivery: ${d.estimatedDelivery}. Tracking: ${d.trackingNumber}.`;
    case "create_ticket":
      return `I've created ticket ${d.ticketId} for "${d.subject}" with ${d.priority} priority. A team member will follow up.`;
    case "get_account":
      return `Found your account ${d.accountId}. Plan: ${d.plan}.`;
    case "escalate_to_human":
      return `I've escalated this to a human agent. You're in the queue at position ${d.queuePosition}.`;
    default:
      return "Done. Is there anything else I can help with?";
  }
}
