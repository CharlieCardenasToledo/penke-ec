import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { open as openShell }  from "@tauri-apps/plugin-shell";
import { dirname }            from "@tauri-apps/api/path";
import {
  PenLine, FileText, Files, KeyRound, HardDrive, Lock,
  Crosshair, SlidersHorizontal, Bookmark, Trash2, FolderOpen,
  ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Loader2,
  RefreshCw, Search, Check, Plus, ShieldCheck,
} from "lucide-react";

import { DropZone }              from "../components/DropZone";
import { LugarSelector }         from "../components/LugarSelector";
import { PdfViewerModal }        from "../components/PdfViewerModal";
import { PdfThumbnail }          from "../components/PdfThumbnail";
import { SignProgress }          from "../components/SignProgress";
import { Collapsible }           from "../components/Collapsible";
import { BatchSignList, type BatchFile } from "../components/BatchSignList";
import { toast }                 from "../components/Toast";
import { useLocalStorage }       from "../hooks/useLocalStorage";
import { sessionStore }          from "../hooks/useSessionStore";
import { useHistory }            from "../hooks/useHistory";
import { usePresets, claveStoreKey, type Preset } from "../hooks/usePresets";
import { api, type FirmarResponse, type TokenInfo } from "../lib/api";

type Estampado = "QR" | "Simple" | "Avanzada" | "";
type ViewMode  = "profiles" | "new-profile" | "sign";
interface StampPos { pagina: number; puntoX: number; puntoY: number; }

// ─── Helper puro ──────────────────────────────────────────────────────────────
function certStatus(validoHasta?: string) {
  if (!validoHasta) return { dot: "bg-slate-300", text: "Sin validar" };
  const days = Math.ceil((new Date(validoHasta).getTime() - Date.now()) / 86400000);
  if (days <= 0) return { dot: "bg-red-500",    text: "Certificado vencido" };
  if (days < 30) return { dot: "bg-yellow-400", text: `Vence en ${days} días` };
  return              { dot: "bg-green-500",  text: `Válido · ${validoHasta}` };
}

