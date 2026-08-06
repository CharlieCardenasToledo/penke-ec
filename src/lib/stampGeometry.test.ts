import { describe, it, expect } from "vitest";
import {
  computeCornerPos,
  clampToPage,
  isInsidePage,
  DEFAULT_STAMP_W_PT as W,
  DEFAULT_STAMP_H_PT as H,
} from "./stampGeometry";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** viewBox para una página estándar A4 (portrait, origen 0,0) */
const A4 = [0, 0, 595, 842] as const;

/** viewBox para carta apaisada (landscape letter, origen 0,0) */
const CARTA_L = [0, 0, 792, 612] as const;

/** viewBox con origen distinto de cero (e.g. CropBox recortada) */
const CROPPED = [20, 30, 615, 872] as const;

const MARGIN = 18;

// ── computeCornerPos ──────────────────────────────────────────────────────────

describe("computeCornerPos — A4 portrait", () => {
  it("BL respeta margen izquierdo e inferior", () => {
    const { x, y } = computeCornerPos([...A4], "BL", W, H);
    expect(x).toBe(A4[0] + MARGIN);
    expect(y).toBe(A4[1] + MARGIN);
  });

  it("BR respeta margen derecho e inferior", () => {
    const { x, y } = computeCornerPos([...A4], "BR", W, H);
    expect(x).toBe(A4[2] - W - MARGIN);
    expect(y).toBe(A4[1] + MARGIN);
  });

  it("TL respeta margen izquierdo y superior", () => {
    const { x, y } = computeCornerPos([...A4], "TL", W, H);
    expect(x).toBe(A4[0] + MARGIN);
    expect(y).toBe(A4[3] - H - MARGIN);
  });

  it("TR respeta margen derecho y superior", () => {
    const { x, y } = computeCornerPos([...A4], "TR", W, H);
    expect(x).toBe(A4[2] - W - MARGIN);
    expect(y).toBe(A4[3] - H - MARGIN);
  });
});

describe("computeCornerPos — carta apaisada", () => {
  it("BR se adapta al ancho de la página", () => {
    const { x, y } = computeCornerPos([...CARTA_L], "BR", W, H);
    expect(x).toBe(CARTA_L[2] - W - MARGIN);   // 792 - 110 - 18 = 664
    expect(y).toBe(CARTA_L[1] + MARGIN);        // 0 + 18 = 18
  });
});

describe("computeCornerPos — CropBox con origen ≠ 0", () => {
  it("BL toma el origen del CropBox", () => {
    const { x, y } = computeCornerPos([...CROPPED], "BL", W, H);
    expect(x).toBe(CROPPED[0] + MARGIN);   // 20 + 18 = 38
    expect(y).toBe(CROPPED[1] + MARGIN);   // 30 + 18 = 48
  });

  it("TR respeta el tope del CropBox", () => {
    const { x, y } = computeCornerPos([...CROPPED], "TR", W, H);
    expect(x).toBe(CROPPED[2] - W - MARGIN);   // 615 - 110 - 18 = 487
    expect(y).toBe(CROPPED[3] - H - MARGIN);   // 872 - 36 - 18 = 818
  });
});

// ── clampToPage ───────────────────────────────────────────────────────────────

describe("clampToPage — A4 portrait", () => {
  it("posición válida no se modifica", () => {
    const r = clampToPage(100, 100, [...A4], W, H);
    expect(r.x).toBe(100);
    expect(r.y).toBe(100);
  });

  it("clic fuera del borde izquierdo se clampea al origen", () => {
    const r = clampToPage(-10, 100, [...A4], W, H);
    expect(r.x).toBe(0);
  });

  it("clic fuera del borde derecho no deja el sello parcialmente fuera", () => {
    const r = clampToPage(600, 100, [...A4], W, H);
    expect(r.x).toBe(A4[2] - W);   // 595 - 110 = 485
  });

  it("clic fuera del borde inferior se clampea al origen Y", () => {
    const r = clampToPage(100, -5, [...A4], W, H);
    expect(r.y).toBe(0);
  });

  it("clic fuera del borde superior no deja el sello parcialmente fuera", () => {
    const r = clampToPage(100, 900, [...A4], W, H);
    expect(r.y).toBe(A4[3] - H);   // 842 - 36 = 806
  });
});

describe("clampToPage — CropBox con origen ≠ 0", () => {
  it("no permite sello por debajo del origen Y del CropBox", () => {
    const r = clampToPage(100, 0, [...CROPPED], W, H);
    expect(r.y).toBe(CROPPED[1]);  // 30
  });

  it("no permite sello por encima del tope del CropBox", () => {
    const r = clampToPage(100, 900, [...CROPPED], W, H);
    expect(r.y).toBe(CROPPED[3] - H);  // 872 - 36 = 836
  });
});

// ── isInsidePage ──────────────────────────────────────────────────────────────

describe("isInsidePage", () => {
  it("sello completamente dentro → true", () => {
    expect(isInsidePage(100, 100, W, H, [...A4])).toBe(true);
  });

  it("sello tocando borde izquierdo → true (límite exacto permitido)", () => {
    expect(isInsidePage(0, 100, W, H, [...A4])).toBe(true);
  });

  it("sello un punto fuera del borde derecho → false", () => {
    expect(isInsidePage(A4[2] - W + 1, 100, W, H, [...A4])).toBe(false);
  });

  it("sello un punto por debajo del origen → false", () => {
    expect(isInsidePage(100, -1, W, H, [...A4])).toBe(false);
  });

  it("sello tocando borde superior exacto → true", () => {
    expect(isInsidePage(100, A4[3] - H, W, H, [...A4])).toBe(true);
  });

  it("sello un punto por encima del tope → false", () => {
    expect(isInsidePage(100, A4[3] - H + 1, W, H, [...A4])).toBe(false);
  });

  it("CropBox con origen ≠ 0: sello en origen global (0,0) → false", () => {
    expect(isInsidePage(0, 0, W, H, [...CROPPED])).toBe(false);
  });

  it("CropBox con origen ≠ 0: sello en el origen del CropBox → true", () => {
    expect(isInsidePage(CROPPED[0], CROPPED[1], W, H, [...CROPPED])).toBe(true);
  });
});

// ── Conversión de anclaje (la hace el backend, pero documentamos el invariante) ──

describe("invariante de anclaje UPPER_LEFT de FirmaEC", () => {
  it("firmaEcY = stampBottom + stampH (lower-left → upper-left)", () => {
    const stampBottom = 589;
    const firmaEcY = stampBottom + H;  // lo que hace FirmarRoute.java
    expect(firmaEcY).toBe(625);        // valor real medido en PDF firmado
  });

  it("stampBottom = firmaEcY - stampH (upper-left → lower-left)", () => {
    const firmaEcY = 625;
    const bottom = firmaEcY - H;
    expect(bottom).toBe(589);
  });
});
