export interface KnowledgeDocument {
  id: string;
  title: string;
  category: "faq" | "product" | "policy" | "troubleshooting";
  content: string;
  tags: string[];
}

export const KNOWLEDGE_BASE: KnowledgeDocument[] = [
  {
    id: "faq-001",
    title: "What languages does Ndumi support?",
    category: "faq",
    content:
      "Ndumi supports five languages: Igbo, Yoruba, Hausa, Nigerian Pidgin, and English. " +
      "It can detect the language as the customer speaks and switch mid-conversation.",
    tags: ["languages", "support", "igbo", "yoruba", "hausa", "pidgin", "english"],
  },
  {
    id: "faq-002",
    title: "How do I integrate Ndumi via API?",
    category: "faq",
    content:
      "Create a session with POST /v1/sessions, then connect to the WebSocket URL returned. " +
      "Stream audio chunks and listen for final_transcript, agent_text, and agent_audio_chunk events.",
    tags: ["api", "integration", "websocket", "session", "rest"],
  },
  {
    id: "faq-003",
    title: "Can Ndumi be embedded on my website?",
    category: "faq",
    content:
      "Yes. Add a single script tag to your site and Ndumi renders a talk-to-us bubble " +
      "with the same listening/thinking/speaking pulse interface.",
    tags: ["widget", "embed", "website", "script"],
  },
  {
    id: "faq-004",
    title: "Does Ndumi work on WhatsApp?",
    category: "faq",
    content:
      "Yes. Customers send voice notes in any of the five supported languages. " +
      "Ndumi transcribes, decides, and replies with a voice note in the same language.",
    tags: ["whatsapp", "voice", "notes", "integration"],
  },
  {
    id: "product-001",
    title: "Ndumi call flow",
    category: "product",
    content:
      "The call flow is: 1) Customer speaks (VAD detects start/end), 2) Language is detected live via streaming ASR, " +
      "3) Ndumi decides what to do (check order, create ticket, get account, or escalate), 4) Reply is spoken back " +
      "in the same language with ~800ms end-to-end latency.",
    tags: ["call", "flow", "vad", "asr", "latency", "pipeline"],
  },
  {
    id: "product-002",
    title: "Ndumi tools and actions",
    category: "product",
    content:
      "Ndumi can: check_order (look up order by ID), create_ticket (open support ticket), " +
      "get_account (retrieve account by phone/email), and escalate_to_human (hand off to human agent).",
    tags: ["tools", "actions", "order", "ticket", "account", "escalate"],
  },
  {
    id: "policy-001",
    title: "Data retention policy",
    category: "policy",
    content:
      "Conversation transcripts are retained for 90 days. Audio recordings are deleted after processing " +
      "unless explicitly saved. Customers can request data deletion at any time.",
    tags: ["data", "retention", "privacy", "deletion", "policy"],
  },
  {
    id: "policy-002",
    title: "Escalation policy",
    category: "policy",
    content:
      "When a conversation is escalated to a human agent, Ndumi pauses, pushes the full transcript " +
      "to the human queue, and the human agent can resume from where Ndumi left off. " +
      "Escalation triggers include: customer request, complex issues, sensitive topics, or fraud concerns.",
    tags: ["escalation", "human", "handoff", "transcript", "queue"],
  },
  {
    id: "troubleshoot-001",
    title: "Audio not being detected",
    category: "troubleshooting",
    content:
      "If Ndumi is not responding to speech: 1) Check microphone permissions in browser, " +
      "2) Ensure VAD threshold is not too high, 3) Verify WebSocket connection is open, " +
      "4) Check that audio chunks are being sent as base64-encoded data.",
    tags: ["audio", "microphone", "vad", "troubleshooting", "websocket"],
  },
  {
    id: "troubleshoot-002",
    title: "Wrong language detected",
    category: "troubleshooting",
    content:
      "If Ndumi detects the wrong language: The language detection model works best with clear audio. " +
      "Code-switching (mixing languages) is supported but may reduce confidence. " +
      "You can force a language by setting it in the session creation request.",
    tags: ["language", "detection", "code-switching", "troubleshooting"],
  },
];
