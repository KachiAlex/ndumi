import type { ButtonHTMLAttributes, AnchorHTMLAttributes } from "react";

type ButtonVariant = "primary" | "ghost";

interface ButtonAsButton extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  as?: "button";
}

interface ButtonAsAnchor extends AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: ButtonVariant;
  as: "a";
}

type ButtonProps = ButtonAsButton | ButtonAsAnchor;

export function Button(props: ButtonProps) {
  const { variant = "primary", className = "", ...rest } = props;
  const baseClass = variant === "primary" ? "btn-primary" : "btn-ghost";
  const combined = `${baseClass} ${className}`;

  if (props.as === "a") {
    const { as: _as, ...anchorProps } = rest as AnchorHTMLAttributes<HTMLAnchorElement> & { as?: string };
    return <a className={combined} {...anchorProps} />;
  }

  const { as: _as, ...buttonProps } = rest as ButtonHTMLAttributes<HTMLButtonElement> & { as?: string };
  return <button className={combined} {...buttonProps} />;
}
