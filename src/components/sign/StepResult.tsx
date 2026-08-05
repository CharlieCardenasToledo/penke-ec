import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, FileText, FolderOpen, ArrowRight, ArrowLeft } from "lucide-react";
import { PdfViewerModal }  from "../PdfViewerModal";
import { PdfThumbnail }    from "../PdfThumbnail";
import { toast }           from "../Toast";
import { openWithDefaultApp, revealInFolder, errorMessage } from "../../lib/fileActions";
import type { FirmarResponse } from "../../lib/api";

interface Props {
  result: FirmarResponse;
  onSignAnother: () => void;
  onBack: () => void;
}

export function StepResult({ result, onSignAnother, onBack }: Props) {
  const [showViewer, setShowViewer] = useState(false);

  async function abrirEnLector() {
    const r = await openWithDefaultApp(result.rutaFirmado);
    if (!r.ok) toast(errorMessage(r.errorType!), "error");
  }

  async function mostrarEnCarpeta() {
    const r = await revealInFolder(result.rutaFirmado);
    if (!r.ok) toast("No se pudo abrir la carpeta.", "error");
  }

  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
      className="space-y-4">

      {showViewer && (
        <PdfViewerModal ruta={result.rutaFirmado} onClose={() => setShowViewer(false)} />
      )}

      {/* Banner de éxito */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-4 mb-4">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, delay: 0.1 }} className="flex-shrink-0">
            <CheckCircle2 size={44} className="text-green-500" />
          </motion.div>
          <div>
            <h2 className="text-lg font-bold text-green-800">¡Documento firmado correctamente!</h2>
            <p className="text-sm text-green-700 mt-0.5">
              Firmado por <span className="font-semibold">{result.firmante}</span>
              {result.cedula && <span className="text-green-600 font-normal"> · CI {result.cedula}</span>}
            </p>
          </div>
        </div>

        {/* Preview clickeable */}
        <div role="button" tabIndex={0}
          onClick={() => setShowViewer(true)}
          onKeyDown={(e) => e.key === "Enter" && setShowViewer(true)}
          className="w-full group mb-4 rounded-xl border-2 border-green-200 hover:border-green-400 bg-white/60 hover:bg-white/90 transition-all overflow-hidden flex items-center gap-4 px-4 py-3 cursor-pointer">
          <div className="flex-shrink-0 rounded-lg overflow-hidden border border-green-100 shadow-sm pointer-events-none">
            <PdfThumbnail ruta={result.rutaFirmado} />
          </div>
          <div className="text-left flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-700 group-hover:text-green-700 transition-colors">
              Ver el documento firmado
            </p>
            <p className="text-xs text-slate-400 truncate mt-0.5 font-mono">
              {result.rutaFirmado.split(/[\\/]/).pop()}
            </p>
            <p className="text-xs text-green-600 mt-1">Haz clic para abrirlo aquí mismo</p>
          </div>
          <ArrowRight size={16} className="text-slate-300 group-hover:text-green-500 flex-shrink-0 transition-colors" />
        </div>

        {/* Ruta */}
        <div className="bg-white/70 rounded-xl border border-green-100 px-3 py-2.5 mb-4">
          <p className="text-[10px] text-slate-400 mb-0.5">Guardado en</p>
          <p className="text-xs font-mono text-slate-600 break-all">{result.rutaFirmado}</p>
        </div>

        {/* Acciones */}
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowViewer(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-all shadow-sm">
            <FileText size={13} /> Ver en Penké
          </button>
          <button onClick={abrirEnLector}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-green-300 text-green-700 text-sm font-medium hover:bg-green-100 transition-all">
            <FileText size={13} /> Abrir en lector PDF
          </button>
          <button onClick={mostrarEnCarpeta}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-green-200 text-green-600 text-sm font-medium hover:bg-green-50 transition-all">
            <FolderOpen size={13} /> Mostrar en carpeta
          </button>
          <button onClick={onSignAnother}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all shadow-md ml-auto">
            Firmar otro <ArrowRight size={13} />
          </button>
        </div>
      </div>

      <button onClick={onBack}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-600 transition-colors">
        <ArrowLeft size={14} /> Volver a mis perfiles
      </button>
    </motion.div>
  );
}
