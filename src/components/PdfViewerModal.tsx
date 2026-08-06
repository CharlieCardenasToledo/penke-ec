import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

// Calibrado inspeccionando /Rect de un PDF firmado con FirmaEC 5.1.0 (anclaje LOWER_LEFT)
const STAMP_W_PT = 110;
const STAMP_H_PT = 36;

export type Corner = "BL" | "BR" | "TL" | "TR";

const CORNER_LABELS: Record<Corner, string> = {
  BL: "↙ Inf. izq.", BR: "↘ Inf. der.", TL: "↖ Sup. izq.", TR: "↗ Sup. der.",
};

// lower-left corner en puntos PDF
interface StampPdfPos { pagina: number; x: number; y: number; }

interface Props {
  ruta: string;
  onClose: () => void;
  onConfirmPosition?: (pagina: number, puntoX: number, puntoY: number) => void;
  initialStamp?: { pagina: number; puntoX: number; puntoY: number } | null;
  /** Si se pasa, pre-selecciona esa esquina al cargar la primera página */
  initialCorner?: Corner;
  /** Tipo de estampado para mostrar en el overlay (QR, Simple, Avanzada…) */
  estampado?: string;
}

function computeCornerPos(viewBox: number[], corner: Corner): { x: number; y: number } {
  const margin = 18;
  const [x0, y0, x1, y1] = viewBox;
  const map: Record<Corner, { x: number; y: number }> = {
    BL: { x: x0 + margin,                y: y0 + margin },
    BR: { x: x1 - STAMP_W_PT - margin,   y: y0 + margin },
    TL: { x: x0 + margin,                y: y1 - STAMP_H_PT - margin },
    TR: { x: x1 - STAMP_W_PT - margin,   y: y1 - STAMP_H_PT - margin },
  };
  return map[corner];
}

function clampToPage(x: number, y: number, viewBox: number[]): { x: number; y: number } {
  const [x0, y0, x1, y1] = viewBox;
  return {
    x: Math.max(x0, Math.min(x1 - STAMP_W_PT, x)),
    y: Math.max(y0, Math.min(y1 - STAMP_H_PT, y)),
  };
}

