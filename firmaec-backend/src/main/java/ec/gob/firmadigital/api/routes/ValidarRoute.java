package ec.gob.firmadigital.api.routes;

import com.fasterxml.jackson.databind.ObjectMapper;
import ec.gob.firmadigital.libreria.certificate.CertEcUtils;
import ec.gob.firmadigital.libreria.certificate.CertUtils;
import ec.gob.firmadigital.libreria.certificate.to.DatosUsuario;
import ec.gob.firmadigital.libreria.keystore.FileKeyStoreProvider;
import ec.gob.firmadigital.libreria.utils.X509CertificateUtils;
import ec.gob.firmadigital.utils.PropertiesUtils;
import io.javalin.http.Context;
import io.javalin.http.Handler;

import java.security.KeyStore;
import java.security.cert.X509Certificate;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

public class ValidarRoute implements Handler {

    private final ObjectMapper mapper = new ObjectMapper();
    private final SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd");

    @Override
    @SuppressWarnings("unchecked")
    public void handle(Context ctx) throws Exception {
        Map<String, Object> body = mapper.readValue(ctx.body(), Map.class);
        String rutaCert = body.get("rutaCertificado") != null ? body.get("rutaCertificado").toString() : null;
        String clave    = body.get("clave")           != null ? body.get("clave").toString()           : null;

        if (rutaCert == null || clave == null) {
            ctx.status(400).json(Map.of("error", "Faltan campos: rutaCertificado, clave"));
            return;
        }

        FileKeyStoreProvider ksp = new FileKeyStoreProvider(rutaCert);
        KeyStore ks = ksp.getKeystore(clave.toCharArray());

        if (ks == null) {
            ctx.status(400).json(Map.of("error", "No se pudo cargar el certificado. Verifica la contraseña."));
            return;
        }

        String alias = CertUtils.seleccionarAlias(ks, null);
        X509Certificate cert = CertUtils.getCert(ks, alias);

        X509CertificateUtils validator = new X509CertificateUtils();
        boolean valido = validator.validarX509Certificate(cert, null, PropertiesUtils.versionBase64());

        DatosUsuario datos = CertEcUtils.getDatosUsuarios(cert);

        boolean caducado = new Date().after(cert.getNotAfter());
        boolean revocado = !valido && !caducado;

        Map<String, Object> resp = new HashMap<>();
        resp.put("valido",      valido);
        resp.put("cedula",      datos != null && datos.getCedula()     != null ? datos.getCedula()     : "");
        resp.put("nombre",      datos != null && datos.getNombre()     != null ? datos.getNombre()     : "");
        resp.put("apellido",    datos != null && datos.getApellido()   != null ? datos.getApellido()   : "");
        resp.put("cargo",       datos != null && datos.getCargo()      != null ? datos.getCargo()      : "");
        resp.put("institucion", datos != null && datos.getInstitucion()!= null ? datos.getInstitucion(): "");
        resp.put("validoDesde", sdf.format(cert.getNotBefore()));
        resp.put("validoHasta", sdf.format(cert.getNotAfter()));
        resp.put("emisor",      cert.getIssuerX500Principal().getName());
        resp.put("caducado",    caducado);
        resp.put("revocado",    revocado);

        ctx.json(resp);
    }
}
