package ec.gob.firmadigital.api.routes;

import com.fasterxml.jackson.databind.ObjectMapper;
import ec.gob.firmadigital.libreria.certificate.to.Certificado;
import ec.gob.firmadigital.libreria.certificate.to.Documento;
import ec.gob.firmadigital.libreria.utils.Utils;
import ec.gob.firmadigital.utils.PropertiesUtils;
import io.javalin.http.Context;
import io.javalin.http.Handler;

import java.io.File;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class VerificarRoute implements Handler {

    private final ObjectMapper mapper = new ObjectMapper();
    private final SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");

    @Override
    @SuppressWarnings("unchecked")
    public void handle(Context ctx) throws Exception {
        Map<String, Object> body = mapper.readValue(ctx.body(), Map.class);
        String rutaDocumento = body.get("rutaDocumento") != null ? body.get("rutaDocumento").toString() : null;

        if (rutaDocumento == null) {
            ctx.status(400).json(Map.of("error", "Falta el campo rutaDocumento"));
            return;
        }

        File doc = new File(rutaDocumento);
        if (!doc.exists()) {
            ctx.status(400).json(Map.of("error", "Documento no encontrado: " + rutaDocumento));
            return;
        }

        Documento documento = Utils.verificarDocumento(doc, PropertiesUtils.versionBase64());
        List<Certificado> certs = documento.getCertificados();

        List<Map<String, Object>> firmas = new ArrayList<>();
        for (Certificado c : certs) {
            boolean valido = Utils.validarFirma(
                c.getValidFrom(), c.getValidTo(), c.getSignGenerated(), c.getRevocated()
            );

            String apellido = c.getDatosUsuario() != null && c.getDatosUsuario().getApellido() != null
                ? c.getDatosUsuario().getApellido() : "";
            String nombre = c.getDatosUsuario() != null && c.getDatosUsuario().getNombre() != null
                ? c.getDatosUsuario().getNombre() : "";
            String cedula = c.getDatosUsuario() != null && c.getDatosUsuario().getCedula() != null
                ? c.getDatosUsuario().getCedula() : "";
            String fecha = c.getSignGenerated() != null ? sdf.format(c.getSignGenerated().getTime()) : "-";

            Map<String, Object> firma = new HashMap<>();
            firma.put("cedula",   cedula);
            firma.put("firmante", (nombre + " " + apellido).trim());
            firma.put("entidad",  c.getIssuedBy() != null ? c.getIssuedBy() : "");
            firma.put("fecha",    fecha);
            firma.put("estado",   valido ? "valida" : "invalida");
            firma.put("razon",    c.getDocReason() != null ? c.getDocReason() : "");
            firmas.add(firma);
        }

        Boolean docValidate = documento.getDocValidate();
        ctx.json(Map.of(
            "firmas",    firmas,
            "docValido", docValidate != null && docValidate
        ));
    }
}
