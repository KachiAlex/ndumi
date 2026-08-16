import type { LanguageCode, ToolName } from "@ndumi/shared";

export interface ToolSchema {
  name: ToolName;
  description: string;
  parameters: Record<string, {
    type: "string" | "number" | "boolean";
    required: boolean;
    description: string;
  }>;
}

export const TOOL_SCHEMAS: Record<ToolName, ToolSchema> = {
  check_order: {
    name: "check_order",
    description: "Look up an order by its ID. Returns order status, items, and delivery estimate.",
    parameters: {
      orderId: {
        type: "string",
        required: true,
        description: "The order ID, e.g. ORD-12345",
      },
    },
  },
  create_ticket: {
    name: "create_ticket",
    description: "Create a support ticket for issues that require human follow-up.",
    parameters: {
      subject: {
        type: "string",
        required: true,
        description: "Short summary of the customer's issue",
      },
      priority: {
        type: "string",
        required: false,
        description: "Ticket priority: low, medium, high, urgent",
      },
      description: {
        type: "string",
        required: false,
        description: "Detailed description of the issue",
      },
    },
  },
  get_account: {
    name: "get_account",
    description: "Retrieve account details for a customer by phone number or email.",
    parameters: {
      identifier: {
        type: "string",
        required: true,
        description: "Phone number or email address",
      },
    },
  },
  escalate_to_human: {
    name: "escalate_to_human",
    description: "Escalate the conversation to a human agent. Use when the issue is complex, sensitive, or the customer explicitly requests a human.",
    parameters: {
      reason: {
        type: "string",
        required: true,
        description: "Why escalation is needed",
      },
      urgency: {
        type: "string",
        required: false,
        description: "Urgency level: normal, priority, emergency",
      },
    },
  },
};

export const GUARDRAILS = {
  maxToolCallsPerTurn: 3,
  maxConversationTurns: 20,
  forbiddenTopics: [
    "political opinions",
    "religious beliefs",
    "medical diagnosis",
    "legal advice",
    "financial investment recommendations",
  ],
  escalationTriggers: [
    "customer requests human agent",
    "customer is frustrated or angry",
    "issue cannot be resolved with available tools",
    "sensitive personal information required",
    "potential fraud or security concern",
  ],
};

export const SYSTEM_PROMPTS: Record<LanguageCode, string> = {
  ig: `Ị bụ Ndumi, onye nnọchianya olu maka ọrụ ndị ahịa. Gịnị ị nwere ike ime: lelee ọnọdụ ihe ọrụ, mepee tiketị nkwado, weghachite nkọwa akaụntụ, ma ọ bụ nyefee onye ọrụ mmadụ. Bụrụ nwayọọ, nye azịza n'ụzọ dị mkpụmkpụ.`,
  yo: `Iwọ ni Ndumi, oluranṣẹ ohun fun iṣẹ alabara. Ohun ti o le ṣe: ṣayẹwo ipo aṣẹ, ṣẹda iwe iṣoro, gba alaye iroyin, tabi gbe sọ́wọ́ si ọmọ-ẹni. Jọwọ dahun ni ọrọ kukuru.`,
  ha: `Kai ne Ndumi, wakilin murya don sabis na abokin ciniki. Abin da za ka iya yi: duba yanayin oda, ƙirƙirar tikitin tallafi, dawo da bayanan asusun, ko mika ma mutum. Da sauri, ka ba da gajerar amsa.`,
  pcm: `You be Ndumi, voice agent for customer service. Wetin you fit do: check order status, create support ticket, get account details, or escalate to human. Make your answer short and clear.`,
  en: `You are Ndumi, a voice agent for customer service. What you can do: check order status, create support tickets, retrieve account details, or escalate to a human agent. Always be concise and respond in the customer's language.`,
};
