import type { ReactNode } from "react";
import { Wrap } from "./Wrap";

interface SectionProps {
  children: ReactNode;
  id?: string;
  className?: string;
  wrapped?: boolean;
}

export function Section({ children, id, className = "", wrapped = true }: SectionProps) {
  return (
    <section id={id} className={`py-20 ${className}`}>
      {wrapped ? <Wrap>{children}</Wrap> : children}
    </section>
  );
}
