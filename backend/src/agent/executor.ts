import type { ToolName, ToolResult } from "@ndumi/shared";

type ToolExecutor = (args: Record<string, unknown>) => Promise<ToolResult>;

const executors: Partial<Record<ToolName, ToolExecutor>> = {
  check_order: async (args) => {
    const orderId = args.orderId as string;
    if (!orderId) {
      return { name: "check_order", success: false, data: { error: "Missing orderId" } };
    }
    return {
      name: "check_order",
      success: true,
      data: {
        orderId,
        status: "shipped",
        items: 2,
        estimatedDelivery: "2-3 business days",
        trackingNumber: "TRK-78901234",
      },
    };
  },

  create_ticket: async (args) => {
    const subject = args.subject as string;
    if (!subject) {
      return { name: "create_ticket", success: false, data: { error: "Missing subject" } };
    }
    return {
      name: "create_ticket",
      success: true,
      data: {
        ticketId: `TKT-${Date.now().toString(36).toUpperCase()}`,
        subject,
        priority: (args.priority as string) || "medium",
        status: "open",
      },
    };
  },

  get_account: async (args) => {
    const identifier = args.identifier as string;
    if (!identifier) {
      return { name: "get_account", success: false, data: { error: "Missing identifier" } };
    }
    return {
      name: "get_account",
      success: true,
      data: {
        accountId: `ACC-${identifier.slice(-6)}`,
        name: "Customer",
        email: identifier.includes("@") ? identifier : undefined,
        phone: identifier.includes("@") ? undefined : identifier,
        plan: "premium",
        balance: 0,
      },
    };
  },

  escalate_to_human: async (args) => {
    const reason = args.reason as string;
    return {
      name: "escalate_to_human",
      success: true,
      data: {
        escalated: true,
        reason,
        urgency: (args.urgency as string) || "normal",
        queuePosition: 1,
      },
    };
  },
};

export async function executeTool(
  name: ToolName,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const executor = executors[name];
  if (!executor) {
    return { name, success: false, data: { error: `Unknown tool: ${name}` } };
  }

  try {
    return await executor(args);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { name, success: false, data: { error: message } };
  }
}

export async function executeToolWithRetry(
  name: ToolName,
  args: Record<string, unknown>,
  maxRetries = 2
): Promise<ToolResult> {
  let lastResult: ToolResult;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    lastResult = await executeTool(name, args);
    if (lastResult.success) return lastResult;
    if (attempt < maxRetries) {
      await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
    }
  }
  return lastResult!;
}
