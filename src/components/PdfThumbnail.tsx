import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { invoke } from "@tauri-apps/api/core";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

interface Props {
  ruta: string;
  onClick?: () => void;
}

export function PdfThumbnail({ ruta, onClick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [pages, setPages]     = useState(0);

  useEffect(() => {
    if (!ruta) return;
    setLoading(true);
    invoke<string>("leer_archivo_base64", { ruta })
      .then((b64) => {
        const binary = atob(b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return pdfjsLib.getDocument({ data: bytes }).promise;
      })
      .then(async (doc) => {
        setPages(doc.numPages);
        const page = await doc.getPage(1);
        const vp = page.getViewport({ scale: 0.35 });
        const canvas = canvasRef.current!;
        canvas.width  = vp.width;
        canvas.height = vp.height;
        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise;
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [ruta]);

  if (loading) {
    return (
      <div className="w-24 h-32 bg-slate-100 rounded-lg animate-pulse flex items-center justify-center">
        <span className="text-slate-300 text-xs">PDF</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title="Clic para seleccionar posición del sello"
      className="group relative flex-shrink-0"
    >
      <canvas
        ref={canvasRef}
        className="rounded-lg shadow border border-slate-200 group-hover:shadow-md transition-shadow"
        style={{ display: "block" }}
      />
      {pages > 0 && (
        <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded">
          {pages} pág.
        </span>
      )}
      <div className="absolute inset-0 rounded-lg bg-blue-500/0 group-hover:bg-blue-500/10 transition-colors flex items-center justify-center">
        <span className="opacity-0 group-hover:opacity-100 text-[10px] font-semibold text-blue-700 bg-white/90 px-2 py-1 rounded-full shadow">
          Posicionar
        </span>
      </div>
    </button>
  );
}
