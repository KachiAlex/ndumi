import { Wrap, SectionHead } from "./primitives";

const STEPS = [
  {
    num: "01",
    title: "Customer speaks",
    desc: "Voice activity detection catches the start and end of speech, so Ndumi never talks over someone or waits too long after they've finished.",
  },
  {
    num: "02",
    title: "Language is detected, live",
    desc: "Streaming recognition identifies which of the five languages is being spoken as the words arrive — including a switch mid-sentence.",
  },
  {
    num: "03",
    title: "Ndumi decides what to do",
    desc: "Check an order, open a ticket, pull an account balance, or escalate to a human — the agent can act, not just talk.",
  },
  {
    num: "04",
    title: "The reply is spoken back",
    desc: "In the same language, in a matching voice, streaming from the first word rather than waiting for the full sentence.",
    latency: "~800ms end-to-end",
  },
];

export function CallFlow() {
  return (
    <section id="flow" className="py-20">
      <Wrap>
        <SectionHead
          eyebrow="Call flow"
          title="What happens in under a second."
          description="This is the actual sequence, every call, in order."
        />
        <div className="reveal flex flex-col gap-0">
          {STEPS.map((s) => (
            <div
              key={s.num}
              className="grid grid-cols-[56px_1fr] gap-5 py-[22px] border-t border-line last:border-b"
            >
              <div className="font-mono text-xs text-indigo pt-0.5">{s.num}</div>
              <div>
                <h4 className="text-[15.5px] font-semibold mb-1.5">{s.title}</h4>
                <p className="text-[13.5px] text-text-dim leading-relaxed max-w-[520px] m-0">
                  {s.desc}
                  {s.latency && (
                    <span className="font-mono text-[10.5px] text-signal ml-2">{s.latency}</span>
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Wrap>
    </section>
  );
}
