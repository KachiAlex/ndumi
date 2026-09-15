import type {
  LanguageCode,
  ToolCall,
  ToolResult,
  AgentThinkingData,
  SessionStatus,
  AuthState,
} from "@ndumi/shared";
import { DESTRUCTIVE_TOOLS, AUTH_REQUIRED_TOOLS } from "@ndumi/shared";
import { executeToolWithRetry } from "./executor.js";
import { checkStructuralGuardrails, classifyIntent, shouldEscalate, isAffirmative, isNegative } from "./guardrails.js";
import { TOOL_SCHEMAS } from "./tools.js";
import { getTenant, type TenantConfig } from "./tenantConfig.js";
import { generateDecision, generateResponseFromToolResults } from "../services/llm.js";
import { nairaToWords } from "./n2w.js";
import { lookupCustomer, verifyPin, extractPhoneNumber, extractPin } from "./customerStore.js";

// Session inactivity timeout: 5 minutes
const SESSION_TIMEOUT_MS = 5 * 60 * 1000;

export interface AgentContext {
  sessionId: string;
  language: LanguageCode;
  turnCount: number;
  toolCallsThisTurn: number;
  conversationHistory: { speaker: "customer" | "agent"; text: string }[];
  /** If set, there's a pending destructive action awaiting confirmation. */
  pendingAction: { toolCall: ToolCall; confirmationPrompt: string } | null;
  /** Authentication state of the session. */
  authState: AuthState;
  /** Verified customer ID (phone number) if authenticated. */
  customerId: string | null;
  /** Timestamp of last activity. */
  lastActivityAt: number;
  /** Tenant ID for multi-industry support. */
  tenantId: string;
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
  /** Updated auth state after this step. */
  newAuthState?: AuthState;
  /** Updated customer ID after authentication. Use null to clear. */
  newCustomerId?: string | null;
  /** Whether to update lastActivityAt. */
  touchActivity?: boolean;
  escalate: boolean;
}

/**
 * Main entry: the agent reasons about the customer's input and decides
 * what to do — authenticate, call tools, ask for confirmation, or respond.
 */
