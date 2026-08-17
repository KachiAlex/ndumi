import { useState, useRef, useCallback, useEffect } from "react";
import { api, SessionStream } from "../lib/api";
import type { LanguageCode, AgentState } from "@ndumi/shared";

const LANGS: { code: LanguageCode; label: string; flag: string }[] = [
  { code: "ig", label: "Igbo", flag: "🇳🇬" },
  { code: "yo", label: "Yorùbá", flag: "🇳🇬" },
  { code: "ha", label: "Hausa", flag: "🇳🇬" },
  { code: "pcm", label: "Pidgin", flag: "🇳🇬" },
  { code: "en", label: "English", flag: "🇬🇧" },
];

const BCP47: Record<string, string> = {
  ig: "ig-NG",
  yo: "yo-NG",
  ha: "ha-NG",
  pcm: "en-NG",
  en: "en-NG",
};

interface TranscriptMsg {
  speaker: "customer" | "agent";
  text: string;
  lang: string;
}

export function MeetingRoom({ onLeave }: { onLeave: () => void }) {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [muted, setMuted] = useState(false);
  const [agentState, setAgentState] = useState<AgentState>("idle");
  const [detectedLang, setDetectedLang] = useState<LanguageCode | null>(null);
  const [selectedLang, setSelectedLang] = useState<LanguageCode>("en");
  const [transcript, setTranscript] = useState<TranscriptMsg[]>([]);
  const [partialText, setPartialText] = useState("");
  const [agentText, setAgentText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [waveHeights, setWaveHeights] = useState<number[]>(() => Array.from({ length: 24 }, () => 4));

  const streamRef = useRef<SessionStream | null>(null);
  const waveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recognitionRef = useRef<any>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const agentTextRef = useRef("");
  const selectedLangRef = useRef<LanguageCode>("en");
  const agentSpeakingRef = useRef(false);
  const shouldListenRef = useRef(false);

  useEffect(() => { agentTextRef.current = agentText; }, [agentText]);
  useEffect(() => { selectedLangRef.current = selectedLang; }, [selectedLang]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript, partialText]);

  // Timer
  useEffect(() => {
    if (connected) {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setElapsed(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [connected]);

  // Waveform animation based on agent state
  useEffect(() => {
    if (waveTimerRef.current) {
      clearInterval(waveTimerRef.current);
      waveTimerRef.current = null;
    }
    if (agentState === "listening" || agentState === "speaking") {
      waveTimerRef.current = setInterval(() => {
        setWaveHeights(Array.from({ length: 24 }, () => 4 + Math.round(Math.random() * (agentState === "speaking" ? 20 : 14))));
      }, 100);
    } else if (agentState === "thinking") {
      waveTimerRef.current = setInterval(() => {
        setWaveHeights(Array.from({ length: 24 }, () => 4 + Math.round(Math.random() * 6)));
      }, 200);
    } else {
      setWaveHeights(Array.from({ length: 24 }, () => 4));
    }
    return () => { if (waveTimerRef.current) clearInterval(waveTimerRef.current); };
  }, [agentState]);

  // Load voices early
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const startRecognition = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Speech recognition not supported in this browser. Use Chrome or Edge.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = BCP47[selectedLang] || "en-NG";

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }
      if (interim) setPartialText(interim);
      if (final.trim()) {
        setPartialText("");
        // Send to backend — the final_transcript event will add it to the transcript
        if (streamRef.current?.isConnected) {
          streamRef.current.sendAudioEnd(final.trim(), selectedLang);
        }
      }
    };

    recognition.onerror = (e: any) => {
      if (e.error !== "no-speech" && e.error !== "aborted") {
        console.warn("Recognition error:", e.error);
      }
    };

    recognition.onend = () => {
      // Auto-restart only if still connected, not muted, and agent is not speaking
      if (streamRef.current?.isConnected && !muted && !agentSpeakingRef.current && shouldListenRef.current) {
        try { recognition.start(); } catch {}
      }
    };

    try {
      recognitionRef.current = recognition;
      if (!shouldListenRef.current || agentSpeakingRef.current) return;
      recognition.start();
    } catch (e) {
      console.warn("Recognition start error:", e);
    }
  }, [selectedLang, muted]);

  const stopRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.onend = null; recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const session = await api.createSession({ language: selectedLang });
      const stream = new SessionStream();
      await stream.connect(session);
      streamRef.current = stream;
      setConnected(true);

      stream.on("state_change", (e) => {
        const data = e.data as { state: AgentState };
        setAgentState(data.state);
        // Stop recognition when agent is speaking or thinking
        if (data.state === "speaking" || data.state === "thinking") {
          agentSpeakingRef.current = true;
          if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch {}
          }
        }
        // Do NOT resume recognition on idle/listening here —
        // that happens only after audio.onended fires
      });

      stream.on("language_detected", (e) => {
        const data = e.data as { language: LanguageCode };
        setDetectedLang(data.language);
      });

      stream.on("partial_transcript", (e) => {
        const data = e.data as { text: string };
        setPartialText(data.text);
      });

      stream.on("final_transcript", (e) => {
        const data = e.data as { text: string; language: LanguageCode; speaker: "customer" | "agent" };
        setPartialText("");
        setTranscript((prev) => [...prev, { speaker: data.speaker, text: data.text, lang: data.language }]);
      });

      stream.on("agent_text", (e) => {
        const data = e.data as { text: string; language: LanguageCode };
        setAgentText(data.text);
        setTranscript((prev) => [...prev, { speaker: "agent", text: data.text, lang: data.language }]);
      });

      stream.on("agent_audio_chunk", (e) => {
        const data = e.data as { chunk: string; mimeType: string };
        if (data.chunk) {
          if (typeof window !== "undefined" && window.speechSynthesis) {
            window.speechSynthesis.cancel();
          }
          // Ensure recognition is stopped while audio plays
          agentSpeakingRef.current = true;
          if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch {}
          }
          const audio = new Audio(`data:${data.mimeType};base64,${data.chunk}`);
          audio.volume = 1.0;
          audio.onended = () => {
            // Resume recognition only after audio finishes playing
            agentSpeakingRef.current = false;
            if (streamRef.current?.isConnected && !muted && shouldListenRef.current) {
              setTimeout(() => {
                if (!agentSpeakingRef.current && shouldListenRef.current) {
                  startRecognition();
                }
              }, 300);
            }
          };
          audio.play().catch((err) => {
            console.warn("Audio playback failed:", err.message);
            // Still resume recognition if audio fails to play
            agentSpeakingRef.current = false;
            if (streamRef.current?.isConnected && !muted && shouldListenRef.current) {
              setTimeout(() => {
                if (shouldListenRef.current) {
                  startRecognition();
                }
              }, 300);
            }
          });
        }
      });

      stream.on("agent_thinking", () => {
        setAgentState("thinking");
      });

      stream.on("error", (e) => {
        const data = e.data as { message: string };
        setError(data.message);
      });

      stream.on("_ws_close", () => {
        setConnected(false);
        stopRecognition();
        setError("Connection closed. Please rejoin.");
      });

      stream.on("session_end", () => {
        setConnected(false);
        stopRecognition();
      });

      // Start listening after welcome message audio finishes playing
      // The agent_audio_chunk handler will resume recognition when audio ends
      setAgentState("speaking");
      agentSpeakingRef.current = true;
      shouldListenRef.current = true;
      // Create recognition object now (won't start until agentSpeakingRef is false)
      startRecognition();
    } catch (e) {
      setError(`Failed to connect: ${(e as Error).message}`);
      setConnected(false);
    } finally {
      setConnecting(false);
    }
  }, [selectedLang, startRecognition, stopRecognition]);

  const disconnect = useCallback(() => {
    stopRecognition();
    agentSpeakingRef.current = false;
    shouldListenRef.current = false;
    if (streamRef.current) {
      streamRef.current.endSession();
      streamRef.current.close();
      streamRef.current = null;
    }
    setConnected(false);
    setAgentState("idle");
    setPartialText("");
    setAgentText("");
    setDetectedLang(null);
    onLeave();
  }, [stopRecognition, onLeave]);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      if (next) {
        stopRecognition();
        if (typeof window !== "undefined" && window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
      } else {
        if (streamRef.current?.isConnected) {
          startRecognition();
        }
      }
      return next;
    });
  }, [startRecognition, stopRecognition]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const stateColors: Record<AgentState, string> = {
    idle: "rgba(91, 110, 232, 0.3)",
    listening: "rgba(210, 96, 58, 0.6)",
    thinking: "rgba(221, 171, 78, 0.6)",
    speaking: "rgba(91, 110, 232, 0.6)",
  };

  const stateLabels: Record<AgentState, string> = {
    idle: "Idle",
    listening: "Listening",
    thinking: "Thinking",
    speaking: "Speaking",
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#0a0e1c" }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-line">
        <div className="flex items-center gap-3">
          <div className="nav-mark" aria-hidden="true">N</div>
          <div>
            <div className="font-semibold text-[15px] tracking-tight">Ndumi Meeting</div>
            <div className="text-[11px] text-text-faint">
              {connected ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                  {formatTime(elapsed)}
                </span>
              ) : (
                "Not connected"
              )}
            </div>
          </div>
        </div>

        {/* Language selector */}
        <div className="flex gap-1.5 flex-wrap justify-center">
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => !connected && setSelectedLang(l.code)}
              disabled={connected}
              className={`text-[11px] px-3 py-1.5 rounded-full border font-medium transition-all disabled:opacity-50 ${
                selectedLang === l.code
                  ? "bg-indigo-dim border-indigo text-[#C7CFFB]"
                  : "border-line text-text-faint hover:border-indigo"
              }`}
            >
              {l.flag} {l.label}
            </button>
          ))}
        </div>

        <button
          onClick={disconnect}
          className="text-[12px] text-text-faint hover:text-text transition-colors"
        >
          ← Back to site
        </button>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
        {/* Background glow */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-500"
          style={{
            background: `radial-gradient(ellipse 600px 400px at 50% 45%, ${stateColors[agentState]}, transparent 70%)`,
            opacity: connected ? 0.5 : 0.15,
          }}
        />

        {/* Orb */}
        <div className="relative z-10 flex flex-col items-center">
          <div
            className={`orb-wrap w-[200px] h-[200px] mb-8 relative flex items-center justify-center ${agentState}`}
            style={{
              transition: "box-shadow 0.4s ease",
            }}
          >
            <div className={`orb-ring ${connected ? "active" : ""}`} />
            <div className={`orb-ring active`} style={{ animationDelay: "0.5s", opacity: connected ? undefined : 0 }} />
            <div className="orb-dash" />
            <div
              className="orb"
              style={{
                width: "160px",
                height: "160px",
                fontSize: "56px",
                boxShadow: connected
                  ? `inset 0 0 30px ${stateColors[agentState]}, 0 0 60px -15px ${stateColors[agentState]}`
                  : undefined,
              }}
            >
              N
            </div>
            {/* Waveform */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-[3px] items-end h-[20px] z-[3]">
              {waveHeights.map((h, i) => (
                <i
                  key={i}
                  className="w-[3px] rounded-[2px] bg-gold transition-[height] duration-75"
                  style={{ height: `${h}px` }}
                />
              ))}
            </div>
          </div>

          {/* State label */}
          <div className="font-mono text-[11px] uppercase tracking-[1.5px] text-text-faint mb-2">
            {connected ? stateLabels[agentState] : "Ready to connect"}
          </div>

          {/* Detected language */}
          {detectedLang && (
            <div className="text-[12px] text-text-dim mb-4">
              Detected: <span className="text-gold font-medium">{LANGS.find((l) => l.code === detectedLang)?.label}</span>
            </div>
          )}

          {/* Agent text bubble */}
          {agentText && agentState === "speaking" && (
            <div className="max-w-[500px] bg-panel border border-line rounded-2xl px-5 py-3 mb-4 text-[14px] leading-relaxed text-text">
              {agentText}
            </div>
          )}

          {/* Partial transcript */}
          {partialText && agentState === "listening" && (
            <div className="max-w-[500px] text-[14px] text-text-dim italic mb-4">
              {partialText}…
            </div>
          )}
        </div>

        {/* Transcript sidebar (right) — always visible when connected */}
        {connected && (
          <div className="absolute right-0 top-0 bottom-0 w-[340px] border-l border-line bg-[rgba(10,14,28,0.6)] backdrop-blur-sm p-4 overflow-y-auto hidden lg:block">
            <div className="font-mono text-[10px] uppercase tracking-[1px] text-text-faint mb-3">Live Transcript</div>
            {transcript.length === 0 ? (
              <div className="text-[12px] text-text-faint italic">Start speaking — your conversation will appear here.</div>
            ) : (
              <div className="flex flex-col gap-3">
                {transcript.map((msg, i) => (
                  <div key={i} className={`flex flex-col ${msg.speaker === "agent" ? "items-start" : "items-end"}`}>
                    <div className="text-[9px] uppercase tracking-[0.5px] text-text-faint mb-0.5">
                      {msg.speaker === "agent" ? "Ndumi" : "You"}
                    </div>
                    <div
                      className={`text-[13px] leading-relaxed rounded-xl px-3 py-2 max-w-[90%] ${
                        msg.speaker === "agent"
                          ? "bg-indigo-dim/30 border border-indigo/20 text-text"
                          : "bg-panel-2 border border-line text-text-dim"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {partialText && (
                  <div className="flex flex-col items-end">
                    <div className="text-[9px] uppercase tracking-[0.5px] text-text-faint mb-0.5">You</div>
                    <div className="text-[13px] leading-relaxed rounded-xl px-3 py-2 max-w-[90%] bg-panel-2 border border-line text-text-faint italic">
                      {partialText}…
                    </div>
                  </div>
                )}
                <div ref={transcriptEndRef} />
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-red-500/10 border border-red-500/30 text-red-300 text-[12px] px-4 py-2 rounded-lg">
            {error}
          </div>
        )}
      </div>

      {/* Mobile transcript (below main area) */}
      {connected && (
        <div className="lg:hidden border-t border-line max-h-[200px] overflow-y-auto p-4">
          <div className="font-mono text-[10px] uppercase tracking-[1px] text-text-faint mb-2">Live Transcript</div>
          {transcript.length === 0 ? (
            <div className="text-[12px] text-text-faint italic">Start speaking — your conversation will appear here.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {transcript.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.speaker === "agent" ? "items-start" : "items-end"}`}>
                  <div className="text-[9px] uppercase tracking-[0.5px] text-text-faint mb-0.5">
                    {msg.speaker === "agent" ? "Ndumi" : "You"}
                  </div>
                  <div
                    className={`text-[12px] leading-relaxed rounded-xl px-3 py-2 max-w-[85%] ${
                      msg.speaker === "agent"
                        ? "bg-indigo-dim/30 border border-indigo/20 text-text"
                        : "bg-panel-2 border border-line text-text-dim"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {partialText && (
                <div className="flex flex-col items-end">
                  <div className="text-[9px] uppercase tracking-[0.5px] text-text-faint mb-0.5">You</div>
                  <div className="text-[12px] leading-relaxed rounded-xl px-3 py-2 max-w-[85%] bg-panel-2 border border-line text-text-faint italic">
                    {partialText}…
                  </div>
                </div>
              )}
              <div ref={transcriptEndRef} />
            </div>
          )}
        </div>
      )}

      {/* Bottom controls */}
      <div className="flex items-center justify-center gap-4 py-6 border-t border-line">
        {!connected ? (
          <button
            onClick={connect}
            disabled={connecting}
            className="btn-primary px-8 py-3.5 text-[14px]"
          >
            {connecting ? "Connecting…" : "Join Call"}
          </button>
        ) : (
          <>
            {/* Mic toggle */}
            <button
              onClick={toggleMute}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                muted
                  ? "bg-red-500/20 border border-red-500/40 text-red-300"
                  : "bg-panel-2 border border-line text-text hover:border-indigo"
              }`}
              aria-label={muted ? "Unmute microphone" : "Mute microphone"}
            >
              {muted ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" fill="currentColor" />
                  <path d="M19 11a7 7 0 0 1-14 0M12 18v4M8 22h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" fill="currentColor" />
                  <path d="M19 11a7 7 0 0 1-14 0M12 18v4M8 22h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              )}
            </button>

            {/* End call */}
            <button
              onClick={disconnect}
              className="w-16 h-16 rounded-full flex items-center justify-center bg-red-500/80 hover:bg-red-500 transition-colors"
              aria-label="End call"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M3 12a9 9 0 0 1 18 0M21 12a9 9 0 0 1-18 0" stroke="white" strokeWidth="2" strokeLinecap="round" transform="rotate(135 12 12)" />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
