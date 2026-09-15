import type {
  LanguageCode,
  ToolCall,
  ToolResult,
  AgentThinkingData,
  SessionStatus,
} from "@ndumi/shared";
import { DESTRUCTIVE_TOOLS } from "@ndumi/shared";
import { executeToolWithRetry } from "./executor.js";
import { checkGuardrails, shouldEscalate, isAffirmative, isNegative } from "./guardrails.js";
import { GUARDRAILS, TOOL_SCHEMAS } from "./tools.js";
import { generateDecision, generateResponseFromToolResults, getSystemPrompt } from "../services/llm.js";
import { nairaToWords } from "./n2w.js";

export interface AgentContext {
  sessionId: string;
  language: LanguageCode;
  turnCount: number;
  toolCallsThisTurn: number;
  conversationHistory: { speaker: "customer" | "agent"; text: string }[];
  /** If set, there's a pending destructive action awaiting confirmation. */
  pendingAction: { toolCall: ToolCall; confirmationPrompt: string } | null;
}

export interface AgentStep {
  thinking: AgentThinkingData;
  toolCalls: ToolCall[];
  toolResults: ToolResult[];
  responseText: string;
  responseLanguage: LanguageCode;
  newStatus: SessionStatus;
  /** Set when a destructive action is proposed and awaiting confirmation. */
  pendingConfirmation?: { toolCall: ToolCall; confirmationPrompt: string };
  escalate: boolean;
}

/**
 * Main entry: the agent reasons about the customer's input and decides
 * what to do — call tools, ask for confirmation, or respond directly.
 */
export async function reason(ctx: AgentContext, customerText: string): Promise<AgentStep> {
  // ── 1. If there's a pending destructive action, check for confirmation ──
  if (ctx.pendingAction) {
    return handleConfirmation(ctx, customerText);
  }

  // ── 2. Guardrail check ──────────────────────────────────────────────
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
      toolResults: [],
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
      toolResults: [],
      responseText: "I understand. Let me connect you with a human agent right away.",
      responseLanguage: ctx.language,
      newStatus: "escalated",
      escalate: true,
    };
  }

  // ── 3. LLM decides: call tools or respond directly ──────────────────
  const systemPrompt = getSystemPrompt(ctx.language);
  const tools = Object.values(TOOL_SCHEMAS);
  const decision = await generateDecision(systemPrompt, ctx.conversationHistory, customerText, tools);

  if (decision.type === "text") {
    // LLM responded directly — no tools needed
    return {
      thinking: {
        reasoning: "LLM generated a direct conversational response.",
        toolsConsidered: [],
      },
      toolCalls: [],
      toolResults: [],
      responseText: decision.content || "I didn't quite catch that. Could you say that again, please?",
      responseLanguage: ctx.language,
      newStatus: "responding",
      escalate: false,
    };
  }

  // ── 4. LLM wants to call tools ──────────────────────────────────────
  const toolCalls = decision.calls.slice(0, GUARDRAILS.maxToolCallsPerTurn - ctx.toolCallsThisTurn);

  // Check if any are destructive — if so, ask for confirmation first
  const destructiveCall = toolCalls.find((tc) => DESTRUCTIVE_TOOLS.includes(tc.name));
  if (destructiveCall) {
    const confirmationPrompt = buildConfirmationPrompt(destructiveCall, ctx.language);
    return {
      thinking: {
        reasoning: `LLM proposed ${destructiveCall.name}. Asking for confirmation before executing.`,
        toolsConsidered: toolCalls.map((tc) => tc.name),
      },
      toolCalls: [],
      toolResults: [],
      responseText: confirmationPrompt,
      responseLanguage: ctx.language,
      newStatus: "awaiting_tool",
      pendingConfirmation: { toolCall: destructiveCall, confirmationPrompt },
      escalate: false,
    };
  }

  // Non-destructive tools — execute immediately
  const results: ToolResult[] = [];
  for (const call of toolCalls) {
    const result = await executeToolWithRetry(call.name, call.args);
    results.push(result);
  }

  // Feed tool results back to LLM for a natural response
  const toolResultsForLLM = results.map((r, i) => ({
    toolCallId: decision.toolCallIds[i] || `call_${i}`,
    toolName: r.name,
    result: r.data,
  }));

  let finalResponseText: string;
  if (results.length > 0 && results.every((r) => r.success)) {
    const llmResponse = await generateResponseFromToolResults(
      systemPrompt,
      ctx.conversationHistory,
      customerText,
      toolResultsForLLM,
    );
    finalResponseText = llmResponse || formatToolResults(results, ctx.language);
  } else {
    const failed = results.find((r) => !r.success);
    finalResponseText = `I wasn't able to complete that. ${failed?.data.error || "Please try again."}`;
  }

  return {
    thinking: {
      reasoning: `Executed tools: ${toolCalls.map((tc) => tc.name).join(", ")}`,
      toolsConsidered: toolCalls.map((tc) => tc.name),
    },
    toolCalls,
    toolResults: results,
    responseText: finalResponseText,
    responseLanguage: ctx.language,
    newStatus: "responding",
    escalate: false,
  };
}

/**
 * Handle confirmation flow for a pending destructive action.
 */
