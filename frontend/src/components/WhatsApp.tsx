import { Wrap } from "./primitives";

const FEATURES = [
  "Customers send a voice note in whichever language is comfortable — no app to download, no menu to navigate.",
  "Ndumi transcribes, decides, and replies with a voice note of its own, in the same language.",
  "Every conversation is logged and searchable, so a human can pick up exactly where Ndumi left off.",
];

export function WhatsApp() {
  return (
    <section className="py-20">
      <Wrap>
        <div className="reveal grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-12 items-center">
          <div>
            <div className="mb-3 font-mono text-[10.5px] uppercase tracking-[1.4px] text-indigo">
              On WhatsApp
            </div>
            <h2 className="font-display italic font-semibold text-[clamp(26px,3.4vw,36px)] leading-[1.15] mb-4 m-0">
              Customer care where your customers already are.
            </h2>
            <ul className="list-none p-0 m-0 mt-[22px] flex flex-col gap-3.5">
              {FEATURES.map((f, i) => (
                <li key={i} className="flex gap-[11px] text-[13.5px] text-text-dim leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold mt-1.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-[#0D1424] border border-line rounded-[20px] p-[18px] shadow-card">
            <div className="rounded-[14px] p-[11px_14px] text-[13px] leading-relaxed mb-2.5 max-w-[82%] bg-panel-2 border border-line">
              How far, my transfer no dey go through since morning o
            </div>
            <div className="rounded-[14px] p-[11px_14px] text-[13px] leading-relaxed mb-2.5 max-w-[82%] ml-auto bg-signal-dim border border-[rgba(79,166,114,0.35)]">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex gap-[2px] items-center">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <i
                      key={i}
                      className="w-[2.5px] rounded-[2px] bg-signal"
                      style={{ height: `${3 + Math.round(Math.random() * 11)}px` }}
                    />
                  ))}
                </div>
                <span>0:14</span>
              </div>
              <div className="font-mono text-[9.5px] text-text-faint mt-0.5">
                Ndumi · replied in Pidgin · 2s
              </div>
            </div>
          </div>
        </div>
      </Wrap>
    </section>
  );
}
