import { type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "tertiary" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  children: ReactNode;
  type?: "button" | "submit" | "reset";
}

const VARIANT: Record<Variant, string> = {
  primary:   "bg-blue-600 hover:bg-blue-700 text-white shadow-md",
  secondary: "border border-slate-200 text-slate-700 hover:bg-slate-50",
  tertiary:  "text-blue-600 hover:text-blue-800 hover:bg-blue-50",
  danger:    "bg-red-600 hover:bg-red-700 text-white shadow-md",
  ghost:     "text-slate-500 hover:text-slate-700 hover:bg-slate-100",
};

const SIZE: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs rounded-lg gap-1.5",
  md: "px-4 py-2 text-sm rounded-xl gap-2",
  lg: "px-6 py-2.5 text-sm rounded-xl gap-2",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  children,
  disabled,
  type = "button",
  className = "",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={[
        "inline-flex items-center justify-center font-semibold transition-all",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        VARIANT[variant],
        SIZE[size],
        className,
      ].join(" ")}
      {...rest}
    >
      {loading
        ? <Loader2 size={14} className="animate-spin flex-shrink-0" aria-hidden />
        : icon}
      {children}
    </button>
  );
}