async function handleConfirmation(ctx: AgentContext, customerText: string): Promise<AgentStep> {
  const pending = ctx.pendingAction!;
  const call = pending.toolCall;

  if (isNegative(customerText)) {
    return {
      thinking: {
        reasoning: `Customer declined ${call.name}. Cancelling.`,
        toolsConsidered: [call.name],
      },
      toolCalls: [],
      toolResults: [],
      responseText: "Okay, I've cancelled that. Is there anything else I can help you with?",
      responseLanguage: ctx.language,
      newStatus: "active",
      escalate: false,
    };
  }

  if (isAffirmative(customerText)) {
    // Execute the destructive tool
    const result = await executeToolWithRetry(call.name, call.args);

    let responseText: string;
    if (result.success) {
      const systemPrompt = getSystemPrompt(ctx.language);
      const llmResponse = await generateResponseFromToolResults(
        systemPrompt,
        ctx.conversationHistory,
        `Please confirm the ${call.name} result to the customer.`,
        [{ toolCallId: "confirm_call", toolName: call.name, result: result.data }],
      );
      responseText = llmResponse || formatToolResults([result], ctx.language);
    } else {
      responseText = `I wasn't able to complete that. ${result.data.error || "Please try again."}`;
    }

    return {
      thinking: {
        reasoning: `Customer confirmed ${call.name}. Executed successfully.`,
        toolsConsidered: [call.name],
      },
      toolCalls: [call],
      toolResults: [result],
      responseText,
      responseLanguage: ctx.language,
      newStatus: result.success ? "responding" : "active",
      escalate: false,
    };
  }

  // Ambiguous — re-prompt
  return {
    thinking: {
      reasoning: "Customer response unclear. Re-prompting for confirmation.",
      toolsConsidered: [call.name],
    },
    toolCalls: [],
    toolResults: [],
    responseText: `I didn't quite catch that. Please say yes to confirm or no to cancel.`,
    responseLanguage: ctx.language,
    newStatus: "awaiting_tool",
    pendingConfirmation: { toolCall: call, confirmationPrompt: pending.confirmationPrompt },
    escalate: false,
  };
}

/**
 * Build a confirmation prompt for a destructive action.
 */
function buildConfirmationPrompt(call: ToolCall, _lang: LanguageCode): string {
  const a = call.args;
  switch (call.name) {
    case "make_transfer": {
      const amount = nairaToWords(a.amount as number);
      const bank = (a.bankCode as string) || "";
      const recipient = (a.recipientAccount as string) || "";
      return `You want to transfer ${amount} to account ${recipient} at ${bank}. Please say yes to confirm or no to cancel.`;
    }
    case "recharge_airtime": {
      const amount = nairaToWords(a.amount as number);
      const phone = (a.phoneNumber as string) || "";
      const network = (a.network as string) || "";
      return `You want to buy ${amount} airtime for ${phone} on ${network}. Please say yes to confirm or no to cancel.`;
    }
    case "pay_bills": {
      const amount = nairaToWords(a.amount as number);
      const biller = (a.biller as string) || "";
      const acct = (a.accountNumber as string) || "";
      return `You want to pay ${amount} for ${biller} on account ${acct}. Please say yes to confirm or no to cancel.`;
    }
    default:
      return `Please say yes to confirm or no to cancel.`;
  }
}

/**
 * Fallback formatter if LLM follow-up fails.
 */
function formatToolResults(results: ToolResult[], _lang: LanguageCode): string {
  const d = results[0]?.data;
  if (!d) return "Done. Is there anything else I can help with?";
  switch (results[0].name) {
    case "check_balance":
      return `Your account balance is ${nairaToWords(d.balance as number)}.`;
    case "get_transactions": {
      const txns = (d.transactions as Array<{ description: string; amount: number; date: string }>) || [];
      if (txns.length === 0) return "You have no recent transactions.";
      const first = txns[0];
      return `Your most recent transaction was ${first.description} for ${nairaToWords(first.amount)} naira on ${first.date}.`;
    }
    case "make_transfer":
      return `Transfer completed successfully. Your new balance is ${nairaToWords(d.newBalance as number)}.`;
    case "recharge_airtime":
      return `Airtime purchase completed. Your new balance is ${nairaToWords(d.newBalance as number)}.`;
    case "pay_bills":
      return `Bill payment completed. Your new balance is ${nairaToWords(d.newBalance as number)}.`;
    case "get_account":
      return `Your account is ${d.accountId}, ${d.name}, ${d.accountType} account.`;
    case "create_ticket":
      return `I've created ticket ${d.ticketId} for "${d.subject}" with ${d.priority} priority. A team member will follow up.`;
    case "escalate_to_human":
      return `I've escalated this to a human agent. You're in the queue at position ${d.queuePosition}.`;
    default:
      return "Done. Is there anything else I can help with?";
  }
}

// ── Legacy act() kept for backward compat (handler.ts may call it) ──
export async function act(
  decision: AgentStep,
  _ctx: AgentContext
): Promise<{ results: ToolResult[]; finalResponseText: string; finalStatus: SessionStatus }> {
  return {
    results: decision.toolResults,
    finalResponseText: decision.responseText,
    finalStatus: decision.newStatus,
  };
}
