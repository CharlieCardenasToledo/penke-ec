import { useCallback, useEffect, useRef, useState } from "react";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { open } from "@tauri-apps/plugin-dialog";
import { Upload } from "lucide-react";

interface Props {
  label: string;
  accept?: string[];
  value?: string;
  onChange: (path: string) => void;
}

export function DropZone({ label, accept, value, onChange }: Props) {
  const [dragging, setDragging] = useState(false);
  const dropZoneRef = useRef<HTMLButtonElement>(null);
  const onChangeRef = useRef(onChange);
  const acceptRef = useRef(accept);

  onChangeRef.current = onChange;
  acceptRef.current = accept;

  const acceptsPath = useCallback((path: string) => {
    const extensions = acceptRef.current;
    if (!extensions?.length) return true;
    const extension = path.split(".").pop()?.toLowerCase();
    return Boolean(extension && extensions.some((item) => item.toLowerCase() === extension));
  }, []);

  const isInsideDropZone = useCallback((position: { x: number; y: number }) => {
    const rect = dropZoneRef.current?.getBoundingClientRect();
    if (!rect) return false;

    // Tauri entrega coordenadas físicas; el DOM trabaja en píxeles lógicos.
    const scale = window.devicePixelRatio || 1;
    const x = position.x / scale;
    const y = position.y / scale;
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  }, []);

  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;

    getCurrentWebview().onDragDropEvent(({ payload }) => {
      if (payload.type === "leave") {
        setDragging(false);
        return;
      }

      const inside = isInsideDropZone(payload.position);
      if (payload.type === "enter") {
        setDragging(inside && payload.paths.some(acceptsPath));
      } else if (payload.type === "over") {
        setDragging(inside);
      } else if (payload.type === "drop") {
        setDragging(false);
        if (!inside) return;
        const path = payload.paths.find(acceptsPath);
        if (path) onChangeRef.current(path);
      }
    }).then((stopListening) => {
      if (disposed) stopListening();
      else unlisten = stopListening;
    }).catch(() => {
      // En el navegador normal se conserva el fallback HTML de abajo.
    });

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [acceptsPath, isInsideDropZone]);

  const pick = useCallback(async () => {
    const selected = await open({
      filters: accept ? [{ name: label, extensions: accept }] : undefined,
      multiple: false,
    });
    if (selected && typeof selected === "string") onChange(selected);
  }, [accept, label, onChange]);

  return (
    <button
      ref={dropZoneRef}
      type="button"
      onClick={pick}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault(); setDragging(false);
        const f = e.dataTransfer.files[0];
        const path = (f as File & { path?: string })?.path;
        if (path && acceptsPath(path)) onChange(path);
      }}
      className={[
        "w-full rounded-xl border-2 border-dashed px-4 py-5 text-left transition-all cursor-pointer",
        dragging  ? "border-blue-400 bg-blue-50" :
        value     ? "border-blue-300 bg-blue-50/50" :
                    "border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/30",
      ].join(" ")}
    >
      {value ? (
        <div>
          <p className="text-xs text-blue-600 font-medium mb-0.5">Archivo seleccionado</p>
          <p className="text-sm text-slate-700 font-mono truncate">{value.split(/[\\/]/).pop()}</p>
          <p className="text-xs text-slate-400 mt-0.5 truncate">{value}</p>
        </div>
      ) : (
        <div className="text-center">
          <Upload size={22} className="text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-600">{label}</p>
          <p className="text-xs text-slate-400 mt-0.5">Haz clic o arrastra el archivo aquí</p>
        </div>
      )}
    </button>
  );
}
