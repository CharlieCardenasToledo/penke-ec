package ec.gob.firmadigital.api;

import ec.gob.firmadigital.api.BuildInfo;
import ec.gob.firmadigital.api.routes.FirmarRoute;
import ec.gob.firmadigital.api.routes.InspectSignaturesRoute;
import ec.gob.firmadigital.api.routes.PlacementInfoRoute;
import ec.gob.firmadigital.api.routes.TokensRoute;
import ec.gob.firmadigital.api.routes.ValidarRoute;
import ec.gob.firmadigital.api.routes.VerificarRoute;
import io.javalin.Javalin;

public class BackendServer {

    public static final int PORT = 8765;

    public static void main(String[] args) {
        Javalin app = Javalin.create(config -> {
            config.bundledPlugins.enableCors(cors -> {
                cors.addRule(rule -> {
                    rule.anyHost();
                    rule.allowCredentials = false;
                });
            });
        });

        // Manejar preflight OPTIONS explícitamente
        app.options("/*", ctx -> {
            ctx.header("Access-Control-Allow-Origin", "*");
            ctx.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            ctx.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
            ctx.status(204);
        });

        // Inyectar headers CORS en todas las respuestas
        app.before(ctx -> {
            ctx.header("Access-Control-Allow-Origin", "*");
            ctx.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            ctx.header("Access-Control-Allow-Headers", "Content-Type");
        });

        // Capturar todas las excepciones no manejadas y retornar JSON
        app.exception(Exception.class, (e, ctx) -> {
            ctx.header("Access-Control-Allow-Origin", "*");
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

        app.start(PORT);
        System.out.println("FirmaEC Backend v" + BuildInfo.VERSION + " (buildId=" + BuildInfo.BUILD_ID + ", apiVersion=" + BuildInfo.API_VERSION + ") corriendo en puerto " + PORT);
    }
}
