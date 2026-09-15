import type { ToolCall, ToolResult, LanguageCode } from "@ndumi/shared";

// ── Audit logging for all tool calls ────────────────────────────────
// Every tool call is logged with full context for compliance and debugging.
// In production this would write to a database or log aggregation service.

export interface AuditEntry {
  timestamp: number;
  sessionId: string;
  tenantId: string;
  customerId: string | null;
  toolName: string;
  args: Record<string, unknown>;
  success: boolean;
  result: Record<string, unknown>;
  durationMs: number;
  language: LanguageCode;
}

class AuditLogger {
  private entries: AuditEntry[] = [];
  private maxEntries = 10000;

  log(entry: AuditEntry): void {
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }
    // Console log for production observability (pm2 logs capture this)
    const status = entry.success ? "OK" : "FAIL";
    console.log(
      `[AUDIT] ${entry.timestamp} session=${entry.sessionId.slice(0, 8)} ` +
      `customer=${entry.customerId ?? "anon"} tool=${entry.toolName} ` +
      `status=${status} duration=${entry.durationMs}ms`,
    );
  }

  getEntries(sessionId?: string): AuditEntry[] {
    if (sessionId) {
      return this.entries.filter((e) => e.sessionId === sessionId);
    }
    return [...this.entries];
  }

  getRecent(limit = 50): AuditEntry[] {
    return this.entries.slice(-limit);
  }

  clear(): void {
    this.entries = [];
  }
}

export const auditLogger = new AuditLogger();

/** Helper to log a tool call result. */
export function logToolCall(
  sessionId: string,
  tenantId: string,
  customerId: string | null,
  language: LanguageCode,
  call: ToolCall,
  result: ToolResult,
  durationMs: number,
): void {
  // Don't log sensitive args (PINs, etc.) — only tool args that are safe
  const safeArgs = sanitizeArgs(call.name, call.args);
  const safeResult = sanitizeResult(call.name, result.data);

  auditLogger.log({
    timestamp: Date.now(),
    sessionId,
    tenantId,
    customerId,
    toolName: call.name,
    args: safeArgs,
    success: result.success,
    result: safeResult,
    durationMs,
    language,
  });
}

/** Remove sensitive fields from args before logging. */
function sanitizeArgs(_toolName: string, args: Record<string, unknown>): Record<string, unknown> {
  const sanitized = { ...args };
  // Never log PINs
  delete sanitized.pin;
  delete sanitized.customerId; // Don't log full customer ID in args
  return sanitized;
}

/** Remove sensitive fields from results before logging. */
function sanitizeResult(_toolName: string, result: Record<string, unknown>): Record<string, unknown> {
  const sanitized = { ...result };
  // Mask account numbers in results
  if (typeof sanitized.accountId === "string") {
    sanitized.accountId = maskAccount(sanitized.accountId);
  }
  if (typeof sanitized.recipientAccount === "string") {
    sanitized.recipientAccount = maskAccount(sanitized.recipientAccount);
  }
  return sanitized;
}

function maskAccount(account: string): string {
  if (account.length <= 4) return account;
  return `${account.slice(0, 3)}****${account.slice(-3)}`;
}
