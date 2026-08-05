import { motion, AnimatePresence } from "framer-motion";
import { Clock, Loader2, CheckCircle2, AlertCircle, X } from "lucide-react";

export type FileStatus = "pending" | "signing" | "done" | "error";
export interface BatchFile {
  id: string; ruta: string; nombre: string; status: FileStatus;
  rutaFirmado?: string; errorMsg?: string;
}

interface Props { files: BatchFile[]; onRemove: (id: string) => void; }

function StatusIcon({ status }: { status: FileStatus }) {
  if (status === "pending") return <Clock size={15} className="text-slate-400" />;
  if (status === "signing") return <Loader2 size={15} className="text-blue-500 animate-spin" />;
  if (status === "done")    return <CheckCircle2 size={15} className="text-green-500" />;
  return <AlertCircle size={15} className="text-red-500" />;
}

const statusTextColor: Record<FileStatus, string> = {
  pending: "text-slate-600", signing: "text-blue-600",
  done: "text-green-700",   error: "text-red-600",
};

export function BatchSignList({ files, onRemove }: Props) {
  if (files.length === 0) return null;
  const done   = files.filter((f) => f.status === "done").length;
  const errors = files.filter((f) => f.status === "error").length;
  const total  = files.length;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
          {total} documento{total !== 1 ? "s" : ""}
        </p>
        <div className="flex items-center gap-3 text-xs">
          {done   > 0 && <span className="text-green-600">{done} firmados</span>}
          {errors > 0 && <span className="text-red-500">{errors} errores</span>}
        </div>
      </div>
      {(done + errors) > 0 && (
        <div className="h-1 bg-slate-100">
          <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${((done + errors) / total) * 100}%` }} />
        </div>
      )}
      <ul className="divide-y divide-slate-50">
        <AnimatePresence initial={false}>
          {files.map((f) => (
            <motion.li
              key={f.id}
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.18 }}
              className="flex items-center gap-3 px-5 py-3"
            >
              <span className="flex-shrink-0"><StatusIcon status={f.status} /></span>
              <div className="flex-1 min-w-0">
                <p className={["text-sm font-medium truncate", statusTextColor[f.status]].join(" ")}>{f.nombre}</p>
                {f.errorMsg && <p className="text-xs text-red-400 truncate mt-0.5">{f.errorMsg}</p>}
                {f.rutaFirmado && <p className="text-xs text-slate-400 truncate mt-0.5">{f.rutaFirmado.split(/[\\/]/).pop()}</p>}
              </div>
              {f.status === "pending" && (
                <button onClick={() => onRemove(f.id)} className="text-slate-300 hover:text-red-400 flex-shrink-0 p-1 rounded hover:bg-red-50 transition-all">
                  <X size={14} />
                </button>
              )}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}
