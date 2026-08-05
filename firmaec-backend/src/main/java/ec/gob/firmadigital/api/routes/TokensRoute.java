package ec.gob.firmadigital.api.routes;

import ec.gob.firmadigital.libreria.certificate.CertEcUtils;
import ec.gob.firmadigital.libreria.certificate.to.DatosUsuario;
import io.javalin.http.Context;
import io.javalin.http.Handler;

import java.security.KeyStore;
import java.security.cert.X509Certificate;
import java.text.SimpleDateFormat;
import java.util.*;

public class TokensRoute implements Handler {
    @Override
    public void handle(Context ctx) throws Exception {
        List<Map<String, String>> tokens = new ArrayList<>();
        try {
            KeyStore ks = KeyStore.getInstance("Windows-MY");
            ks.load(null, null);
            SimpleDateFormat sdf = new SimpleDateFormat("dd/MM/yyyy");
            Enumeration<String> aliases = ks.aliases();
            while (aliases.hasMoreElements()) {
                String alias = aliases.nextElement();
                try {
                    if (!ks.isKeyEntry(alias)) continue;
                    X509Certificate cert = (X509Certificate) ks.getCertificate(alias);
                    if (cert == null || new Date().after(cert.getNotAfter())) continue;
                    Map<String, String> info = new HashMap<>();
                    info.put("alias", alias);
                    info.put("validoHasta", sdf.format(cert.getNotAfter()));
                    DatosUsuario datos = CertEcUtils.getDatosUsuarios(cert);
                    if (datos != null) {
                        info.put("nombre", safe(datos.getNombre() + " " + datos.getApellido()));
                        info.put("cedula",      safe(datos.getCedula()));
                        info.put("cargo",       safe(datos.getCargo()));
                        info.put("institucion", safe(datos.getInstitucion()));
                    } else {
                        String dn = cert.getSubjectX500Principal().getName();
                        String cn = Arrays.stream(dn.split(","))
                            .filter(p -> p.trim().startsWith("CN="))
                            .map(p -> p.trim().substring(3))
                            .findFirst().orElse(alias);
                        info.put("nombre", cn); info.put("cedula", "");
                        info.put("cargo", "");  info.put("institucion", "");
                    }
                    tokens.add(info);
                } catch (Exception ignored) {}
            }
        } catch (Exception ignored) {}
        ctx.json(Map.of("tokens", tokens));
    }
    private static String safe(String s) { return s != null ? s.trim() : ""; }
}
