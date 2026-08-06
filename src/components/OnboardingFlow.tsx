import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  KeyRound, HardDrive, ArrowRight, ArrowLeft,
  Lock, ShieldCheck, CheckCircle2, AlertCircle, Loader2,
  Search, Check, RefreshCw, User, Plus, X,
} from "lucide-react";
import imagotipo from "../assets/penke-imagotipo.svg";
import { invoke } from "@tauri-apps/api/core";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { DropZone } from "./DropZone";
import { LugarSelector } from "./LugarSelector";
import { api, type TokenInfo } from "../lib/api";
import { sessionStore } from "../hooks/useSessionStore";
import { claveStoreKey, type Preset } from "../hooks/usePresets";
import { secureStore } from "../lib/secureStore";

type Estampado = "QR" | "Simple" | "Avanzada" | "";
type Step = "welcome" | "identity" | "verification" | "preferences" | "save" | "done";

const STEP_INDEX: Partial<Record<Step, number>> = {
  "identity":     0,
  "verification": 1,
  "preferences":  2,
  "save":         3,
};

interface Props {
  onComplete:          (p: Omit<Preset, "id">) => void;
  onAddAnother?:       (p: Omit<Preset, "id">) => void;
  onCompleteAndSign?:  (p: Omit<Preset, "id">) => void;
}

function parseCN(dn: string): string {
  const m = dn.match(/CN=([^,]+)/i);
  return m ? m[1].trim() : dn;
}

// ─── Mini SVG previews de cada tipo de sello ─────────────────────────────────

function MiniDocQR() {
  return (
    <svg viewBox="0 0 64 80" className="w-full h-full drop-shadow-sm">
      <rect x="2" y="2" width="60" height="76" rx="3" fill="white" stroke="#e2e8f0" strokeWidth="1.5" />
      {[10, 15, 20, 25, 30, 35].map((y) => (
        <rect key={y} x="7" y={y} width={y % 10 === 0 ? 38 : 48} height="2.5" rx="1.25" fill="#f1f5f9" />
      ))}
      <rect x="37" y="52" width="22" height="22" rx="2" fill="#1e40af" />
      <rect x="38.5" y="53.5" width="19" height="19" rx="1" fill="white" />
      <rect x="40" y="55" width="5" height="5" fill="#1e40af" />
      <rect x="51" y="55" width="5" height="5" fill="#1e40af" />
      <rect x="40" y="66" width="5" height="5" fill="#1e40af" />
      <rect x="46" y="60" width="3" height="3" fill="#1e40af" />
      <rect x="51" y="63" width="2" height="2" fill="#1e40af" />
      <rect x="53" y="66" width="3" height="3" fill="#1e40af" />
      <rect x="51" y="70" width="2" height="2" fill="#1e40af" />
      <rect x="7" y="55" width="27" height="1.5" rx="0.75" fill="#94a3b8" />
      <rect x="7" y="59" width="20" height="1.5" rx="0.75" fill="#cbd5e1" />
      <rect x="7" y="63" width="24" height="1.5" rx="0.75" fill="#cbd5e1" />
      <rect x="7" y="67" width="16" height="1.5" rx="0.75" fill="#cbd5e1" />
    </svg>
  );
}

function MiniDocSimple() {
  return (
    <svg viewBox="0 0 64 80" className="w-full h-full drop-shadow-sm">
      <rect x="2" y="2" width="60" height="76" rx="3" fill="white" stroke="#e2e8f0" strokeWidth="1.5" />
      {[10, 15, 20, 25, 30].map((y) => (
        <rect key={y} x="7" y={y} width={y % 10 === 0 ? 38 : 48} height="2.5" rx="1.25" fill="#f1f5f9" />
      ))}
      <line x1="7" y1="50" x2="57" y2="50" stroke="#cbd5e1" strokeWidth="0.75" />
      <rect x="7" y="53" width="30" height="2.5" rx="1.25" fill="#94a3b8" />
      <rect x="7" y="58.5" width="22" height="1.5" rx="0.75" fill="#cbd5e1" />
      <rect x="7" y="62.5" width="35" height="1.5" rx="0.75" fill="#cbd5e1" />
      <rect x="7" y="66.5" width="26" height="1.5" rx="0.75" fill="#cbd5e1" />
      <rect x="7" y="70.5" width="42" height="1.5" rx="0.75" fill="#e2e8f0" />
    </svg>
  );
}