export async function reason(ctx: AgentContext, customerText: string): Promise<AgentStep> {
  // ── 0. Check session timeout ───────────────────────────────────────
  if (ctx.authState === "authenticated" && isSessionExpired(ctx)) {
    return {
      thinking: {
        reasoning: "Session timed out due to inactivity. Re-authentication required.",
        toolsConsidered: [],
      },
      toolCalls: [],
      toolResults: [],
      responseText: "For your security, your session has timed out due to inactivity. Please provide your phone number to verify your identity again.",
      responseLanguage: ctx.language,
      newStatus: "active",
      newAuthState: "awaiting_phone",
      newCustomerId: null,
      touchActivity: true,
      escalate: false,
    };
  }

  // ── 1. If there's a pending destructive action, check for confirmation ──
  if (ctx.pendingAction) {
    return handleConfirmation(ctx, customerText);
  }

  // ── 2. Authentication gate ───────────────────────────────────────────
  if (ctx.authState !== "authenticated") {
    return handleAuth(ctx, customerText);
  }

  // ── 3. Guardrail check (structural + LLM-based intent classification) ──
  const tenant = getTenant(ctx.tenantId);
  const structuralGuardrail = checkStructuralGuardrails({
    turnCount: ctx.turnCount,
    toolCallsThisTurn: ctx.toolCallsThisTurn,
    guardrails: tenant.guardrails,
  });

  if (!structuralGuardrail.passed) {
    return {
      thinking: {
        reasoning: structuralGuardrail.reason || "Guardrail triggered",
        toolsConsidered: ["escalate_to_human"],
      },
      toolCalls: [{ name: "escalate_to_human", args: { reason: structuralGuardrail.reason } }],
      toolResults: [],
      responseText: "I'll connect you with a human agent who can help further.",
      responseLanguage: ctx.language,
      newStatus: "escalated",
      touchActivity: true,
      escalate: true,
    };
  }

  // LLM-based intent classification (replaces substring matching)
  const intent = await classifyIntent(customerText, tenant.guardrails);
  if (intent.category === "out_of_scope") {
    return {
      thinking: {
        reasoning: intent.reason || "Customer request is out of scope.",
        toolsConsidered: ["escalate_to_human"],
      },
      toolCalls: [{ name: "escalate_to_human", args: { reason: intent.reason } }],
      toolResults: [],
      responseText: "I'm not able to help with that topic, but I can connect you with a human agent who may be able to assist.",
      responseLanguage: ctx.language,
      newStatus: "escalated",
      touchActivity: true,
      escalate: true,
    };
  }

  if (intent.category === "escalate" || shouldEscalate(customerText)) {
    return {
      thinking: {
        reasoning: intent.reason || "Customer requested escalation.",
        toolsConsidered: ["escalate_to_human"],
      },
      toolCalls: [{ name: "escalate_to_human", args: { reason: intent.reason || "Customer requested human agent" } }],
      toolResults: [],
      responseText: "I understand. Let me connect you with a human agent right away.",
      responseLanguage: ctx.language,
      newStatus: "escalated",
      touchActivity: true,
      escalate: true,
    };
  }

  // ── 4. LLM decides: call tools or respond directly ──────────────────
  const systemPrompt = tenant.systemPrompts[ctx.language] || tenant.systemPrompts.en;
  // Filter tools to only those enabled for this tenant
  const tools = Object.values(TOOL_SCHEMAS).filter((t) =>
    tenant.enabledTools.includes(t.function.name),
  );
  const decision = await generateDecision(systemPrompt, ctx.conversationHistory, customerText, tools);

  if (decision.type === "text") {
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
      touchActivity: true,
      escalate: false,
    };
  }

  // ── 5. LLM wants to call tools ──────────────────────────────────────
  const toolCalls = decision.calls.slice(0, tenant.guardrails.maxToolCallsPerTurn - ctx.toolCallsThisTurn);

  // Inject customerId into auth-required tool calls
  const enrichedCalls = toolCalls.map((tc) => {
    if (AUTH_REQUIRED_TOOLS.includes(tc.name) && ctx.customerId) {
      return { ...tc, args: { ...tc.args, customerId: ctx.customerId } };
    }
    return tc;
  });

  // Enforce transaction limits before asking for confirmation
  const destructiveCall = enrichedCalls.find((tc) => DESTRUCTIVE_TOOLS.includes(tc.name));
  if (destructiveCall) {
    const limitError = checkTransactionLimit(destructiveCall, tenant);
    if (limitError) {
      return {
        thinking: {
          reasoning: limitError,
          toolsConsidered: enrichedCalls.map((tc) => tc.name),
        },
        toolCalls: [],
        toolResults: [],
        responseText: limitError,
        responseLanguage: ctx.language,
        newStatus: "active",
        touchActivity: true,
        escalate: false,
      };
    }
    const confirmationPrompt = buildConfirmationPrompt(destructiveCall, ctx.language);
    return {
      thinking: {
        reasoning: `LLM proposed ${destructiveCall.name}. Asking for confirmation before executing.`,
        toolsConsidered: enrichedCalls.map((tc) => tc.name),
      },
      toolCalls: [],
      toolResults: [],
      responseText: confirmationPrompt,
      responseLanguage: ctx.language,
      newStatus: "awaiting_tool",
      pendingConfirmation: { toolCall: destructiveCall, confirmationPrompt },
      touchActivity: true,
      escalate: false,
    };
  }

  // Non-destructive tools — execute immediately
  const results: ToolResult[] = [];
  for (const call of enrichedCalls) {
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
      reasoning: `Executed tools: ${enrichedCalls.map((tc) => tc.name).join(", ")}`,
      toolsConsidered: enrichedCalls.map((tc) => tc.name),
    },
    toolCalls: enrichedCalls,
    toolResults: results,
    responseText: finalResponseText,
    responseLanguage: ctx.language,
    newStatus: "responding",
    touchActivity: true,
    escalate: false,
  };
}

// ── Authentication flow ──────────────────────────────────────────────

/**
 * Handle the authentication flow based on current auth state.
 *
 * unauthenticated → ask for phone number
 * awaiting_phone → extract phone, look up customer, ask for PIN
 * awaiting_pin → extract PIN, verify, mark authenticated
 */
