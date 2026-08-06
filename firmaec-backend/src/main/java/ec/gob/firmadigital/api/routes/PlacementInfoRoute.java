package ec.gob.firmadigital.api.routes;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.itextpdf.kernel.geom.Rectangle;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfPage;
import com.itextpdf.kernel.pdf.PdfReader;
import io.javalin.http.Context;
import io.javalin.http.Handler;

import java.io.File;
import java.util.HashMap;
import java.util.Map;

/**
 * POST /pdf/placement-info
 *
 * Devuelve las dimensiones reales de la página y la geometría del sello para
 * que el frontend pueda posicionar el overlay exactamente donde irá la firma.
 *
 * Request: { rutaDocumento, pagina?, estampado? }
 * Response: { page, stamp, defaultPosition }
 */
public class PlacementInfoRoute implements Handler {

    // Calibrado inspeccionando /Rect de un PDF firmado con FirmaEC 5.1.0 (anclaje LOWER_LEFT).
    private static final int STAMP_W_PT = 110;
    private static final int STAMP_H_PT = 36;
    private static final int MARGIN_PT  = 18;

    private final ObjectMapper mapper = new ObjectMapper();

    private static String str(Map<String, Object> body, String key, String def) {
        Object v = body.get(key);
        return v != null ? v.toString() : def;
    }

    private static int num(Map<String, Object> body, String key, int def) {
        Object v = body.get(key);
        if (v == null) return def;
        if (v instanceof Number) return ((Number) v).intValue();
        try { return Integer.parseInt(v.toString()); } catch (Exception e) { return def; }
    }

    @Override
    @SuppressWarnings("unchecked")
    public void handle(Context ctx) throws Exception {
        Map<String, Object> body = mapper.readValue(ctx.body(), Map.class);

        String rutaDocumento = str(body, "rutaDocumento", null);
        int    pagina        = num(body, "pagina", 1);
        String estampado     = str(body, "estampado", null);

        if (rutaDocumento == null) {
            ctx.status(400).json(Map.of("code", "MISSING_FIELD", "error", "Falta campo obligatorio: rutaDocumento"));
            return;
        }

        File docFile = new File(rutaDocumento);
        if (!docFile.exists()) {
            ctx.status(400).json(Map.of(
                "code", "DOCUMENT_NOT_FOUND",
                "error", "Documento no encontrado: " + rutaDocumento
            ));
            return;
        }

        float pageWidthPt, pageHeightPt;
        int   rotation, numPages;

        try (PdfDocument pdfDoc = new PdfDocument(new PdfReader(rutaDocumento))) {
            numPages = pdfDoc.getNumberOfPages();
            if (pagina < 1 || pagina > numPages) {
                ctx.status(400).json(Map.of(
                    "code",  "INVALID_PAGE",
                    "error", "Página " + pagina + " fuera de rango (documento tiene " + numPages + " páginas)"
                ));
                return;
            }
            PdfPage   page = pdfDoc.getPage(pagina);
            Rectangle mb   = page.getMediaBox();
            rotation        = page.getRotation();
            // Páginas rotadas 90°/270°: el ancho y alto visuales están invertidos
            if (rotation == 90 || rotation == 270) {
                pageWidthPt  = mb.getHeight();
                pageHeightPt = mb.getWidth();
            } else {
                pageWidthPt  = mb.getWidth();
                pageHeightPt = mb.getHeight();
            }
        }

        // Posición por defecto: esquina inferior derecha con margen.
        // defaultY = borde superior del sello (puntoY = top en coords FirmaEC).
        int defaultX = Math.round(pageWidthPt - STAMP_W_PT - MARGIN_PT);
        int defaultY = MARGIN_PT + STAMP_H_PT;  // bottom=MARGIN_PT, top=MARGIN_PT+STAMP_H_PT

        Map<String, Object> pageInfo = new HashMap<>();
        pageInfo.put("widthPt",  pageWidthPt);
        pageInfo.put("heightPt", pageHeightPt);
        pageInfo.put("rotation", rotation);
        pageInfo.put("numPages", numPages);

        Map<String, Object> stampInfo = new HashMap<>();
        stampInfo.put("widthPt",  STAMP_W_PT);
        stampInfo.put("heightPt", STAMP_H_PT);
        // Anclaje LOWER_LEFT confirmado inspeccionando /Rect vs puntoX,puntoY de una firma real
        stampInfo.put("anchor",   "LOWER_LEFT");
        stampInfo.put("type",     estampado != null ? estampado : "default");

        Map<String, Object> defaultPos = new HashMap<>();
        defaultPos.put("x", defaultX);
        defaultPos.put("y", defaultY);

        Map<String, Object> resp = new HashMap<>();
        resp.put("page",            pageInfo);
        resp.put("stamp",           stampInfo);
        resp.put("defaultPosition", defaultPos);

        ctx.json(resp);
    }
}
