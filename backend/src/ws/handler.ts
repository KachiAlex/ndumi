import type { WebSocket } from "ws";
import type { IncomingMessage } from "http";
import { sessionStore } from "../sessionStore.js";
import { redisStore } from "../redisStore.js";
import { reason, act } from "../agent/index.js";
import type { AgentContext } from "../agent/index.js";
import { transcribe } from "../services/asr.js";
import { synthesizeToBase64 } from "../services/tts.js";
import type {
  WsEvent,
  WsEventType,
  AgentState,
  LanguageCode,
  FinalTranscriptData,
  PartialTranscriptData,
  AgentAudioChunkData,
  AgentTextData,
  LanguageDetectedData,
  StateChangeData,
  ErrorData,
  SessionEndData,
  ToolCallData,
  ToolResultData,
} from "@ndumi/shared";

const WELCOME_MESSAGES: Record<LanguageCode, string> = {
  ig: "Nnọọ, ị byala Ndumi. Kedu ka m ga-esi nyere gị aka taa?",
  yo: "Ẹ káàbọ̀, ẹ wọ́ sí ọ̀dọ̀ Ndumi. Bawo ni mo lè ṣe iranlọwọ fún ẹ lóní?",
  ha: "Barka da zuwa, ka zo ga Ndumi. Ta yaya zan iya taimaka maku yau?",
  pcm: "I dey welcome you to Ndumi. How I fit help you today?",
  en: "Welcome, you're speaking with Ndumi. How can I help you today?",
};

function sendEvent(ws: WebSocket, type: WsEventType, data: unknown): void {
  const event: WsEvent = { type, data, timestamp: Date.now() };
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(event));
  }
}

function setState(ws: WebSocket, sessionId: string, newState: AgentState): void {
  const session = sessionStore.get(sessionId);
  if (!session) return;
  const prevState = session.state;
  if (prevState === newState) return;
  sessionStore.updateState(sessionId, newState);
  const data: StateChangeData = { state: newState, previousState: prevState };
  sendEvent(ws, "state_change", data);
}