// ─── ProfileCard ──────────────────────────────────────────────────────────────
function ProfileCard({ profile, onSelect, onDelete }: {
  profile: Preset; onSelect: () => void; onDelete: () => void;
}) {
  const status = certStatus(profile.certValidoHasta);
  const certName = (profile.tipoFirma ?? "archivo") === "token"
    ? (profile.tokenNombre || "Token USB")
    : (profile.cert?.split(/[\\/]/).pop()?.replace(/\.(p12|pfx)$/i, "") || "Certificado");

  return (
    <motion.div layout whileHover={{ y: -2 }}
      className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden group">
      <div className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            {(profile.tipoFirma ?? "archivo") === "token"
              ? <HardDrive size={16} className="text-blue-600" />
              : <KeyRound  size={16} className="text-blue-600" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-800 leading-tight">{profile.nombre}</p>
            <p className="text-xs text-slate-400 truncate mt-0.5">{certName}</p>
          </div>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50 transition-all">
            <Trash2 size={13} />
          </button>
        </div>

        {profile.certTitular && (
          <p className="text-xs font-medium text-slate-700 mb-2">{profile.certTitular}</p>
        )}

        <div className="flex items-center gap-1.5 mb-3">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${status.dot}`} />
          <p className="text-xs text-slate-400">{status.text}</p>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {profile.estampado && (
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-medium">
              {profile.estampado}
            </span>
          )}
          {profile.razon && (
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] truncate max-w-[120px]">
              {profile.razon}
            </span>
          )}
          {profile.lugar && (
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] truncate max-w-[110px]">
              {profile.lugar}
            </span>
          )}
        </div>
      </div>

      <button onClick={onSelect}
        className="w-full border-t border-slate-50 bg-slate-50/50 hover:bg-blue-50 hover:border-blue-100 px-5 py-3 flex items-center justify-between transition-all group/btn">
        <p className="text-xs text-slate-400 group-hover/btn:text-blue-600">
          {profile.certCedula ? `CI: ${profile.certCedula}` : "Seleccionar para firmar"}
        </p>
        <ArrowRight size={14} className="text-slate-300 group-hover/btn:text-blue-500 transition-colors" />
      </button>
    </motion.div>
  );
}

// ─── NewProfileForm ───────────────────────────────────────────────────────────
function NewProfileForm({ onSave, onCancel }: {
  onSave: (p: Omit<Preset, "id">) => void; onCancel: () => void;
}) {
  const [nombre,   setNombre]   = useState("");
  const [tipoFirma, setTipoFirma] = useState<"archivo" | "token">("archivo");
  const [cert,     setCert]     = useState("");
  const [clave,    setClave]    = useState("");
  const [tokens,   setTokens]   = useState<TokenInfo[]>([]);
  const [selectedAlias, setSelectedAlias] = useState("");
  const [detecting,  setDetecting]  = useState(false);
  const [validating, setValidating] = useState(false);
  const [certInfo,   setCertInfo]   = useState<{ titular: string; cedula: string; validoHasta: string } | null>(null);
  const [certError,  setCertError]  = useState("");
  const [razon,    setRazon]    = useState("");
  const [lugar,    setLugar]    = useState("Quito, Pichincha");
  const [estampado, setEstampado] = useState<Estampado>("QR");

  async function detectTokens() {
    setDetecting(true);
    try {
      const res = await api.tokens();
      setTokens(res.tokens);
      if (res.tokens.length === 0) toast("No se detectaron tokens USB conectados", "info");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Error al detectar tokens", "error");
    } finally { setDetecting(false); }
  }

  async function verificarCert() {
    if (!cert || !clave) { setCertError("Selecciona el certificado e ingresa la contraseña"); return; }
    setValidating(true); setCertError("");
    try {
      const res = await api.validar(cert, clave);
      setCertInfo({ titular: `${res.nombre} ${res.apellido}`.trim(), cedula: res.cedula, validoHasta: res.validoHasta });
      setClave("");
    } catch (e) {
      setCertError(e instanceof Error ? e.message : "Error al verificar el certificado");
    } finally { setValidating(false); }
  }

  function save() {
    if (!nombre.trim()) { toast("Ingresa un nombre para el perfil", "error"); return; }
    if (tipoFirma === "archivo" && !cert) { toast("Selecciona el certificado .p12", "error"); return; }
    if (tipoFirma === "token" && !selectedAlias) { toast("Selecciona un certificado del token", "error"); return; }
    const tokenInfo = tokens.find((t) => t.alias === selectedAlias);
    onSave({
      nombre: nombre.trim(), tipoFirma, cert: tipoFirma === "archivo" ? cert : "",
      tokenAlias: tipoFirma === "token" ? selectedAlias : "",
      tokenNombre: tipoFirma === "token" ? (tokenInfo?.nombre ?? "") : "",
      razon, lugar, estampado,
      certTitular:    certInfo?.titular    ?? (tipoFirma === "token" ? (tokenInfo?.nombre ?? "") : ""),
      certCedula:     certInfo?.cedula     ?? (tipoFirma === "token" ? (tokenInfo?.cedula ?? "") : ""),
      certValidoHasta: certInfo?.validoHasta ?? (tipoFirma === "token" ? (tokenInfo?.validoHasta ?? "") : ""),
    });
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <button onClick={onCancel}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 mb-5 transition-colors">
          <ArrowLeft size={15} /> Mis perfiles
        </button>
        <h1 className="text-2xl font-bold text-slate-800">Nuevo perfil de firma</h1>
        <p className="text-sm text-slate-400 mt-0.5">Configura tu identidad digital para firmar documentos</p>
      </div>

      {/* Nombre */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block">Nombre del perfil</label>
        <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus
          placeholder="Ej. Aprobación, Documentos legales, Gerencia..."
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium placeholder:font-normal" />
      </div>

      {/* Certificado */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 pt-5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-2 mb-4">
            <KeyRound size={13} /> Certificado digital
          </label>
          <div className="inline-flex bg-slate-100 rounded-lg p-0.5 mb-5">
            <button onClick={() => { setTipoFirma("archivo"); setCertInfo(null); }}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${tipoFirma === "archivo" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              Archivo .p12
            </button>
            <button onClick={() => { setTipoFirma("token"); setCertInfo(null); setCert(""); }}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${tipoFirma === "token" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              <HardDrive size={11} /> Token USB
            </button>
          </div>
        </div>

        <div className="px-5 pb-5 space-y-3">
          <AnimatePresence mode="wait">
            {tipoFirma === "archivo" ? (
              <motion.div key="archivo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                <DropZone label="Seleccionar certificado .p12" accept={["p12", "pfx"]} value={cert}
                  onChange={(p) => { setCert(p); setCertInfo(null); setCertError(""); }} />

                {cert && !certInfo && (
                  <div className="space-y-2">
                    <div className="relative">
                      <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="password" value={clave} onChange={(e) => setClave(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && verificarCert()}
                        placeholder="Contraseña (para verificar)"
                        className="w-full pl-9 pr-4 rounded-xl border border-slate-200 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    </div>
                    {certError && (
                      <div className="flex items-center gap-2 text-red-600 text-xs">
                        <AlertCircle size={12} className="flex-shrink-0" />{certError}
                      </div>
                    )}
                    <button onClick={verificarCert} disabled={validating || !clave}
                      className="w-full py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                      {validating ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
                      {validating ? "Verificando con MINTEL..." : "Verificar certificado"}
                    </button>
                    <p className="text-xs text-slate-400 text-center">La contraseña se usa solo para verificar — no se guarda en disco</p>
                  </div>
                )}

                {certInfo && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-green-600 flex-shrink-0" />
                      <p className="text-xs font-semibold text-green-700">{certInfo.titular}</p>
                    </div>
                    <p className="text-xs text-green-600 pl-5">CI: {certInfo.cedula} · Vence: {certInfo.validoHasta}</p>
                    <button onClick={() => { setCertInfo(null); setCert(""); }}
                      className="text-[10px] text-green-500 hover:underline pl-5">Cambiar certificado</button>
                  </motion.div>
                )}
              </motion.div>
            ) : (
              <motion.div key="token" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                {tokens.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-8 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                      <HardDrive size={24} className="text-slate-300" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-600">Conecta tu token USB</p>
                      <p className="text-xs text-slate-400 mt-1">Asegúrate de que el driver está instalado</p>
                    </div>
                    <button onClick={detectTokens} disabled={detecting}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-sm">
                      {detecting ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                      {detecting ? "Detectando..." : "Detectar tokens"}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-slate-500">Certificados disponibles en el token</p>
                    <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                      {tokens.map((t) => (
                        <button key={t.alias} onClick={() => setSelectedAlias(t.alias)}
                          className={`w-full text-left px-4 py-3 transition-colors flex items-center gap-3 ${selectedAlias === t.alias ? "bg-blue-50" : "hover:bg-slate-50"}`}>
                          <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${selectedAlias === t.alias ? "border-blue-500 bg-blue-500" : "border-slate-300"}`}>
                            {selectedAlias === t.alias && <Check size={9} className="text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{t.nombre}</p>
                            <p className="text-xs text-slate-400">{t.cedula}{t.cargo ? ` · ${t.cargo}` : ""}</p>
                            <p className="text-xs text-slate-400">Vence {t.validoHasta}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                    <button onClick={detectTokens} disabled={detecting}
                      className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors">
                      <RefreshCw size={11} /> Volver a detectar
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Ajustes de firma */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-2">
          <SlidersHorizontal size={13} /> Ajustes de firma
        </label>
        <div>
          <p className="text-xs font-medium text-slate-500 mb-2">Tipo de estampado</p>
          <div className="flex gap-2 flex-wrap">
            {(["QR", "Simple", "Avanzada", ""] as Estampado[]).map((e) => (
              <button key={e} type="button" onClick={() => setEstampado(e)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${estampado === e ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"}`}>
                {e || "Sin estampa"}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">Razón de firma</label>
            <input type="text" value={razon} onChange={(e) => setRazon(e.target.value)}
              placeholder="Aprobado, Revisado..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">Localización</label>
            <LugarSelector value={lugar} onChange={setLugar} />
          </div>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex gap-3">
        <button onClick={onCancel}
          className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">
          Cancelar
        </button>
        <button onClick={save}
          className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md flex items-center justify-center gap-2 transition-colors">
          <Bookmark size={14} /> Guardar perfil
        </button>
      </div>
    </div>
  );
}

// ─── SignSection ──────────────────────────────────────────────────────────────
function SignSection({ profile, onBack }: { profile: Preset; onBack: () => void }) {
  const [batchMode, setBatchMode] = useLocalStorage("firmaec.batchMode", false);
  const [doc,             setDoc]             = useState("");
  const [stampPos,        setStampPos]        = useState<StampPos | null>(null);
  const [showPdfViewer,   setShowPdfViewer]   = useState(false);
  const [showSignedViewer, setShowSignedViewer] = useState(false);
  const [clave,      setClave]      = useState(() => {
    if (profile.recordarClave && profile.cert) {
      const saved = localStorage.getItem(claveStoreKey(profile.cert));
      if (saved) return saved;
    }
    return sessionStore.get("firmaec.clave");
  });
  const [claveGuardada, setClaveGuardada] = useState(
    !!(profile.recordarClave && profile.cert && localStorage.getItem(claveStoreKey(profile.cert)))
  );
  const [signing,    setSigning]    = useState(false);
  const [signed,     setSigned]     = useState(false);
  const [result,     setResult]     = useState<FirmarResponse | null>(null);
  const [error,      setError]      = useState("");
  const [batchFiles, setBatchFiles] = useState<BatchFile[]>([]);
  const [batchDone,  setBatchDone]  = useState(false);
  const claveRef = useRef<HTMLInputElement>(null);
  const { addEntry } = useHistory();

  const tipoFirma  = profile.tipoFirma ?? "archivo";
  const cert       = profile.cert ?? "";
  const tokenAlias = profile.tokenAlias ?? "";
  const status     = useMemo(() => certStatus(profile.certValidoHasta), [profile.certValidoHasta]);

  useEffect(() => { sessionStore.set("firmaec.clave", clave); }, [clave]);

  function validate(): boolean {
    if (!clave) {
      setError(tipoFirma === "token" ? "Ingresa el PIN del token." : "Ingresa la contraseña del certificado.");
      claveRef.current?.focus(); return false;
    }
    return true;
  }

  async function firmar() {
    if (!doc) { setError("Selecciona el documento PDF."); return; }
    if (!validate()) return;
    setSigning(true); setSigned(false); setError(""); setResult(null);
    try {
      const res = await api.firmar({
        rutaDocumento: doc,
        rutaCertificado: tipoFirma === "archivo" ? cert : undefined,
        alias: tipoFirma === "token" ? tokenAlias : undefined,
        clave, tipoFirma,
        estampado: (profile.estampado as "QR" | "Simple" | "Avanzada") || undefined,
        razonFirma: profile.razon, localizacion: profile.lugar,
        pagina: stampPos?.pagina ?? 1, puntoX: stampPos?.puntoX ?? 0, puntoY: stampPos?.puntoY ?? 0,
        carpetaDestino: profile.carpetaDestino || undefined,
      });
      setResult(res); setSigned(true);
      toast(`Firmado por ${res.firmante}`, "success");
      addEntry({
        ruta: res.rutaFirmado,
        nombre: res.rutaFirmado.split(/[\\/]/).pop() ?? res.rutaFirmado,
        firmante: res.firmante,
        fecha: new Date().toLocaleString("es-EC", { dateStyle: "short", timeStyle: "short" }),
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg); toast(msg, "error");
    } finally { setSigning(false); }
  }

  async function firmarLote() {
    if (!validate()) return;
    const pending = batchFiles.filter((f) => f.status === "pending");
    if (pending.length === 0) { setError("Agrega al menos un PDF al lote."); return; }
    setError(""); setBatchDone(false);
    for (const file of pending) {
      setBatchFiles((prev) => prev.map((f) => f.id === file.id ? { ...f, status: "signing" } : f));
      try {
        const res = await api.firmar({
          rutaDocumento: file.ruta,
          rutaCertificado: tipoFirma === "archivo" ? cert : undefined,
          alias: tipoFirma === "token" ? tokenAlias : undefined,
          clave, tipoFirma,
          estampado: (profile.estampado as "QR" | "Simple" | "Avanzada") || undefined,
          razonFirma: profile.razon, localizacion: profile.lugar,
          pagina: 1, puntoX: 0, puntoY: 0,
        });
        setBatchFiles((prev) => prev.map((f) => f.id === file.id ? { ...f, status: "done", rutaFirmado: res.rutaFirmado } : f));
        addEntry({
          ruta: res.rutaFirmado, nombre: res.rutaFirmado.split(/[\\/]/).pop() ?? res.rutaFirmado,
          firmante: res.firmante, fecha: new Date().toLocaleString("es-EC", { dateStyle: "short", timeStyle: "short" }),
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setBatchFiles((prev) => prev.map((f) => f.id === file.id ? { ...f, status: "error", errorMsg: msg } : f));
      }
    }
    setBatchDone(true);
    toast("Lote completado", "success");
  }

  // Ref para atajos de teclado — apunta siempre a la función correcta
  const doSignRef = useRef<() => Promise<void>>(firmar);
  useEffect(() => { doSignRef.current = batchMode ? firmarLote : firmar; });
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") doSignRef.current();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  async function addBatchFiles() {
    const selected = await openDialog({ multiple: true, filters: [{ name: "PDF", extensions: ["pdf"] }] });
    if (!selected) return;
    const paths = Array.isArray(selected) ? selected : [selected];
    const news: BatchFile[] = paths
      .filter((p) => !batchFiles.find((f) => f.ruta === p))
      .map((p) => ({ id: Math.random().toString(36).slice(2), ruta: p, nombre: p.split(/[\\/]/).pop() ?? p, status: "pending" as const }));
    setBatchFiles((prev) => [...prev, ...news]);
    setBatchDone(false);
  }

  function firmarOtro() { setDoc(""); setStampPos(null); setResult(null); setSigned(false); setError(""); }

  async function abrirCarpeta(ruta: string) {
    try { await openShell(await dirname(ruta)); } catch { /* ignorar */ }
  }

  async function abrirArchivo(ruta: string) {
    try { await openShell(ruta); } catch { /* ignorar */ }
  }

  // Vista éxito
  if (signed && result) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl mx-auto space-y-4">

        {showSignedViewer && (
          <PdfViewerModal ruta={result.rutaFirmado} onClose={() => setShowSignedViewer(false)} />
        )}

        {/* Banner de éxito */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, delay: 0.1 }} className="flex-shrink-0">
              <CheckCircle2 size={44} className="text-green-500" />
            </motion.div>
            <div>
              <h2 className="text-lg font-bold text-green-800">¡Documento firmado correctamente!</h2>
              <p className="text-sm text-green-700 mt-0.5">
                Firmado por <span className="font-semibold">{result.firmante}</span>
                {result.cedula && <span className="text-green-600 font-normal"> · CI {result.cedula}</span>}
              </p>
            </div>
          </div>

          {/* Preview del PDF firmado */}
          <div role="button" tabIndex={0} onClick={() => setShowSignedViewer(true)}
            onKeyDown={(e) => e.key === "Enter" && setShowSignedViewer(true)}
            className="w-full group mb-4 rounded-xl border-2 border-green-200 hover:border-green-400 bg-white/60 hover:bg-white/90 transition-all overflow-hidden flex items-center gap-4 px-4 py-3 cursor-pointer">
            <div className="flex-shrink-0 rounded-lg overflow-hidden border border-green-100 shadow-sm pointer-events-none">
              <PdfThumbnail ruta={result.rutaFirmado} />
            </div>
            <div className="text-left flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-700 group-hover:text-green-700 transition-colors">
                Ver el documento firmado
              </p>
              <p className="text-xs text-slate-400 truncate mt-0.5 font-mono">
                {result.rutaFirmado.split(/[\\/]/).pop()}
              </p>
              <p className="text-xs text-green-600 mt-1">Haz clic para abrirlo aquí mismo</p>
            </div>
            <ArrowRight size={16} className="text-slate-300 group-hover:text-green-500 flex-shrink-0 transition-colors" />
          </div>

          {/* Ruta */}
          <div className="bg-white/70 rounded-xl border border-green-100 px-3 py-2.5 mb-4">
            <p className="text-[10px] text-slate-400 mb-0.5">Guardado en</p>
            <p className="text-xs font-mono text-slate-600 break-all">{result.rutaFirmado}</p>
          </div>

          {/* Acciones */}
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => abrirArchivo(result.rutaFirmado)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-green-300 text-green-700 text-sm font-medium hover:bg-green-100 transition-all">
              <FileText size={13} /> Abrir archivo
            </button>
            <button onClick={() => abrirCarpeta(result.rutaFirmado)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-green-200 text-green-600 text-sm font-medium hover:bg-green-50 transition-all">
              <FolderOpen size={13} /> Abrir carpeta
            </button>
            <button onClick={firmarOtro}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all shadow-md ml-auto">
              Firmar otro <ArrowRight size={13} />
            </button>
          </div>
        </div>

        <button onClick={onBack}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowLeft size={14} /> Volver a mis perfiles
        </button>
      </motion.div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {showPdfViewer && doc && (
        <PdfViewerModal
          ruta={doc}
          onClose={() => setShowPdfViewer(false)}
          onConfirmPosition={(pagina, puntoX, puntoY) => {
            setStampPos({ pagina, puntoX, puntoY });
            toast("Posición del sello guardada", "info");
          }}
          initialStamp={stampPos}
        />
      )}

      {/* Header */}
      <div>
        <button onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 mb-4 transition-colors">
          <ArrowLeft size={15} /> Mis perfiles
        </button>

        {/* Perfil activo */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              {tipoFirma === "token" ? <HardDrive size={16} className="text-blue-600" /> : <KeyRound size={16} className="text-blue-600" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-slate-800">{profile.nombre}</p>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${status.dot}`} title={status.text} />
              </div>
              {profile.certTitular ? (
                <p className="text-xs text-slate-400">{profile.certTitular}{profile.certCedula ? ` · ${profile.certCedula}` : ""}</p>
              ) : (
                <p className="text-xs text-slate-400">{status.text}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setBatchMode(!batchMode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${batchMode ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-500 border-slate-200 hover:border-indigo-300"}`}>
              <Files size={12} /> Lote
            </button>
          </div>
        </div>
      </div>

      {/* Documento */}
      <AnimatePresence mode="wait">
        {!batchMode ? (
          <motion.div key="individual" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-2">
              <FileText size={13} /> Tu documento
            </label>
            {doc ? (
              <div className="flex gap-4 items-start">
                <PdfThumbnail ruta={doc} onClick={() => setShowPdfViewer(true)} />
                <div className="flex-1 space-y-2">
                  <DropZone label="Cambiar documento" accept={["pdf"]} value={doc}
                    onChange={(p) => { setDoc(p); setStampPos(null); setSigned(false); setResult(null); }} />
                  <button type="button" onClick={() => setShowPdfViewer(true)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border-2 border-dashed transition-all w-full justify-center ${stampPos ? "border-green-400 text-green-700 bg-green-50 hover:bg-green-100" : "border-blue-300 text-blue-600 hover:bg-blue-50"}`}>
                    <Crosshair size={14} />
                    {stampPos
                      ? `Firma en pág. ${stampPos.pagina} — Cambiar posición`
                      : "Ver el documento y elegir dónde va la firma"}
                  </button>
                </div>
              </div>
            ) : (
              <DropZone label="Elige el documento a firmar" accept={["pdf"]} value={doc}
                onChange={(p) => { setDoc(p); setStampPos(null); setSigned(false); setResult(null); }} />
            )}
          </motion.div>
        ) : (
          <motion.div key="lote" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
            className="space-y-3">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-2">
                <Files size={13} /> Documentos para firmar en lote
              </label>
              <button type="button" onClick={addBatchFiles}
                className="w-full py-3 rounded-xl border-2 border-dashed border-indigo-300 text-indigo-600 hover:bg-indigo-50 text-sm font-medium transition-all flex items-center justify-center gap-2">
                <Plus size={14} /> Agregar PDFs al lote
              </button>
              <p className="text-xs text-slate-400">Todos se firmarán con el mismo perfil. La firma se coloca automáticamente en cada documento.</p>
            </div>
            <BatchSignList files={batchFiles} onRemove={(id) => setBatchFiles((prev) => prev.filter((f) => f.id !== id))} />
            {batchDone && (
              <button onClick={() => { setBatchFiles([]); setBatchDone(false); setError(""); }}
                className="text-xs text-slate-400 hover:text-slate-600 underline">
                Limpiar lista
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contraseña */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <label className="text-xs font-medium text-slate-500 mb-1.5 block">
          {tipoFirma === "token" ? "PIN de tu token" : "Contraseña de tu firma digital"}
        </label>

        {claveGuardada ? (
          <div className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Lock size={14} className="text-green-500" />
              <span>Contraseña guardada</span>
              <span className="text-slate-400 text-xs">{"•".repeat(8)}</span>
            </div>
            <button
              onClick={() => {
                if (profile.cert) localStorage.removeItem(claveStoreKey(profile.cert));
                setClave(""); setClaveGuardada(false);
              }}
              className="text-xs text-slate-400 hover:text-red-500 transition-colors">
              Olvidar
            </button>
          </div>
        ) : (
          <div className="relative">
            <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input ref={claveRef} type="password" value={clave} onChange={(e) => setClave(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (batchMode ? firmarLote() : firmar())}
              placeholder="••••••••" autoComplete="current-password"
              className="w-full pl-9 pr-4 rounded-lg border border-slate-200 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition-shadow" />
          </div>
        )}
      </div>

      {/* Opciones avanzadas - solo en modo individual */}
      {!batchMode && (
        <Collapsible label="Opciones avanzadas">
          <div className="text-xs text-slate-500 space-y-1">
            <p><span className="font-medium">Estampado:</span> {profile.estampado || "Sin estampa"}</p>
            <p><span className="font-medium">Razón:</span> {profile.razon || "—"}</p>
            <p><span className="font-medium">Localización:</span> {profile.lugar || "—"}</p>
          </div>
          <p className="text-xs text-slate-400">Para cambiar estos ajustes, edita el perfil desde la pantalla principal.</p>
        </Collapsible>
      )}

      {/* SignProgress */}
      {!batchMode && <SignProgress active={signing} done={signed} />}

      {/* Error */}
      <AnimatePresence>
        {error && !signing && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex items-start gap-2">
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botón principal */}
      <motion.button whileTap={{ scale: 0.985 }}
        onClick={batchMode ? firmarLote : firmar}
        disabled={signing || (batchMode && batchFiles.filter((f) => f.status === "pending").length === 0 && !batchDone)}
        className={["w-full py-3.5 rounded-xl font-semibold text-sm transition-all shadow-md flex items-center justify-center gap-2",
          signing ? "bg-blue-400 text-white cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg"].join(" ")}>
        <PenLine size={16} />
        {signing ? "Firmando…" : batchMode
          ? `Firmar ${batchFiles.filter((f) => f.status === "pending").length} documento(s) en lote`
          : "Firmar documento"}
      </motion.button>

      <p className="text-center text-xs text-slate-400">
        <kbd className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-[11px]">Ctrl+Enter</kbd> para firmar rápido
      </p>
    </div>
  );
}

// ─── FirmarPage (main export) ─────────────────────────────────────────────────
export function FirmarPage() {
  const { presets, savePreset, deletePreset } = usePresets();
  const [view, setView] = useState<ViewMode>("profiles");
  const [activeProfile, setActiveProfile] = useState<Preset | null>(null);

  if (view === "new-profile") {
    return (
      <NewProfileForm
        onSave={(p) => { savePreset(p); setView("profiles"); toast(`Perfil "${p.nombre}" creado`, "success"); }}
        onCancel={() => setView("profiles")}
      />
    );
  }

  if (view === "sign" && activeProfile) {
    return <SignSection profile={activeProfile} onBack={() => { setActiveProfile(null); setView("profiles"); }} />;
  }

  // Profiles view
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Mis firmas</h1>
          <p className="text-sm text-slate-400 mt-0.5">Selecciona un perfil para comenzar</p>
        </div>
        <button onClick={() => setView("new-profile")}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all shadow-md">
          <Plus size={14} /> Nuevo perfil
        </button>
      </div>

      <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AnimatePresence>
          {presets.map((p) => (
            <motion.div key={p.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
              <ProfileCard
                profile={p}
                onSelect={() => { setActiveProfile(p); setView("sign"); }}
                onDelete={() => deletePreset(p.id)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
