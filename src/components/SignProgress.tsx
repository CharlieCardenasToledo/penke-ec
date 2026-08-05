import { Loader2, CheckCircle2 } from "lucide-react";

interface Props {
  active: boolean;
  done: boolean;
  fileName?: string;
  outputFolder?: string;
}

export function SignProgress({ active, done, fileName, outputFolder }: Props) {
  if (!active && !done) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-6 py-5">
      <div className="flex items-center gap-3 mb-4">
        {done ? (
          <CheckCircle2 size={20} className="text-green-500 flex-shrink-0" />
        ) : (
          <Loader2 size={20} className="text-blue-500 animate-spin flex-shrink-0" />
        )}
        <p className="text-sm font-semibold text-slate-700">
          {done ? "Firma completada" : "Firmando y guardando el documento…"}
        </p>
      </div>

      {(fileName || outputFolder) && (
        <div className="space-y-1.5 mb-4 pl-8">
          {fileName && (
            <p className="text-xs text-slate-500 font-mono truncate">{fileName}</p>
          )}
          {outputFolder && (
            <p className="text-xs text-slate-400 truncate">{outputFolder}</p>
          )}
        </div>
      )}

      {!done && (
        <p className="text-xs text-slate-400 pl-8">
          No cierres Penké durante este proceso.
        </p>
      )}

      <div className="mt-4 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        {done ? (
          <div className="h-full w-full bg-green-500 rounded-full" />
        ) : (
          <div className="h-full bg-blue-500 rounded-full animate-pulse w-2/5" />
        )}
      </div>
    </div>
  );
}
