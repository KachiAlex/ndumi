import { Wrap, SectionHead } from "./primitives";

const CHANNELS = [
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M4 6h16M4 12h16M4 18h10" stroke="#5B6EE8" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    title: "API",
    desc: "Stream audio in, get transcripts, agent replies, and audio out over a WebSocket session. Bring your own frontend.",
    tag: "WS + REST · OpenAI-compatible",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <rect x="4" y="4" width="16" height="16" rx="4" stroke="#5B6EE8" strokeWidth="2" />
        <circle cx="12" cy="12" r="3" stroke="#5B6EE8" strokeWidth="2" />
      </svg>
    ),
    title: "Widget",
    desc: "Drop one script tag into your site. Renders a talk-to-us bubble with the same listening/thinking/speaking pulse you just tried.",
    tag: "One <script> tag",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M12 3a9 9 0 100 18 9 9 0 000-18z" stroke="#5B6EE8" strokeWidth="2" />
        <path d="M9 10c0 3 2 5 5 5" stroke="#5B6EE8" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    title: "WhatsApp",
    desc: "Customers send a voice note, Ndumi replies with one — in whichever of the five languages they used.",
    tag: "Voice notes & native calling",
  },
];

export function Channels() {
  return (
    <section id="channels" className="py-20">
      <Wrap>
        <SectionHead
          eyebrow="Three ways in"
          title="One agent, wherever the conversation starts."
          description="Build the pipeline once. Ndumi shows up as an API for your own product, a drop-in widget for your website, or a customer care agent on WhatsApp."
        />
        <div className="reveal grid grid-cols-1 md:grid-cols-3 gap-4">
          {CHANNELS.map((c) => (
            <div
              key={c.title}
              className="bg-panel border border-line rounded-card p-[26px_24px] transition-all hover:border-indigo hover:-translate-y-[3px]"
            >
              <div className="w-[38px] h-[38px] rounded-[10px] bg-indigo-dim flex items-center justify-center mb-4">
                {c.icon}
              </div>
              <h3 className="text-base font-semibold mb-2">{c.title}</h3>
              <p className="text-[13.5px] text-text-dim leading-relaxed mb-3">{c.desc}</p>
              <div className="font-mono text-[10px] text-text-faint tracking-tight">{c.tag}</div>
            </div>
          ))}
        </div>
      </Wrap>
    </section>
  );
}
