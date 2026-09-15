import type { ToolName, ToolResult } from "@ndumi/shared";
import { GUARDRAILS } from "./tools.js";

// ── In-memory mock banking data ────────────────────────────────────
// In production these executors would call real banking APIs.
// For now they return realistic mock data seeded per-session.

interface MockAccount {
  accountId: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
}

interface MockTransaction {
  id: string;
  type: "credit" | "debit" | "airtime" | "bill";
  description: string;
  amount: number;
  date: string;
  balanceAfter: number;
}

const MOCK_ACCOUNT: MockAccount = {
  accountId: "0123456789",
  name: "Chiamaka Okafor",
  type: "Savings",
  balance: 247500,
  currency: "NGN",
};

const MOCK_TRANSACTIONS: MockTransaction[] = [
  { id: "TXN-001", type: "credit", description: "Salary - Acme Corp", amount: 350000, date: "2026-09-10", balanceAfter: 597500 },
  { id: "TXN-002", type: "debit", description: "Transfer to 08012345678 (GTB)", amount: 150000, date: "2026-09-12", balanceAfter: 447500 },
  { id: "TXN-003", type: "airtime", description: "MTN Airtime - 08012345678", amount: 2000, date: "2026-09-13", balanceAfter: 445500 },
  { id: "TXN-004", type: "bill", description: "Ikeja Electric - Meter 044123", amount: 15000, date: "2026-09-14", balanceAfter: 430500 },
  { id: "TXN-005", type: "debit", description: "POS Purchase - Shoprite", amount: 183000, date: "2026-09-14", balanceAfter: 247500 },
];

const BANK_NAMES: Record<string, string> = {
  gtb: "Guaranty Trust Bank",
  access: "Access Bank",
  zenith: "Zenith Bank",
  uba: "UBA",
  first_bank: "First Bank of Nigeria",
  kuda: "Kuda Microfinance Bank",
  opay: "OPay",
  sterling: "Sterling Bank",
  fidelity: "Fidelity Bank",
  wema: "Wema Bank",
};

const NETWORK_NAMES: Record<string, string> = {
  mtn: "MTN",
  glo: "Glo",
  airtel: "Airtel",
  "9mobile": "9mobile",
};

const BILLER_NAMES: Record<string, string> = {
  electricity: "Electricity",
  dstv: "DStv",
  gotv: "GOtv",
  startimes: "StarTimes",
  water: "Water Board",
};

type ToolExecutor = (args: Record<string, unknown>) => Promise<ToolResult>;

