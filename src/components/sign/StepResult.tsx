import { useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2, AlertCircle, FileText, FolderOpen, ArrowRight, ArrowLeft, Files,
} from "lucide-react";
import { PdfViewerModal }  from "../PdfViewerModal";
import { PdfThumbnail }    from "../PdfThumbnail";
import { toast }           from "../Toast";
import { openWithDefaultApp, revealInFolder, errorMessage, copyPath } from "../../lib/fileActions";
import type { SignResult } from "./SignWizard";

interface Props {
  result: SignResult;
  onSignAnother: () => void;
  onBack: () => void;
}

export function StepResult({ result, onSignAnother, onBack }: Props) {
  const [showViewer, setShowViewer] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);

  // ── Resultado de lote ──────────────────────────────────────────────────────
  if (result.kind === "batch") {
    const { completed, failed, outputFolder } = result;
    const total = completed.length + failed.length;
    const allOk = failed.length === 0;
    const allFailed = completed.length === 0;

    async function abrirCarpeta() {
      if (!outputFolder) return;
      const r = await revealInFolder(outputFolder);
      if (!r.ok) toast("No se pudo abrir la carpeta.", "error");
    }

    return (
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
        className="space-y-4">
        <div className={[
          "rounded-2xl border p-6 shadow-sm space-y-4",
          allOk ? "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200"
            : allFailed ? "bg-red-50 border-red-200"
            : "bg-amber-50 border-amber-200",
        ].join(" ")}>
          <div className="flex items-center gap-4">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, delay: 0.1 }} className="flex-shrink-0">
              {allOk
                ? <CheckCircle2 size={44} className="text-green-500" />
                : allFailed
                ? <AlertCircle size={44} className="text-red-500" />
                : <Files size={44} className="text-amber-500" />}
            </motion.div>
            <div>
              <h2 className={[
                "text-lg font-bold",
                allOk ? "text-green-800" : allFailed ? "text-red-800" : "text-amber-900",
              ].join(" ")}>
                {allOk ? "Lote firmado correctamente" : allFailed ? "No se firmó ningún documento" : "Lote completado con errores"}
              </h2>
              <p className="text-sm mt-0.5">
                {allOk
                  ? <span className="text-green-700">{completed.length} de {total} documentos firmados</span>
                  : <><span className="text-green-700 font-semibold">{completed.length} firmados</span>{" · "}<span className="text-red-600 font-semibold">{failed.length} con error</span></>}
              </p>
            </div>
          </div>

          {/* Documentos con error */}
          {failed.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">Errores</p>
              {failed.map((f) => (
                <div key={f.id} className="flex items-start gap-2 px-3 py-2 bg-red-100 rounded-lg">
                  <AlertCircle size={13} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-red-800 truncate">{f.nombre}</p>
                    {f.errorMsg && <p className="text-[11px] text-red-600 mt-0.5">{f.errorMsg}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Carpeta de salida */}
          {outputFolder && (
            <div className="bg-white/70 rounded-xl border border-green-100 px-3 py-2.5">
              <p className="text-[10px] text-slate-400 mb-0.5">Archivos guardados en</p>
              <p className="text-xs font-mono text-slate-600 break-all">{outputFolder}</p>
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            {outputFolder && (
              <button onClick={abrirCarpeta}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-all shadow-sm">
                <FolderOpen size={13} /> Mostrar en carpeta
              </button>
            )}
            <button onClick={onSignAnother}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all shadow-md ml-auto">
              Firmar otro lote <ArrowRight size={13} />
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

  // ── Resultado individual ───────────────────────────────────────────────────
  const { response } = result;

  async function abrirEnLector() {
    setOpenError(null);
    const r = await openWithDefaultApp(response.rutaFirmado);
    if (!r.ok) setOpenError(errorMessage(r.errorType!));
  }

  async function mostrarEnCarpeta() {
    const r = await revealInFolder(response.rutaFirmado);
    if (!r.ok) toast("No se pudo abrir la carpeta.", "error");
  }

  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
      className="space-y-4">

      {showViewer && (
        <PdfViewerModal ruta={response.rutaFirmado} onClose={() => setShowViewer(false)} />
      )}

      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-4 mb-4">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, delay: 0.1 }} className="flex-shrink-0">
            <CheckCircle2 size={44} className="text-green-500" />
          </motion.div>
          <div>
            <h2 className="text-lg font-bold text-green-800">¡Documento firmado correctamente!</h2>
            <p className="text-sm text-green-700 mt-0.5">
              Firmado por <span className="font-semibold">{response.firmante}</span>
              {response.cedula && <span className="text-green-600 font-normal"> · CI {response.cedula}</span>}
            </p>
          </div>
        </div>

        <div role="button" tabIndex={0}
          onClick={() => setShowViewer(true)}
          onKeyDown={(e) => e.key === "Enter" && setShowViewer(true)}
          className="w-full group mb-4 rounded-xl border-2 border-green-200 hover:border-green-400 bg-white/60 hover:bg-white/90 transition-all overflow-hidden flex items-center gap-4 px-4 py-3 cursor-pointer">
          <div className="flex-shrink-0 rounded-lg overflow-hidden border border-green-100 shadow-sm pointer-events-none">
            <PdfThumbnail ruta={response.rutaFirmado} />
          </div>
          <div className="text-left flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-700 group-hover:text-green-700 transition-colors">
              Ver el documento firmado
            </p>
            <p className="text-xs text-slate-400 truncate mt-0.5 font-mono">
              {response.rutaFirmado.split(/[\\/]/).pop()}
            </p>
            <p className="text-xs text-green-600 mt-1">Haz clic para abrirlo aquí mismo</p>
          </div>
          <ArrowRight size={16} className="text-slate-300 group-hover:text-green-500 flex-shrink-0 transition-colors" />
        </div>

        <div className="bg-white/70 rounded-xl border border-green-100 px-3 py-2.5 mb-4">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <p className="text-[10px] text-slate-400">Guardado en</p>
            <button
              onClick={() => { copyPath(response.rutaFirmado); toast("Ruta copiada", "success"); }}
              className="text-[10px] text-slate-400 hover:text-blue-600 transition-colors"
              title="Copiar ruta"
            >
              Copiar
            </button>
          </div>
          <p className="text-xs font-mono text-slate-600 break-all">{response.rutaFirmado}</p>
        </div>

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

        {openError && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 space-y-2 mt-2">
            <p className="text-sm text-amber-800">{openError}</p>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => { setShowViewer(true); setOpenError(null); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-colors">
                Ver en Penké
              </button>
              <button onClick={() => { mostrarEnCarpeta(); setOpenError(null); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 text-amber-700 text-xs font-medium hover:bg-amber-100 transition-colors">
                Mostrar en carpeta
              </button>
              <button onClick={() => { copyPath(response.rutaFirmado); toast("Ruta copiada", "success"); setOpenError(null); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 text-amber-700 text-xs font-medium hover:bg-amber-100 transition-colors">
                Copiar ruta
              </button>
            </div>
          </div>
        )}
      </div>

      <button onClick={onBack}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-600 transition-colors">
        <ArrowLeft size={14} /> Volver a mis perfiles
      </button>
    </motion.div>
  );
}
