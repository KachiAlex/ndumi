import type { LanguageCode } from "@ndumi/shared";

const ORINODE_BASE_URL = "https://maraba.ai/api/v1/tts";
const FISH_AUDIO_BASE_URL = "https://api.fish.audio/v1/tts";
const GOOGLE_TTS_URL = "https://texttospeech.googleapis.com/v1/text:synthesize";
const NJA_LINGO_BASE_URL = "https://api.9jalingo.org/v1";
const SPITCH_BASE_URL = "https://api.spitch.app";

const getOrinodeKey = () => process.env.ORINODE_API_KEY || "";
const getFishAudioKey = () => process.env.FISH_AUDIO_API_KEY || "";
const getGoogleServiceAccount = () => process.env.GOOGLE_TTS_SERVICE_ACCOUNT_JSON || "";
const getNjaLingoKey = () => process.env.NJA_LINGO_API_KEY || "";
const getSpitchKey = () => process.env.SPITCH_API_KEY || "";

const ORINODE_VOICES: Record<LanguageCode, string> = {
  ig: "ig-chiamaka",
  yo: "yo-adunni",
  ha: "ha-aisha",
  pcm: "pcm-bobo",
  en: "en-tola",
};

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

const GOOGLE_LANGUAGE_CODES: Record<LanguageCode, string> = {
  ig: "ig-NG",
  yo: "yo-NG",
  ha: "ha-NG",
  pcm: "en-NG",
  en: "en-NG",
};

const GOOGLE_VOICE_NAMES: Record<LanguageCode, string> = {
  ig: "ig-NG-Standard-A",
  yo: "yo-NG-Standard-A",
  ha: "ha-NG-Standard-A",
  pcm: "en-NG-Standard-A",
  en: "en-NG-Standard-A",
};

export interface TtsResult {
  audioBuffer: Buffer;
  mimeType: string;
  duration: number;
  provider: "orinode" | "fish_audio" | "google" | "9ja_lingo" | "spitch";
}

async function synthesizeOrinode(
  text: string,
  language: LanguageCode,
  responseFormat: string,
): Promise<TtsResult> {
  const apiKey = getOrinodeKey();
  if (!apiKey) throw new Error("No ORINODE_API_KEY");

  const voice = ORINODE_VOICES[language] || ORINODE_VOICES.en;
  const fmt = responseFormat === "wav" ? "wav" : "mp3";

  const res = await fetch(ORINODE_BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
    body: JSON.stringify({ text, voice, format: fmt, sample_rate: 16000 }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Orinode ${res.status}: ${errText.substring(0, 200)}`);
  }

  const audioBuffer = Buffer.from(await res.arrayBuffer());
  return {
    audioBuffer,
    mimeType: `audio/${fmt}`,
    duration: Math.ceil(text.length / 15),
    provider: "orinode",
  };
}

async function synthesizeFishAudio(
  text: string,
  _language: LanguageCode,
  _responseFormat: string,
): Promise<TtsResult> {
  const apiKey = getFishAudioKey();
  if (!apiKey) throw new Error("No FISH_AUDIO_API_KEY");

  const MALE_NIGERIAN_VOICE = "0d3dde577c164738857eb6272ce853c2";

  const res = await fetch(FISH_AUDIO_BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      model: "s2.1-pro-free",
    },
    body: JSON.stringify({
      text,
      format: "mp3",
      reference_id: MALE_NIGERIAN_VOICE,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Fish Audio ${res.status}: ${errText.substring(0, 200)}`);
  }

  const audioBuffer = Buffer.from(await res.arrayBuffer());
  return {
    audioBuffer,
    mimeType: "audio/mp3",
    duration: Math.ceil(text.length / 15),
    provider: "fish_audio",
  };
}

let cachedGoogleToken: { token: string; expiresAt: number } | null = null;

async function getGoogleAccessToken(): Promise<string> {
  if (cachedGoogleToken && Date.now() < cachedGoogleToken.expiresAt - 60000) {
    return cachedGoogleToken.token;
  }

  const saJson = getGoogleServiceAccount();
  if (!saJson) throw new Error("No GOOGLE_TTS_SERVICE_ACCOUNT_JSON");

  const sa = JSON.parse(saJson);
  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 3600;

  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    exp: expiry,
    iat: now,
  };

  const encoder = new TextEncoder();
  const headerB64 = Buffer.from(JSON.stringify(header)).toString("base64url");
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signInput = `${headerB64}.${payloadB64}`;

  const keyData = crypto.subtle.importKey(
    "pkcs8",
    strToAb(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    await keyData,
    encoder.encode(signInput),
  );

  const token = `${signInput}.${Buffer.from(signature).toString("base64url")}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${token}`,
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`Google auth failed: ${err.substring(0, 200)}`);
  }

  const tokenData = await tokenRes.json() as { access_token: string; expires_in: number };
  cachedGoogleToken = {
    token: tokenData.access_token,
    expiresAt: Date.now() + tokenData.expires_in * 1000,
  };
  return cachedGoogleToken.token;
}

function strToAb(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----[^-]+-----/g, "").replace(/\s/g, "");
  const binary = Buffer.from(b64, "base64");
  return binary.buffer.slice(binary.byteOffset, binary.byteOffset + binary.byteLength);
}

async function synthesizeGoogle(
  text: string,
  language: LanguageCode,
  _responseFormat: string,
): Promise<TtsResult> {
  const accessToken = await getGoogleAccessToken();

  const langCode = GOOGLE_LANGUAGE_CODES[language] || "en-NG";
  const voiceName = GOOGLE_VOICE_NAMES[language] || "en-NG-Standard-A";

  const res = await fetch(GOOGLE_TTS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: langCode, name: voiceName, ssmlGender: "FEMALE" },
      audioConfig: { audioEncoding: "MP3", speakingRate: 1.0 },
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Google TTS ${res.status}: ${errText.substring(0, 200)}`);
  }

  const data = await res.json() as { audioContent: string };
  const audioBuffer = Buffer.from(data.audioContent, "base64");
  return {
    audioBuffer,
    mimeType: "audio/mp3",
    duration: Math.ceil(text.length / 15),
    provider: "google",
  };
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
  const spitchLang = language === "en" ? "en" : language === "pcm" ? "en" : language;

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

  // 1. Orinode (Nigerian-native, free beta)
  try {
    return await synthesizeOrinode(text, language, responseFormat);
  } catch (err) {
    console.warn("[TTS] Orinode failed:", (err as Error).message);
  }

  // 2. Fish Audio (free through Aug 2026, no cap, 83 languages)
  try {
    return await synthesizeFishAudio(text, language, responseFormat);
  } catch (err) {
    console.warn("[TTS] Fish Audio failed:", (err as Error).message);
  }

  // 3. Google Cloud TTS (4M+1M chars/month permanent free)
  try {
    return await synthesizeGoogle(text, language, responseFormat);
  } catch (err) {
    console.warn("[TTS] Google Cloud failed:", (err as Error).message);
  }

  // 4. 9ja Lingo (existing, rate-limited)
  try {
    return await synthesizeNjaLingo(text, language, responseFormat);
  } catch (err) {
    console.warn("[TTS] 9ja Lingo failed:", (err as Error).message);
  }

  // 5. Spitch (existing, credits exhausted)
  try {
    return await synthesizeSpitch(text, language, responseFormat);
  } catch (err) {
    console.error("[TTS] All providers failed. Last error (Spitch):", (err as Error).message);
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
  return ORINODE_VOICES[lang] || ORINODE_VOICES.en;
}
