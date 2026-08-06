import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import {
  KeyRound, HardDrive, Lock, SlidersHorizontal, Bookmark, Trash2, FolderOpen,
  ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Loader2,
  RefreshCw, Search, Check, Plus, ShieldCheck, FolderCheck, X, Pencil,
} from "lucide-react";

import { DropZone }              from "../components/DropZone";
import { LugarSelector }         from "../components/LugarSelector";
import { toast }                 from "../components/Toast";
import { usePresets, claveStoreKey, type Preset } from "../hooks/usePresets";
import { api, type TokenInfo } from "../lib/api";
import { secureStore } from "../lib/secureStore";
import { certStatus } from "../lib/certUtils";
import { SignWizard } from "../components/sign/SignWizard";

type Estampado = "QR" | "Simple" | "Avanzada" | "";
type ViewMode  = "profiles" | "new-profile" | "edit-profile" | "sign";

// ─── ProfileCard ──────────────────────────────────────────────────────────────
function ProfileCard({ profile, onSelect, onDelete, onEdit }: {
  profile: Preset; onSelect: () => void; onDelete: () => void; onEdit: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const status = certStatus(profile.certValidoHasta);
  const certName = (profile.tipoFirma ?? "archivo") === "token"
    ? (profile.tokenNombre || "Token USB")
    : (profile.cert?.split(/[\\/]/).pop()?.replace(/\.(p12|pfx)$/i, "") || "Certificado");

  const sinCarpeta = !profile.carpetaBaseUsuario;

  return (
    <motion.div layout whileHover={{ y: -2 }}
      className={[
        "bg-white rounded-2xl border shadow-sm overflow-hidden group",
        sinCarpeta ? "border-amber-200" : "border-slate-100",
      ].join(" ")}>
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
          <div className="flex items-center gap-1">
            <button onClick={(e) => { e.stopPropagation(); onEdit(); }}
              aria-label={`Editar perfil ${profile.nombre}`}
              className="p-2 rounded-lg text-slate-300 hover:text-blue-500 hover:bg-blue-50 transition-all">
              <Pencil size={13} />
            </button>
            {confirming ? (
              <div className="flex items-center gap-1">
                <button onClick={(e) => { e.stopPropagation(); setConfirming(false); }}
                  className="px-1.5 py-1 text-[10px] text-slate-400 hover:text-slate-600 rounded transition-colors">
                  No
                </button>
                <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  className="px-2 py-1 text-[10px] rounded bg-red-500 hover:bg-red-600 text-white font-semibold transition-colors">
                  Eliminar
                </button>
              </div>
            ) : (
              <button onClick={(e) => { e.stopPropagation(); setConfirming(true); }}
                aria-label={`Eliminar perfil ${profile.nombre}`}
                className="p-2 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50 transition-all">
                <Trash2 size={13} />
              </button>
            )}
          </div>
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

        {profile.carpetaBaseUsuario ? (
          <div className="flex items-center gap-1.5 mt-2">
            <FolderOpen size={10} className="text-slate-400 flex-shrink-0" />
            <p className="text-[10px] text-slate-400 truncate font-mono">
              {profile.carpetaBaseUsuario}/Penké Firmas
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 mt-2">
            <AlertCircle size={10} className="text-amber-400 flex-shrink-0" />
            <p className="text-[10px] text-amber-600">Sin carpeta de destino configurada</p>
          </div>
        )}
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
  const [carpetaBaseUsuario, setCarpetaBaseUsuario] = useState("");

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

  async function elegirCarpeta() {
    const selected = await openDialog({ directory: true, multiple: false });
    if (selected && typeof selected === "string") setCarpetaBaseUsuario(selected);
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
      carpetaBaseUsuario: carpetaBaseUsuario || undefined,
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
          <div role="group" aria-label="Tipo de certificado" className="inline-flex bg-slate-100 rounded-lg p-0.5 mb-5">
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
                      {validating ? "Verificando certificado…" : "Verificar certificado"}
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

      {/* Carpeta de destino */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-2">
          <FolderOpen size={13} /> Carpeta de destino
        </label>
        <p className="text-xs text-slate-400">
          Los documentos firmados se guardarán en <span className="font-mono text-slate-600">Penké Firmas/</span> dentro de esta carpeta.
        </p>
        {carpetaBaseUsuario ? (
          <div className="flex items-start gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl">
            <FolderCheck size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-mono text-green-800 break-all">{carpetaBaseUsuario}</p>
              <p className="text-[10px] text-green-600 mt-0.5">→ {carpetaBaseUsuario}/Penké Firmas/</p>
            </div>
            <button onClick={() => setCarpetaBaseUsuario("")}
              className="text-green-400 hover:text-green-600 flex-shrink-0 transition-colors">
              <X size={13} />
            </button>
          </div>
        ) : (
          <button onClick={elegirCarpeta}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/50 transition-all group">
            <FolderOpen size={18} className="text-slate-400 group-hover:text-blue-500 transition-colors flex-shrink-0" />
            <div className="text-left">
              <p className="text-sm font-medium text-slate-600 group-hover:text-blue-700 transition-colors">Elegir carpeta</p>
              <p className="text-xs text-slate-400">Opcional — sin carpeta se usará Documentos/Penké Firmas/</p>
            </div>
          </button>
        )}
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

// ─── EditProfileForm ─────────────────────────────────────────────────────────
function EditProfileForm({ profile, onSave, onCancel }: {
  profile: Preset;
  onSave: (updates: Partial<Omit<Preset, "id">>) => void;
  onCancel: () => void;
}) {
  const [nombre,   setNombre]   = useState(profile.nombre);
  const [razon,    setRazon]    = useState(profile.razon);
  const [lugar,    setLugar]    = useState(profile.lugar);
  const [estampado, setEstampado] = useState<Estampado>((profile.estampado as Estampado) || "QR");
  const [carpetaBaseUsuario, setCarpetaBaseUsuario] = useState(profile.carpetaBaseUsuario || "");

  async function elegirCarpeta() {
    const selected = await openDialog({ directory: true, multiple: false });
    if (selected && typeof selected === "string") setCarpetaBaseUsuario(selected);
  }

  function save() {
    if (!nombre.trim()) { toast("Ingresa un nombre para el perfil", "error"); return; }
    onSave({ nombre: nombre.trim(), razon, lugar, estampado, carpetaBaseUsuario: carpetaBaseUsuario || undefined });
  }

  const certName = (profile.tipoFirma ?? "archivo") === "token"
    ? (profile.tokenNombre || "Token USB")
    : (profile.cert?.split(/[\\/]/).pop()?.replace(/\.(p12|pfx)$/i, "") || "Certificado");

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <button onClick={onCancel}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 mb-5 transition-colors">
          <ArrowLeft size={15} /> Mis perfiles
        </button>
        <h1 className="text-2xl font-bold text-slate-800">Editar perfil</h1>
        <p className="text-sm text-slate-400 mt-0.5">Modifica los ajustes de este perfil de firma</p>
      </div>

      {/* Certificado — solo lectura */}
      <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
          {(profile.tipoFirma ?? "archivo") === "token"
            ? <HardDrive size={16} className="text-blue-600" />
            : <KeyRound  size={16} className="text-blue-600" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-500 mb-0.5">Certificado (no editable)</p>
          <p className="text-sm font-medium text-slate-700 truncate">{certName}</p>
          {profile.certTitular && <p className="text-xs text-slate-400">{profile.certTitular}</p>}
        </div>
      </div>

      {/* Nombre */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block">Nombre del perfil</label>
        <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus
          onKeyDown={(e) => e.key === "Enter" && save()}
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium placeholder:font-normal" />
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

      {/* Carpeta de destino */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-2">
          <FolderOpen size={13} /> Carpeta de destino
        </label>
        <p className="text-xs text-slate-400">
          Los documentos firmados se guardarán en <span className="font-mono text-slate-600">Penké Firmas/</span> dentro de esta carpeta.
        </p>
        {carpetaBaseUsuario ? (
          <div className="flex items-start gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl">
            <FolderCheck size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-mono text-green-800 break-all">{carpetaBaseUsuario}</p>
              <p className="text-[10px] text-green-600 mt-0.5">→ {carpetaBaseUsuario}/Penké Firmas/</p>
            </div>
            <button onClick={() => setCarpetaBaseUsuario("")}
              className="text-green-400 hover:text-green-600 flex-shrink-0 transition-colors">
              <X size={13} />
            </button>
          </div>
        ) : (
          <button onClick={elegirCarpeta}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 border-dashed border-amber-300 hover:border-blue-400 hover:bg-blue-50/50 bg-amber-50/30 transition-all group">
            <FolderOpen size={18} className="text-amber-400 group-hover:text-blue-500 transition-colors flex-shrink-0" />
            <div className="text-left">
              <p className="text-sm font-medium text-amber-700 group-hover:text-blue-700 transition-colors">Elegir carpeta</p>
              <p className="text-xs text-amber-500">Sin carpeta se usará Documentos/Penké Firmas/</p>
            </div>
          </button>
        )}
      </div>

      {/* Acciones */}
      <div className="flex gap-3">
        <button onClick={onCancel}
          className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">
          Cancelar
        </button>
        <button onClick={save}
          className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md flex items-center justify-center gap-2 transition-colors">
          <Check size={14} /> Guardar cambios
        </button>
      </div>
    </div>
  );
}
// ─── FirmarPage (main export) ─────────────────────────────────────────────────
export function FirmarPage() {
  const { presets, savePreset, deletePreset, updatePreset } = usePresets();
  const location = useLocation();
  const [initialDoc, setInitialDoc] = useState("");
  const consumedState = useRef(false);
  const [view, setView] = useState<ViewMode>("profiles");
  const [activeProfile,  setActiveProfile]  = useState<Preset | null>(null);
  const [editingProfile, setEditingProfile] = useState<Preset | null>(null);

  useEffect(() => {
    if (consumedState.current || !location.state) return;
    consumedState.current = true;
    const { profileId, doc: stateDoc, action } = (location.state ?? {}) as {
      profileId?: string; doc?: string; action?: string;
    };
    if (action === "new") { setView("new-profile"); return; }
    if (!profileId) return;
    const profile = presets.find((p) => p.id === profileId);
    if (!profile) return;
    if (action === "edit") {
      setEditingProfile(profile);
      setView("edit-profile");
    } else {
      setActiveProfile(profile);
      setInitialDoc(stateDoc ?? "");
      setView("sign");
    }
  }, [presets, location.state]);

  if (view === "new-profile") {
    return (
      <NewProfileForm
        onSave={(p) => { savePreset(p); setView("profiles"); toast(`Perfil "${p.nombre}" creado`, "success"); }}
        onCancel={() => setView("profiles")}
      />
    );
  }

  if (view === "edit-profile" && editingProfile) {
    return (
      <EditProfileForm
        profile={editingProfile}
        onSave={(updates) => {
          updatePreset(editingProfile.id, updates);
          setEditingProfile(null);
          setView("profiles");
          toast("Perfil actualizado", "success");
        }}
        onCancel={() => { setEditingProfile(null); setView("profiles"); }}
      />
    );
  }

  if (view === "sign" && activeProfile) {
    return (
      <SignWizard
        profile={activeProfile}
        onBack={() => { setActiveProfile(null); setView("profiles"); }}
        initialDocument={initialDoc}
      />
    );
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
                onDelete={() => {
                  secureStore.remove(claveStoreKey(p.cert));
                  deletePreset(p.id);
                }}
                onEdit={() => { setEditingProfile(p); setView("edit-profile"); }}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
