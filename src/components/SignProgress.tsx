import { useEffect, useState } from "react";
import { KeyRound, ShieldCheck, PenLine, Save, Check, Loader2 } from "lucide-react";

const STEPS = [
  { label: "Cargando certificado",    Icon: KeyRound,    ms: 0    },
  { label: "Verificando certificado", Icon: ShieldCheck, ms: 1200 },
  { label: "Aplicando firma digital", Icon: PenLine,     ms: 3000 },
  { label: "Guardando documento",     Icon: Save,        ms: 6500 },
];

interface Props { active: boolean; done: boolean; }

export function SignProgress({ active, done }: Props) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!active) { setStep(0); return; }
    const timers = STEPS.map((s, i) => setTimeout(() => setStep(i), s.ms));
    return () => timers.forEach(clearTimeout);
  }, [active]);

  if (!active && !done) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-6 py-5">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">
        {done ? "Firma completada" : "Firmando…"}
      </p>
      <div className="space-y-3">
        {STEPS.map(({ label, Icon }, i) => {
          const isActive = active && i === step;
          const isDone   = done || (active && i < step);
          return (
            <div key={i} className="flex items-center gap-3">
              <div className={[
                "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300",
                isDone   ? "bg-green-500 text-white" :
                isActive ? "bg-blue-500 text-white animate-pulse" :
                           "bg-slate-100 text-slate-400",
              ].join(" ")}>
                {isDone   ? <Check size={13} /> :
                 isActive ? <Loader2 size={13} className="animate-spin" /> :
                            <Icon size={13} />}
              </div>
              <span className={[
                "text-sm transition-all duration-300",
                isDone   ? "text-green-700 font-medium" :
                isActive ? "text-blue-700 font-semibold" :
                           "text-slate-400",
              ].join(" ")}>
                {label}{isActive && <span className="ml-1 animate-pulse">…</span>}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-4 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-700"
          style={{ width: done ? "100%" : `${(step / (STEPS.length - 1)) * 100}%` }}
        />
      </div>
    </div>
  );
}