async function handleAuth(ctx: AgentContext, customerText: string): Promise<AgentStep> {
  switch (ctx.authState) {
    case "unauthenticated":
    case "awaiting_phone": {
      // Try to extract a phone number from the customer's input
      const phone = extractPhoneNumber(customerText);
      if (phone) {
        const customer = lookupCustomer(phone);
        if (customer) {
          return {
            thinking: {
              reasoning: `Phone ${phone} found. Asking for PIN.`,
              toolsConsidered: [],
            },
            toolCalls: [],
            toolResults: [],
            responseText: `I found your account. Please say your four digit PIN to verify your identity.`,
            responseLanguage: ctx.language,
            newStatus: "active",
            newAuthState: "awaiting_pin",
            newCustomerId: phone,
            touchActivity: true,
            escalate: false,
          };
        }
        return {
          thinking: {
            reasoning: `Phone ${phone} not found in records.`,
            toolsConsidered: [],
          },
          toolCalls: [],
          toolResults: [],
          responseText: `I couldn't find an account for that phone number. Please check and try again, or say "agent" to speak with a human.`,
          responseLanguage: ctx.language,
          newStatus: "active",
          newAuthState: "awaiting_phone",
          touchActivity: true,
          escalate: false,
        };
      }

      // No phone number detected — ask for one
      return {
        thinking: {
          reasoning: "No phone number detected. Asking customer for phone number.",
          toolsConsidered: [],
        },
        toolCalls: [],
        toolResults: [],
        responseText: `To access your account, please say your registered phone number.`,
        responseLanguage: ctx.language,
        newStatus: "active",
        newAuthState: "awaiting_phone",
        touchActivity: true,
        escalate: false,
      };
    }

    case "awaiting_pin": {
      const pin = extractPin(customerText);
      if (pin && ctx.customerId) {
        const customer = verifyPin(ctx.customerId, pin);
        if (customer) {
          return {
            thinking: {
              reasoning: `PIN verified for ${customer.name}. Session authenticated.`,
              toolsConsidered: [],
            },
            toolCalls: [],
            toolResults: [],
            responseText: `Welcome, ${customer.name.split(" ")[0]}! Your identity has been verified. How can I help you today? You can check your balance, transfer money, buy airtime, or pay bills.`,
            responseLanguage: ctx.language,
            newStatus: "active",
            newAuthState: "authenticated",
            newCustomerId: ctx.customerId,
            touchActivity: true,
            escalate: false,
          };
        }
        return {
          thinking: {
            reasoning: "Incorrect PIN. Asking customer to try again.",
            toolsConsidered: [],
          },
          toolCalls: [],
          toolResults: [],
          responseText: `That PIN is incorrect. Please say your four digit PIN again, or say "agent" to speak with a human.`,
          responseLanguage: ctx.language,
          newStatus: "active",
          newAuthState: "awaiting_pin",
          touchActivity: true,
          escalate: false,
        };
      }

      // No PIN detected
      return {
        thinking: {
          reasoning: "No PIN detected. Asking customer for PIN.",
          toolsConsidered: [],
        },
        toolCalls: [],
        toolResults: [],
        responseText: `Please say your four digit PIN to verify your identity.`,
        responseLanguage: ctx.language,
        newStatus: "active",
        newAuthState: "awaiting_pin",
        touchActivity: true,
        escalate: false,
      };
    }

    default:
      return {
        thinking: {
          reasoning: `Unexpected auth state: ${ctx.authState}`,
          toolsConsidered: [],
        },
        toolCalls: [],
        toolResults: [],
        responseText: "Something went wrong. Please say your phone number to verify your identity.",
        responseLanguage: ctx.language,
        newStatus: "active",
        newAuthState: "awaiting_phone",
        touchActivity: true,
        escalate: false,
      };
  }
}

function isSessionExpired(ctx: AgentContext): boolean {
  return Date.now() - ctx.lastActivityAt > SESSION_TIMEOUT_MS;
}

// ── Confirmation flow ────────────────────────────────────────────────

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
      touchActivity: true,
      escalate: false,
    };
  }

  if (isAffirmative(customerText)) {
    // Inject customerId if needed
    const enrichedCall = AUTH_REQUIRED_TOOLS.includes(call.name) && ctx.customerId
      ? { ...call, args: { ...call.args, customerId: ctx.customerId } }
      : call;

    const result = await executeToolWithRetry(enrichedCall.name, enrichedCall.args);

    let responseText: string;
    if (result.success) {
      const tenant = getTenant(ctx.tenantId);
      const systemPrompt = tenant.systemPrompts[ctx.language] || tenant.systemPrompts.en;
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
      toolCalls: [enrichedCall],
      toolResults: [result],
      responseText,
      responseLanguage: ctx.language,
      newStatus: result.success ? "responding" : "active",
      touchActivity: true,
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
    touchActivity: true,
    escalate: false,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────

/** Check if a destructive tool call exceeds the tenant's transaction limits. */
function checkTransactionLimit(call: ToolCall, tenant: TenantConfig): string | null {
  const limits = tenant.guardrails.transactionLimits;
  if (!limits) return null;

  const limit = limits[call.name];
  if (limit === undefined) return null;

  const amount = call.args.amount as number | undefined;
  if (amount === undefined) return null;

  if (amount > limit) {
    return `I'm sorry, but the amount exceeds the maximum limit of ${nairaToWords(limit)} for this transaction. Please try again with a smaller amount.`;
  }

  return null;
}

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

function formatToolResults(results: ToolResult[], _lang: LanguageCode): string {
  const d = results[0]?.data;
  if (!d) return "Done. Is there anything else I can help you with?";
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
      return "Done. Is there anything else I can help you with?";
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
