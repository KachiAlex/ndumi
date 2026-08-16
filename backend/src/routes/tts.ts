import { Router } from "express";
import type { TtsRequest, TtsResponse, LanguageCode } from "@ndumi/shared";
import { synthesizeToBase64 } from "../services/tts.js";

export const ttsRouter = Router();

const VALID_LANGS: LanguageCode[] = ["ig", "yo", "ha", "pcm", "en"];

ttsRouter.post("/", async (req, res) => {
  const body = req.body as TtsRequest;

  if (!body?.text || typeof body.text !== "string") {
    res.status(400).json({ error: "Missing required field: text" });
    return;
  }

  if (!body?.language || !VALID_LANGS.includes(body.language)) {
    res.status(400).json({ error: `Invalid language. Must be one of: ${VALID_LANGS.join(", ")}` });
    return;
  }

  const result = await synthesizeToBase64(body.text, body.language, {
    voice: body.voice,
    responseFormat: "mp3",
  });

  if (!result.base64) {
    res.status(200).json({
      audioUrl: "",
      duration: Math.ceil(body.text.length / 15),
      mimeType: "audio/mpeg",
      fallback: "browser_tts",
    } as TtsResponse & { fallback: string });
    return;
  }

  const response: TtsResponse = {
    audioUrl: `data:${result.mimeType};base64,${result.base64}`,
    duration: result.duration,
    mimeType: result.mimeType,
  };

  res.json(response);
});
