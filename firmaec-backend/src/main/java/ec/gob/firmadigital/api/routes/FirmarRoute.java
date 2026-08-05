package ec.gob.firmadigital.api.routes;

import com.fasterxml.jackson.databind.ObjectMapper;
import ec.gob.firmadigital.api.BuildInfo;
import ec.gob.firmadigital.api.OutputPathResolver;
import ec.gob.firmadigital.cliente.FirmaDigital;
import ec.gob.firmadigital.libreria.certificate.CertEcUtils;
import ec.gob.firmadigital.libreria.certificate.CertUtils;
import ec.gob.firmadigital.libreria.certificate.to.DatosUsuario;
import ec.gob.firmadigital.libreria.keystore.FileKeyStoreProvider;
import ec.gob.firmadigital.libreria.utils.X509CertificateUtils;
import ec.gob.firmadigital.utils.PropertiesUtils;
import io.javalin.http.Context;
import io.javalin.http.Handler;

import java.awt.Point;
import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
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
        int    pagina         = num(body, "pagina", 1);
        int    puntoX         = num(body, "puntoX", 0);
        int    puntoY         = num(body, "puntoY", 0);

        // Aceptar tanto el campo nuevo como el viejo para compatibilidad con perfiles anteriores
        String carpetaBase = str(body, "carpetaBaseUsuario", null);
        if (carpetaBase == null) carpetaBase = str(body, "carpetaDestino", null);

        if (rutaDocumento == null) {
            ctx.status(400).json(Map.of("code", "MISSING_FIELD", "error", "Falta campo obligatorio: rutaDocumento"));
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
                ctx.status(400).json(Map.of("code", "MISSING_FIELD", "error", "rutaCertificado es requerido para tipoFirma=archivo"));
                return;
            }
            if (clave == null) {
                ctx.status(400).json(Map.of("code", "MISSING_FIELD", "error", "Contraseña requerida"));
                return;
            }
            FileKeyStoreProvider ksp = new FileKeyStoreProvider(rutaCert);
            ks = ksp.getKeystore(clave.toCharArray());
            alias = CertUtils.seleccionarAlias(ks, null);
        }

        if (ks == null) {
            ctx.status(400).json(Map.of("code", "CERT_LOAD_FAILED", "error", "No se pudo cargar el certificado. Verifica la contraseña."));
            return;
        }
        X509Certificate cert = CertUtils.getCert(ks, alias);

        // Validar certificado contra OCSP de MINTEL
        X509CertificateUtils validator = new X509CertificateUtils();
        validator.validarX509Certificate(cert, null, PropertiesUtils.versionBase64());

        File doc = new File(rutaDocumento);
        if (!doc.exists()) {
            ctx.status(400).json(Map.of(
                "code", "DOCUMENT_NOT_FOUND",
                "error", "Documento no encontrado: " + rutaDocumento,
                "path", rutaDocumento
            ));
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

        if (firmado == null || firmado.length == 0) {
            ctx.status(500).json(Map.of("code", "SIGNED_BYTES_EMPTY", "error", "FirmaDigital.firmar() retornó vacío. Verifica el certificado y el PDF."));
            return;
        }

        // Carpeta base: la indicada por el usuario o Documentos del sistema
        Path base;
        if (carpetaBase != null && !carpetaBase.isBlank()) {
            base = Paths.get(carpetaBase);
        } else {
            base = Paths.get(System.getProperty("user.home"), "Documents");
        }

        // Verificar permisos de escritura en la carpeta base
        if (Files.exists(base) && !Files.isWritable(base)) {
            ctx.status(500).json(Map.of(
                "code", "OUTPUT_DIRECTORY_NOT_WRITABLE",
                "error", "No se puede escribir en la carpeta seleccionada.",
                "path", base.toString()
            ));
            return;
        }

        // Resolver ruta de salida usando OutputPathResolver
        Path rutaSalida;
        try {
            rutaSalida = OutputPathResolver.resolve(doc.toPath(), base);
        } catch (Exception e) {
            ctx.status(500).json(Map.of(
                "code", "OUTPUT_DIRECTORY_CREATE_FAILED",
                "error", "No se pudo crear la carpeta de destino: " + e.getMessage(),
                "path", base.toString()
            ));
            return;
        }

        // Escritura segura: guardar en temporal y mover atómicamente
        Path temporal = rutaSalida.getParent().resolve(rutaSalida.getFileName() + ".tmp");
        try {
            Files.write(temporal, firmado);
            try {
                Files.move(temporal, rutaSalida, StandardCopyOption.ATOMIC_MOVE);
            } catch (java.nio.file.AtomicMoveNotSupportedException e) {
                Files.move(temporal, rutaSalida, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (Exception e) {
            try { Files.deleteIfExists(temporal); } catch (Exception ignored) {}
            ctx.status(500).json(Map.of(
                "code", "OUTPUT_WRITE_FAILED",
                "error", "Error al escribir el archivo firmado: " + e.getMessage(),
                "path", rutaSalida.toString()
            ));
            return;
        }

        // Verificación posterior
        if (!Files.exists(rutaSalida) || !Files.isRegularFile(rutaSalida) || Files.size(rutaSalida) == 0) {
            ctx.status(500).json(Map.of("code", "OUTPUT_WRITE_FAILED", "error", "El archivo firmado quedó vacío o no se creó correctamente."));
            return;
        }

        DatosUsuario datos = CertEcUtils.getDatosUsuarios(cert);
        Map<String, Object> resp = new HashMap<>();
        resp.put("rutaFirmado",    rutaSalida.toString());
        resp.put("carpetaSalida",  rutaSalida.getParent().toString());
        resp.put("nombreFirmado",  rutaSalida.getFileName().toString());
        resp.put("firmante",       datos != null ? datos.getNombre() + " " + datos.getApellido() : alias);
        resp.put("cedula",         datos != null ? datos.getCedula() : "");
        resp.put("backendBuildId", BuildInfo.BUILD_ID);

        ctx.json(resp);
    }
}
