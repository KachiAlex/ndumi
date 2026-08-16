import type { ReactNode } from "react";

interface SectionHeadProps {
  eyebrow: string;
  title: ReactNode;
  description?: string;
  className?: string;
}

export function SectionHead({ eyebrow, title, description, className = "" }: SectionHeadProps) {
  return (
    <div className={`reveal max-w-[560px] mb-11 ${className}`}>
      <div className="mb-3 font-mono text-[10.5px] uppercase tracking-[1.4px] text-indigo">
        {eyebrow}
      </div>
      <h2 className="font-display italic font-semibold leading-[1.15] text-[clamp(26px,3.4vw,36px)] mb-3">
        {title}
      </h2>
      {description && (
        <p className="text-text-dim text-[14.5px] leading-relaxed m-0">
          {description}
        </p>
      )}
    </div>
  );
}
