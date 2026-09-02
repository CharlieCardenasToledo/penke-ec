// mock-backend.mjs — Simula el backend Java de Penke para screenshots demo
import http from "http";

const MOCK_PDF_PATH = "C:/docs/Contrato_Alquiler_2025.pdf";

const RESPONSES = {
  "/firmar": {
    rutaFirmado: "C:/Users/JuanPerez/Penke Firmas/Contrato_Alquiler_2025_penke.pdf",
    carpetaSalida: "C:/Users/JuanPerez/Penke Firmas",
    nombreFirmado: "Contrato_Alquiler_2025_penke.pdf",
    firmante: "Juan Perez Mendoza",
    cedula: "1712345678",
    backendBuildId: "mock-1.0.0",
    placementUsed: { page: 1, left: 100, bottom: 50, right: 290, top: 120, widthPt: 190, heightPt: 70 }
  },
  "/verificar": {
    docValido: true,
    firmas: [{
      cedula: "1712345678",
      firmante: "Juan Perez Mendoza",
      entidad: "Banco Central del Ecuador",
      fecha: "22/08/2025 10:30:45",
      estado: "valida",
      razon: "Revisado y aprobado"
    }]
  },
  "/validar": {
    valido: true, cedula: "1712345678",
    nombre: "Juan", apellido: "Perez Mendoza",
    cargo: "Gerente General", institucion: "Empresa ABC S.A.",
    validoDesde: "2024-01-15", validoHasta: "2027-06-30",
    emisor: "Banco Central del Ecuador",
    caducado: false, revocado: false
  },
  "/tokens": { tokens: [] },
  "/pdf/placement-info": {
    page: { left: 0, bottom: 0, right: 595, top: 842, rotation: 0, numPages: 3 },
    stamp: { widthPt: 190, heightPt: 70, anchor: "LOWER_LEFT", type: "QR" },
    defaultPosition: { left: 100, bottom: 50 }
  }
};

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  const data = RESPONSES[req.url] ?? { ok: true };
  res.writeHead(200);
  res.end(JSON.stringify(data));
  console.log(`[MOCK] ${req.method} ${req.url} -> 200`);
});

server.listen(8765, () => console.log("[MOCK BACKEND] Running on http://localhost:8765"));
