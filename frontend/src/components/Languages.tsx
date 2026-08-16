import { Wrap, SectionHead } from "./primitives";

const LANGS = [
  { name: "Igbo", greeting: "Kedu, kedu ka m nwere ike inyere gị aka?", translation: "Hello, how can I help you?" },
  { name: "Yorùbá", greeting: "Bawo, kí ni mo lè ṣe fún ọ?", translation: "Hello, what can I do for you?" },
  { name: "Hausa", greeting: "Sannu, ta yaya zan iya taimaka?", translation: "Hello, how can I help?" },
  { name: "Pidgin", greeting: "How far, wetin I fit do for you?", translation: "Hi, what can I do for you?" },
  { name: "English", greeting: "Hello, how can I help you today?", translation: "—" },
];

export function Languages() {
  return (
    <section id="languages" className="py-20">
      <Wrap>
        <SectionHead
          eyebrow="Language coverage"
          title="It answers in the language it was asked in."
          description={'No menu, no "press 1 for Yorùbá." Ndumi detects the language as the customer speaks and replies in kind — including mid-sentence switches.'}
        />
        <div className="reveal grid grid-cols-1 xs:grid-cols-2 md:grid-cols-5 gap-3">
          {LANGS.map((l) => (
            <div key={l.name} className="bg-panel-2 border border-line rounded-2xl p-[18px_16px]">
              <div className="font-display italic font-semibold text-lg mb-2 text-gold">{l.name}</div>
              <div className="text-[13px] leading-relaxed mb-1.5">{l.greeting}</div>
              <div className="text-[11px] text-text-faint italic">{l.translation}</div>
            </div>
          ))}
        </div>
      </Wrap>
    </section>
  );
}
