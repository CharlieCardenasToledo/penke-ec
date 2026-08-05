import { CheckCircle2, AlertTriangle, XCircle, ShieldOff, HelpCircle } from "lucide-react";

export type StatusVariant = "valid" | "expiring" | "expired" | "revoked" | "unknown";

interface StatusBadgeProps {
  variant: StatusVariant;
  label?: string;
  className?: string;
}

const CONFIG: Record<StatusVariant, {
  Icon: typeof CheckCircle2;
  text: string;
  defaultLabel: string;
}> = {
  valid:    { Icon: CheckCircle2,  text: "text-green-700",  defaultLabel: "Vigente"    },
  expiring: { Icon: AlertTriangle, text: "text-yellow-700", defaultLabel: "Por vencer" },
  expired:  { Icon: XCircle,       text: "text-red-700",    defaultLabel: "Vencido"    },
  revoked:  { Icon: ShieldOff,     text: "text-red-800",    defaultLabel: "Revocado"   },
  unknown:  { Icon: HelpCircle,    text: "text-slate-500",  defaultLabel: "?"          },
};

export function StatusBadge({ variant, label, className = "" }: StatusBadgeProps) {
  const { Icon, text, defaultLabel } = CONFIG[variant];
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <Icon size={12} className={`flex-shrink-0 ${text}`} aria-hidden />
      <span className={`text-xs font-semibold ${text}`}>{label ?? defaultLabel}</span>
    </span>
  );
}
