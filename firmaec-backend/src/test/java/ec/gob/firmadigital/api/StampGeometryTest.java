package ec.gob.firmadigital.api;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Pruebas de geometría del sello de FirmaEC 5.1.0.
 *
 * Cubren:
 *  - Conversión lower-left ↔ UPPER_LEFT (anclaje real de FirmaEC)
 *  - Validación de límites con CropBox de origen variable
 *  - Páginas A4 portrait, Carta landscape, rotadas 90/270
 *  - Páginas con CropBox de origen distinto de cero
 *  - Clic cerca de cada borde (clamping)
 */
class StampGeometryTest {

    // ── Constantes calibradas ────────────────────────────────────────────────
    static final int STAMP_W = 110;
    static final int STAMP_H = 36;

    // ── Utilidades de geometría extraídas de FirmarRoute ────────────────────

    /** Conversión lower-left → UPPER_LEFT (lo que envía FirmarRoute a FirmaEC). */
    static int firmaEcY(int stampBottom) { return stampBottom + STAMP_H; }

    /** Validación de límites (misma lógica que FirmarRoute.java). */
    static boolean isOutOfBounds(int stampLeft, int stampBottom,
                                 float pageLeft, float pageBottom,
                                 float pageRight, float pageTop) {
        return stampLeft              < pageLeft
            || stampLeft  + STAMP_W  > pageRight
            || stampBottom           < pageBottom
            || stampBottom + STAMP_H > pageTop;
    }

    // ── 1. Conversión de anclaje ─────────────────────────────────────────────

    @Test
    void firmaEcY_devuelveTop() {
        // Valor real medido inspeccionando /Rect de PDF firmado con FirmaEC 5.1.0
        assertEquals(625, firmaEcY(589));
    }

    @Test
    void bottom_desde_firmaEcY() {
        // Inverso: bottom = firmaEcY - stampH
        assertEquals(589, firmaEcY(589) - STAMP_H);
    }

    // ── 2. Validación de límites — A4 portrait (595 × 842) ──────────────────

    @Test
    void a4_sello_completamente_dentro_es_valido() {
        assertFalse(isOutOfBounds(100, 100, 0, 0, 595, 842));
    }

    @Test
    void a4_sello_en_borde_inferior_izquierdo_exacto_es_valido() {
        assertFalse(isOutOfBounds(0, 0, 0, 0, 595, 842));
    }

    @Test
    void a4_sello_un_punto_fuera_del_borde_derecho_es_invalido() {
        // stampLeft + STAMP_W = 486 > 595 NO, pero 486 + 110 = 596 > 595
        assertTrue(isOutOfBounds(595 - STAMP_W + 1, 100, 0, 0, 595, 842));
    }

    @Test
    void a4_sello_en_borde_derecho_exacto_es_valido() {
        assertFalse(isOutOfBounds(595 - STAMP_W, 100, 0, 0, 595, 842));
    }

    @Test
    void a4_sello_un_punto_por_debajo_del_origen_es_invalido() {
        assertTrue(isOutOfBounds(100, -1, 0, 0, 595, 842));
    }

    @Test
    void a4_sello_en_borde_superior_exacto_es_valido() {
        assertFalse(isOutOfBounds(100, 842 - STAMP_H, 0, 0, 595, 842));
    }

    @Test
    void a4_sello_un_punto_por_encima_del_tope_es_invalido() {
        assertTrue(isOutOfBounds(100, 842 - STAMP_H + 1, 0, 0, 595, 842));
    }

    // ── 3. Carta apaisada (792 × 612) ────────────────────────────────────────

    @Test
    void carta_landscape_sello_en_borde_derecho_exacto_es_valido() {
        assertFalse(isOutOfBounds(792 - STAMP_W, 18, 0, 0, 792, 612));
    }

    @Test
    void carta_landscape_sello_fuera_del_borde_superior_es_invalido() {
        assertTrue(isOutOfBounds(100, 612 - STAMP_H + 1, 0, 0, 792, 612));
    }

    // ── 4. Página rotada 90°/270° (FirmarRoute NO hace swap) ─────────────────
    //
    // El frontend usa convertToPdfPoint() de PDF.js que devuelve coords internas
    // sin rotación. FirmarRoute valida contra getCropBox() sin rotar.
    // Por tanto una página A4 rotada 90° sigue teniendo mediaBox 595×842
    // (no 842×595) para propósitos de validación.

    @Test
    void pagina_rotada_usa_coords_internas_sin_swap() {
        // Mediabox de una A4 rotada 90°: sigue siendo [0,0,595,842] internamente
        // Un sello en (100, 100) es válido en coords internas
        assertFalse(isOutOfBounds(100, 100, 0, 0, 595, 842));
    }

    // ── 5. CropBox con origen distinto de cero ────────────────────────────────

    @Test
    void cropbox_sello_en_origen_global_es_invalido() {
        // CropBox = [20, 30, 615, 872]; sello en (0,0) debe ser inválido
        assertTrue(isOutOfBounds(0, 0, 20, 30, 615, 872));
    }

    @Test
    void cropbox_sello_en_origen_del_cropbox_es_valido() {
        assertFalse(isOutOfBounds(20, 30, 20, 30, 615, 872));
    }

    @Test
    void cropbox_sello_un_punto_antes_del_borde_izquierdo_es_invalido() {
        assertTrue(isOutOfBounds(19, 100, 20, 30, 615, 872));
    }

    // ── 6. Detección automática de anclaje ───────────────────────────────────

    @ParameterizedTest(name = "requestedLeft={0}, requestedBottom={1} → {2}")
    @CsvSource({
        "286, 589, LOWER_LEFT",  // puntoLeft=rectLeft, puntoBottom=rectBottom → LOWER_LEFT
        "286, 625, UPPER_LEFT",  // puntoBottom=rectTop (lo que enviaba el código antes de la corrección)
        "341, 607, CENTER",      // puntoLeft=cx, puntoBottom=cy
    })
    void anchorDetection(float reqLeft, float reqBottom, String expectedAnchor) {
        // Sello real: left=286, bottom=589, right=396, top=625 (medido en PDF)
        float rectLeft = 286, rectBottom = 589, rectRight = 396, rectTop = 625;
        float cx = rectLeft  + (rectRight  - rectLeft)  / 2f; // 341
        float cy = rectBottom + (rectTop   - rectBottom) / 2f; // 607

        double TOL = 1.5;
        boolean matchLeft   = Math.abs(rectLeft   - reqLeft)   < TOL;
        boolean matchBottom = Math.abs(rectBottom - reqBottom) < TOL;
        boolean matchTop    = Math.abs(rectTop    - reqBottom) < TOL;
        boolean matchCxX    = Math.abs(cx         - reqLeft)   < TOL;
        boolean matchCyY    = Math.abs(cy         - reqBottom) < TOL;

        String anchor;
        if      (matchLeft && matchTop)    anchor = "UPPER_LEFT";
        else if (matchLeft && matchBottom) anchor = "LOWER_LEFT";
        else if (matchCxX  && matchCyY)    anchor = "CENTER";
        else                               anchor = "UNKNOWN";

        assertEquals(expectedAnchor, anchor);
    }
}
