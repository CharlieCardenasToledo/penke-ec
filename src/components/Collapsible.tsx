import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

interface Props { label: string; children: ReactNode; defaultOpen?: boolean; }

export function Collapsible({ label, children, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-sm font-medium text-slate-600"
      >
        <span>{label}</span>
        <ChevronDown size={16} className={["transition-transform duration-200 text-slate-400", open ? "rotate-180" : ""].join(" ")} />
      </button>
      {open && <div className="px-4 py-4 space-y-4 bg-white">{children}</div>}
    </div>
  );
}
