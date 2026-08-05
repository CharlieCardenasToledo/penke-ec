package ec.gob.firmadigital.api.routes;

import com.fasterxml.jackson.databind.ObjectMapper;
import ec.gob.firmadigital.cliente.FirmaDigital;
import ec.gob.firmadigital.libreria.certificate.CertEcUtils;
import ec.gob.firmadigital.libreria.certificate.CertUtils;
import ec.gob.firmadigital.libreria.certificate.to.DatosUsuario;
import ec.gob.firmadigital.libreria.keystore.FileKeyStoreProvider;
import ec.gob.firmadigital.libreria.utils.FileUtils;
import ec.gob.firmadigital.libreria.utils.X509CertificateUtils;
import ec.gob.firmadigital.utils.PropertiesUtils;
import io.javalin.http.Context;
import io.javalin.http.Handler;

import java.awt.Point;
import java.io.File;
import java.security.KeyStore;
import java.security.cert.X509Certificate;
import java.util.HashMap;
import java.util.Map;

public class FirmarRoute implements Handler {

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

        String rutaDocumento  = str(body, "rutaDocumento", null);
        String rutaCert       = str(body, "rutaCertificado", null);
        String clave          = str(body, "clave", null);
        String tipoFirma      = str(body, "tipoFirma", "archivo");
        String requestedAlias = str(body, "alias", null);
        String estampado      = str(body, "estampado", null);
        String razonFirma     = str(body, "razonFirma", "");
        String localizacion   = str(body, "localizacion", "");
        String carpetaDestino = str(body, "carpetaDestino", null);
        int    pagina         = num(body, "pagina", 1);
        int    puntoX         = num(body, "puntoX", 0);
        int    puntoY         = num(body, "puntoY", 0);

        if (rutaDocumento == null) {
            ctx.status(400).json(Map.of("error", "Falta campo obligatorio: rutaDocumento"));
            return;
        }

        KeyStore ks;
        String alias;
        if ("token".equals(tipoFirma)) {
            KeyStore windowsKs = KeyStore.getInstance("Windows-MY");
            windowsKs.load(null, null);
            ks = windowsKs;
            alias = (requestedAlias != null && !requestedAlias.isEmpty())
                ? requestedAlias : CertUtils.seleccionarAlias(ks, null);
        } else {
            if (rutaCert == null) {
                ctx.status(400).json(Map.of("error", "rutaCertificado es requerido para tipoFirma=archivo"));
                return;
            }
            if (clave == null) {
                ctx.status(400).json(Map.of("error", "Contraseña requerida"));
                return;
            }
            FileKeyStoreProvider ksp = new FileKeyStoreProvider(rutaCert);
            ks = ksp.getKeystore(clave.toCharArray());
            alias = CertUtils.seleccionarAlias(ks, null);
        }

        if (ks == null) {
            ctx.status(400).json(Map.of("error", "No se pudo cargar el certificado. Verifica la contraseña."));
            return;
        }
        X509Certificate cert = CertUtils.getCert(ks, alias);

        // Validar certificado contra OCSP de MINTEL
        X509CertificateUtils validator = new X509CertificateUtils();
        validator.validarX509Certificate(cert, null, PropertiesUtils.versionBase64());

        File doc = new File(rutaDocumento);
        if (!doc.exists()) {
            ctx.status(400).json(Map.of("error", "Documento no encontrado: " + rutaDocumento));
            return;
        }

        char[] password = (clave != null && !clave.isEmpty()) ? clave.toCharArray() : null;
        byte[] firmado = FirmaDigital.firmar(
            ks, alias, doc,
            password,
            new Point(puntoX, puntoY),
            pagina,
            razonFirma,
            localizacion,
            estampado
        );

        if (firmado == null) {
            ctx.status(500).json(Map.of("error", "FirmaDigital.firmar() retornó null. Verifica el certificado y el PDF."));
            return;
        }

        // Construir nombre de salida: {stem}_penke.pdf
        String nombreOriginal = doc.getName();
        String stem = nombreOriginal.contains(".")
            ? nombreOriginal.substring(0, nombreOriginal.lastIndexOf('.'))
            : nombreOriginal;
        String nombreFirmado = stem + "_penke.pdf";

        // Carpeta base: la indicada por el usuario o Documentos del sistema
        java.nio.file.Path base;
        if (carpetaDestino != null && !carpetaDestino.isBlank()) {
            base = java.nio.file.Paths.get(carpetaDestino);
        } else {
            base = java.nio.file.Paths.get(System.getProperty("user.home"), "Documents");
        }
        // Siempre guardar dentro de "Firmas Penké"
        java.nio.file.Path carpeta = base.resolve("Firmas Penké");
        java.nio.file.Files.createDirectories(carpeta);

        String rutaFirmado = carpeta.resolve(nombreFirmado).toString();
        FileUtils.saveByteArrayToDisc(firmado, rutaFirmado);

        DatosUsuario datos = CertEcUtils.getDatosUsuarios(cert);
        Map<String, Object> resp = new HashMap<>();
        resp.put("rutaFirmado", rutaFirmado);
        resp.put("firmante", datos != null ? datos.getNombre() + " " + datos.getApellido() : alias);
        resp.put("cedula",   datos != null ? datos.getCedula() : "");

        ctx.json(resp);
    }
}