const executors: Partial<Record<ToolName, ToolExecutor>> = {
  check_balance: async () => ({
    name: "check_balance",
    success: true,
    data: {
      accountId: maskAccount(MOCK_ACCOUNT.accountId),
      balance: MOCK_ACCOUNT.balance,
      currency: MOCK_ACCOUNT.currency,
      accountType: MOCK_ACCOUNT.type,
    },
  }),

  get_transactions: async (args) => {
    const limit = Math.min((args.limit as number) || 5, 20);
    return {
      name: "get_transactions",
      success: true,
      data: {
        transactions: MOCK_TRANSACTIONS.slice(0, limit).map((t) => ({
          id: t.id,
          type: t.type,
          description: t.description,
          amount: t.amount,
          date: t.date,
        })),
      },
    };
  },

  make_transfer: async (args) => {
    const recipientAccount = args.recipientAccount as string;
    const bankCode = args.bankCode as string;
    const amount = args.amount as number;
    const narration = (args.narration as string) || "";

    if (!recipientAccount || !bankCode || !amount) {
      return { name: "make_transfer", success: false, data: { error: "Missing required fields: recipientAccount, bankCode, amount" } };
    }
    if (amount > GUARDRAILS.maxTransferAmount) {
      return { name: "make_transfer", success: false, data: { error: `Amount exceeds maximum transfer limit of ₦${GUARDRAILS.maxTransferAmount.toLocaleString()}` } };
    }
    if (amount > MOCK_ACCOUNT.balance) {
      return { name: "make_transfer", success: false, data: { error: "Insufficient balance for this transfer" } };
    }

    MOCK_ACCOUNT.balance -= amount;
    const txn: MockTransaction = {
      id: `TXN-${Date.now().toString(36).toUpperCase()}`,
      type: "debit",
      description: `Transfer to ${recipientAccount} (${BANK_NAMES[bankCode] || bankCode})`,
      amount,
      date: new Date().toISOString().slice(0, 10),
      balanceAfter: MOCK_ACCOUNT.balance,
    };
    MOCK_TRANSACTIONS.unshift(txn);

    return {
      name: "make_transfer",
      success: true,
      data: {
        transferId: txn.id,
        recipientAccount: maskAccount(recipientAccount),
        bank: BANK_NAMES[bankCode] || bankCode,
        amount,
        narration,
        newBalance: MOCK_ACCOUNT.balance,
        status: "completed",
      },
    };
  },

  recharge_airtime: async (args) => {
    const phoneNumber = args.phoneNumber as string;
    const amount = args.amount as number;
    const network = args.network as string;

    if (!phoneNumber || !amount || !network) {
      return { name: "recharge_airtime", success: false, data: { error: "Missing required fields: phoneNumber, amount, network" } };
    }
    if (amount > GUARDRAILS.maxRechargeAmount) {
      return { name: "recharge_airtime", success: false, data: { error: `Amount exceeds maximum recharge limit of ₦${GUARDRAILS.maxRechargeAmount.toLocaleString()}` } };
    }
    if (amount > MOCK_ACCOUNT.balance) {
      return { name: "recharge_airtime", success: false, data: { error: "Insufficient balance for this recharge" } };
    }

    MOCK_ACCOUNT.balance -= amount;
    const txn: MockTransaction = {
      id: `TXN-${Date.now().toString(36).toUpperCase()}`,
      type: "airtime",
      description: `${NETWORK_NAMES[network] || network} Airtime - ${phoneNumber}`,
      amount,
      date: new Date().toISOString().slice(0, 10),
      balanceAfter: MOCK_ACCOUNT.balance,
    };
    MOCK_TRANSACTIONS.unshift(txn);

    return {
      name: "recharge_airtime",
      success: true,
      data: {
        rechargeId: txn.id,
        phoneNumber,
        network: NETWORK_NAMES[network] || network,
        amount,
        newBalance: MOCK_ACCOUNT.balance,
        status: "completed",
      },
    };
  },

  pay_bills: async (args) => {
    const biller = args.biller as string;
    const accountNumber = args.accountNumber as string;
    const amount = args.amount as number;

    if (!biller || !accountNumber || !amount) {
      return { name: "pay_bills", success: false, data: { error: "Missing required fields: biller, accountNumber, amount" } };
    }
    if (amount > GUARDRAILS.maxBillPayment) {
      return { name: "pay_bills", success: false, data: { error: `Amount exceeds maximum bill payment limit of ₦${GUARDRAILS.maxBillPayment.toLocaleString()}` } };
    }
    if (amount > MOCK_ACCOUNT.balance) {
      return { name: "pay_bills", success: false, data: { error: "Insufficient balance for this payment" } };
    }

    MOCK_ACCOUNT.balance -= amount;
    const txn: MockTransaction = {
      id: `TXN-${Date.now().toString(36).toUpperCase()}`,
      type: "bill",
      description: `${BILLER_NAMES[biller] || biller} - ${accountNumber}`,
      amount,
      date: new Date().toISOString().slice(0, 10),
      balanceAfter: MOCK_ACCOUNT.balance,
    };
    MOCK_TRANSACTIONS.unshift(txn);

    return {
      name: "pay_bills",
      success: true,
      data: {
        paymentId: txn.id,
        biller: BILLER_NAMES[biller] || biller,
        accountNumber,
        amount,
        newBalance: MOCK_ACCOUNT.balance,
        status: "completed",
      },
    };
  },

  get_account: async () => ({
    name: "get_account",
    success: true,
    data: {
      accountId: maskAccount(MOCK_ACCOUNT.accountId),
      name: MOCK_ACCOUNT.name,
      accountType: MOCK_ACCOUNT.type,
    },
  }),

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

function maskAccount(account: string): string {
  if (account.length <= 4) return account;
  return `${account.slice(0, 3)}****${account.slice(-3)}`;
}

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
