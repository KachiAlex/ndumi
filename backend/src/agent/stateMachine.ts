import type { SessionStatus } from "@ndumi/shared";

export interface StateMachineConfig {
  transitions: Record<SessionStatus, SessionStatus[]>;
}

const config: StateMachineConfig = {
  transitions: {
    active: ["awaiting_tool", "responding", "escalated", "resolved", "ended"],
    awaiting_tool: ["responding", "active", "escalated", "ended"],
    responding: ["active", "escalated", "ended"],
    escalated: ["active", "resolved", "ended"],
    resolved: ["ended"],
    ended: [],
  },
};

export function canTransition(from: SessionStatus, to: SessionStatus): boolean {
  const allowed = config.transitions[from];
  return allowed.includes(to);
}

export function transition(from: SessionStatus, to: SessionStatus): SessionStatus {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid state transition: ${from} -> ${to}`);
  }
  return to;
}

export function isTerminal(status: SessionStatus): boolean {
  return status === "ended";
}

export function isActive(status: SessionStatus): boolean {
  return status === "active" || status === "awaiting_tool" || status === "responding";
}
