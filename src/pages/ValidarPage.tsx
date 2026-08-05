import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck, ShieldX, ShieldAlert, HelpCircle,
  AlertCircle, Lock, ArrowRight, Info,
} from "lucide-react";
import { DropZone }              from "../components/DropZone";
import { toast }                 from "../components/Toast";
import { useLocalStorage }       from "../hooks/useLocalStorage";
import { sessionStore }          from "../hooks/useSessionStore";
import { api, type ValidarResponse } from "../lib/api";

export function ValidarPage() {
  const navigate = useNavigate();
  const [cert, setCert]   = useLocalStorage("firmaec.cert", "");
  const [clave, setClave] = useState(() => sessionStore.get("firmaec.clave") ?? "");
  const [loading, setLoading] = useState(false);
  const [data, setData]       = useState<ValidarResponse | null>(null);
  const [error, setError]     = useState("");

  async function validar() {
    if (!cert || !clave) { setError("Selecciona el certificado e ingresa la contraseña."); return; }
    setLoading(true); setError(""); setData(null);
    try {
      const res = await api.validar(cert, clave);
      setData(res);
      sessionStore.set("firmaec.clave", clave);
      const estado = res.revocado ? "revocado" : res.caducado ? "caducado" : "válido";
      toast(`Certificado ${estado}`, res.valido ? "success" : "error");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg); toast(msg, "error");
    } finally { setLoading(false); }
  }

  function badge(d: ValidarResponse) {
    if (d.revocado) return { Icon: ShieldX,    bg: "bg-red-50 border-red-200",       text: "text-red-800",    label: "Revocado"      };
    if (d.caducado) return { Icon: ShieldAlert, bg: "bg-yellow-50 border-yellow-200", text: "text-yellow-800", label: "Caducado"      };
    if (d.valido)   return { Icon: ShieldCheck, bg: "bg-green-50 border-green-200",   text: "text-green-800",  label: "Válido"        };
    return             { Icon: HelpCircle,  bg: "bg-slate-50 border-slate-200",    text: "text-slate-700",  label: "Sin verificar" };
  }

  function diasRestantes(fecha: string) {
    return Math.ceil((new Date(fecha).getTime() - Date.now()) / 86400000);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Validar certificado</h1>
        <p className="text-sm text-slate-500 mt-0.5">Verifica vigencia y estado de revocación (OCSP) del certificado</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">
            Certificado .p12
            {cert && (
              <span className="ml-2 text-blue-400 normal-case font-normal text-[11px]">recordado</span>
            )}
          </label>
          <DropZone
            label="Seleccionar certificado"
            accept={["p12", "pfx"]}
            value={cert}
            onChange={(p) => { setCert(p); setData(null); }}
          />
        </div>

        <div>
          <label className="text-xs font-medium text-slate-500 mb-1.5 block">Contraseña</label>
          <div className="relative">
            <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="password"
              value={clave ?? ""}
              onChange={(e) => setClave(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && validar()}
              placeholder="••••••••"
              className="w-full pl-9 rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>

        {/* Nota OCSP */}
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-100">
          <Info size={13} className="text-slate-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-slate-500 leading-relaxed">
            La validación consulta el estado del certificado en tiempo real mediante <strong>OCSP</strong> (Online
            Certificate Status Protocol) en los servidores del BCE y Consejo de la Judicatura. Requiere conexión a Internet.
          </p>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              role="alert"
              className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex gap-2 items-start"
            >
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileTap={{ scale: 0.985 }}
          onClick={validar}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm transition-all shadow-md"
        >
          {loading ? "Validando certificado…" : "Validar certificado"}
        </motion.button>
      </div>

      {/* Resultados */}
      <div aria-live="polite" aria-atomic="true">
        <AnimatePresence>
          {data && (() => {
            const { Icon, bg, text, label } = badge(data);
            const dias = diasRestantes(data.validoHasta);
            return (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                {/* Banner de estado */}
                <div className={`rounded-2xl px-6 py-5 border ${bg} flex items-center gap-4`}>
                  <Icon size={40} className={text} aria-hidden />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xl font-bold ${text}`}>{label}</p>
                    {!data.caducado && !data.revocado && (
                      <p className={`text-sm mt-0.5 ${dias < 30 ? "text-yellow-600 font-semibold" : "text-slate-500"}`}>
                        {dias > 0 ? `Vence en ${dias} días (${data.validoHasta})` : "Vencido"}
                      </p>
                    )}
                    {data.caducado && (
                      <p className="text-sm mt-0.5 text-yellow-700">
                        Venció el {data.validoHasta}. Renueva tu certificado con la entidad emisora.
                      </p>
                    )}
                    {data.revocado && (
                      <p className="text-sm mt-0.5 text-red-700">
                        Este certificado fue revocado por la entidad certificadora. No debe usarse para firmar.
                      </p>
                    )}
                  </div>
                </div>

                {/* CTA: usar para firmar (solo si el cert es válido) */}
                {data.valido && !data.revocado && !data.caducado && (
                  <button
                    onClick={() => navigate("/firmar", { state: { cert, clave } })}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-all shadow-md"
                  >
                    Usar este certificado para firmar <ArrowRight size={14} />
                  </button>
                )}

                {/* Recomendaciones si hay problemas */}
                {(data.revocado || data.caducado) && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 space-y-2">
                    <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Qué hacer</p>
                    <ul className="text-sm text-amber-900 space-y-1.5 list-disc list-inside">
                      {data.revocado && (
                        <>
                          <li>Contacta a tu entidad certificadora (BCE, Security Data, ANF, etc.) para obtener un nuevo certificado.</li>
                          <li>No uses este certificado para firmar documentos: las firmas generadas con él no son legalmente válidas.</li>
                          <li>Si sospechas que el certificado fue comprometido, repórtalo a tu entidad certificadora.</li>
                        </>
                      )}
                      {data.caducado && !data.revocado && (
                        <>
                          <li>Renueva tu certificado digital. Puedes hacerlo en línea o presencialmente con tu entidad certificadora.</li>
                          <li>Las firmas generadas con un certificado caducado pueden no ser reconocidas por entidades públicas.</li>
                        </>
                      )}
                    </ul>
                  </div>
                )}

                {/* Datos del titular */}
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6"
                >
                  <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">Datos del titular</h2>
                  <dl className="grid grid-cols-2 gap-x-8 gap-y-4">
                    {([
                      ["Nombre completo", `${data.nombre} ${data.apellido}`],
                      ["Cédula",          data.cedula],
                      ["Cargo",           data.cargo       || "—"],
                      ["Institución",     data.institucion || "—"],
                      ["Válido desde",    data.validoDesde],
                      ["Válido hasta",    data.validoHasta],
                    ] as [string, string][]).map(([k, v]) => (
                      <div key={k}>
                        <dt className="text-xs text-slate-400">{k}</dt>
                        <dd className="text-sm font-semibold text-slate-800 mt-0.5">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </motion.div>

                {/* Entidad emisora */}
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4"
                >
                  <p className="text-xs text-slate-400 mb-1">Entidad certificadora emisora</p>
                  <p className="text-xs font-mono text-slate-600 break-all leading-relaxed">{data.emisor}</p>
                </motion.div>

                {/* Nota sobre OCSP en resultados */}
                <p className="text-[11px] text-slate-400 text-center">
                  Estado verificado vía OCSP · {new Date().toLocaleString("es-EC", { dateStyle: "short", timeStyle: "short" })}
                </p>
              </motion.div>
            );
          })()}
        </AnimatePresence>
      </div>
    </div>
  );
}