function MiniDocAvanzada() {
  return (
    <svg viewBox="0 0 64 80" className="w-full h-full drop-shadow-sm">
      <rect x="2" y="2" width="60" height="76" rx="3" fill="white" stroke="#e2e8f0" strokeWidth="1.5" />
      {[10, 15, 20, 25, 30].map((y) => (
        <rect key={y} x="7" y={y} width={y % 10 === 0 ? 38 : 48} height="2.5" rx="1.25" fill="#f1f5f9" />
      ))}
      <rect x="4" y="47" width="56" height="29" rx="2.5" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="1" />
      <rect x="7" y="50" width="12" height="12" rx="2" fill="#bfdbfe" />
      <rect x="8.5" y="51.5" width="9" height="9" rx="1" fill="#93c5fd" />
      <rect x="22" y="51" width="20" height="2.5" rx="1.25" fill="#60a5fa" />
      <rect x="22" y="56" width="27" height="1.5" rx="0.75" fill="#bfdbfe" />
      <rect x="22" y="59.5" width="22" height="1.5" rx="0.75" fill="#bfdbfe" />
      <rect x="48" y="50" width="10" height="10" rx="1.5" fill="#1e40af" />
      <rect x="49" y="51" width="8" height="8" rx="0.75" fill="white" />
      <rect x="50" y="52" width="2.5" height="2.5" fill="#1e40af" />
      <rect x="54.5" y="52" width="2.5" height="2.5" fill="#1e40af" />
      <rect x="50" y="56.5" width="2.5" height="2.5" fill="#1e40af" />
      <rect x="6" y="65" width="52" height="0.75" fill="#bfdbfe" />
      <rect x="6" y="67.5" width="38" height="1.5" rx="0.75" fill="#bfdbfe" />
      <rect x="6" y="71" width="48" height="1.5" rx="0.75" fill="#bfdbfe" />
      <rect x="6" y="74.5" width="30" height="1.5" rx="0.75" fill="#dbeafe" />
    </svg>
  );
}

function MiniDocSinSello() {
  return (
    <svg viewBox="0 0 64 80" className="w-full h-full drop-shadow-sm">
      <rect x="2" y="2" width="60" height="76" rx="3" fill="white" stroke="#e2e8f0" strokeWidth="1.5" />
      {[10, 15, 20, 25, 30, 35, 40].map((y) => (
        <rect key={y} x="7" y={y} width={y % 10 === 0 ? 38 : 48} height="2.5" rx="1.25" fill="#f1f5f9" />
      ))}
      <rect x="22" y="54" width="20" height="16" rx="3" fill="none" stroke="#cbd5e1" strokeWidth="1.75" strokeDasharray="2 1.5" />
      <path d="M26 54 Q26 47 32 47 Q38 47 38 54" fill="none" stroke="#cbd5e1" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="32" cy="62" r="2.5" fill="#cbd5e1" />
    </svg>
  );
}

// ─── Tarjeta de identidad del certificado ────────────────────────────────────

function formatRemaining(days: number): string {
  if (days <= 0) return "Certificado vencido";
  const y = Math.floor(days / 365);
  const m = Math.floor((days % 365) / 30);
  const d = days % 30;
  const parts: string[] = [];
  if (y > 0) parts.push(`${y} ${y === 1 ? "año" : "años"}`);
  if (m > 0) parts.push(`${m} ${m === 1 ? "mes" : "meses"}`);
  if (d > 0 || parts.length === 0) parts.push(`${d} ${d === 1 ? "día" : "días"}`);
  const verb = parts.length === 1 && (y === 1 || m === 1 || d === 1) ? "queda" : "quedan";
  const joined =
    parts.length === 1 ? parts[0] :
    parts.length === 2 ? `${parts[0]} y ${parts[1]}` :
    `${parts[0]}, ${parts[1]} y ${parts[2]}`;
  return `Te ${verb} ${joined}`;
}

