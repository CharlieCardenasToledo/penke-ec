import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as pdfjsLib from "pdfjs-dist";
import { invoke } from "@tauri-apps/api/core";
import {
  X, ChevronLeft, ChevronRight,
  ZoomIn, ZoomOut, Loader2,
  Crosshair, Check, Trash2,
} from "lucide-react";
import { IconButton } from "./ui";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

const STAMP_W_PT = 153;
const STAMP_H_PT = 50;

interface StampPdfPos { pagina: number; x: number; y: number; }

interface Props {
  ruta: string;
  onClose: () => void;
  /** Si se pasa, el modal muestra el modo de posicionamiento y devuelve la posición al confirmar */
  onConfirmPosition?: (pagina: number, puntoX: number, puntoY: number) => void;
  /** Posición existente para mostrar desde el principio */
  initialStamp?: { pagina: number; puntoX: number; puntoY: number } | null;
}

export function PdfViewerModal({ ruta, onClose, onConfirmPosition, initialStamp }: Props) {
  const canvasRef      = useRef<HTMLCanvasElement>(null);
  const renderTaskRef  = useRef<pdfjsLib.RenderTask | null>(null);
  const viewportRef    = useRef<pdfjsLib.PageViewport | null>(null);
  const modalRef       = useRef<HTMLDivElement>(null);

  const [pdfDoc,        setPdfDoc]        = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage,   setCurrentPage]   = useState(1);
  const [totalPages,    setTotalPages]    = useState(0);
  const [scale,         setScale]         = useState(1.4);
  const [loading,       setLoading]       = useState(true);

  // Modo posicionamiento
  const [positioning,   setPositioning]   = useState(!!onConfirmPosition);
  // Posición almacenada en coordenadas PDF (estables entre zooms)
  const [stampPdf,      setStampPdf]      = useState<StampPdfPos | null>(
    initialStamp ? { pagina: initialStamp.pagina, x: initialStamp.puntoX, y: initialStamp.puntoY } : null
  );

  const fileName = ruta.split(/[\\/]/).pop() ?? ruta;

  // Devolver foco al elemento que tenía el foco al montar el modal
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    return () => { previousFocus?.focus(); };
  }, []);

  // ── Cargar PDF ───────────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    setPdfDoc(null);
    invoke<string>("leer_archivo_base64", { ruta })
      .then((b64) => {
        const bin   = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return pdfjsLib.getDocument({ data: bytes }).promise;
      })
      .then((doc) => { setPdfDoc(doc); setTotalPages(doc.numPages); setLoading(false); })
      .catch(() => setLoading(false));
  }, [ruta]);

  // ── Dibujar sello encima del canvas ya renderizado ────────────────────────────
  const drawStamp = useCallback((vp: pdfjsLib.PageViewport, pdfX: number, pdfY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const [cx, cy] = vp.convertToViewportPoint(pdfX, pdfY);

    const sw = (STAMP_W_PT / 72) * 96 * scale;
    const sh = (STAMP_H_PT / 72) * 96 * scale;
    const fontSize = Math.max(9, scale * 9);

    ctx.save();
    ctx.globalAlpha = 0.78;
    ctx.fillStyle   = "#3b82f6";
    ctx.strokeStyle = "#1d4ed8";
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.roundRect(cx - sw / 2, cy - sh / 2, sw, sh, 4);
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha  = 1;
    ctx.fillStyle    = "#ffffff";
    ctx.font         = `bold ${fontSize}px Inter, sans-serif`;
    ctx.textAlign    = "center";
    ctx.fillText("FIRMA DIGITAL",   cx, cy - sh / 6);
    ctx.font         = `${Math.max(7, scale * 7)}px Inter, sans-serif`;
    ctx.fillText("Penké EC", cx, cy + sh / 6);
    ctx.restore();
  }, [scale]);

  // ── Renderizar página + sello ─────────────────────────────────────────────────
  const renderPage = useCallback(async (
    doc: pdfjsLib.PDFDocumentProxy,
    pageNum: number,
    sc: number,
    stamp: StampPdfPos | null,
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Esperar a que termine la tarea anterior antes de usar el mismo canvas
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
      try { await renderTaskRef.current.promise; } catch { /* RenderingCancelledException esperada */ }
      renderTaskRef.current = null;
    }

    // Verificar que el canvas sigue montado tras el await
    if (!canvasRef.current) return;

    const page = await doc.getPage(pageNum);
    const vp   = page.getViewport({ scale: sc });
    viewportRef.current = vp;

    canvas.width  = vp.width;
    canvas.height = vp.height;
    const ctx  = canvas.getContext("2d")!;
    const task = page.render({ canvasContext: ctx, viewport: vp, canvas });
    renderTaskRef.current = task;

    task.promise
      .then(() => {
        if (stamp && stamp.pagina === pageNum) drawStamp(vp, stamp.x, stamp.y);
      })
      .catch(() => { /* RenderingCancelledException ignorada */ });
  }, [drawStamp]);

  useEffect(() => {
    if (!pdfDoc) return;
    renderPage(pdfDoc, currentPage, scale, stampPdf);
  }, [pdfDoc, currentPage, scale, stampPdf, renderPage]);

  // ── Click en el canvas (modo posicionamiento) ─────────────────────────────────
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!positioning || !viewportRef.current) return;
    const canvas = canvasRef.current!;
    const rect   = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    const cx     = (e.clientX - rect.left) * scaleX;
    const cy     = (e.clientY - rect.top)  * scaleY;
    const [px, py] = viewportRef.current.convertToPdfPoint(cx, cy);
    setStampPdf({ pagina: currentPage, x: px, y: py });
  }, [positioning, currentPage]);

  // ── Foco al montar y teclado ──────────────────────────────────────────────────
  useEffect(() => {
    const closeBtn = document.getElementById("pdf-viewer-close");
    closeBtn?.focus();
  }, []);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape")         onClose();
      if (e.key === "ArrowRight")     setCurrentPage((p) => Math.min(p + 1, totalPages));
      if (e.key === "ArrowLeft")      setCurrentPage((p) => Math.max(p - 1, 1));
      if (e.key === "+" || e.key === "=") setScale((s) => +(Math.min(s + 0.2, 3)).toFixed(1));
      if (e.key === "-")              setScale((s) => +(Math.max(s - 0.2, 0.5)).toFixed(1));
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, totalPages]);

  // Trampa de foco dentro del modal
  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;
    function trapFocus(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const focusable = Array.from(
        modal!.querySelectorAll<HTMLElement>(
          "button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex='-1'])"
        )
      ).filter((el) => el.offsetParent !== null);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last  = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
      }
    }
    modal.addEventListener("keydown", trapFocus);
    return () => modal.removeEventListener("keydown", trapFocus);
  }, []);

  // ── Confirmar posición ────────────────────────────────────────────────────────
  function handleConfirm() {
    if (!stampPdf || !onConfirmPosition) return;
    onConfirmPosition(stampPdf.pagina, Math.round(stampPdf.x), Math.round(stampPdf.y));
    onClose();
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pdf-viewer-title"
        className="fixed inset-0 z-50 flex flex-col"
        style={{ background: "rgba(15,23,42,0.97)", backdropFilter: "blur(4px)" }}
      >
        {/* ── Toolbar ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 h-12 border-b border-white/10 flex-shrink-0 gap-3">
          <p id="pdf-viewer-title" className="text-sm font-medium text-white/80 truncate min-w-0" title={ruta}>
            {fileName}
          </p>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Modo posicionamiento — solo si se pasó onConfirmPosition */}
            {onConfirmPosition && (
              <button
                onClick={() => setPositioning((v) => !v)}
                className={[
                  "flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-colors",
                  positioning
                    ? "bg-blue-500 text-white"
                    : "bg-white/10 text-white/60 hover:text-white",
                ].join(" ")}>
                <Crosshair size={13} />
                {positioning ? "Eligiendo dónde va la firma…" : "¿Dónde va la firma?"}
              </button>
            )}

            {/* Zoom */}
            <div className="flex items-center gap-0.5 bg-white/10 rounded-lg px-1">
              <IconButton
                aria-label="Alejar"
                size="sm"
                onClick={() => setScale((s) => +(Math.max(s - 0.2, 0.5)).toFixed(1))}
                className="text-white/60 hover:text-white hover:bg-white/10"
              >
                <ZoomOut size={14} />
              </IconButton>
              <span className="text-xs text-white/50 w-10 text-center select-none" aria-live="polite">
                {Math.round(scale * 100)}%
              </span>
              <IconButton
                aria-label="Acercar"
                size="sm"
                onClick={() => setScale((s) => +(Math.min(s + 0.2, 3)).toFixed(1))}
                className="text-white/60 hover:text-white hover:bg-white/10"
              >
                <ZoomIn size={14} />
              </IconButton>
            </div>

            {/* Páginas */}
            {totalPages > 0 && (
              <div className="flex items-center gap-0.5 bg-white/10 rounded-lg px-1">
                <IconButton
                  aria-label="Página anterior"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-25"
                >
                  <ChevronLeft size={14} />
                </IconButton>
                <span className="text-xs text-white/50 px-2 select-none" aria-live="polite">
                  {currentPage} / {totalPages}
                </span>
                <IconButton
                  aria-label="Página siguiente"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-25"
                >
                  <ChevronRight size={14} />
                </IconButton>
              </div>
            )}

            <IconButton
              id="pdf-viewer-close"
              aria-label="Cerrar visor de PDF"
              size="sm"
              onClick={onClose}
              className="text-white/50 hover:text-white hover:bg-white/10 ml-1"
            >
              <X size={16} />
            </IconButton>
          </div>
        </div>

        {/* ── Banner de instrucción cuando posicionando ─────────────────────── */}
        <AnimatePresence>
          {positioning && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden flex-shrink-0">
              <div className="flex items-center justify-between px-5 py-2.5 bg-blue-600/20 border-b border-blue-500/30">
                <p className="text-sm text-blue-300 flex items-center gap-2">
                  <Crosshair size={14} />
                  {stampPdf
                    ? <span>Firma en la pág. <strong>{stampPdf.pagina}</strong> — haz clic en otra parte para moverla</span>
                    : <span>Haz clic en el lugar del documento donde quieres que aparezca tu firma</span>}
                </p>

                <div className="flex items-center gap-2">
                  {stampPdf && (
                    <button onClick={() => setStampPdf(null)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-red-300 hover:bg-red-500/20 transition-colors">
                      <Trash2 size={11} /> Quitar
                    </button>
                  )}
                  <button onClick={handleConfirm} disabled={!stampPdf}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-400 disabled:opacity-40 text-white text-xs font-semibold transition-colors">
                    <Check size={13} /> Listo, poner aquí
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Área del PDF ──────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-auto flex items-start justify-center p-6 min-h-0">
          {loading ? (
            <div className="flex flex-col items-center gap-3 mt-24 text-white/30">
              <Loader2 size={32} className="animate-spin" />
              <p className="text-sm">Cargando PDF…</p>
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              className={[
                "rounded shadow-2xl block",
                positioning ? "cursor-crosshair" : "cursor-default",
              ].join(" ")}
            />
          )}
        </div>

        {/* ── Ayuda teclado ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-center gap-5 py-2 border-t border-white/5 flex-shrink-0">
          {([["←→", "Página"], ["+ −", "Zoom"], ["Esc", "Cerrar"]] as const).map(([k, l]) => (
            <span key={k} className="text-[10px] text-white/20">
              <kbd className="font-mono">{k}</kbd><span className="ml-1">{l}</span>
            </span>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
