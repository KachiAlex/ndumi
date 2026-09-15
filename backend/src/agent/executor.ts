import type { ToolName, ToolResult } from "@ndumi/shared";
import { GUARDRAILS } from "./tools.js";
import {
  getCustomer,
  getCustomerTransactions,
  recordTransaction,
  hasSufficientBalance,
  maskAccount,
} from "./customerStore.js";

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
  check_balance: async (args) => {
    const customerId = args.customerId as string;
    const customer = getCustomer(customerId);
    if (!customer) {
      return { name: "check_balance", success: false, data: { error: "Customer not found" } };
    }
    return {
      name: "check_balance",
      success: true,
      data: {
        accountId: maskAccount(customer.accountId),
        balance: customer.balance,
        currency: customer.currency,
        accountType: customer.accountType,
      },
    };
  },

  get_transactions: async (args) => {
    const customerId = args.customerId as string;
    const limit = Math.min((args.limit as number) || 5, 20);
    const txns = getCustomerTransactions(customerId, limit);
    return {
      name: "get_transactions",
      success: true,
      data: {
        transactions: txns.map((t) => ({
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
    const customerId = args.customerId as string;
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
    if (!hasSufficientBalance(customerId, amount)) {
      return { name: "make_transfer", success: false, data: { error: "Insufficient balance for this transfer" } };
    }

    const txn = recordTransaction(customerId, "debit", `Transfer to ${recipientAccount} (${BANK_NAMES[bankCode] || bankCode})`, amount);
    if (!txn) {
      return { name: "make_transfer", success: false, data: { error: "Failed to process transfer" } };
    }

    return {
      name: "make_transfer",
      success: true,
      data: {
        transferId: txn.id,
        recipientAccount: maskAccount(recipientAccount),
        bank: BANK_NAMES[bankCode] || bankCode,
        amount,
        narration,
        newBalance: txn.balanceAfter,
        status: "completed",
      },
    };
  },

  recharge_airtime: async (args) => {
    const customerId = args.customerId as string;
    const phoneNumber = args.phoneNumber as string;
    const amount = args.amount as number;
    const network = args.network as string;

    if (!phoneNumber || !amount || !network) {
      return { name: "recharge_airtime", success: false, data: { error: "Missing required fields: phoneNumber, amount, network" } };
    }
    if (amount > GUARDRAILS.maxRechargeAmount) {
      return { name: "recharge_airtime", success: false, data: { error: `Amount exceeds maximum recharge limit of ₦${GUARDRAILS.maxRechargeAmount.toLocaleString()}` } };
    }
    if (!hasSufficientBalance(customerId, amount)) {
      return { name: "recharge_airtime", success: false, data: { error: "Insufficient balance for this recharge" } };
    }

    const txn = recordTransaction(customerId, "airtime", `${NETWORK_NAMES[network] || network} Airtime - ${phoneNumber}`, amount);
    if (!txn) {
      return { name: "recharge_airtime", success: false, data: { error: "Failed to process recharge" } };
    }

    return {
      name: "recharge_airtime",
      success: true,
      data: {
        rechargeId: txn.id,
        phoneNumber,
        network: NETWORK_NAMES[network] || network,
        amount,
        newBalance: txn.balanceAfter,
        status: "completed",
      },
    };
  },

  pay_bills: async (args) => {
    const customerId = args.customerId as string;
    const biller = args.biller as string;
    const accountNumber = args.accountNumber as string;
    const amount = args.amount as number;

    if (!biller || !accountNumber || !amount) {
      return { name: "pay_bills", success: false, data: { error: "Missing required fields: biller, accountNumber, amount" } };
    }
    if (amount > GUARDRAILS.maxBillPayment) {
      return { name: "pay_bills", success: false, data: { error: `Amount exceeds maximum bill payment limit of ₦${GUARDRAILS.maxBillPayment.toLocaleString()}` } };
    }
    if (!hasSufficientBalance(customerId, amount)) {
      return { name: "pay_bills", success: false, data: { error: "Insufficient balance for this payment" } };
    }

    const txn = recordTransaction(customerId, "bill", `${BILLER_NAMES[biller] || biller} - ${accountNumber}`, amount);
    if (!txn) {
      return { name: "pay_bills", success: false, data: { error: "Failed to process bill payment" } };
    }

    return {
      name: "pay_bills",
      success: true,
      data: {
        paymentId: txn.id,
        biller: BILLER_NAMES[biller] || biller,
        accountNumber,
        amount,
        newBalance: txn.balanceAfter,
        status: "completed",
      },
    };
  },

  get_account: async (args) => {
    const customerId = args.customerId as string;
    const customer = getCustomer(customerId);
    if (!customer) {
      return { name: "get_account", success: false, data: { error: "Customer not found" } };
    }
    return {
      name: "get_account",
      success: true,
      data: {
        accountId: maskAccount(customer.accountId),
        name: customer.name,
        accountType: customer.accountType,
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
