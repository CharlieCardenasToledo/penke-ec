import { type ButtonHTMLAttributes, type ReactNode } from "react";

type Size = "sm" | "md" | "lg";

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  "aria-label": string;
  size?: Size;
  children: ReactNode;
  type?: "button" | "submit" | "reset";
}

const SIZE: Record<Size, string> = {
  sm: "w-8  h-8  rounded-lg",
  md: "w-9  h-9  rounded-lg",
  lg: "w-10 h-10 rounded-xl",
};

export function IconButton({
  "aria-label": ariaLabel,
  size = "md",
  children,
  disabled,
  type = "button",
  className = "",
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={ariaLabel}
      disabled={disabled}
      className={[
        "inline-flex items-center justify-center flex-shrink-0 transition-all",
        "text-slate-500 hover:text-slate-700 hover:bg-slate-100",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        SIZE[size],
        className,
      ].join(" ")}
      {...rest}
    >
      {children}
    </button>
  );
}
