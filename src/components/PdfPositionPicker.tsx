import { useEffect, useRef, useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { invoke } from "@tauri-apps/api/core";

// Worker inline para Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

// Tamaño del sello en puntos PDF (igual que FirmaEC nativo: 153×50)
const STAMP_W_PT = 153;
const STAMP_H_PT = 50;

interface Props {
  rutaDocumento: string;
  onConfirm: (pagina: number, puntoX: number, puntoY: number) => void;
  onClose: () => void;
}

export function PdfPositionPicker({ rutaDocumento, onConfirm, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pagina, setPagina] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [viewport, setViewport] = useState<pdfjsLib.PageViewport | null>(null);
  const [stampPos, setStampPos] = useState<{ x: number; y: number } | null>(null);
  const [loading, setLoading] = useState(true);

  // Carga el PDF leyendo los bytes desde Rust (evita restricciones de Tauri sobre file://)
  useEffect(() => {
    setLoading(true);
    invoke<string>("leer_archivo_base64", { ruta: rutaDocumento })
      .then((b64) => {
        const binary = atob(b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return pdfjsLib.getDocument({ data: bytes }).promise;
      })
      .then((doc) => {
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        setLoading(false);
      })
      .catch((e) => {
        console.error("Error cargando PDF:", e);
        setLoading(false);
      });
  }, [rutaDocumento]);

  // Renderiza la página en el canvas
  const renderPage = useCallback(async (doc: pdfjsLib.PDFDocumentProxy, num: number) => {
    const page = await doc.getPage(num);
    const scale = 1.5;
    const vp = page.getViewport({ scale });
    setViewport(vp);
    setStampPos(null);

    const canvas = canvasRef.current!;
    canvas.width  = vp.width;
    canvas.height = vp.height;
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport: vp, canvas: canvas }).promise;
  }, []);

  useEffect(() => {
    if (pdfDoc) renderPage(pdfDoc, pagina);
  }, [pdfDoc, pagina, renderPage]);

  // Redibuja el sello de preview encima del PDF
  const drawStamp = useCallback((x: number, y: number) => {
    if (!viewport) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    // Limpia y re-renderiza la página base (solo si ya existe)
    if (pdfDoc) {
      pdfDoc.getPage(pagina).then((page) => {
        page.render({ canvasContext: ctx, viewport: viewport, canvas: canvas }).promise.then(() => {
          // Tamaño del sello escalado a píxeles de pantalla
          const sw = (STAMP_W_PT / 72) * 96 * 1.5;
          const sh = (STAMP_H_PT / 72) * 96 * 1.5;
          ctx.save();
          ctx.globalAlpha = 0.7;
          ctx.fillStyle = "#3b82f6";
          ctx.strokeStyle = "#1d4ed8";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(x - sw / 2, y - sh / 2, sw, sh, 4);
          ctx.fill();
          ctx.stroke();
          ctx.globalAlpha = 1;
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 11px Inter, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("FIRMA DIGITAL", x, y - 6);
          ctx.font = "9px Inter, sans-serif";
          ctx.fillText("FirmaEC · MINTEL", x, y + 8);
          ctx.restore();
        });
      });
    }
  }, [pdfDoc, pagina, viewport]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!viewport) return;
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    const canvasX = (e.clientX - rect.left)  * scaleX;
    const canvasY = (e.clientY - rect.top)   * scaleY;

    setStampPos({ x: canvasX, y: canvasY });
    drawStamp(canvasX, canvasY);
  }, [viewport, drawStamp]);

  const handleConfirm = useCallback(() => {
    if (!stampPos || !viewport) return;
    // Convertir coordenadas de canvas → puntos PDF
    const [pdfX, pdfY] = viewport.convertToPdfPoint(stampPos.x, stampPos.y);
    // pdfY ya viene en sistema PDF (origen abajo), FirmaDigital.firmar() lo espera así
    onConfirm(pagina, Math.round(pdfX), Math.round(pdfY));
  }, [stampPos, viewport, pagina, onConfirm]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl flex flex-col w-[900px] max-w-[95vw] max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-slate-800">Seleccionar posición del sello</h2>
            <p className="text-xs text-slate-500 mt-0.5">Haz clic en el PDF donde quieres colocar la firma</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-bold px-2">✕</button>
        </div>

        {/* Controles de página */}
        <div className="flex items-center gap-3 px-6 py-3 border-b border-slate-100 bg-slate-50">
          <button
            onClick={() => setPagina(p => Math.max(1, p - 1))}
            disabled={pagina <= 1}
            className="px-3 py-1 rounded-lg border border-slate-200 text-sm disabled:opacity-40 hover:bg-white"
          >
            ← Anterior
          </button>
          <span className="text-sm text-slate-600">
            Página <strong>{pagina}</strong> de <strong>{totalPages}</strong>
          </span>
          <button
            onClick={() => setPagina(p => Math.min(totalPages, p + 1))}
            disabled={pagina >= totalPages}
            className="px-3 py-1 rounded-lg border border-slate-200 text-sm disabled:opacity-40 hover:bg-white"
          >
            Siguiente →
          </button>

          {stampPos && (
            <span className="ml-auto text-xs text-green-600 font-medium">
              ✓ Posición seleccionada — confirma abajo
            </span>
          )}
        </div>

        {/* Canvas PDF */}
        <div className="flex-1 overflow-auto p-4 bg-slate-100 flex justify-center">
          {loading ? (
            <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
              Cargando PDF…
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              className="shadow-lg rounded cursor-crosshair max-w-full"
              style={{ display: "block" }}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!stampPos}
            className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-semibold transition-all shadow-md"
          >
            Confirmar posición
          </button>
        </div>
      </div>
    </div>
  );
}
