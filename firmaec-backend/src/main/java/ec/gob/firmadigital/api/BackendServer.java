package ec.gob.firmadigital.api;

import ec.gob.firmadigital.api.BuildInfo;
import ec.gob.firmadigital.api.routes.FirmarRoute;
import ec.gob.firmadigital.api.routes.InspectSignaturesRoute;
import ec.gob.firmadigital.api.routes.PlacementInfoRoute;
import ec.gob.firmadigital.api.routes.TokensRoute;
import ec.gob.firmadigital.api.routes.ValidarRoute;
import ec.gob.firmadigital.api.routes.VerificarRoute;
import io.javalin.Javalin;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Set;

public class BackendServer {

    public static final int PORT = 8765;

    private static void monitorParentProcess() {
        String value = System.getenv("PENKE_PARENT_PID");
        if (value == null || value.isBlank()) return;

        try {
            long parentPid = Long.parseLong(value);
            ProcessHandle.of(parentPid).ifPresent(parent -> {
                Thread monitor = new Thread(() -> {
                    try {
                        while (parent.isAlive()) Thread.sleep(500);
                        System.err.println("Penké principal terminó; cerrando backend.");
                        System.exit(0);
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    }
                }, "penke-parent-monitor");
                monitor.setDaemon(true);
                monitor.start();
            });
        } catch (NumberFormatException e) {
            System.err.println("PENKE_PARENT_PID inválido: " + value);
        }
    }

    public static void main(String[] args) {
        String apiToken = System.getenv("PENKE_API_TOKEN");
        if (apiToken == null || apiToken.isBlank()) {
            throw new IllegalStateException("PENKE_API_TOKEN no está configurado");
        }
        monitorParentProcess();

        Set<String> allowedOrigins = Set.of(
            "http://tauri.localhost",
            "https://tauri.localhost",
            "tauri://localhost",
            "http://localhost:1420"
        );

        // Javalin 6 exige puerto explícito en allowHost(), pero Tauri envía
        // orígenes como http://tauri.localhost sin puerto. El manejo CORS
        // explícito de abajo cubre los orígenes permitidos sin ese parser.
        Javalin app = Javalin.create();

        // Manejar preflight OPTIONS explícitamente
        app.options("/*", ctx -> {
            String origin = ctx.header("Origin");
            if (origin != null && allowedOrigins.contains(origin)) ctx.header("Access-Control-Allow-Origin", origin);
            ctx.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            ctx.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
            ctx.status(204);
        });

        app.before(ctx -> {
            String origin = ctx.header("Origin");
            if (origin != null && allowedOrigins.contains(origin)) ctx.header("Access-Control-Allow-Origin", origin);
            ctx.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            ctx.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
            if ("OPTIONS".equalsIgnoreCase(ctx.method().name())) return;

            String authorization = ctx.header("Authorization");
            String supplied = authorization != null && authorization.startsWith("Bearer ")
                ? authorization.substring("Bearer ".length()).trim() : "";
            boolean valid = MessageDigest.isEqual(
                supplied.getBytes(StandardCharsets.UTF_8),
                apiToken.getBytes(StandardCharsets.UTF_8)
            );
            if (!valid) {
                ctx.status(401).json(java.util.Map.of("code", "UNAUTHORIZED", "error", "Sesión no autorizada"));
                ctx.skipRemainingHandlers();
            }
        });

        // Capturar todas las excepciones no manejadas y retornar JSON
        app.exception(Exception.class, (e, ctx) -> {
            String msg = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
            ctx.status(500).json(java.util.Map.of("code", "INTERNAL_ERROR", "error", msg));
            e.printStackTrace();
        });

        app.get("/health",  ctx -> ctx.result("OK"));
        app.get("/version", ctx -> {
            ctx.contentType("application/json");
            ctx.result(String.format(
                "{\"version\":\"%s\",\"buildId\":\"%s\",\"apiVersion\":%d}",
                BuildInfo.VERSION, BuildInfo.BUILD_ID, BuildInfo.API_VERSION
            ));
        });
        app.get("/tokens", new TokensRoute());

        app.post("/firmar",                    new FirmarRoute());
        app.post("/pdf/placement-info",       new PlacementInfoRoute());
        app.post("/pdf/inspect-signatures",   new InspectSignaturesRoute());
        app.post("/verificar",                new VerificarRoute());
        app.post("/validar",                  new ValidarRoute());

        app.start("127.0.0.1", PORT);
        System.out.println("FirmaEC Backend v" + BuildInfo.VERSION + " (buildId=" + BuildInfo.BUILD_ID + ", apiVersion=" + BuildInfo.API_VERSION + ") corriendo en puerto " + PORT);
    }
}
