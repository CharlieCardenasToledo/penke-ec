import { useState, useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight, Crosshair, RotateCcw } from "lucide-react";
import { PdfViewerModal } from "../PdfViewerModal";
import type { Preset } from "../../hooks/usePresets";
import type { StampPos } from "./SignWizard";

const QUICK_POSITIONS = [
  { label: "Inferior derecha",    puntoX: 340, puntoY: 22 },
  { label: "Inferior izquierda",  puntoX: 22,  puntoY: 22 },
  { label: "Superior derecha",    puntoX: 340, puntoY: 760 },
  { label: "Superior izquierda",  puntoX: 22,  puntoY: 760 },
] as const;

interface Props {
  profile: Preset;
  doc: string;
  stampPos: StampPos | null;
  setStampPos: (pos: StampPos | null) => void;
  onBack: () => void;
  onNext: () => void;
}

export function StepAppearance({ profile, doc, stampPos, setStampPos, onBack, onNext }: Props) {
  const [showViewer, setShowViewer] = useState(false);

  function applyQuick(puntoX: number, puntoY: number) {
    setStampPos({ pagina: 1, puntoX, puntoY });
  }

  const stampLabel = stampPos
    ? `Pág. ${stampPos.pagina} · (${Math.round(stampPos.puntoX)}, ${Math.round(stampPos.puntoY)})`
    : null;

  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { headingRef.current?.focus(); }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (!stampPos) return;
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
      e.preventDefault();
      const step = e.shiftKey ? 20 : 5;
      const { pagina, puntoX, puntoY } = stampPos;
      if (e.key === "ArrowLeft")  setStampPos({ pagina, puntoX: Math.max(0, puntoX - step), puntoY });
      if (e.key === "ArrowRight") setStampPos({ pagina, puntoX: puntoX + step, puntoY });
      if (e.key === "ArrowUp")    setStampPos({ pagina, puntoX, puntoY: puntoY + step });
      if (e.key === "ArrowDown")  setStampPos({ pagina, puntoX, puntoY: Math.max(0, puntoY - step) });
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [stampPos, setStampPos]);

  return (
    <div className="space-y-5">
      {showViewer && (
        <PdfViewerModal
          ruta={doc}
          onClose={() => setShowViewer(false)}
          onConfirmPosition={(pagina, puntoX, puntoY) => {
            setStampPos({ pagina, puntoX, puntoY });
            setShowViewer(false);
          }}
          initialStamp={stampPos}
        />
      )}

      <div>
        <button onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 mb-4 transition-colors">
          <ArrowLeft size={15} /> Documento
        </button>
        <h2 ref={headingRef} tabIndex={-1} className="text-base font-bold text-slate-800">¿Dónde va la firma en el documento?</h2>
        <p className="text-sm text-slate-500 mt-1">
          Sello: <span className="font-medium text-slate-700">{profile.estampado}</span>
        </p>
      </div>

      {/* Posiciones rápidas */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Posición rápida</p>
        <div className="grid grid-cols-2 gap-2">
          {QUICK_POSITIONS.map(({ label, puntoX, puntoY }) => {
            const active = stampPos?.puntoX === puntoX && stampPos?.puntoY === puntoY;
            return (
              <button
                key={label}
                onClick={() => applyQuick(puntoX, puntoY)}
                className={[
                  "px-3 py-2.5 rounded-xl border text-sm font-medium transition-all text-left",
                  active
                    ? "border-blue-400 bg-blue-50 text-blue-700"
                    : "border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50/50",
                ].join(" ")}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Elegir manualmente */}
        <button
          onClick={() => setShowViewer(true)}
          className={[
            "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed text-sm font-medium transition-all",
            stampPos && !QUICK_POSITIONS.some((q) => q.puntoX === stampPos.puntoX && q.puntoY === stampPos.puntoY)
              ? "border-blue-400 bg-blue-50 text-blue-700"
              : "border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50",
          ].join(" ")}
        >
          <Crosshair size={14} /> Elegir manualmente en el documento
        </button>

        {/* Estado actual de la posición */}
        {stampPos && (
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
            <div>
              <p className="text-xs text-slate-500">
                Posición: <span className="font-mono text-slate-700">{stampLabel}</span>
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                <kbd className="font-mono">↑↓←→</kbd> para mover · <kbd className="font-mono">Shift</kbd>+flecha para saltar
              </p>
            </div>
            <button
              onClick={() => setStampPos(null)}
              aria-label="Restablecer posición"
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors ml-4 flex-shrink-0"
            >
              <RotateCcw size={11} /> Restablecer
            </button>
          </div>
        )}
      </div>

      {/* Nota: sin posición se firma en la esquina inferior derecha */}
      {!stampPos && (
        <p className="text-xs text-slate-400 text-center">
          Si no eliges posición, la firma irá en la esquina inferior derecha de la primera página.
        </p>
      )}

      {/* Navegación */}
      <div className="flex justify-between">
        <button onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-all">
          <ArrowLeft size={14} /> Atrás
        </button>
        <button onClick={onNext}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all shadow-md">
          Continuar <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
