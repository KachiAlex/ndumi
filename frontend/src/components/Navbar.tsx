import { useState } from "react";
import { Wrap } from "./primitives";

export function Navbar() {
  const [open, setOpen] = useState(false);

  const links = [
    { href: "#channels", label: "Product" },
    { href: "#languages", label: "Languages" },
    { href: "#flow", label: "How it works" },
    { href: "#developers", label: "Developers" },
  ];

  return (
    <nav className="sticky top-0 z-40 backdrop-blur-[10px] bg-[rgba(10,14,28,0.72)] border-b border-line" aria-label="Main navigation">
      <Wrap>
        <div className="flex items-center justify-between py-[15px]">
          <a href="#" className="flex items-center gap-2.5 font-semibold text-[15px] tracking-tight" aria-label="Ndumi home">
            <div className="nav-mark" aria-hidden="true">N</div>
            Ndumi
          </a>

          <div className="hidden md:flex gap-7 text-[13.5px] text-text-dim" role="menubar">
            {links.map((l) => (
              <a key={l.href} href={l.href} className="hover:text-text transition-colors" role="menuitem">
                {l.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
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
            <button
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg border border-line text-text-dim"
              onClick={() => setOpen(!open)}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                {open ? (
                  <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                ) : (
                  <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {open && (
          <div className="md:hidden pb-4 flex flex-col gap-3 text-[14px] text-text-dim border-t border-line pt-4" role="menu">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="hover:text-text transition-colors"
                role="menuitem"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </a>
            ))}
          </div>
        )}
      </Wrap>
    </nav>
  );
}
