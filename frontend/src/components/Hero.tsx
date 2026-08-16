import { Wrap } from "./primitives";
import { Eyebrow } from "./primitives";
import { PulseDemo } from "./PulseDemo";

export function Hero() {
  const scrollToPulse = () => {
    document.getElementById("pulse")?.scrollIntoView({ behavior: "smooth" });
    const orb = document.querySelector(".orb-wrap") as HTMLElement | null;
    orb?.click();
  };

  return (
    <header id="pulse" className="py-16 pb-10">
      <Wrap>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-12 items-center">
          <div>
            <Eyebrow live>LIVE INTERACTIVE DEMO</Eyebrow>
            <h1 className="font-display italic font-semibold text-[clamp(38px,5.4vw,58px)] leading-[1.08] tracking-tight mb-5 m-0">
              An agent that <em className="text-gold">listens</em><br />
              in five Nigerian voices.
            </h1>
            <p className="text-text-dim text-base leading-relaxed max-w-[480px] mb-7">
              Ndumi understands Igbo, Yorùbá, Hausa, Pidgin and English — and switches between them mid-conversation, the way your customers actually talk. Deploy it as an API, a widget, or a WhatsApp agent.
            </p>
            <div className="flex gap-3 flex-wrap">
              <button className="btn-primary" onClick={scrollToPulse}>
                Press the orb to hear Ndumi think
              </button>
              <a href="#developers" className="btn-ghost">View the API</a>
            </div>
          </div>

          <PulseDemo />
        </div>
      </Wrap>
    </header>
  );
}