export function PdfViewerModal({
  ruta, onClose, onConfirmPosition, initialStamp, initialCorner, estampado,
}: Props) {
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);
  const modalRef      = useRef<HTMLDivElement>(null);
  const cornerApplied = useRef(false);
  const dragStart     = useRef<{ mouseX: number; mouseY: number; pdfX: number; pdfY: number } | null>(null);

  const [pdfDoc,       setPdfDoc]      = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage,  setCurrentPage] = useState(1);
  const [totalPages,   setTotalPages]  = useState(0);
  const [scale,        setScale]       = useState(1.4);
  const [loading,      setLoading]     = useState(true);
  const [viewport,     setViewport]    = useState<pdfjsLib.PageViewport | null>(null);
  const [positioning,  setPositioning] = useState(!!onConfirmPosition);
  const [dragging,     setDragging]    = useState(false);
  // puntoY en FirmaEC = borde SUPERIOR del sello (Y mayor = arriba en coords PDF).
  // Internamente usamos lower-left; al confirmar sumamos STAMP_H_PT, al inicializar restamos.
  const [stampPdf,     setStampPdf]    = useState<StampPdfPos | null>(
    initialStamp
      ? { pagina: initialStamp.pagina, x: initialStamp.puntoX, y: initialStamp.puntoY - STAMP_H_PT }
      : null,
  );

  const fileName = ruta.split(/[\\/]/).pop() ?? ruta;

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    return () => { prev?.focus(); };
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

  // ── Renderizar página (sin dibujar sello — lo maneja el overlay HTML) ────────
  const renderPage = useCallback(async (
    doc: pdfjsLib.PDFDocumentProxy,
    pageNum: number,
    sc: number,
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
      try { await renderTaskRef.current.promise; } catch { /* cancelación esperada */ }
      renderTaskRef.current = null;
    }

    if (!canvasRef.current) return;

    const page = await doc.getPage(pageNum);
    const vp   = page.getViewport({ scale: sc });
    setViewport(vp);

    canvas.width  = vp.width;
    canvas.height = vp.height;
    const ctx  = canvas.getContext("2d")!;
    const task = page.render({ canvasContext: ctx, viewport: vp, canvas });
    renderTaskRef.current = task;
    task.promise.catch(() => {});
  }, []);

  useEffect(() => {
    if (!pdfDoc) return;
    renderPage(pdfDoc, currentPage, scale);
  }, [pdfDoc, currentPage, scale, renderPage]);

  // ── Aplicar esquina inicial la primera vez que carga el viewport ─────────────
  useEffect(() => {
    if (!viewport || !initialCorner || cornerApplied.current || stampPdf) return;
    cornerApplied.current = true;
    setStampPdf({ pagina: 1, ...computeCornerPos(viewport.viewBox, initialCorner) });
  }, [viewport, initialCorner, stampPdf]);

  // ── Rectángulo del sello en píxeles CSS (para overlay HTML) ─────────────────
  const stampScreenRect = useMemo(() => {
    if (!viewport || !stampPdf || stampPdf.pagina !== currentPage) return null;
    // Esquinas en espacio de canvas usando convertToViewportPoint
    const [cx0, cy0] = viewport.convertToViewportPoint(stampPdf.x,              stampPdf.y);
    const [cx1, cy1] = viewport.convertToViewportPoint(stampPdf.x + STAMP_W_PT, stampPdf.y + STAMP_H_PT);
    return {
      left:   Math.min(cx0, cx1),
      top:    Math.min(cy0, cy1),
      width:  Math.abs(cx1 - cx0),
      height: Math.abs(cy1 - cy0),
    };
  }, [viewport, stampPdf, currentPage]);

  // ── Click en canvas: center→lower-left + clamping ────────────────────────────
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!positioning || !viewport || dragging) return;
    const canvas = canvasRef.current!;
    const rect   = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    const cx     = (e.clientX - rect.left) * scaleX;
    const cy     = (e.clientY - rect.top)  * scaleY;
    const [clickX, clickY] = viewport.convertToPdfPoint(cx, cy);
    const clamped = clampToPage(
      clickX - STAMP_W_PT / 2,
      clickY - STAMP_H_PT / 2,
      viewport.viewBox,
    );
    setStampPdf({ pagina: currentPage, ...clamped });
  }, [positioning, viewport, currentPage, dragging]);

  // ── Arrastre del sello ────────────────────────────────────────────────────────
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (!positioning || !viewport || !stampPdf) return;
    e.preventDefault();
    e.stopPropagation();
    dragStart.current = { mouseX: e.clientX, mouseY: e.clientY, pdfX: stampPdf.x, pdfY: stampPdf.y };
    setDragging(true);
  }, [positioning, viewport, stampPdf]);

  const handleDragMove = useCallback((e: React.MouseEvent) => {
    if (!dragging || !dragStart.current || !viewport) return;
    const canvas = canvasRef.current!;
    const rect   = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    const deltaCx = (e.clientX - dragStart.current.mouseX) * scaleX;
    const deltaCy = (e.clientY - dragStart.current.mouseY) * scaleY;
    const [startCx, startCy] = viewport.convertToViewportPoint(dragStart.current.pdfX, dragStart.current.pdfY);
    const [newPdfX, newPdfY] = viewport.convertToPdfPoint(startCx + deltaCx, startCy + deltaCy);
    const clamped = clampToPage(newPdfX, newPdfY, viewport.viewBox);
    setStampPdf((prev) => prev ? { ...prev, ...clamped } : prev);
  }, [dragging, viewport]);

  const handleDragEnd = useCallback(() => {
    if (dragging) { setDragging(false); dragStart.current = null; }
  }, [dragging]);

  // ── Posiciones rápidas dinámicas ─────────────────────────────────────────────
  function applyQuickPos(corner: Corner) {
    if (!viewport) return;
    setStampPdf({ pagina: currentPage, ...computeCornerPos(viewport.viewBox, corner) });
  }

  useEffect(() => {
    document.getElementById("pdf-viewer-close")?.focus();
  }, []);

  // ── Teclado ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") { onClose(); return; }

      // Mover sello con flechas (solo en modo posicionamiento con sello colocado)
      if (positioning && viewport && stampPdf) {
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
          e.preventDefault();
          const step = e.shiftKey ? 10 : 1;
          const vb = viewport.viewBox;
          setStampPdf((prev) => {
            if (!prev) return prev;
            let { pagina, x, y } = prev;
            if (e.key === "ArrowLeft")  x = Math.max(vb[0],               x - step);
            if (e.key === "ArrowRight") x = Math.min(vb[2] - STAMP_W_PT,  x + step);
            if (e.key === "ArrowUp")    y = Math.min(vb[3] - STAMP_H_PT,  y + step);
            if (e.key === "ArrowDown")  y = Math.max(vb[1],               y - step);
            return { pagina, x, y };
          });
          return;
        }
      }

      // Navegación de páginas (cuando no se está moviendo el sello)
      if (e.key === "ArrowRight") setCurrentPage((p) => Math.min(p + 1, totalPages));
      if (e.key === "ArrowLeft")  setCurrentPage((p) => Math.max(p - 1, 1));
      if (e.key === "+" || e.key === "=") setScale((s) => +(Math.min(s + 0.2, 3)).toFixed(1));
      if (e.key === "-")              setScale((s) => +(Math.max(s - 0.2, 0.5)).toFixed(1));
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, totalPages, positioning, viewport, stampPdf]);

  // ── Trampa de foco ────────────────────────────────────────────────────────────
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

  function handleConfirm() {
    if (!stampPdf || !onConfirmPosition) return;
    // FirmaEC espera puntoY = borde superior del sello en coords PDF
    onConfirmPosition(stampPdf.pagina, Math.round(stampPdf.x), Math.round(stampPdf.y + STAMP_H_PT));
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

            <div className="flex items-center gap-0.5 bg-white/10 rounded-lg px-1">
              <IconButton
                aria-label="Alejar" size="sm"
                onClick={() => setScale((s) => +(Math.max(s - 0.2, 0.5)).toFixed(1))}
                className="text-white/60 hover:text-white hover:bg-white/10">
                <ZoomOut size={14} />
              </IconButton>
              <span className="text-xs text-white/50 w-10 text-center select-none" aria-live="polite">
                {Math.round(scale * 100)}%
              </span>
              <IconButton
                aria-label="Acercar" size="sm"
                onClick={() => setScale((s) => +(Math.min(s + 0.2, 3)).toFixed(1))}
                className="text-white/60 hover:text-white hover:bg-white/10">
                <ZoomIn size={14} />
              </IconButton>
            </div>

            {totalPages > 0 && (
              <div className="flex items-center gap-0.5 bg-white/10 rounded-lg px-1">
                <IconButton
                  aria-label="Página anterior" size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-25">
                  <ChevronLeft size={14} />
                </IconButton>
                <span className="text-xs text-white/50 px-2 select-none" aria-live="polite">
                  {currentPage} / {totalPages}
                </span>
                <IconButton
                  aria-label="Página siguiente" size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-25">
                  <ChevronRight size={14} />
                </IconButton>
              </div>
            )}

            <IconButton
              id="pdf-viewer-close"
              aria-label="Cerrar visor de PDF" size="sm"
              onClick={onClose}
              className="text-white/50 hover:text-white hover:bg-white/10 ml-1">
              <X size={16} />
            </IconButton>
          </div>
        </div>

        {/* ── Banner de posicionamiento con posiciones rápidas ──────────────── */}
        <AnimatePresence>
          {positioning && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden flex-shrink-0">
              <div className="px-5 py-3 bg-blue-600/20 border-b border-blue-500/30 space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm text-blue-300 flex items-center gap-2">
                      <Crosshair size={14} />
                      {stampPdf
                        ? <span>Firma en pág. <strong>{stampPdf.pagina}</strong> — arrastra o haz clic para moverla</span>
                        : <span>Haz clic en el documento o elige una posición rápida</span>}
                    </p>
                    {stampPdf && (
                      <p className="text-[11px] text-blue-400/70 pl-5">
                        {`${STAMP_W_PT} × ${STAMP_H_PT} pt · `}
                        <span className="font-mono">{`(${Math.round(stampPdf.x)}, ${Math.round(stampPdf.y)})`}</span>
                        <span className="ml-1.5 text-green-400">✓ dentro de la página</span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {stampPdf && (
                      <button
                        onClick={() => setStampPdf(null)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-red-300 hover:bg-red-500/20 transition-colors">
                        <Trash2 size={11} /> Quitar
                      </button>
                    )}
                    <button
                      onClick={handleConfirm}
                      disabled={!stampPdf}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-400 disabled:opacity-40 text-white text-xs font-semibold transition-colors">
                      <Check size={13} /> Listo, poner aquí
                    </button>
                  </div>
                </div>

                {/* Posiciones rápidas dinámicas (calculadas del viewBox real de la página) */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-blue-400/50 mr-0.5">Posición rápida:</span>
                  {(["BR", "BL", "TR", "TL"] as Corner[]).map((c) => (
                    <button
                      key={c}
                      onClick={() => applyQuickPos(c)}
                      disabled={!viewport}
                      className="px-2.5 py-0.5 rounded text-[11px] text-blue-200 bg-blue-500/20 hover:bg-blue-500/40 disabled:opacity-30 transition-colors">
                      {CORNER_LABELS[c]}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Área del PDF con overlay HTML para el sello ──────────────────── */}
        <div className="flex-1 overflow-auto flex items-start justify-center p-6 min-h-0">
          {loading ? (
            <div className="flex flex-col items-center gap-3 mt-24 text-white/30">
              <Loader2 size={32} className="animate-spin" />
              <p className="text-sm">Cargando PDF…</p>
            </div>
          ) : (
            <div
              className="relative"
              onMouseMove={handleDragMove}
              onMouseUp={handleDragEnd}
              onMouseLeave={handleDragEnd}
            >
              <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                className={[
                  "rounded shadow-2xl block",
                  positioning && !dragging ? "cursor-crosshair" : "cursor-default",
                ].join(" ")}
              />

              {/* Overlay HTML: no re-renderiza el PDF al mover el sello */}
              {stampScreenRect && (
                <div
                  className={[
                    "absolute border-2 border-blue-500 bg-blue-500/30 rounded flex flex-col items-center justify-center gap-0.5",
                    positioning ? (dragging ? "cursor-grabbing" : "cursor-grab") : "pointer-events-none",
                  ].join(" ")}
                  style={{
                    left:   stampScreenRect.left,
                    top:    stampScreenRect.top,
                    width:  stampScreenRect.width,
                    height: stampScreenRect.height,
                  }}
                  onMouseDown={positioning ? handleDragStart : undefined}
                >
                  <span
                    className="text-white font-bold leading-none select-none"
                    style={{ fontSize: Math.max(8, scale * 8) }}
                  >
                    FIRMA DIGITAL
                  </span>
                  {estampado && (
                    <span
                      className="text-white/60 leading-none select-none"
                      style={{ fontSize: Math.max(6, scale * 6) }}
                    >
                      {estampado}
                    </span>
                  )}
                  <span
                    className="text-white/50 leading-none select-none"
                    style={{ fontSize: Math.max(6, scale * 6) }}
                  >
                    Penké EC
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Ayuda teclado ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-center gap-5 py-2 border-t border-white/5 flex-shrink-0">
          {(positioning
            ? [["↑↓←→", "Mover 1 pt"], ["Shift+flecha", "Mover 10 pt"], ["+ −", "Zoom"], ["Esc", "Cerrar"]]
            : [["←→", "Página"], ["+ −", "Zoom"], ["Esc", "Cerrar"]]
          ).map(([k, l]) => (
            <span key={k} className="text-[10px] text-white/20">
              <kbd className="font-mono">{k}</kbd><span className="ml-1">{l}</span>
            </span>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
