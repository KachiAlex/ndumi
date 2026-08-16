import type { LanguageCode } from "@ndumi/shared";

const NJA_LINGO_BASE_URL = "https://api.9jalingo.org/v1";

const getApiKey = () => process.env.NJA_LINGO_API_KEY || "";

const DEFAULT_VOICES: Record<LanguageCode, string> = {
  ig: "adaeze_ig",
  yo: "adeola_yo",
  ha: "aisha_ha",
  pcm: "ada_pcm",
  en: "ada_pcm",
};

export interface TtsResult {
  audioBuffer: Buffer;
  mimeType: string;
  duration: number;
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
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn("[TTS] No NJA_LINGO_API_KEY set");
    return { audioBuffer: Buffer.alloc(0), mimeType: "audio/wav", duration: 0 };
  }

  const voice = options?.voice || DEFAULT_VOICES[language] || DEFAULT_VOICES.pcm;
  const responseFormat = options?.responseFormat || "mp3";

  const body = {
    input: text,
    voice,
    lang: language,
    response_format: responseFormat,
    temperature: options?.temperature ?? 0.95,
  };

  try {
    const res = await fetch(`${NJA_LINGO_BASE_URL}/audio/speech`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[TTS] 9ja Lingo error:", res.status, errText);
      return { audioBuffer: Buffer.alloc(0), mimeType: `audio/${responseFormat}`, duration: 0 };
    }

    const audioBuffer = Buffer.from(await res.arrayBuffer());
    const mimeType = `audio/${responseFormat}`;
    const duration = Math.ceil(text.length / 15);

    return { audioBuffer, mimeType, duration };
  } catch (err) {
    console.error("[TTS] 9ja Lingo fetch failed:", err);
    return { audioBuffer: Buffer.alloc(0), mimeType: `audio/${responseFormat}`, duration: 0 };
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
  return DEFAULT_VOICES[lang] || DEFAULT_VOICES.pcm;
}