export function handleSessionWs(ws: WebSocket, req: IncomingMessage): void {
  const urlParts = req.url?.split("/") ?? [];
  const sessionId = urlParts[urlParts.length - 2] ?? "";

  const session = sessionStore.get(sessionId);
  if (!session) {
    const errorData: ErrorData = { code: "SESSION_NOT_FOUND", message: `Session ${sessionId} does not exist` };
    sendEvent(ws, "error", errorData);
    ws.close(1008, "Session not found");
    return;
  }

  console.log(`[WS] Session ${sessionId} connected`);

  const conversationHistory: { speaker: "customer" | "agent"; text: string }[] = [];
  let turnCount = 0;

  // Send welcome message immediately on connect
  const welcomeLang: LanguageCode = session.language || "en";
  const welcomeText = WELCOME_MESSAGES[welcomeLang] || WELCOME_MESSAGES.en;

  (async () => {
    try {
      setState(ws, sessionId, "speaking");
      sessionStore.addTranscript(sessionId, {
        speaker: "agent",
        language: welcomeLang,
        text: welcomeText,
        isFinal: true,
      });

      const textData: AgentTextData = { text: welcomeText, language: welcomeLang };
      sendEvent(ws, "agent_text", textData);

      const ttsResult = await synthesizeToBase64(welcomeText, welcomeLang, {
        responseFormat: "mp3",
      });

      if (ttsResult.base64) {
        const audioData: AgentAudioChunkData = {
          chunk: ttsResult.base64,
          sequence: 0,
          mimeType: ttsResult.mimeType,
        };
        sendEvent(ws, "agent_audio_chunk", audioData);
      } else {
        const audioData: AgentAudioChunkData = {
          chunk: "",
          sequence: 0,
          mimeType: "audio/mpeg",
        };
        sendEvent(ws, "agent_audio_chunk", audioData);
      }

      conversationHistory.push({ speaker: "agent", text: welcomeText });
      await redisStore.addToHistory(sessionId, "agent", welcomeText);
      setState(ws, sessionId, "idle");
    } catch (err) {
      console.error("[WS] Welcome message failed:", err);
      setState(ws, sessionId, "idle");
    }
  })();

  ws.on("message", async (raw: Buffer) => {
    let msg: { type: string; data?: Record<string, unknown> };
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      const errorData: ErrorData = { code: "INVALID_MESSAGE", message: "Message must be valid JSON" };
      sendEvent(ws, "error", errorData);
      return;
    }

    switch (msg.type) {
      case "audio_chunk": {
        setState(ws, sessionId, "listening");
        // If audio bytes are provided, send to Spitch for partial transcription
        const audioBytes = msg.data?.audio as string | undefined;
        if (audioBytes) {
          try {
            const audioBuffer = Buffer.from(audioBytes, "base64");
            const lang = session.language || "en";
            const asrResult = await transcribe(audioBuffer, lang);
            const partialData: PartialTranscriptData = {
              text: asrResult.text || "",
              language: (asrResult.language as LanguageCode) || lang,
              isFinal: false,
            };
            sendEvent(ws, "partial_transcript", partialData);
          } catch {
            const partialData: PartialTranscriptData = {
              text: (msg.data?.text as string) || "",
              language: session.language ?? "en",
              isFinal: false,
            };
            sendEvent(ws, "partial_transcript", partialData);
          }
        } else {
          const partialData: PartialTranscriptData = {
            text: (msg.data?.text as string) || "",
            language: session.language ?? "en",
            isFinal: false,
          };
          sendEvent(ws, "partial_transcript", partialData);
        }
        break;
      }

      case "audio_end": {
        let finalText = (msg.data?.text as string) || "";
        let detectedLang: LanguageCode = (msg.data?.language as LanguageCode) || session.language || "en";

        // If audio bytes are provided, use Spitch for final transcription
        const audioBytes = msg.data?.audio as string | undefined;
        if (audioBytes) {
          try {
            const audioBuffer = Buffer.from(audioBytes, "base64");
            const asrResult = await transcribe(audioBuffer, detectedLang, {
              timestamp: "sentence",
            });
            if (asrResult.text) {
              finalText = asrResult.text;
            }
            if (asrResult.language) {
              detectedLang = asrResult.language as LanguageCode;
            }
          } catch (err) {
            console.error("[WS] Spitch ASR failed:", err);
          }
        }

        if (!finalText || !finalText.trim()) {
          // Ignore empty transcripts — likely noise or agent echo
          setState(ws, sessionId, "idle");
          break;
        }

        sessionStore.setLanguage(sessionId, detectedLang);

        const langData: LanguageDetectedData = { language: detectedLang, confidence: 0.92 };
        sendEvent(ws, "language_detected", langData);

        const transcript = sessionStore.addTranscript(sessionId, {
          speaker: "customer",
          language: detectedLang,
          text: finalText,
          isFinal: true,
        });

        const finalData: FinalTranscriptData = {
          text: finalText,
          language: detectedLang,
          speaker: "customer",
          transcriptId: transcript.id,
        };
        sendEvent(ws, "final_transcript", finalData);

        conversationHistory.push({ speaker: "customer", text: finalText });
        await redisStore.addToHistory(sessionId, "customer", finalText);
        turnCount++;

        // Agent reasoning
        setState(ws, sessionId, "thinking");
        sessionStore.updateStatus(sessionId, "responding");

        const ctx: AgentContext = {
          sessionId,
          language: detectedLang,
          turnCount,
          toolCallsThisTurn: 0,
          conversationHistory,
        };

        const decision = await reason(ctx, finalText);
        sendEvent(ws, "agent_thinking", decision.thinking);

        // Emit tool calls
        for (const call of decision.toolCalls) {
          const callData: ToolCallData = { name: call.name, args: call.args };
          sendEvent(ws, "tool_call", callData);
        }

        // Execute tools
        const { results, finalResponseText, finalStatus } = await act(decision, ctx);

        for (const result of results) {
          const resultData: ToolResultData = {
            name: result.name,
            success: result.success,
            data: result.data,
            durationMs: 0,
          };
          sendEvent(ws, "tool_result", resultData);
        }

        // Agent responds
        setState(ws, sessionId, "speaking");
        sessionStore.addTranscript(sessionId, {
          speaker: "agent",
          language: detectedLang,
          text: finalResponseText,
          isFinal: true,
        });

        const textData: AgentTextData = { text: finalResponseText, language: detectedLang };
        sendEvent(ws, "agent_text", textData);

        // Synthesize speech via 9ja Lingo TTS
        try {
          const ttsResult = await synthesizeToBase64(finalResponseText, detectedLang, {
            responseFormat: "mp3",
          });

          if (ttsResult.base64) {
            const audioData: AgentAudioChunkData = {
              chunk: ttsResult.base64,
              sequence: 0,
              mimeType: ttsResult.mimeType,
            };
            sendEvent(ws, "agent_audio_chunk", audioData);
          } else {
            const audioData: AgentAudioChunkData = {
              chunk: "",
              sequence: 0,
              mimeType: "audio/mpeg",
            };
            sendEvent(ws, "agent_audio_chunk", audioData);
          }
        } catch (ttsErr) {
          console.error("[WS] 9ja Lingo TTS failed:", ttsErr);
          const audioData: AgentAudioChunkData = {
            chunk: "",
            sequence: 0,
            mimeType: "audio/mpeg",
          };
          sendEvent(ws, "agent_audio_chunk", audioData);
        }

        conversationHistory.push({ speaker: "agent", text: finalResponseText });
        await redisStore.addToHistory(sessionId, "agent", finalResponseText);
        sessionStore.updateStatus(sessionId, finalStatus);

        // Create handoff record if escalated
        if (finalStatus === "escalated") {
          const transcripts = sessionStore.getTranscripts(sessionId);
          const handoffReason = decision.thinking.reasoning;
          await redisStore.createHandoff(sessionId, handoffReason, "normal", transcripts);
          console.log(`[WS] Session ${sessionId} escalated — handoff record created`);
        }

        setState(ws, sessionId, "idle");
        break;
      }

      case "end_session": {
        const transcripts = sessionStore.getTranscripts(sessionId);
        const endData: SessionEndData = {
          sessionId,
          duration: Date.now() - session.createdAt,
          transcriptCount: transcripts.length,
        };
        sessionStore.endSession(sessionId);
        sendEvent(ws, "session_end", endData);
        ws.close(1000, "Session ended");
        break;
      }

      default: {
        const errorData: ErrorData = { code: "UNKNOWN_MESSAGE_TYPE", message: `Unknown message type: ${msg.type}` };
        sendEvent(ws, "error", errorData);
      }
    }
  });

  ws.on("close", () => {
    console.log(`[WS] Session ${sessionId} disconnected`);
    sessionStore.updateState(sessionId, "idle");
  });

  ws.on("error", (err) => {
    console.error(`[WS] Session ${sessionId} error:`, err.message);
  });
}
