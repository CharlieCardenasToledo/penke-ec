import { useState, useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight, Crosshair, RotateCcw } from "lucide-react";
import { Button } from "../ui";
import { PdfViewerModal, type Corner } from "../PdfViewerModal";
import { CORNER_LABELS } from "../../lib/stampGeometry";
import type { Preset } from "../../hooks/usePresets";
import type { StampPos } from "./SignWizard";

interface Props {
  profile: Preset;
  doc: string;
  stampPos: StampPos | null;
  setStampPos: (pos: StampPos | null) => void;
  onBack: () => void;
  onNext: () => void;
}

export function StepAppearance({ profile, doc, stampPos, setStampPos, onBack, onNext }: Props) {
  const [showViewer,    setShowViewer]    = useState(false);
  const [pendingCorner, setPendingCorner] = useState<Corner | undefined>();

  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { headingRef.current?.focus(); }, []);

  function openModal(corner?: Corner) {
    setPendingCorner(corner);
    setShowViewer(true);
  }

  const stampLabel = stampPos
    ? `Pág. ${stampPos.pagina} · (${Math.round(stampPos.left)}, ${Math.round(stampPos.bottom)})`
    : null;

  return (
    <div className="space-y-5">
      {showViewer && (
        <PdfViewerModal
          ruta={doc}
          onClose={() => setShowViewer(false)}
          onConfirmPosition={(pagina, left, bottom) => {
            setStampPos({ pagina, left, bottom });
            setShowViewer(false);
          }}
          initialStamp={stampPos ? { pagina: stampPos.pagina, left: stampPos.left, bottom: stampPos.bottom } : null}
          initialCorner={pendingCorner}
          estampado={profile.estampado}
        />
      )}

      <div>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 mb-4 transition-colors">
          <ArrowLeft size={15} /> Documento
        </button>
        <h2 ref={headingRef} tabIndex={-1} className="text-base font-bold text-slate-800">
          ¿Dónde va la firma en el documento?
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Sello: <span className="font-medium text-slate-700">{profile.estampado}</span>
        </p>
      </div>

      {/* Posiciones rápidas — abren el modal con esa esquina pre-seleccionada */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Posición rápida</p>
        <div className="grid grid-cols-2 gap-2">
          {(["BR", "BL", "TR", "TL"] as Corner[]).map((corner) => (
            <button
              key={corner}
              onClick={() => openModal(corner)}
              className="px-3 py-2.5 rounded-xl border text-sm font-medium transition-all text-left border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50/50"
            >
              {CORNER_LABELS[corner]}
            </button>
          ))}
        </div>

        {/* Elegir manualmente */}
        <button
          onClick={() => openModal()}
          className={[
            "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed text-sm font-medium transition-all",
            stampPos
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
                Abre el visor para ajustar con <kbd className="font-mono">↑↓←→</kbd>
              </p>
            </div>
            <button
              onClick={() => setStampPos(null)}
              aria-label="Restablecer posición"
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors ml-4 flex-shrink-0">
              <RotateCcw size={11} /> Restablecer
            </button>
          </div>
        )}
      </div>

      {!stampPos && (
        <p className="text-xs text-slate-400 text-center">
          Elige dónde va la firma para poder continuar.
        </p>
      )}

      {/* Navegación */}
      <div className="flex justify-between">
        <Button variant="secondary" onClick={onBack} icon={<ArrowLeft size={14} />}>Atrás</Button>
        <Button onClick={onNext} size="lg" disabled={!stampPos} icon={<ArrowRight size={14} />}>Continuar</Button>
      </div>
    </div>
  );
}
