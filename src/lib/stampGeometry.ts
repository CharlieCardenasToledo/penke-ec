/**
 * Geometría del sello de FirmaEC calibrada inspeccionando /Rect de PDFs firmados.
 * Tamaño: 110 × 36 pt. Anclaje en FirmaEC: UPPER_LEFT (puntoY = top).
 * El frontend siempre trabaja en lower-left; la conversión ocurre en FirmarRoute.java.
 *
 * Tipos confirmados con FirmaEC 5.1.0:
 *   QR       — 110 × 36 pt (confirmado)
 *   Simple   — 110 × 36 pt (pendiente de verificar)
 *   Avanzada — 110 × 36 pt (pendiente de verificar)
 */
export const DEFAULT_STAMP_W_PT = 110;
export const DEFAULT_STAMP_H_PT = 36;

export type Corner = "BL" | "BR" | "TL" | "TR";

export const CORNER_LABELS: Record<Corner, string> = {
  BL: "↙ Inf. izq.",
  BR: "↘ Inf. der.",
  TL: "↖ Sup. izq.",
  TR: "↗ Sup. der.",
};

/**
 * Calcula la posición lower-left del sello en coords PDF para cada esquina.
 * viewBox = [x0, y0, x1, y1] en puntos PDF (CropBox o MediaBox).
 */
export function computeCornerPos(
  viewBox: number[],
  corner: Corner,
  stampW: number,
  stampH: number,
): { x: number; y: number } {
  const margin = 18;
  const [x0, y0, x1, y1] = viewBox;
  const map: Record<Corner, { x: number; y: number }> = {
    BL: { x: x0 + margin,            y: y0 + margin },
    BR: { x: x1 - stampW - margin,   y: y0 + margin },
    TL: { x: x0 + margin,            y: y1 - stampH - margin },
    TR: { x: x1 - stampW - margin,   y: y1 - stampH - margin },
  };
  return map[corner];
}

/**
 * Fuerza (x, y) lower-left dentro de los límites de la página.
 * viewBox = [x0, y0, x1, y1] en puntos PDF.
 */
export function clampToPage(
  x: number,
  y: number,
  viewBox: number[],
  stampW: number,
  stampH: number,
): { x: number; y: number } {
  const [x0, y0, x1, y1] = viewBox;
  return {
    x: Math.max(x0, Math.min(x1 - stampW, x)),
    y: Math.max(y0, Math.min(y1 - stampH, y)),
  };
}

/** Devuelve true si el sello (lower-left x/y, stampW/stampH) cabe en viewBox. */
export function isInsidePage(
  x: number,
  y: number,
  stampW: number,
  stampH: number,
  viewBox: number[],
): boolean {
  const [x0, y0, x1, y1] = viewBox;
  return x >= x0 && y >= y0 && x + stampW <= x1 && y + stampH <= y1;
}
