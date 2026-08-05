import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft, Lock, CheckCircle2, Circle, AlertCircle,
} from "lucide-react";
import { Button } from "../ui";
import { api } from "../../lib/api";
import { traducirErrorFirma } from "../../lib/errors";
import type { SignResult } from "./SignWizard";
import { type Preset } from "../../hooks/usePresets";
import { sessionStore } from "../../hooks/useSessionStore";
import { useHistory } from "../../hooks/useHistory";
import { toast } from "../Toast";
import { SignProgress } from "../SignProgress";
import { AnimatePresence, motion } from "framer-motion";
import type { StampPos } from "./SignWizard";
import type { BatchFile } from "../BatchSignList";
import { BatchSignList } from "../BatchSignList";

interface Props {
  profile: Preset;
  doc: string;
  batchMode: boolean;
  batchFiles: BatchFile[];
  setBatchFiles: React.Dispatch<React.SetStateAction<BatchFile[]>>;
  stampPos: StampPos | null;
  onBack: () => void;
  onDone: (result: SignResult) => void;
}

function Req({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {ok
        ? <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" />
        : <Circle size={14} className="text-slate-300 flex-shrink-0" />}
      <span className={ok ? "text-sm text-green-700" : "text-sm text-slate-400"}>{label}</span>
    </div>
  );
}

