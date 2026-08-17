const GROQ_BASE_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const SPITCH_BASE_URL = "https://api.spitch.app";
const getGroqKey = () => process.env.GROQ_API_KEY || "";
const getSpitchKey = () => process.env.SPITCH_API_KEY || "";

const GROQ_LANG_MAP: Record<string, string> = {
  ig: "ig",
  yo: "yo",
  ha: "ha",
  pcm: "en",
  en: "en",
};

interface GroqTranscriptionResponse {
  text: string;
  language?: string;
  segments?: Array<{ text: string; start: number; end: number }>;
  error?: { message: string };
}

interface SpitchTranscriptionResponse {
  text: string;
  segments?: Array<{ text: string; start: number; end: number }>;
  language?: string;
  error?: { message: string };
}

export interface AsrResult {
  text: string;
  language?: string;
  segments?: Array<{ text: string; start: number; end: number }>;
}

async function transcribeGroq(
  audioBuffer: Buffer,
  language?: string,
): Promise<AsrResult> {
  const apiKey = getGroqKey();
  if (!apiKey) throw new Error("No GROQ_API_KEY");

  const formData = new FormData();
  const blob = new Blob([audioBuffer], { type: "audio/wav" });
  formData.append("file", blob, "audio.wav");
  formData.append("model", "whisper-large-v3-turbo");
  formData.append("response_format", "verbose_json");

  if (language) {
    const langCode = GROQ_LANG_MAP[language] || language;
    formData.append("language", langCode);
  }

  const res = await fetch(GROQ_BASE_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Groq ASR ${res.status}: ${errText.substring(0, 200)}`);
  }

  const data = (await res.json()) as GroqTranscriptionResponse;
  return {
    text: data.text || "",
    language: data.language,
    segments: data.segments,
  };
}

async function transcribeSpitch(
  audioBuffer: Buffer,
  language?: string,
  options?: {
    specialWords?: string;
    timestamp?: "sentence" | "word";
  },
): Promise<AsrResult> {
  const apiKey = getSpitchKey();
  if (!apiKey) throw new Error("No SPITCH_API_KEY");

  const formData = new FormData();
  const blob = new Blob([audioBuffer], { type: "audio/wav" });
  formData.append("content", blob, "audio.wav");

  if (language) {
    formData.append("language", language);
  }

  if (options?.specialWords) {
    formData.append("special_words", options.specialWords);
  }

  if (options?.timestamp) {
    formData.append("timestamp", options.timestamp);
  }

  const res = await fetch(`${SPITCH_BASE_URL}/v1/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
    signal: AbortSignal.timeout(30000),
  });

  const data = (await res.json()) as SpitchTranscriptionResponse;

  if (data.error) {
    throw new Error(`Spitch ASR: ${data.error.message}`);
  }

  return {
    text: data.text || "",
    language: data.language,
    segments: data.segments,
  };
}

export async function transcribe(
  audioBuffer: Buffer,
  language?: string,
  options?: {
    specialWords?: string;
    timestamp?: "sentence" | "word";
  },
): Promise<AsrResult> {
  // 1. Groq Whisper (free, 2000 req/day, fast)
  try {
    return await transcribeGroq(audioBuffer, language);
  } catch (err) {
    console.warn("[ASR] Groq failed:", (err as Error).message);
  }

  // 2. Spitch (existing, credits may be exhausted)
  try {
    return await transcribeSpitch(audioBuffer, language, options);
  } catch (err) {
    console.error("[ASR] All providers failed. Last error (Spitch):", (err as Error).message);
    return { text: "" };
  }
}

export async function detectLanguage(audioBuffer: Buffer): Promise<{ language: string; text: string }> {
  const result = await transcribe(audioBuffer);
  return { language: result.language || "en", text: result.text };
}
