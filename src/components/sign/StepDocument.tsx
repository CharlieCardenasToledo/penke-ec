import { ArrowLeft, ArrowRight, FileText, Files, Plus } from "lucide-react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { DropZone }     from "../DropZone";
import { PdfThumbnail } from "../PdfThumbnail";
import { BatchSignList, type BatchFile } from "../BatchSignList";
import type { Preset } from "../../hooks/usePresets";

interface Props {
  profile: Preset;
  doc: string;
  setDoc: (d: string) => void;
  batchMode: boolean;
  setBatchMode: (b: boolean) => void;
  batchFiles: BatchFile[];
  setBatchFiles: React.Dispatch<React.SetStateAction<BatchFile[]>>;
  onBack: () => void;
  onNext: () => void;
}

export function StepDocument({
  profile, doc, setDoc, batchMode, setBatchMode,
  batchFiles, setBatchFiles, onBack, onNext,
}: Props) {
  const canContinue = batchMode
    ? batchFiles.filter((f) => f.status === "pending").length > 0
    : !!doc;

  async function addBatchFiles() {
    const selected = await openDialog({
      multiple: true,
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });
    if (!selected) return;
    const paths = Array.isArray(selected) ? selected : [selected];
    const news: BatchFile[] = paths
      .filter((p) => !batchFiles.find((f) => f.ruta === p))
      .map((p) => ({
        id: Math.random().toString(36).slice(2),
        ruta: p,
        nombre: p.split(/[\\/]/).pop() ?? p,
        status: "pending" as const,
      }));
    setBatchFiles((prev) => [...prev, ...news]);
  }

  function removeFile(id: string) {
    setBatchFiles((prev) => prev.filter((f) => f.id !== id));
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <button onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 mb-4 transition-colors">
          <ArrowLeft size={15} /> Mis perfiles
        </button>

        {/* Perfil activo */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-slate-800">{profile.nombre}</p>
            {profile.certTitular && (
              <p className="text-xs text-slate-400 mt-0.5">
                {profile.certTitular}{profile.certCedula ? ` · CI ${profile.certCedula}` : ""}
              </p>
            )}
          </div>
          {/* Toggle modo */}
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 p-0.5">
            <button
              onClick={() => setBatchMode(false)}
              className={[
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                !batchMode ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700",
              ].join(" ")}
            >
              <FileText size={12} /> Un documento
            </button>
            <button
              onClick={() => setBatchMode(true)}
              className={[
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                batchMode ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700",
              ].join(" ")}
            >
              <Files size={12} /> Varios documentos
            </button>
          </div>
        </div>
      </div>

      {/* Contenido según modo */}
      <AnimatePresence mode="wait">
        {!batchMode ? (
          <motion.div key="individual"
            initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-2">
              <FileText size={13} /> Tu documento
            </label>
            {doc ? (
              <div className="flex gap-4 items-start">
                <PdfThumbnail ruta={doc} />
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-medium text-slate-700 truncate">
                    {doc.split(/[\\/]/).pop()}
                  </p>
                  <DropZone
                    label="Cambiar documento"
                    accept={["pdf"]}
                    value={doc}
                    onChange={(p) => { setDoc(p); }}
                  />
                </div>
              </div>
            ) : (
              <DropZone
                label="Arrastra un PDF o haz clic para seleccionarlo"
                accept={["pdf"]}
                value=""
                onChange={(p) => setDoc(p)}
              />
            )}
          </motion.div>
        ) : (
          <motion.div key="batch"
            initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
            className="space-y-3">
            <BatchSignList files={batchFiles} onRemove={removeFile} />
            <button onClick={addBatchFiles}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/50 text-slate-500 hover:text-blue-600 text-sm font-medium transition-all">
              <Plus size={15} /> Agregar PDFs al lote
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Acción */}
      <div className="flex justify-end">
        <button
          onClick={onNext}
          disabled={!canContinue}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all shadow-md"
        >
          Continuar <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
