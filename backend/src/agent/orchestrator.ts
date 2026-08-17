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
import { retrieveContext, type RetrievedContext } from "../knowledge/index.js";
import { generateResponse, buildContextString, getSystemPrompt } from "../services/llm.js";

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
  retrievedContext?: RetrievedContext;
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

  // Retrieve relevant knowledge for this query
  const retrieved = retrieveContext(customerText, 3);
  const lowerText = customerText.toLowerCase();

  // Check if any tool-related keywords match with strong intent
  const orderIdMatch = customerText.match(/ORD-\d+/i);
  if (orderIdMatch && (lowerText.includes("order") || lowerText.includes("delivery") || lowerText.includes("tracking"))) {
    const orderId = orderIdMatch[0];
    return {
      thinking: {
        reasoning: "Customer is asking about a specific order. Will check order status.",
        toolsConsidered: ["check_order"],
      },
      toolCalls: [{ name: "check_order", args: { orderId } }],
      responseText: `Let me check on order ${orderId} for you.`,
      responseLanguage: ctx.language,
      newStatus: "awaiting_tool",
      escalate: false,
      retrievedContext: retrieved,
    };
  }

  if (lowerText.includes("create") && (lowerText.includes("ticket") || lowerText.includes("complaint"))) {
    return {
      thinking: {
        reasoning: "Customer wants to create a support ticket.",
        toolsConsidered: ["create_ticket"],
      },
      toolCalls: [{ name: "create_ticket", args: { subject: customerText.slice(0, 80), priority: "medium" } }],
      responseText: "I'll create a support ticket for this issue.",
      responseLanguage: ctx.language,
      newStatus: "awaiting_tool",
      escalate: false,
      retrievedContext: retrieved,
    };
  }

  if ((lowerText.includes("my account") || lowerText.includes("my balance") || lowerText.includes("my plan")) && lowerText.length < 100) {
    const identifier = ctx.conversationHistory.find((h) => h.speaker === "customer")?.text || "";
    return {
      thinking: {
        reasoning: "Customer is asking about their account. Will look up account details.",
        toolsConsidered: ["get_account"],
      },
      toolCalls: [{ name: "get_account", args: { identifier } }],
      responseText: "Let me pull up your account details.",
      responseLanguage: ctx.language,
      newStatus: "awaiting_tool",
      escalate: false,
      retrievedContext: retrieved,
    };
  }

  // No tool needed — use Gemini LLM with RAG context for response
  const contextString = buildContextString(ctx.language, retrieved);
  const systemPrompt = getSystemPrompt(ctx.language);
  const llmResponse = await generateResponse(
    systemPrompt,
    ctx.conversationHistory,
    customerText,
    contextString,
  );

  if (llmResponse) {
    return {
      thinking: {
        reasoning: contextString
          ? `Used Gemini with RAG context (${retrieved.results.length} docs retrieved).`
          : "Used Gemini to generate a conversational response.",
        toolsConsidered: [],
      },
      toolCalls: [],
      responseText: llmResponse,
      responseLanguage: ctx.language,
      newStatus: "responding",
      escalate: false,
      retrievedContext: retrieved,
    };
  }

  // Fallback: use retrieved knowledge directly if LLM is unavailable
  if (retrieved.results.length > 0 && retrieved.results[0].score > 0.1) {
    const topDoc = retrieved.results[0].document;
    return {
      thinking: {
        reasoning: `LLM unavailable. Retrieved relevant knowledge: "${topDoc.title}" (score: ${retrieved.results[0].score.toFixed(3)}). Using it to answer.`,
        toolsConsidered: [],
      },
      toolCalls: [],
      responseText: topDoc.content,
      responseLanguage: ctx.language,
      newStatus: "responding",
      escalate: false,
      retrievedContext: retrieved,
    };
  }

  return {
    thinking: {
      reasoning: "LLM and RAG unavailable — responding with greeting.",
      toolsConsidered: [],
    },
    toolCalls: [],
    responseText: generateGreeting(ctx.language),
    responseLanguage: ctx.language,
    newStatus: "responding",
    escalate: false,
    retrievedContext: retrieved,
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