export function StepReview({
  profile, doc, batchMode, batchFiles, setBatchFiles, stampPos, onBack, onDone,
}: Props) {
  const tipoFirma  = profile.tipoFirma ?? "archivo";
  const cert       = profile.cert ?? "";
  const tokenAlias = profile.tokenAlias ?? "";
  const { addEntry } = useHistory();

  const [clave,   setClave]   = useState(() => sessionStore.get("firmaec.clave") ?? "");
  const [signing, setSigning] = useState(false);
  const [error,   setError]   = useState("");
  const claveRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { headingRef.current?.focus(); }, []);

  useEffect(() => { sessionStore.set("firmaec.clave", clave); }, [clave]);

  const outputName = doc
    ? `${doc.split(/[\\/]/).pop()?.replace(/\.pdf$/i, "").replace(/_penke$/i, "")}_penke.pdf`
    : "";
  const outputFolder = profile.carpetaBaseUsuario
    ? `${profile.carpetaBaseUsuario}/Penké Firmas`
    : "Documentos/Penké Firmas";

  const reqDoc    = batchMode ? batchFiles.filter((f) => f.status === "pending").length > 0 : !!doc;
  const reqCert   = !!(cert || tokenAlias);
  const reqFolder = true;
  const reqClave  = !!clave;
  const canSign   = reqDoc && reqCert && reqFolder && reqClave;

  function buildRequest(rutaDocumento: string) {
    return {
      rutaDocumento,
      rutaCertificado: tipoFirma === "archivo" ? cert : undefined,
      alias: tipoFirma === "token" ? tokenAlias : undefined,
      clave, tipoFirma,
      estampado: (profile.estampado as "QR" | "Simple" | "Avanzada") || undefined,
      razonFirma: profile.razon,
      localizacion: profile.lugar,
      pagina: stampPos?.pagina ?? 1,
      puntoX: stampPos?.puntoX ?? 0,
      puntoY: stampPos?.puntoY ?? 0,
      carpetaBaseUsuario: profile.carpetaBaseUsuario,
    };
  }

  async function firmar() {
    if (!canSign) { claveRef.current?.focus(); return; }
    setSigning(true); setError("");
    try {
      const res = await api.firmar(buildRequest(doc));
      addEntry({
        ruta: res.rutaFirmado,
        nombre: res.rutaFirmado.split(/[\\/]/).pop() ?? res.rutaFirmado,
        firmante: res.firmante,
        fecha: new Date().toLocaleString("es-EC", { dateStyle: "short", timeStyle: "short" }),
      });
      onDone({ kind: "single", response: res });
    } catch (e) {
      const msg = traducirErrorFirma(e);
      setError(msg); toast(msg, "error");
    } finally { setSigning(false); }
  }

  async function firmarLote() {
    if (!reqClave) { claveRef.current?.focus(); return; }
    const pending = batchFiles.filter((f) => f.status === "pending");
    if (pending.length === 0) return;
    setSigning(true); setError("");
    const completedFiles: BatchFile[] = [];
    const failedFiles: BatchFile[] = [];
    for (const file of pending) {
      setBatchFiles((prev) => prev.map((f) => f.id === file.id ? { ...f, status: "signing" } : f));
      try {
        const res = await api.firmar(buildRequest(file.ruta));
        const doneFile: BatchFile = { ...file, status: "done", rutaFirmado: res.rutaFirmado };
        completedFiles.push(doneFile);
        setBatchFiles((prev) => prev.map((f) => f.id === file.id ? doneFile : f));
        addEntry({
          ruta: res.rutaFirmado,
          nombre: res.rutaFirmado.split(/[\\/]/).pop() ?? res.rutaFirmado,
          firmante: res.firmante,
          fecha: new Date().toLocaleString("es-EC", { dateStyle: "short", timeStyle: "short" }),
        });
      } catch (e) {
        const errFile: BatchFile = { ...file, status: "error", errorMsg: traducirErrorFirma(e) };
        failedFiles.push(errFile);
        setBatchFiles((prev) => prev.map((f) => f.id === file.id ? errFile : f));
      }
    }
    setSigning(false);
    const total = pending.length;
    const errCount = failedFiles.length;
    const doneCount = completedFiles.length;
    const msg = errCount > 0
      ? `${doneCount} de ${total} firmados · ${errCount} con error${errCount > 1 ? "es" : ""}`
      : `${doneCount} de ${total} firmados correctamente`;
    toast(msg, errCount > 0 ? "error" : "success");
    onDone({ kind: "batch", completed: completedFiles, failed: failedFiles, outputFolder });
  }

  return (
    <div className="space-y-5">
      <div>
        <button onClick={onBack} disabled={signing}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 mb-4 transition-colors disabled:opacity-40">
          <ArrowLeft size={15} /> {profile.estampado ? "Posición" : "Documento"}
        </button>
        <h2 ref={headingRef} tabIndex={-1} className="text-base font-bold text-slate-800">Revisa y firma</h2>
      </div>

      {/* Resumen */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Firmante</p>
            <p className="font-medium text-slate-700">
              {profile.certTitular || profile.nombre}
              {profile.certCedula && <span className="text-slate-400 font-normal"> · {profile.certCedula}</span>}
            </p>
          </div>
          {!batchMode && doc && (
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Documento</p>
              <p className="font-medium text-slate-700 truncate">{doc.split(/[\\/]/).pop()}</p>
            </div>
          )}
          {profile.estampado && (
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Sello</p>
              <p className="font-medium text-slate-700">
                {profile.estampado}
                {stampPos && ` · Pág. ${stampPos.pagina}`}
              </p>
            </div>
          )}
          {!batchMode && outputName && (
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Se guardará como</p>
              <p className="font-medium text-slate-700 truncate">{outputName}</p>
            </div>
          )}
          <div className="col-span-2">
            <p className="text-xs text-slate-400 mb-0.5">Destino</p>
            <p className="font-mono text-xs text-slate-600">{outputFolder}</p>
          </div>
        </div>

        {/* Lista de lote */}
        {batchMode && <BatchSignList files={batchFiles} onRemove={() => {}} />}

        {/* Requisitos */}
        <div className="pt-3 border-t border-slate-100 space-y-1.5">
          <Req ok={reqDoc}    label={batchMode ? `${batchFiles.filter((f) => f.status === "pending").length} documentos en cola` : "Documento seleccionado"} />
          <Req ok={reqCert}   label="Certificado cargado" />
          <Req ok={true} label={profile.carpetaBaseUsuario ? "Carpeta personalizada configurada" : "Usando carpeta predeterminada"} />
          <Req ok={reqClave}  label={tipoFirma === "token" ? "PIN del token ingresado" : "Contraseña del certificado ingresada"} />
        </div>
      </div>

      {/* Contraseña */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-2 mb-3">
          <Lock size={12} /> {tipoFirma === "token" ? "PIN del Token" : "Contraseña del certificado"}
        </label>
        <input
          ref={claveRef}
          type="password"
          value={clave}
          onChange={(e) => setClave(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (batchMode ? firmarLote() : firmar())}
          placeholder={tipoFirma === "token" ? "PIN…" : "Contraseña…"}
          disabled={signing}
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 bg-slate-50"
        />
      </div>

      {/* Progreso */}
      <AnimatePresence>
        {signing && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <SignProgress
              active={signing}
              done={false}
              fileName={!batchMode ? (doc.split(/[\\/]/).pop()) : undefined}
              outputFolder={outputFolder}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      <AnimatePresence>
        {error && !signing && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
            <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Acción principal */}
      <div className="flex justify-between items-center">
        <Button variant="secondary" onClick={onBack} disabled={signing} icon={<ArrowLeft size={14} />}>
          Atrás
        </Button>
        <Button
          onClick={batchMode ? firmarLote : firmar}
          disabled={!canSign}
          loading={signing}
          size="lg"
        >
          {signing ? "Firmando…" : batchMode
            ? `Firmar ${batchFiles.filter((f) => f.status === "pending").length} documentos`
            : "Firmar documento"}
        </Button>
      </div>
    </div>
  );
}
