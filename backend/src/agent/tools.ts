import type { LanguageCode, ToolName } from "@ndumi/shared";

// ── OpenAI function-calling schema format ──────────────────────────
// Groq uses the OpenAI-compatible tools API, so each tool is
// { type: "function", function: { name, description, parameters } }.

export interface OpenAIToolSchema {
  type: "function";
  function: {
    name: ToolName;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, {
        type: string;
        description: string;
        enum?: string[];
      }>;
      required: string[];
    };
  };
}

export const TOOL_SCHEMAS: Record<ToolName, OpenAIToolSchema> = {
  check_balance: {
    type: "function",
    function: {
      name: "check_balance",
      description: "Check the customer's current account balance. Use when the customer asks how much money they have or their balance.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },

  get_transactions: {
    type: "function",
    function: {
      name: "get_transactions",
      description: "Retrieve recent transaction history. Use when the customer asks about recent transactions, payments, or activity.",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Number of recent transactions to retrieve (default 5, max 20)",
          },
        },
        required: [],
      },
    },
  },

  make_transfer: {
    type: "function",
    function: {
      name: "make_transfer",
      description: "Transfer money from the customer's account to another bank account. Requires confirmation before executing.",
      parameters: {
        type: "object",
        properties: {
          recipientAccount: {
            type: "string",
            description: "The recipient's 10-digit bank account number",
          },
          bankCode: {
            type: "string",
            description: "The recipient bank's code",
            enum: ["gtb", "access", "zenith", "uba", "first_bank", "kuda", "opay", "sterling", "fidelity", "wema"],
          },
          amount: {
            type: "number",
            description: "Amount to transfer in Naira (e.g. 5000 means five thousand naira)",
          },
          narration: {
            type: "string",
            description: "Optional transfer note or description",
          },
        },
        required: ["recipientAccount", "bankCode", "amount"],
      },
    },
  },

  recharge_airtime: {
    type: "function",
    function: {
      name: "recharge_airtime",
      description: "Buy airtime credit for a phone number. Requires confirmation before executing.",
      parameters: {
        type: "object",
        properties: {
          phoneNumber: {
            type: "string",
            description: "The phone number to recharge (11-digit Nigerian number, e.g. 08012345678)",
          },
          amount: {
            type: "number",
            description: "Amount of airtime to buy in Naira",
          },
          network: {
            type: "string",
            description: "The mobile network provider",
            enum: ["mtn", "glo", "airtel", "9mobile"],
          },
        },
        required: ["phoneNumber", "amount", "network"],
      },
    },
  },

  pay_bills: {
    type: "function",
    function: {
      name: "pay_bills",
      description: "Pay a utility or service bill (electricity, TV, water). Requires confirmation before executing.",
      parameters: {
        type: "object",
        properties: {
          biller: {
            type: "string",
            description: "The biller or service type",
            enum: ["electricity", "dstv", "gotv", "startimes", "water"],
          },
          accountNumber: {
            type: "string",
            description: "The customer's account or meter number with the biller",
          },
          amount: {
            type: "number",
            description: "Amount to pay in Naira",
          },
        },
        required: ["biller", "accountNumber", "amount"],
      },
    },
  },

  get_account: {
    type: "function",
    function: {
      name: "get_account",
      description: "Retrieve the customer's account details (name, account number, account type). Use when the customer asks about their account info.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },

  create_ticket: {
    type: "function",
    function: {
      name: "create_ticket",
      description: "Create a support ticket for issues that require human follow-up.",
      parameters: {
        type: "object",
        properties: {
          subject: {
            type: "string",
            description: "Short summary of the customer's issue",
          },
          priority: {
            type: "string",
            description: "Ticket priority",
            enum: ["low", "medium", "high", "urgent"],
          },
          description: {
            type: "string",
            description: "Detailed description of the issue",
          },
        },
        required: ["subject"],
      },
    },
  },

  escalate_to_human: {
    type: "function",
    function: {
      name: "escalate_to_human",
      description: "Escalate the conversation to a human agent. Use when the issue is complex, sensitive, or the customer explicitly requests a human.",
      parameters: {
        type: "object",
        properties: {
          reason: {
            type: "string",
            description: "Why escalation is needed",
          },
          urgency: {
            type: "string",
            description: "Urgency level",
            enum: ["normal", "priority", "emergency"],
          },
        },
        required: ["reason"],
      },
    },
  },
};

/** Array form for passing to the LLM API. */
export const ALL_TOOL_SCHEMAS: OpenAIToolSchema[] = Object.values(TOOL_SCHEMAS);

export const GUARDRAILS = {
  maxToolCallsPerTurn: 3,
  maxConversationTurns: 20,
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
  // Banking-specific limits
  maxTransferAmount: 500000, // ₦500,000 per transaction
  maxRechargeAmount: 10000,  // ₦10,000 per recharge
  maxBillPayment: 100000,   // ₦100,000 per bill payment
};

export const SYSTEM_PROMPTS: Record<LanguageCode, string> = {
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
};
