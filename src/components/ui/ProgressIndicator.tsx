import { Loader2 } from "lucide-react";

type Mode = "indeterminate" | "determinate";

interface ProgressIndicatorProps {
  mode?: Mode;
  value?: number;
  label?: string;
  className?: string;
}

export function ProgressIndicator({
  mode = "indeterminate",
  value = 0,
  label,
  className = "",
}: ProgressIndicatorProps) {
  const pct = Math.max(0, Math.min(100, value));

  if (mode === "indeterminate") {
    return (
      <div
        role="status"
        aria-label={label ?? "Cargando…"}
        className={`flex items-center gap-2 ${className}`}
      >
        <Loader2 size={16} className="animate-spin text-blue-500 flex-shrink-0" aria-hidden />
        {label && <span className="text-sm text-slate-500">{label}</span>}
      </div>
    );
  }

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{label}</span>
          <span aria-live="polite">{pct}%</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? "Progreso"}
        className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden"
      >
        <div
          className="h-full bg-blue-500 rounded-full transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
