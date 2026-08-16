import { Wrap } from "./primitives";

export function Navbar() {
  return (
    <nav className="sticky top-0 z-40 backdrop-blur-[10px] bg-[rgba(10,14,28,0.72)] border-b border-line">
      <Wrap>
        <div className="flex items-center justify-between py-[15px]">
          <div className="flex items-center gap-2.5 font-semibold text-[15px] tracking-tight">
            <div className="nav-mark">N</div>
            Ndumi
          </div>
          <div className="hidden md:flex gap-7 text-[13.5px] text-text-dim">
            <a href="#channels" className="hover:text-text transition-colors">Product</a>
            <a href="#languages" className="hover:text-text transition-colors">Languages</a>
            <a href="#flow" className="hover:text-text transition-colors">How it works</a>
            <a href="#developers" className="hover:text-text transition-colors">Developers</a>
          </div>
          <a
            href="#pulse"
            className="rounded-full font-bold text-[12.5px] tracking-tight px-[18px] py-[9px]"
            style={{
              background: "linear-gradient(135deg, #ddab4e, #c48e3a)",
              color: "#2a1a02",
            }}
          >
            Talk to Ndumi
          </a>
        </div>
      </Wrap>
    </nav>
  );
}
