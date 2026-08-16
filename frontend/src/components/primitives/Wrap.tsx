import type { ReactNode } from "react";

interface WrapProps {
  children: ReactNode;
  className?: string;
  id?: string;
}

export function Wrap({ children, className = "", id }: WrapProps) {
  return (
    <div id={id} className={`mx-auto max-w-wrap px-5 ${className}`}>
      {children}
    </div>
  );
}
