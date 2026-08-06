package ec.gob.firmadigital.api.routes;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.itextpdf.forms.PdfAcroForm;
import com.itextpdf.forms.fields.PdfFormField;
import com.itextpdf.kernel.pdf.PdfArray;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfName;
import com.itextpdf.kernel.pdf.PdfReader;
import io.javalin.http.Context;
import io.javalin.http.Handler;

import java.io.File;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * POST /pdf/inspect-signatures
 *
 * Lee un PDF firmado y devuelve el /Rect de cada campo de firma.
 * Usar para calibrar el anclaje real de FirmaEC:
 *   - Firma con puntoX=100, puntoY=100
 *   - Llama este endpoint sobre el PDF resultante
 *   - Si rectX1≈100 && rectY1≈100 → anclaje LOWER_LEFT
 *   - Si rectX1≈(100-76.5) && rectY1≈(100-25) → anclaje CENTER
 *
 * Request:  { "rutaDocumento": "/ruta/al/firmado.pdf" }
 * Response: { "signatures": [ { "name", "page", "rect": [x1,y1,x2,y2], "widthPt", "heightPt", "anchorGuess" } ] }
 */
public class InspectSignaturesRoute implements Handler {

    private final ObjectMapper mapper = new ObjectMapper();

    @Override
    @SuppressWarnings("unchecked")
    public void handle(Context ctx) throws Exception {
        Map<String, Object> body = mapper.readValue(ctx.body(), Map.class);
        Object v = body.get("rutaDocumento");
        String rutaDocumento = v != null ? v.toString() : null;

        // Parámetros opcionales para auto-detección de anclaje
        Double requestedLeft   = body.get("requestedLeft")   instanceof Number n ? n.doubleValue() : null;
        Double requestedBottom = body.get("requestedBottom") instanceof Number n2 ? n2.doubleValue() : null;

        if (rutaDocumento == null) {
            ctx.status(400).json(Map.of("code", "MISSING_FIELD", "error", "Falta campo obligatorio: rutaDocumento"));
            return;
        }
        if (!new File(rutaDocumento).exists()) {
            ctx.status(400).json(Map.of("code", "DOCUMENT_NOT_FOUND", "error", "Documento no encontrado: " + rutaDocumento));
            return;
        }

        List<Map<String, Object>> signatures = new ArrayList<>();

        try (PdfDocument pdfDoc = new PdfDocument(new PdfReader(rutaDocumento))) {
            PdfAcroForm form = PdfAcroForm.getAcroForm(pdfDoc, false);
            if (form != null) {
                for (Map.Entry<String, PdfFormField> entry : form.getAllFormFields().entrySet()) {
                    PdfFormField field = entry.getValue();
                    if (!PdfName.Sig.equals(field.getFormType())) continue;

                    // El /Rect puede estar en el widget hijo o en el campo mismo
                    PdfArray rect = field.getPdfObject().getAsArray(PdfName.Rect);
                    if (rect == null && field.getWidgets() != null && !field.getWidgets().isEmpty()) {
                        rect = field.getWidgets().get(0).getRectangle();
                    }
                    if (rect == null || rect.size() < 4) continue;

                    float x1 = rect.getAsNumber(0).floatValue();
                    float y1 = rect.getAsNumber(1).floatValue();
                    float x2 = rect.getAsNumber(2).floatValue();
                    float y2 = rect.getAsNumber(3).floatValue();
                    // Normalizar: asegurar lower-left primero
                    float left   = Math.min(x1, x2);
                    float bottom = Math.min(y1, y2);
                    float right  = Math.max(x1, x2);
                    float top    = Math.max(y1, y2);
                    float w      = right  - left;
                    float h      = top    - bottom;

                    // Página (el widget anota en qué página está)
                    int page = 1;
                    try {
                        if (field.getWidgets() != null && !field.getWidgets().isEmpty()) {
                            com.itextpdf.kernel.pdf.PdfDictionary pageDict =
                                field.getWidgets().get(0).getPdfObject().getAsDictionary(PdfName.P);
                            if (pageDict != null) {
                                for (int p = 1; p <= pdfDoc.getNumberOfPages(); p++) {
                                    if (pdfDoc.getPage(p).getPdfObject().equals(pageDict)) { page = p; break; }
                                }
                            }
                        }
                    } catch (Exception ignored) {}

                    float cx = left + w / 2f;
                    float cy = bottom + h / 2f;

                    String anchorGuess;
                    Double deltaX = null, deltaY = null;
                    final double TOL = 1.5;
                    if (requestedLeft != null && requestedBottom != null) {
                        boolean matchLeft   = Math.abs(left   - requestedLeft)   < TOL;
                        boolean matchBottom = Math.abs(bottom - requestedBottom) < TOL;
                        boolean matchTop    = Math.abs(top    - requestedBottom) < TOL;
                        boolean matchCxX    = Math.abs(cx     - requestedLeft)   < TOL;
                        boolean matchCyY    = Math.abs(cy     - requestedBottom) < TOL;
                        if      (matchLeft && matchTop)    anchorGuess = "UPPER_LEFT";
                        else if (matchLeft && matchBottom) anchorGuess = "LOWER_LEFT";
                        else if (matchCxX  && matchCyY)   anchorGuess = "CENTER";
                        else anchorGuess = String.format(
                                "UNKNOWN (dLeft=%.1f dBottom=%.1f dTop=%.1f)",
                                left - requestedLeft, bottom - requestedBottom, top - requestedBottom);
                        deltaX = (double)(left   - requestedLeft.floatValue());
                        deltaY = (double)(bottom - requestedBottom.floatValue());
                    } else {
                        anchorGuess = "sin requestedLeft/requestedBottom — pasa las coords que enviaste";
                    }

                    Map<String, Object> sig = new HashMap<>();
                    sig.put("name",        entry.getKey());
                    sig.put("page",        page);
                    sig.put("rect",        new float[]{ left, bottom, right, top });
                    sig.put("widthPt",     w);
                    sig.put("heightPt",    h);
                    sig.put("centerX",     cx);
                    sig.put("centerY",     cy);
                    sig.put("anchorGuess", anchorGuess);
                    if (deltaX != null) { sig.put("deltaX", deltaX); sig.put("deltaY", deltaY); }
                    signatures.add(sig);
                }
            }
        }

        ctx.json(Map.of("signatures", signatures));
    }
}