export function CertIdentityCard({ titular, cedula, cargo, validoHasta, emisor }: {
  titular: string; cedula: string; cargo?: string; validoHasta: string; emisor?: string;
}) {
  const days = Math.ceil((new Date(validoHasta).getTime() - Date.now()) / 86400000);
  const isValid  = days > 0;
  const dotColor = days > 180 ? "bg-green-400" : days > 30 ? "bg-yellow-400" : "bg-red-400";
  const badge    = days > 180
    ? "bg-green-500/20 text-green-300"
    : days > 30
    ? "bg-yellow-500/20 text-yellow-300"
    : "bg-red-500/20 text-red-300";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className="relative rounded-2xl overflow-hidden shadow-xl shadow-blue-200/60"
      style={{ background: "linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 100%)" }}
    >
      <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white/10 pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />

      <div className="relative p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
              <ShieldCheck size={14} className="text-white" />
            </div>
            <div>
              <p className="text-[10px] text-blue-300 uppercase tracking-widest font-medium">Certificado Digital</p>
              {emisor && <p className="text-[10px] text-blue-200 mt-0.5">Emitido por {emisor}</p>}
            </div>
          </div>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide ${badge}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
            {isValid ? "Activo" : "Vencido"}
          </div>
        </div>

        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <User size={18} className="text-white/80" />
          </div>
          <div>
            <p className="text-lg font-bold text-white leading-tight">{titular}</p>
            {cargo && <p className="text-xs text-blue-300 mt-0.5">{cargo}</p>}
          </div>
        </div>
        <p className="text-sm text-blue-300 mt-2 font-mono tracking-wider pl-0.5">CI: {cedula}</p>

        <div className="mt-4 pt-4 border-t border-white/20 space-y-1.5">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] text-blue-400 uppercase tracking-widest">Válido hasta</p>
              <p className="text-sm font-bold text-white mt-0.5">{validoHasta}</p>
            </div>
            <p className="text-[11px] text-blue-300 text-right leading-tight max-w-[160px]">
              {formatRemaining(days)}
            </p>
          </div>
          <p className="text-[10px] text-blue-400 text-right">
            {isValid ? `${days} días restantes` : "Renovación requerida"}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Barra de progreso (4 etapas) ────────────────────────────────────────────

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1 mb-8">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className={[
          "h-1 rounded-full transition-all duration-300 flex-1",
          i < current  ? "bg-blue-600" :
          i === current ? "bg-blue-400" :
                         "bg-slate-200",
        ].join(" ")} />
      ))}
    </div>
  );
}

// ─── Opciones de sello ────────────────────────────────────────────────────────

const STAMP_OPTIONS: { value: Estampado; label: string; desc: string; recommended?: boolean; Preview: () => React.ReactElement }[] = [
  { value: "QR",       label: "Con QR",    desc: "Código QR verificable en el documento",  recommended: true, Preview: MiniDocQR },
  { value: "Simple",   label: "Simple",    desc: "Bloque de texto con datos del firmante",  Preview: MiniDocSimple },
  { value: "Avanzada", label: "Avanzada",  desc: "Sello completo: logo, datos y QR",        Preview: MiniDocAvanzada },
  { value: "",         label: "Sin sello", desc: "Firma invisible embebida en el PDF",       Preview: MiniDocSinSello },
];

// ─── Componente principal ─────────────────────────────────────────────────────

