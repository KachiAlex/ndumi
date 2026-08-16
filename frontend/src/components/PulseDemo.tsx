import { useState, useRef, useCallback, useEffect } from "react";

const STATES = [
  { lang: "ig", label: "Igbo", who: "Customer", state: "listening", text: "Kedu, kedu ka m nwere ike inyere gị aka?" },
  { lang: "ig", label: "Igbo", who: "Ndumi", state: "thinking", text: "…" },
  { lang: "ig", label: "Igbo", who: "Ndumi", state: "speaking", text: "Nnọọ! Kedu ihe ị chọrọ ka m mee?" },
  { lang: "yo", label: "Yorùbá", who: "Customer", state: "listening", text: "Bawo, kí ni mo lè ṣe fún ọ?" },
  { lang: "yo", label: "Yorùbá", who: "Ndumi", state: "thinking", text: "…" },
  { lang: "yo", label: "Yorùbá", who: "Ndumi", state: "speaking", text: "Ẹ káàbọ̀! Mo ti gbọ́, ẹ jọ̀wọ́ ẹ sọ ohun tí ẹ nílò." },
  { lang: "ha", label: "Hausa", who: "Customer", state: "listening", text: "Sannu, ta yaya zan iya taimaka?" },
  { lang: "ha", label: "Hausa", who: "Ndumi", state: "thinking", text: "…" },
  { lang: "ha", label: "Hausa", who: "Ndumi", state: "speaking", text: "Barka da zuwa! Na ji ka, don Allah gaya mini abin da kake bukata." },
  { lang: "pcm", label: "Pidgin", who: "Customer", state: "listening", text: "How far, wetin I fit do for you?" },
  { lang: "pcm", label: "Pidgin", who: "Ndumi", state: "thinking", text: "…" },
  { lang: "pcm", label: "Pidgin", who: "Ndumi", state: "speaking", text: "I dey here o. Talk wetin dey worry you make we sort am." },
  { lang: "en", label: "English", who: "Customer", state: "listening", text: "Hello, how can I help you today?" },
  { lang: "en", label: "English", who: "Ndumi", state: "thinking", text: "…" },
  { lang: "en", label: "English", who: "Ndumi", state: "speaking", text: "Hi there, I heard you — go ahead and tell me what you need." },
] as const;

const LANGS = [
  { code: "ig", label: "Igbo" },
  { code: "yo", label: "Yorùbá" },
  { code: "ha", label: "Hausa" },
  { code: "pcm", label: "Pidgin" },
  { code: "en", label: "English" },
];

const BCP47: Record<string, string> = {
  ig: "ig",
  yo: "yo",
  ha: "ha",
  pcm: "pcm",
  en: "en-US",
};

function speak(text: string, lang: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = BCP47[lang] || "en-US";
  utter.rate = 0.95;
  utter.pitch = 1;
  utter.volume = 1.0;

  const voices = window.speechSynthesis.getVoices();
  const match = voices.find((v) => v.lang.startsWith(lang)) || voices.find((v) => v.lang.startsWith(lang.split("-")[0]));
  if (match) utter.voice = match;

  window.speechSynthesis.speak(utter);
}

async function speakViaBackend(text: string, lang: string) {
  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:3001/v1";
  try {
    const res = await fetch(`${apiBase}/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, language: lang }),
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data.audioUrl && typeof data.audioUrl === "string" && data.audioUrl.startsWith("data:audio")) {
      const audio = new Audio(data.audioUrl);
      audio.volume = 1.0;
      await audio.play();
    }
  } catch {
    // Fallback to browser speech synthesis
    speak(text, lang);
  }
}

export function PulseDemo() {
  const [idx, setIdx] = useState(-1);
  const [waveHeights, setWaveHeights] = useState<number[]>(() =>
    Array.from({ length: 16 }, () => 4)
  );
  const waveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
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

      if (s.state === "speaking") {
        waveTimerRef.current = setInterval(() => {
          setWaveHeights(Array.from({ length: 16 }, () => 4 + Math.round(Math.random() * 12)));
        }, 130);
        speakViaBackend(s.text, s.lang);
      } else {
        setWaveHeights(Array.from({ length: 16 }, () => 4));
        if (typeof window !== "undefined" && window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
      }

      return next;
    });
  }, []);

  const current = idx >= 0 ? STATES[idx] : null;
  const stateClass = current?.state ?? "";

  return (
    <div className="bg-panel border border-line rounded-panel p-[30px_26px_24px] relative overflow-hidden shadow-card">
      <div
        className="absolute inset-0 pointer-events-none opacity-50 pulse-card-bg"
      />
      <div className="relative z-[1]">
        <div className="text-center font-mono text-[10px] uppercase tracking-[1.4px] text-text-faint mb-4">
          STATE — <b className="text-indigo">{current ? current.state.toUpperCase() : "IDLE"}</b>
        </div>

        <div
          className={`orb-wrap w-[150px] h-[150px] mx-auto mb-[18px] relative flex items-center justify-center cursor-pointer ${stateClass}`}
          onClick={advance}
          role="button"
          tabIndex={0}
          aria-label={current ? `${current.state}: ${current.who} in ${current.label}` : "Tap to start the demo"}
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
            <span>{current?.who ?? "Ndumi"}</span>
            <span>{current?.label ?? "Tap the orb to begin"}</span>
          </div>
          <div className="text-sm leading-relaxed">{current?.text ?? "…"}</div>
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
          Each tap moves Ndumi through listening → thinking → speaking, in a new language.
        </div>
      </div>
    </div>
  );
}
