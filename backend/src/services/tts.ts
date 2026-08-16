import type { LanguageCode } from "@ndumi/shared";

const NJA_LINGO_BASE_URL = "https://api.9jalingo.org/v1";
const SPITCH_BASE_URL = "https://api.spitch.app";

const getNjaLingoKey = () => process.env.NJA_LINGO_API_KEY || "";
const getSpitchKey = () => process.env.SPITCH_API_KEY || "";

const NJA_VOICES: Record<LanguageCode, string> = {
  ig: "adaeze_ig",
  yo: "adeola_yo",
  ha: "aisha_ha",
  pcm: "ada_pcm",
  en: "ada_pcm",
};

const SPITCH_VOICES: Record<LanguageCode, string> = {
  ig: "ngozi",
  yo: "sade",
  ha: "amina",
  pcm: "femi",
  en: "femi",
};

export interface TtsResult {
  audioBuffer: Buffer;
  mimeType: string;
  duration: number;
  provider: "9ja_lingo" | "spitch";
}

async function synthesizeNjaLingo(
  text: string,
  language: LanguageCode,
  responseFormat: string,
): Promise<TtsResult> {
  const apiKey = getNjaLingoKey();
  if (!apiKey) throw new Error("No NJA_LINGO_API_KEY");

  const voice = NJA_VOICES[language] || NJA_VOICES.pcm;
  const ttsLang = language === "en" ? "pcm" : language;

  const body = {
    input: text,
    voice,
    lang: ttsLang,
    response_format: responseFormat,
    temperature: 0.95,
  };

  const res = await fetch(`${NJA_LINGO_BASE_URL}/audio/speech`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`9ja Lingo ${res.status}: ${errText}`);
  }

  const audioBuffer = Buffer.from(await res.arrayBuffer());
  return {
    audioBuffer,
    mimeType: `audio/${responseFormat}`,
    duration: Math.ceil(text.length / 15),
    provider: "9ja_lingo",
  };
}

async function synthesizeSpitch(
  text: string,
  language: LanguageCode,
  responseFormat: string,
): Promise<TtsResult> {
  const apiKey = getSpitchKey();
  if (!apiKey) throw new Error("No SPITCH_API_KEY");

  const voice = SPITCH_VOICES[language] || SPITCH_VOICES.pcm;
  const spitchLang = language === "en" ? "en" : language;

  const body = {
    text,
    voice,
    language: spitchLang,
    format: responseFormat,
    speed: 1.0,
  };

  const res = await fetch(`${SPITCH_BASE_URL}/v1/speech`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Spitch ${res.status}: ${errText}`);
  }

  const audioBuffer = Buffer.from(await res.arrayBuffer());
  return {
    audioBuffer,
    mimeType: `audio/${responseFormat}`,
    duration: Math.ceil(text.length / 15),
    provider: "spitch",
  };
}

export async function synthesize(
  text: string,
  language: LanguageCode,
  options?: {
    voice?: string;
    responseFormat?: "wav" | "mp3" | "flac" | "aac" | "ogg" | "alac" | "pcm";
    temperature?: number;
  },
): Promise<TtsResult> {
  const responseFormat = options?.responseFormat || "mp3";

  // Try 9ja Lingo first
  try {
    return await synthesizeNjaLingo(text, language, responseFormat);
  } catch (err) {
    console.warn("[TTS] 9ja Lingo failed, falling back to Spitch:", (err as Error).message);
  }

  // Fallback to Spitch
  try {
    return await synthesizeSpitch(text, language, responseFormat);
  } catch (err) {
    console.error("[TTS] Spitch also failed:", (err as Error).message);
    return { audioBuffer: Buffer.alloc(0), mimeType: `audio/${responseFormat}`, duration: 0, provider: "spitch" };
  }
}

export async function synthesizeToBase64(
  text: string,
  language: LanguageCode,
  options?: { voice?: string; responseFormat?: "wav" | "mp3" | "flac" | "aac" | "ogg" | "alac" | "pcm" },
): Promise<{ base64: string; mimeType: string; duration: number }> {
  const result = await synthesize(text, language, options);
  return {
    base64: result.audioBuffer.toString("base64"),
    mimeType: result.mimeType,
    duration: result.duration,
  };
}

export function getDefaultVoice(lang: LanguageCode): string {
  return NJA_VOICES[lang] || NJA_VOICES.pcm;
}
