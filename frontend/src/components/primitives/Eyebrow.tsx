interface EyebrowProps {
  children: string;
  live?: boolean;
}

export function Eyebrow({ children, live = false }: EyebrowProps) {
  return (
    <div className="inline-flex items-center gap-[7px] mb-[22px] rounded-full border border-[rgba(210,96,58,0.3)] bg-camwood-dim px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[1.2px] text-camwood-2">
      {live && (
        <span className="w-[5px] h-[5px] rounded-full bg-camwood-2 animate-blink-dot" />
      )}
      {children}
    </div>
  );
}
