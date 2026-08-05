import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertTriangle, FileText, Check, X } from "lucide-react";
import { DropZone } from "../components/DropZone";
import { toast }    from "../components/Toast";
import { api, type Firma } from "../lib/api";

export function VerificarPage() {
  const [doc, setDoc]         = useState("");
  const [loading, setLoading] = useState(false);
  const [firmas, setFirmas]   = useState<Firma[] | null>(null);
  const [docValido, setDocValido] = useState(false);
  const [error, setError]     = useState("");

  async function verificar() {
    if (!doc) { setError("Selecciona un documento PDF."); return; }
    setLoading(true); setError(""); setFirmas(null);
    try {
      const res = await api.verificar(doc);
      setFirmas(res.firmas); setDocValido(res.docValido);
      toast(`${res.firmas.length} firma(s) encontrada(s)`, res.docValido ? "success" : "info");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg); toast(msg, "error");
    } finally { setLoading(false); }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Verificar firmas</h1>
        <p className="text-sm text-slate-500 mt-0.5">Comprueba la integridad y validez de las firmas digitales</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block">Documento PDF firmado</label>
        <DropZone label="Seleccionar PDF" accept={["pdf"]} value={doc} onChange={(p) => { setDoc(p); setFirmas(null); }} />
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex gap-2 items-start">
              <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" /><span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>
        <motion.button whileTap={{ scale: 0.985 }} onClick={verificar} disabled={loading}
          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm transition-all shadow-md">
          {loading ? "Verificando…" : "Verificar documento"}
        </motion.button>
      </div>

      <AnimatePresence>
        {firmas !== null && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <div className={["rounded-xl px-5 py-4 flex items-center gap-4 border", docValido ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"].join(" ")}>
              {docValido ? <CheckCircle2 size={32} className="text-green-600 flex-shrink-0" /> : <AlertTriangle size={32} className="text-yellow-500 flex-shrink-0" />}
              <div>
                <p className={["font-bold", docValido ? "text-green-800" : "text-yellow-800"].join(" ")}>
                  {docValido ? "Documento íntegro y válido" : "Documento con observaciones"}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{firmas.length} firma(s) encontrada(s)</p>
              </div>
            </div>

            {firmas.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs text-slate-400 uppercase tracking-wide">
                      <th className="text-left px-5 py-3">Firmante</th>
                      <th className="text-left px-5 py-3">Fecha</th>
                      <th className="text-left px-5 py-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {firmas.map((f, i) => (
                      <motion.tr key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                        className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                        <td className="px-5 py-3">
                          <p className="font-semibold text-slate-800">{f.firmante}</p>
                          <p className="text-xs text-slate-400">{f.cedula} · {f.entidad}</p>
                          {f.razon && <p className="text-xs text-slate-400 italic">{f.razon}</p>}
                        </td>
                        <td className="px-5 py-3 text-xs text-slate-500 whitespace-nowrap">{f.fecha}</td>
                        <td className="px-5 py-3">
                          <span className={["inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
                            f.estado === "valida" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"].join(" ")}>
                            {f.estado === "valida" ? <Check size={11} /> : <X size={11} />}
                            {f.estado === "valida" ? "Válida" : "Inválida"}
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {firmas.length === 0 && (
              <div className="bg-slate-50 rounded-xl px-5 py-10 text-center">
                <FileText size={32} className="text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Este documento no contiene firmas digitales.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
