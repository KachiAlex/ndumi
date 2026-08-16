import { Router } from "express";
import type { TtsRequest, TtsResponse, LanguageCode } from "@ndumi/shared";

export const ttsRouter = Router();

const VALID_LANGS: LanguageCode[] = ["ig", "yo", "ha", "pcm", "en"];

ttsRouter.post("/", (req, res) => {
  const body = req.body as TtsRequest;

  if (!body?.text || typeof body.text !== "string") {
    res.status(400).json({ error: "Missing required field: text" });
    return;
  }

  if (!body?.language || !VALID_LANGS.includes(body.language)) {
    res.status(400).json({ error: `Invalid language. Must be one of: ${VALID_LANGS.join(", ")}` });
    return;
  }

  // Placeholder: in production this calls the TTS service (Storm TTS / Tavus)
  // and returns a streaming audio URL or base64 chunks.
  const response: TtsResponse = {
    audioUrl: `data:audio/mpeg;base64,PLACEHOLDER_TTS_AUDIO`,
    duration: Math.ceil(body.text.length / 15),
    mimeType: "audio/mpeg",
  };

  res.json(response);
});
