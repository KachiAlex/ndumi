const SPITCH_BASE_URL = "https://api.spitch.app";
const API_KEY = process.env.SPITCH_API_KEY || "";

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

export async function transcribe(
  audioBuffer: Buffer,
  language?: string,
  options?: {
    specialWords?: string;
    timestamp?: "sentence" | "word";
  },
): Promise<AsrResult> {
  if (!API_KEY) {
    console.warn("[ASR] No SPITCH_API_KEY set");
    return { text: "" };
  }

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

  try {
    const res = await fetch(`${SPITCH_BASE_URL}/v1/transcriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
      },
      body: formData,
    });

    const data = (await res.json()) as SpitchTranscriptionResponse;

    if (data.error) {
      console.error("[ASR] Spitch error:", data.error.message);
      return { text: "" };
    }

    return {
      text: data.text || "",
      language: data.language,
      segments: data.segments,
    };
  } catch (err) {
    console.error("[ASR] Spitch fetch failed:", err);
    return { text: "" };
  }
}

export async function detectLanguage(audioBuffer: Buffer): Promise<{ language: string; text: string }> {
  const result = await transcribe(audioBuffer);
  return { language: result.language || "en", text: result.text };
}
