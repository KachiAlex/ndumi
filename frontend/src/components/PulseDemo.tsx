import { useState, useRef, useCallback, useEffect } from "react";

const STATES = [
  { lang: "ig", label: "Igbo", text: "Nnọọ, abụ m Ndumi, enyemaka gị AI nke Naịjirịa. Kedu ka m ga-esi nyere gị aka taa?" },
  { lang: "yo", label: "Yorùbá", text: "Ẹ káàbọ̀, mo ni Ndumi, olùrànlọwọ AI rẹ ti Nàìjíríà. Bawo ni mo lè ṣe iranlọwọ fún ọ lóní?" },
  { lang: "ha", label: "Hausa", text: "Barka da zuwa, ni ne Ndumi, mataimakin AI ɗin ku na Najeriya. Ta yaya zan iya taimaka maku yau?" },
  { lang: "pcm", label: "Pidgin", text: "I dey welcome you, I be Ndumi, your Nigerian AI assistant. How I fit help you today?" },
  { lang: "en", label: "English", text: "Welcome, I'm Ndumi, your Nigerian AI assistant. How can I help you today?" },
] as const;

const LANGS = [
  { code: "ig", label: "Igbo" },
  { code: "yo", label: "Yorùbá" },
  { code: "ha", label: "Hausa" },
  { code: "pcm", label: "Pidgin" },
  { code: "en", label: "English" },
];

async function speakViaBackend(text: string, lang: string): Promise<boolean> {
  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:3001/v1";
  try {
    const res = await fetch(`${apiBase}/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, language: lang }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (data.audioUrl && typeof data.audioUrl === "string" && data.audioUrl.startsWith("data:audio")) {
      const audio = new Audio(data.audioUrl);
      audio.volume = 1.0;
      await audio.play();
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function PulseDemo() {
  const [idx, setIdx] = useState(-1);
  const [waveHeights, setWaveHeights] = useState<number[]>(() =>
    Array.from({ length: 16 }, () => 4)
  );
  const [loading, setLoading] = useState(false);
  const waveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (waveTimerRef.current) clearInterval(waveTimerRef.current);
    };
  }, []);

  const advance = useCallback(() => {
    setIdx((prev) => {
      const next = (prev + 1) % STATES.length;
      const s = STATES[next];

      if (waveTimerRef.current) {
        clearInterval(waveTimerRef.current);
        waveTimerRef.current = null;
      }

      // Start waveform animation immediately
      waveTimerRef.current = setInterval(() => {
        setWaveHeights(Array.from({ length: 16 }, () => 4 + Math.round(Math.random() * 12)));
      }, 130);

      // Speak via backend Nigerian TTS only (no browser system voice)
      setLoading(true);
      speakViaBackend(s.text, s.lang).finally(() => setLoading(false));

      return next;
    });
  }, []);

  const current = idx >= 0 ? STATES[idx] : null;

  return (
    <div className="bg-panel border border-line rounded-panel p-[30px_26px_24px] relative overflow-hidden shadow-card">
      <div
        className="absolute inset-0 pointer-events-none opacity-50 pulse-card-bg"
      />
      <div className="relative z-[1]">
        <div className="text-center font-mono text-[10px] uppercase tracking-[1.4px] text-text-faint mb-4">
          {current ? <b className="text-gold">{current.label.toUpperCase()}</b> : "READY"}
        </div>

        <div
          className={`orb-wrap w-[150px] h-[150px] mx-auto mb-[18px] relative flex items-center justify-center cursor-pointer ${current ? "speaking" : ""}`}
          onClick={advance}
          role="button"
          tabIndex={0}
          aria-label={current ? `Speaking in ${current.label}` : "Tap to start the demo"}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              advance();
            }
          }}
        >
          <div className={`orb-ring ${current ? "active" : ""}`} />
          <div className={`orb-ring active`} style={{ animationDelay: "0.5s", opacity: current ? undefined : 0 }} />
          <div className="orb-dash" />
          <div className="orb">N</div>
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 flex gap-[2px] items-end h-[14px] z-[3]">
            {waveHeights.map((h, i) => (
              <i
                key={i}
                className="w-[2.5px] rounded-[2px] bg-gold transition-[height] duration-75"
                style={{ height: `${h}px` }}
              />
            ))}
          </div>
        </div>

        <div className="bg-panel-2 border border-line rounded-[13px] p-[13px_16px] min-h-[64px] mb-3.5">
          <div className="flex justify-between font-mono text-[9.5px] uppercase tracking-[0.6px] text-text-faint mb-1.5">
            <span>Ndumi</span>
            <span>{current?.label ?? "Tap the orb to begin"}</span>
          </div>
          <div className="text-sm leading-relaxed">
            {loading ? "Loading…" : (current?.text ?? "…")}
          </div>
        </div>

        <div className="flex gap-1.5 flex-wrap justify-center">
          {LANGS.map((l) => (
            <div
              key={l.code}
              className={`text-[10px] px-2.5 py-1.5 rounded-full border font-medium transition-all ${
                current?.lang === l.code
                  ? "bg-indigo-dim border-indigo text-[#C7CFFB]"
                  : "border-line text-text-faint"
              }`}
            >
              {l.label}
            </div>
          ))}
        </div>

        <div className="text-center text-[11px] text-text-faint mt-3.5">
          Each tap makes Ndumi speak the same greeting in a new Nigerian language.
        </div>
      </div>
    </div>
  );
}
