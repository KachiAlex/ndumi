import { Wrap } from "./primitives";

export function CTABand() {
  return (
    <section className="py-20">
      <Wrap>
        <div className="reveal bg-panel border border-line rounded-cta p-[56px_40px] text-center relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none opacity-40 cta-band-bg" />
          <div className="relative z-[1]">
            <h2 className="font-display italic font-semibold text-[clamp(26px,3.6vw,38px)] mb-3.5 m-0">
              Let a customer try it in their own language.
            </h2>
            <p className="text-text-dim text-[14.5px] mb-6.5 m-0">
              Talk to the demo above, or bring Ndumi into your own product this week.
            </p>
            <a href="#meeting" className="btn-primary">Talk to Ndumi</a>
          </div>
        </div>
      </Wrap>
    </section>
  );
}
