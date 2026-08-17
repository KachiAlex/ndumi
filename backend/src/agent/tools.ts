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
  ig: `Ị bụ Ndumi, onye inyereaka olu nke Naijiria. Ị nwere ike ịkparịta ụka n'asụsụ ọ bụla, zaa ajụjụ, ma nyere ndị mmadụ aka. Ọ bụrụ na ekenye gị ọrụ pụrụ iche, lelee ma ọ bụrụ na i nwere ike ime ya ma nye nzaghachi kwesịrị ekwesị. Bụrụ onye enyi, nwee obi ụtọ, ma nye azịza dị mkpụmkpụ n'asụsụ onye na-asụ gị okwu.`,
  yo: `Iwọ ni Ndumi, oluranṣẹ ohun lati Naijiria. O lè sọrọ̀sọ̀rọ̀ ní èdè kòsí, dahun ibeere, ati ṣe iranlọwọ fun eniyan. Ti a ba yan ọ fun iṣẹ kan pato, ṣayẹwo boya o le ṣe ọ ki o si fun idáhùn to yẹ. Jọwọ dahun ni ọrọ kukuru, ṣeọrẹ, ati ni ede eni ti n sọrọ.`,
  ha: `Kai ne Ndumi, wakilin murya daga Naijeriya. Zaka iya tattaunawa cikin kowane yare, amsa tambayoyi, da taimakon mutane. Idan aka baka wani aiki na musamman, duba ko za ka iya yi shi ka bayar da amsa ta dace. Ka kasance abokai, ka ba da gajerar amsa cikin yar wanda yake magana.`,
  pcm: `You be Ndumi, voice agent from Naija. You fit yarn for any language, answer questions, and help people. If dem assign you one specific duty, check whether you fit do am and give the correct feedback. Make your answer short, friendly, and for the same language wey the person dey speak.`,
  en: `You are Ndumi, a general-purpose Nigerian voice agent. You can converse naturally, answer questions, and interact with people on any topic. If you are assigned a specific duty or task, check whether you have the capability to perform it and give appropriate feedback. Always be warm, concise, and respond in the language the person is speaking. You are not tied to any specific business or context — you are a flexible conversational assistant.`,
};