export function OnboardingFlow({ onComplete, onAddAnother, onCompleteAndSign }: Props) {
  const [step, setStep] = useState<Step>("welcome");
  const [dir,  setDir]  = useState(1);

  // Cert
  const [tipoFirma,      setTipoFirma]      = useState<"archivo" | "token">("archivo");
  const [cert,           setCert]           = useState("");
  const [clave,          setClave]          = useState("");
  const [verifying,      setVerifying]      = useState(false);
  const [certInfo,       setCertInfo]       = useState<{ titular: string; cedula: string; cargo?: string; validoHasta: string; emisor?: string } | null>(null);
  const [certError,      setCertError]      = useState("");
  const [recordarClave,  setRecordarClave]  = useState(false);

  // Token
  const [tokens,         setTokens]         = useState<TokenInfo[]>([]);
  const [tokenError,     setTokenError]     = useState("");
  const [selectedAlias,  setSelectedAlias]  = useState("");
  const [detecting,      setDetecting]      = useState(false);

  // Preferences + destination
  const [estampado,      setEstampado]      = useState<Estampado>("QR");
  const [lugar,          setLugar]          = useState("Quito, Pichincha");
  const [nombre,         setNombre]         = useState("Mi firma");
  const [carpetaDestino, setCarpetaDestino] = useState("");
  const [defaultFolder,  setDefaultFolder]  = useState("");
  const [saved,          setSaved]          = useState<Omit<Preset, "id"> | null>(null);

  function goNext(to: Step) { setDir(1);  setStep(to); }
  function goBack(to: Step) { setDir(-1); setStep(to); }

  function resetFlow() {
    setTipoFirma("archivo"); setCert(""); setClave("");
    setVerifying(false); setCertInfo(null); setCertError(""); setTokenError("");
    setTokens([]); setSelectedAlias(""); setDetecting(false);
    setEstampado("QR"); setLugar("Quito, Pichincha"); setNombre("Mi firma");
    setCarpetaDestino(""); setSaved(null); setRecordarClave(false);
    goNext("identity");
  }

  async function detectTokens() {
    setDetecting(true); setTokenError("");
    try {
      const res = await api.tokens();
      setTokens(res.tokens);
      if (res.tokens.length === 0) setTokenError("No se detectaron tokens USB. Verifica que el dispositivo esté conectado y el driver instalado.");
    } catch (e) {
      setTokenError(e instanceof Error ? e.message : "Error al detectar tokens. Verifica la conexión del dispositivo.");
    } finally { setDetecting(false); }
  }

  async function verificar() {
    if (!cert || !clave) return;
    setVerifying(true); setCertError("");
    try {
      const res = await api.validar(cert, clave);
      setCertInfo({
        titular:     `${res.nombre} ${res.apellido}`.trim(),
        cedula:      res.cedula,
        cargo:       res.cargo   || undefined,
        validoHasta: res.validoHasta,
        emisor:      res.emisor  ? parseCN(res.emisor) : undefined,
      });
      // Guardar contraseña: en sesión siempre; en Stronghold si el usuario lo pidió
      sessionStore.set(claveStoreKey(cert), clave);
      if (recordarClave) {
        secureStore.set(claveStoreKey(cert), clave);
      }
      goNext("verification");
    } catch (e) {
      setCertError(e instanceof Error ? e.message : "Contraseña incorrecta o certificado inválido");
    } finally { setVerifying(false); }
  }

  function advanceIdentity() {
    if (tipoFirma === "archivo") {
      // La contraseña se ingresa inline; verificar() lleva a verification
      verificar();
    } else {
      const t = tokens.find((tk) => tk.alias === selectedAlias);
      if (!t) return;
      setCertInfo({ titular: t.nombre, cedula: t.cedula, cargo: t.cargo ?? undefined, validoHasta: t.validoHasta });
      goNext("verification");
    }
  }

  function buildProfile(): Omit<Preset, "id"> {
    const tokenInfo = tokens.find((t) => t.alias === selectedAlias);
    return {
      nombre: nombre.trim() || "Mi firma",
      tipoFirma,
      cert:        tipoFirma === "archivo" ? cert : "",
      tokenAlias:  tipoFirma === "token"   ? selectedAlias             : "",
      tokenNombre: tipoFirma === "token"   ? (tokenInfo?.nombre ?? "") : "",
      razon: "", lugar, estampado, recordarClave,
      carpetaBaseUsuario: carpetaDestino || defaultFolder || undefined,
      certTitular:    certInfo?.titular    ?? "",
      certCedula:     certInfo?.cedula     ?? "",
      certValidoHasta: certInfo?.validoHasta ?? "",
    };
  }

  async function saveAndFinish() {
    let folder = carpetaDestino;
    if (!folder) {
      if (defaultFolder) {
        folder = defaultFolder;
      } else {
        try {
          const docs = await invoke<string>("carpeta_penke_defecto");
          if (docs) { folder = docs; setDefaultFolder(docs); }
        } catch { /* usar fallback del backend */ }
      }
    }
    const profile = { ...buildProfile(), carpetaBaseUsuario: folder || undefined };
    setSaved(profile);
    goNext("done");
  }

  async function loadDefaultFolder() {
    if (defaultFolder) return;
    try {
      const docs = await invoke<string>("carpeta_penke_defecto");
      if (docs) setDefaultFolder(docs);
    } catch { /* no crítico */ }
  }

  const slide = {
    enter:  (d: number) => ({ x: d > 0 ?  48 : -48, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit:   (d: number) => ({ x: d > 0 ? -48 :  48, opacity: 0 }),
  };

  const stepIdx = STEP_INDEX[step] ?? -1;

  // ── Welcome ──────────────────────────────────────────────────────────────────
  if (step === "welcome") return (
    <AnimatePresence custom={dir} mode="wait">
      <motion.div key="welcome" custom={dir} variants={slide} initial="enter" animate="center" exit="exit"
        transition={{ duration: 0.2 }} className="max-w-md mx-auto text-center space-y-8 py-10">

        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.08 }}>
          <img src={imagotipo} alt="Penké" className="w-72 max-w-full mx-auto" />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
          <p className="text-xl font-semibold text-slate-700">Tu firma digital, auténtica.</p>
          <p className="text-slate-500 mt-2 text-base leading-relaxed max-w-sm mx-auto">
            Configura tu perfil de firma en 4 pasos. Solo necesitas tu certificado .p12 o token USB.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => goNext("identity")}
            className="inline-flex items-center gap-2.5 px-9 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base shadow-lg shadow-blue-200 transition-colors">
            Comenzar <ArrowRight size={18} />
          </motion.button>
          <p className="text-xs text-slate-400 mt-4">Necesitas tu certificado .p12 o un token USB</p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  // ── Done ─────────────────────────────────────────────────────────────────────
  if (step === "done") return (
    <AnimatePresence custom={dir} mode="wait">
      <motion.div key="done" custom={dir} variants={slide} initial="enter" animate="center" exit="exit"
        transition={{ duration: 0.2 }} className="max-w-md mx-auto text-center space-y-7 py-10">

        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.1 }}>
          <CheckCircle2 size={72} className="text-green-500 mx-auto" />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h2 className="text-2xl font-bold text-slate-800">Perfil creado</h2>
          {saved?.certTitular && <p className="text-slate-700 mt-2 font-semibold">{saved.certTitular}</p>}
          <p className="text-slate-400 text-sm mt-1">
            <span className="font-medium text-slate-600">"{saved?.nombre}"</span> listo para firmar
          </p>
        </motion.div>

        {/* Resumen del perfil */}
        {saved && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
            className="text-left bg-slate-50 rounded-2xl border border-slate-100 p-4 space-y-2">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              <div>
                <p className="text-slate-400">Perfil</p>
                <p className="font-medium text-slate-700">{saved.nombre}</p>
              </div>
              <div>
                <p className="text-slate-400">Sello</p>
                <p className="font-medium text-slate-700">{saved.estampado || "Sin sello"}</p>
              </div>
              <div className="col-span-2">
                <p className="text-slate-400">Destino</p>
                <p className="font-mono text-slate-600 truncate">
                  {saved.carpetaBaseUsuario ? `${saved.carpetaBaseUsuario}/Penké Firmas` : "Documentos/Penké Firmas"}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="flex flex-col gap-3 pt-2">
          <motion.button whileTap={{ scale: 0.97 }}
            onClick={() => {
              if (!saved) return;
              if (onCompleteAndSign) { onCompleteAndSign(saved); } else { onComplete(saved); }
            }}
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md transition-colors">
            Firmar mi primer documento <ArrowRight size={16} />
          </motion.button>

          <motion.button whileTap={{ scale: 0.97 }}
            onClick={() => { if (!saved) return; onAddAnother?.(saved); resetFlow(); }}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold transition-colors">
            <Plus size={16} /> Agregar otro perfil
          </motion.button>

          <p className="text-xs text-slate-400">Puedes agregar más perfiles desde el inicio en cualquier momento</p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  // ── Etapa 1: Identidad digital ────────────────────────────────────────────────
  if (step === "identity") return (
    <AnimatePresence custom={dir} mode="wait">
      <motion.div key="identity" custom={dir} variants={slide} initial="enter" animate="center" exit="exit"
        transition={{ duration: 0.2 }} className="max-w-md mx-auto space-y-5">

        <StepBar current={stepIdx} />
        <div>
          <p className="text-xs font-semibold text-blue-500 uppercase tracking-widest mb-1">Etapa 1 de 4</p>
          <h2 className="text-xl font-bold text-slate-800">Tu identidad digital</h2>
          <p className="text-sm text-slate-400 mt-1">¿Cómo tienes el certificado?</p>
        </div>

        {/* Toggle tipo */}
        <div role="group" aria-label="Tipo de certificado" className="inline-flex bg-slate-100 rounded-xl p-1">
          <button onClick={() => { setTipoFirma("archivo"); setCert(""); setCertError(""); }}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${tipoFirma === "archivo" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            <KeyRound size={13} /> Archivo .p12
          </button>
          <button onClick={() => { setTipoFirma("token"); setCert(""); setCertError(""); setSelectedAlias(""); }}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${tipoFirma === "token" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            <HardDrive size={13} /> Token USB
          </button>
        </div>

        <AnimatePresence mode="wait">
          {tipoFirma === "archivo" ? (
            <motion.div key="archivo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }} className="space-y-4">

              {/* Selección de archivo */}
              {!cert ? (
                <DropZone label="Seleccionar .p12 o .pfx" accept={["p12", "pfx"]} value=""
                  onChange={(p) => { setCert(p); setCertError(""); }} />
              ) : (
                <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <KeyRound size={16} className="text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">{cert.split(/[\\/]/).pop()}</p>
                    <p className="text-xs text-slate-400">Certificado cargado</p>
                  </div>
                  <button onClick={() => { setCert(""); setClave(""); setCertError(""); }}
                    className="text-slate-400 hover:text-red-400 transition-colors flex-shrink-0">
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Campo de contraseña — aparece inline al seleccionar el archivo */}
              <AnimatePresence>
                {cert && (
                  <motion.div key="clave" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }} className="space-y-3">
                    <div className="relative">
                      <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="password"
                        value={clave}
                        onChange={(e) => setClave(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && clave && !verifying && advanceIdentity()}
                        placeholder="Contraseña del certificado"
                        autoFocus
                        className="w-full pl-10 pr-4 rounded-xl border-2 border-slate-200 focus:border-blue-400 py-3.5 text-sm font-medium focus:outline-none transition-colors bg-white" />
                    </div>

                    {certError && (
                      <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-1.5 text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                        <AlertCircle size={13} className="flex-shrink-0" />{certError}
                      </motion.p>
                    )}

                    <label className="flex items-start gap-2.5 cursor-pointer select-none group">
                      <input type="checkbox" checked={recordarClave} onChange={(e) => setRecordarClave(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-400 cursor-pointer flex-shrink-0" />
                      <div>
                        <span className="text-sm text-slate-600 group-hover:text-slate-800 transition-colors block">
                          Recordar contraseña en este dispositivo
                        </span>
                        <span className="text-xs text-slate-400">
                          Se guardará localmente. No se envía a ningún servidor.
                        </span>
                      </div>
                    </label>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div key="token" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }} className="space-y-3">
              {tokens.length === 0 ? (
                <div className="flex flex-col items-center gap-4 py-8 bg-slate-50 rounded-2xl text-center">
                  <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                    <HardDrive size={24} className="text-slate-300" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">Conecta tu token USB</p>
                    <p className="text-xs text-slate-400 mt-0.5">Asegúrate de que el driver está instalado</p>
                  </div>
                  {tokenError && (
                    <p className="flex items-center gap-1.5 text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2 max-w-xs text-left">
                      <AlertCircle size={12} className="flex-shrink-0" />{tokenError}
                    </p>
                  )}
                  <button onClick={detectTokens} disabled={detecting}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors">
                    {detecting ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
                    {detecting ? "Detectando…" : "Detectar tokens"}
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-500">Certificados detectados</p>
                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                    {tokens.map((t) => (
                      <button key={t.alias} onClick={() => setSelectedAlias(t.alias)}
                        className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${selectedAlias === t.alias ? "bg-blue-50" : "hover:bg-slate-50"}`}>
                        <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${selectedAlias === t.alias ? "border-blue-500 bg-blue-500" : "border-slate-300"}`}>
                          {selectedAlias === t.alias && <Check size={9} className="text-white" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{t.nombre}</p>
                          <p className="text-xs text-slate-400">{t.cedula}{t.cargo ? ` · ${t.cargo}` : ""}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                  <button onClick={detectTokens} disabled={detecting}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors">
                    <RefreshCw size={10} /> Volver a detectar
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-3 pt-2">
          <button onClick={() => goBack("welcome")}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-500 hover:bg-slate-50 flex items-center gap-1.5 transition-colors">
            <ArrowLeft size={14} /> Atrás
          </button>
          <button
            onClick={advanceIdentity}
            disabled={tipoFirma === "archivo" ? (!cert || !clave || verifying) : !selectedAlias}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors shadow-sm">
            {verifying
              ? <><Loader2 size={14} className="animate-spin" /> Verificando…</>
              : tipoFirma === "archivo"
              ? <><ShieldCheck size={14} /> Verificar</>
              : <>Continuar <ArrowRight size={14} /></>}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );

  // ── Etapa 2: Verificación ─────────────────────────────────────────────────────
  if (step === "verification") return (
    <AnimatePresence custom={dir} mode="wait">
      <motion.div key="verification" custom={dir} variants={slide} initial="enter" animate="center" exit="exit"
        transition={{ duration: 0.2 }} className="max-w-md mx-auto space-y-5">

        <StepBar current={stepIdx} />
        <div>
          <p className="text-xs font-semibold text-blue-500 uppercase tracking-widest mb-1">Etapa 2 de 4</p>
          <h2 className="text-xl font-bold text-slate-800">Tu firma digital</h2>
          <p className="text-sm text-slate-400 mt-1">Confirma que estos datos son correctos</p>
        </div>

        {certInfo && (
          <CertIdentityCard
            titular={certInfo.titular}
            cedula={certInfo.cedula}
            cargo={certInfo.cargo}
            validoHasta={certInfo.validoHasta}
            emisor={certInfo.emisor}
          />
        )}

        <div className="flex gap-3 pt-1">
          <button onClick={() => goBack("identity")}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-500 hover:bg-slate-50 flex items-center gap-1.5 transition-colors">
            <ArrowLeft size={14} /> Elegir otro
          </button>
          <button onClick={() => goNext("preferences")}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm">
            Esta información es correcta <ArrowRight size={14} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );

  // ── Etapa 3: Preferencias ─────────────────────────────────────────────────────
  if (step === "preferences") return (
    <AnimatePresence custom={dir} mode="wait">
      <motion.div key="preferences" custom={dir} variants={slide} initial="enter" animate="center" exit="exit"
        transition={{ duration: 0.2 }} className="max-w-md mx-auto space-y-6">

        <StepBar current={stepIdx} />
        <div>
          <p className="text-xs font-semibold text-blue-500 uppercase tracking-widest mb-1">Etapa 3 de 4</p>
          <h2 className="text-xl font-bold text-slate-800">Preferencias de firma</h2>
          <p className="text-sm text-slate-400 mt-1">Elige el tipo de sello y los datos del perfil</p>
        </div>

        {/* Tipo de sello */}
        <div>
          <p className="text-sm font-medium text-slate-700 mb-3">¿Cómo se verá tu firma?</p>
          <div className="grid grid-cols-2 gap-3">
            {STAMP_OPTIONS.map(({ value, label, desc, recommended, Preview }) => {
              const selected = estampado === value;
              return (
                <button key={value} onClick={() => setEstampado(value)}
                  className={[
                    "relative flex flex-col items-center text-center rounded-2xl border-2 p-4 transition-all",
                    selected
                      ? "border-blue-500 bg-blue-50 shadow-md shadow-blue-100"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm",
                  ].join(" ")}>

                  {recommended && (
                    <span className="absolute top-2 left-2 text-[9px] font-bold uppercase tracking-wide text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full">
                      Recomendado
                    </span>
                  )}
                  {selected && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 300 }}
                      className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                      <Check size={10} className="text-white" />
                    </motion.div>
                  )}

                  <div className="w-16 h-20 mb-3 mt-1">
                    <Preview />
                  </div>
                  <p className={`text-sm font-semibold leading-tight ${selected ? "text-blue-700" : "text-slate-800"}`}>
                    {label}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">{desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Localización */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">¿Desde dónde firmas?</p>
          <p className="text-xs text-slate-400">Aparecerá como localización en el sello del documento</p>
          <LugarSelector value={lugar} onChange={setLugar} />
        </div>

        {/* Nombre del perfil */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Nombre del perfil</p>
          <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && nombre.trim() && goNext("save")}
            placeholder="Mi firma, Aprobación, Gerencia…"
            className="w-full rounded-xl border-2 border-slate-200 focus:border-blue-400 px-4 py-3 text-sm font-medium focus:outline-none transition-colors placeholder:font-normal" />
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Vista previa:</span>
            <span className="px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-medium">
              {nombre.trim() || "Mi firma"}
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={() => goBack("verification")}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-500 hover:bg-slate-50 flex items-center gap-1.5 transition-colors">
            <ArrowLeft size={14} /> Atrás
          </button>
          <button
            onClick={() => { if (nombre.trim()) { loadDefaultFolder(); goNext("save"); } }}
            disabled={!nombre.trim()}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors shadow-sm">
            Continuar <ArrowRight size={14} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );

  // ── Etapa 4: Guardado ─────────────────────────────────────────────────────────
  async function elegirCarpeta() {
    const selected = await openDialog({ directory: true, multiple: false });
    if (selected && typeof selected === "string") setCarpetaDestino(selected);
  }

  const displayFolder = carpetaDestino || defaultFolder;

  return (
    <AnimatePresence custom={dir} mode="wait">
      <motion.div key="save" custom={dir} variants={slide} initial="enter" animate="center" exit="exit"
        transition={{ duration: 0.2 }} className="max-w-md mx-auto space-y-5">

        <StepBar current={stepIdx} />
        <div>
          <p className="text-xs font-semibold text-blue-500 uppercase tracking-widest mb-1">Etapa 4 de 4</p>
          <h2 className="text-xl font-bold text-slate-800">¿Dónde guardar tus documentos firmados?</h2>
          <p className="text-sm text-slate-400 mt-1">
            Cada vez que firmes, el PDF firmado se guardará aquí.
          </p>
        </div>

        {/* Opciones de carpeta */}
        <div className="space-y-3">
          {/* Opción 1: carpeta predeterminada */}
          <button
            onClick={() => setCarpetaDestino("")}
            className={[
              "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition-all",
              !carpetaDestino
                ? "border-blue-400 bg-blue-50"
                : "border-slate-200 hover:border-slate-300",
            ].join(" ")}
          >
            <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${!carpetaDestino ? "border-blue-500 bg-blue-500" : "border-slate-300"}`}>
              {!carpetaDestino && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
            </div>
            <div className="min-w-0">
              <p className={`text-sm font-semibold ${!carpetaDestino ? "text-blue-700" : "text-slate-700"}`}>
                Guardar en Documentos
              </p>
              <p className="text-xs text-slate-400 font-mono truncate mt-0.5">
                {defaultFolder ? `${defaultFolder}/Penké Firmas` : "Documentos/Penké Firmas"}
              </p>
            </div>
          </button>

          {/* Opción 2: elegir carpeta */}
          {carpetaDestino ? (
            <div className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 border-blue-400 bg-blue-50">
              <div className="w-4 h-4 rounded-full border-2 border-blue-500 bg-blue-500 flex-shrink-0 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-blue-700">Elegir otra carpeta</p>
                <p className="text-xs text-slate-600 font-mono truncate mt-0.5">{carpetaDestino}/Penké Firmas</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={elegirCarpeta}
                  className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded-lg hover:bg-blue-100 transition-colors">
                  Cambiar
                </button>
                <button onClick={() => setCarpetaDestino("")}
                  className="p-1 text-slate-400 hover:text-red-400 rounded-lg hover:bg-red-50 transition-colors">
                  <X size={14} />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={elegirCarpeta}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 border-slate-200 hover:border-slate-300 text-left transition-all"
            >
              <div className="w-4 h-4 rounded-full border-2 border-slate-300 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-700">Elegir otra carpeta</p>
                <p className="text-xs text-slate-400 mt-0.5">Seleccionar ubicación personalizada</p>
              </div>
            </button>
          )}
        </div>

        {/* Resumen previo */}
        <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 space-y-2 text-xs">
          <p className="font-medium text-slate-700">Resumen del perfil:</p>
          <div className="space-y-1 text-slate-500">
            <p><span className="font-medium text-slate-600">Nombre:</span> {nombre.trim() || "Mi firma"}</p>
            <p><span className="font-medium text-slate-600">Certificado:</span> {certInfo?.titular || "—"}</p>
            <p><span className="font-medium text-slate-600">Sello:</span> {estampado || "Sin sello"}</p>
            <p><span className="font-medium text-slate-600">Destino:</span>{" "}
              <span className="font-mono">{displayFolder ? `${displayFolder}/Penké Firmas` : "Documentos/Penké Firmas"}</span>
            </p>
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={() => goBack("preferences")}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-500 hover:bg-slate-50 flex items-center gap-1.5 transition-colors">
            <ArrowLeft size={14} /> Atrás
          </button>
          <button onClick={saveAndFinish}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm">
            Crear perfil <ArrowRight size={14} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
