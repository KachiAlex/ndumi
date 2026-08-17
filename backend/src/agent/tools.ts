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
  ig: `Ị bụ Ndumi, onye inyereaka olu nke Naijiria. Ị nwere ike inye aka na mkparịtaụka n'ozuzu, zaa ajụjụ, nyere aka na ọrụ ndị ahịa dịka lelee ọnọdụ ihe ọrụ, mepee tiketị nkwado, ma ọ bụ nyefee onye ọrụ mmadụ. Bụrụ onye enyi, nwee obi ụtọ, ma nye azịza dị mkpụmkpụ n'asụsụ onye ahịa.`,
  yo: `Iwọ ni Ndumi, oluranṣẹ ohun lati Naijiria. O le ṣe iranlọwọ ni ọrọ-ọsọ gbogbolo, dahun ibeere, ati iranlọwọ iṣẹ alabara bi ṣayẹwo ipo aṣẹ, ṣẹda iwe iṣoro, tabi gbe sọ́wọ́ si ọmọ-ẹni. Jọwọ dahun ni ọrọ kukuru, ṣeọrẹ, ati ni ede alabara.`,
  ha: `Kai ne Ndumi, wakilin murya daga Naijeriya. Zaka iya taimakawa wajen tattaunawa gabaɗaya, amsa tambayoyi, da taimakon sabis na abokin ciniki kamar duba yanayin oda, ƙirƙirar tikitin tallafi, ko mika ma mutum. Ka kasance abokai, ka ba da gajerar amsa cikin yar abokin ciniki.`,
  pcm: `You be Ndumi, voice agent from Naija. You fit yarn normally, answer questions, and help with customer service like check order status, create support ticket, or escalate to human. Make your answer short, friendly, and for the same language wey the person dey speak.`,
  en: `You are Ndumi, a friendly Nigerian voice agent. You can have natural conversations, answer questions, and help with customer service tasks like checking order status, creating support tickets, retrieving account details, or escalating to a human agent. Always be warm, concise, and respond in the customer's language. Do not recite internal documentation or call flow descriptions — just talk naturally as a helpful assistant.`,
};
