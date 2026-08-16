import { Wrap } from "./primitives";

export function Footer() {
  return (
    <footer className="border-t border-line py-9 pb-10">
      <Wrap>
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-2.5 text-[13.5px] text-text-dim">
            <div className="nav-mark" style={{ width: "24px", height: "24px", fontSize: "12px" }}>N</div>
            Ndumi · Speak. Understand. Connect.
          </div>
          <div className="flex gap-[22px] text-[12.5px] text-text-faint">
            <a href="#" className="hover:text-text-dim transition-colors">Docs</a>
            <a href="#" className="hover:text-text-dim transition-colors">Pricing</a>
            <a href="#" className="hover:text-text-dim transition-colors">Contact</a>
            <a href="#" className="hover:text-text-dim transition-colors">Privacy</a>
          </div>
        </div>
      </Wrap>
    </footer>
  );
}
