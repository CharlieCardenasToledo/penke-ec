import { useCallback, useState } from "react";
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

  const pick = useCallback(async () => {
    const selected = await open({
      filters: accept ? [{ name: label, extensions: accept }] : undefined,
      multiple: false,
    });
    if (selected && typeof selected === "string") onChange(selected);
  }, [accept, label, onChange]);

  return (
    <button
      type="button"
      onClick={pick}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault(); setDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) onChange((f as unknown as { path: string }).path);
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
