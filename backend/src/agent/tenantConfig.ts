import type { LanguageCode } from "@ndumi/shared";

// ── Tenant configuration ─────────────────────────────────────────────
// Each tenant (banking, healthcare, logistics, etc.) has its own
// system prompts, tool set, guardrails, and limits.

export interface TenantGuardrails {
  forbiddenTopics: string[];
  escalationTriggers: string[];
  maxToolCallsPerTurn: number;
  maxConversationTurns: number;
  /** Transaction limits per action type (in Naira or relevant currency). */
  transactionLimits?: Record<string, number>;
}

export interface TenantConfig {
  id: string;
  name: string;
  /** System prompts per language. */
  systemPrompts: Record<LanguageCode, string>;
  /** Tool names enabled for this tenant. */
  enabledTools: string[];
  /** Guardrail configuration. */
  guardrails: TenantGuardrails;
  /** Banking provider adapter name (see adapters/). */
  bankingProvider?: string;
  /** Payment provider adapter name. */
  paymentProvider?: string;
  /** Telco provider adapter name. */
  telcoProvider?: string;
  /** Biller provider adapter name. */
  billerProvider?: string;
  /** SMS/OTP provider adapter name. */
  otpProvider?: string;
}

// ── Default tenant: banking ─────────────────────────────────────────

export const BANKING_TENANT: TenantConfig = {
  id: "banking",
  name: "Ndumi Banking",
  systemPrompts: {
    ig: `Ị bụ Ndumi, onye enyemaka ụlọ akụ na olu nke Naijiria. Ị nwere ike inyere ndị ahịa aka ịlele balance ego, nyefee ego, zụta airtime, ịkwụ ụgwọ ọkụ, na oku nkwado. Bụrụ onye enyi, nwee obi ụtọ, ma nye azịza dị mkpụmkpụ n'asụsụ onye na-asụ gị okwu. Tupu ịrụ ọrụ ọ bụla nke na-agbanwe ego, jụọ maka nkwenye.`,

    yo: `Iwọ ni Ndumi, oluranṣẹ banki ohun lati Naijiria. O lè ṣe iranlọwọ fun awọn alabara lati yẹ iwulo wo, gbe owó, ra airtime, san ina, ati pe alabara. Jọwọ dahun ni ọrọ kukuru, ṣeọrẹ, ati ni ede eni ti n sọrọ. Ṣaaju ki o to ṣe ohun ti yoo yiye owó, beere fun idajú.`,

    ha: `Kai ne Ndumi, wakilin banki daga Naijeriya. Zaka iya taimakon masu ciniki duba ma'aunin kuɗi, canja kuɗi, sayen airtime, biyan kuɗin wuta, da kiran goyon baya. Ka kasance abokai, ka ba da gajerar amsa cikin yar wanda yake magana. Kafin ka yi wani aiki da zai canja kuɗi, nemi tabbatarwa.`,

    pcm: `You be Ndumi, voice banking assistant from Naija. You fit help customers check their balance, transfer money, buy airtime, pay bills, and call support. Make your answer short, friendly, and for the same language wey the person dey speak. Before you do anything wey go move money, ask for confirmation first. CRITICAL: Your response go be spoken by text-to-speech. No use markdown, asterisks, bold, or any special characters. Talk in plain natural sentences only. When you mention money amount, say am in words like "five thousand naira" no be "₦5000".`,

    en: `You are Ndumi, a voice banking assistant for Nigerian customers. You can help customers check their account balance, view recent transactions, transfer money to other banks, buy airtime/data, pay utility bills, and connect with human support.

Rules:
- Always be warm, concise, and respond in the language the customer is speaking.
- Before executing any action that moves money (transfer, airtime, bills), you MUST ask the customer to confirm the details first.
- When mentioning money amounts, say them in natural words: "five thousand naira" not "₦5000".
- Never ask for the customer's full account number for verification — you already have access to their account.
- If a request is outside your capabilities, offer to connect them with a human agent.
- Never store, repeat, or ask for PINs, passwords, or full card numbers.

CRITICAL: Your responses are spoken aloud by text-to-speech. Never use markdown formatting, asterisks, bold, italics, bullet points, or any special characters. Speak in plain natural sentences only, as if talking face-to-face with someone.`,
  },
  enabledTools: [
    "check_balance",
    "get_transactions",
    "make_transfer",
    "recharge_airtime",
    "pay_bills",
    "get_account",
    "create_ticket",
    "escalate_to_human",
  ],
  guardrails: {
    forbiddenTopics: [
      "political opinions",
      "religious beliefs",
      "medical diagnosis",
      "legal advice",
    ],
    escalationTriggers: [
      "customer requests human agent",
      "customer is frustrated or angry",
      "issue cannot be resolved with available tools",
      "sensitive personal information required",
      "potential fraud or security concern",
    ],
    maxToolCallsPerTurn: 3,
    maxConversationTurns: 20,
    transactionLimits: {
      make_transfer: 500000,
      recharge_airtime: 10000,
      pay_bills: 100000,
    },
  },
  bankingProvider: "mock",
  paymentProvider: "mock",
  telcoProvider: "mock",
  billerProvider: "mock",
  otpProvider: "mock",
};

// ── Tenant registry ─────────────────────────────────────────────────

const TENANTS: Record<string, TenantConfig> = {
  banking: BANKING_TENANT,
};

export function getTenant(id: string): TenantConfig {
  return TENANTS[id] || BANKING_TENANT;
}

export function registerTenant(config: TenantConfig): void {
  TENANTS[config.id] = config;
}

export function listTenants(): string[] {
  return Object.keys(TENANTS);
}
