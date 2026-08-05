package ec.gob.firmadigital.api;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

public class OutputPathResolver {

    public static final String OUTPUT_FOLDER = "Penké Firmas";

    /**
     * Resuelve la ruta de salida para un documento firmado.
     * Estructura: carpetaBaseUsuario / "Penké Firmas" / {stem}_penke.pdf
     * Maneja colisiones añadiendo _2, _3, etc.
     */
    public static Path resolve(Path documentoOriginal, Path carpetaBaseUsuario) throws IOException {
        Path carpetaFinal = carpetaBaseUsuario.resolve(OUTPUT_FOLDER);
        Files.createDirectories(carpetaFinal);

        String nombreOriginal = documentoOriginal.getFileName().toString();
        String stem = stemOf(nombreOriginal);

        // Evitar sufijo duplicado si el archivo ya termina en _penke
        if (stem.length() > "_penke".length() && stem.endsWith("_penke")) {
            stem = stem.substring(0, stem.length() - "_penke".length());
        }

        Path candidato = carpetaFinal.resolve(stem + "_penke.pdf");

        // Política de colisiones: agregar _2, _3, etc.
        int n = 2;
        while (Files.exists(candidato)) {
            candidato = carpetaFinal.resolve(stem + "_penke_" + n + ".pdf");
            n++;
        }

        return candidato;
    }

    private static String stemOf(String nombre) {
        int dot = nombre.lastIndexOf('.');
        if (dot <= 0) return nombre;
        return nombre.substring(0, dot);
    }
}
