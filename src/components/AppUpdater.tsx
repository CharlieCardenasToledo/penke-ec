import { Download, RefreshCw, X } from "lucide-react";
import { Button } from "./ui/Button";
import { Dialog } from "./ui/Dialog";
import type { UpdaterState } from "../hooks/useAppUpdater";

interface AppUpdaterProps {
  state: UpdaterState;
  version?: string;
  notes?: string;
  progress: number;
  error: string | null;
  onCheck: () => void;
  onInstall: () => void;
  onClose: () => void;
}

export function AppUpdater({ state, version, notes, progress, error, onCheck, onInstall, onClose }: AppUpdaterProps) {
  const open = state === "available" || state === "downloading" || state === "error";
  const downloading = state === "downloading";
  return (
    <Dialog open={open} onClose={downloading ? () => undefined : onClose} title={state === "error" ? "Actualización no disponible" : "Nueva versión de Penké"}>
      {state === "error" ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">{error}</p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>Cerrar</Button>
            <Button icon={<RefreshCw size={14} />} onClick={onCheck}>Reintentar</Button>
          </div>
        </div>
      ) : downloading ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Descargando e instalando Penké v{version}. No cierres la aplicación.</p>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100" aria-label={`Progreso: ${progress}%`}>
            <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-right text-xs font-medium text-slate-500">{progress}%</p>
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <p className="text-sm text-slate-600">Está disponible Penké v{version}. Guarda tu trabajo antes de instalarla.</p>
            {notes && <div className="mt-4 max-h-48 overflow-y-auto rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">{notes}</div>}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" icon={<X size={14} />} onClick={onClose}>Más tarde</Button>
            <Button icon={<Download size={14} />} onClick={onInstall}>Actualizar ahora</Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
