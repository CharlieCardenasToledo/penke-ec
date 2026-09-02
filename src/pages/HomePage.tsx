import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FileText, FolderOpen, Clock, ArrowRight, Plus } from "lucide-react";
import { DropZone }             from "../components/DropZone";
import { ProfileCardCompact }   from "../components/ProfileCardCompact";
import { PdfViewerModal }       from "../components/PdfViewerModal";
import { StatusBadge }          from "../components/ui";
import { openWithDefaultApp, revealInFolder, errorMessage } from "../lib/fileActions";
import { toast }                from "../components/Toast";
import { usePresets, type Preset } from "../hooks/usePresets";
import { useHistory }           from "../hooks/useHistory";
import { certStatus }           from "../lib/certUtils";

export function HomePage() {
  const navigate = useNavigate();
  const { presets, deletePreset, savePreset } = usePresets();
  const { entries } = useHistory();

  const lastUsedId = localStorage.getItem("firmaec.lastProfile");
  const defaultProfile =
    presets.find((p) => p.id === lastUsedId) ?? presets[0] ?? null;

  const [selectedProfile, setSelectedProfile] = useState<Preset | null>(defaultProfile);
  const [quickDoc, setQuickDoc] = useState("");
  const [viewingRuta, setViewingRuta] = useState<string | null>(null);

  function selectProfile(p: Preset) {
    setSelectedProfile(p);
    localStorage.setItem("firmaec.lastProfile", p.id);
  }

  function startSign() {
    if (!selectedProfile) return;
    localStorage.setItem("firmaec.lastProfile", selectedProfile.id);
    navigate("/firmar", { state: { profileId: selectedProfile.id, doc: quickDoc } });
  }

  const outputFolder = selectedProfile?.carpetaBaseUsuario
    ? `${selectedProfile.carpetaBaseUsuario}/Penké Firmas`
    : "Documentos/Penké Firmas";

  const status = selectedProfile ? certStatus(selectedProfile.certValidoHasta) : null;

  return (
    <div className="max-w-4xl mx-auto space-y-7">
      {viewingRuta && (
        <PdfViewerModal ruta={viewingRuta} onClose={() => setViewingRuta(null)} />
      )}

      {/* Cabecera */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Inicio</h1>
          <p className="text-sm text-slate-600 mt-1">Firma, comprueba y valida tus documentos digitales.</p>
        </div>
        <button
          onClick={() => navigate("/firmar")}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition-all"
        >
          Todos los perfiles
        </button>
      </div>

      {/* Firma rápida */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Firma rápida</h2>
          <p className="text-sm text-slate-600 mt-1">Elige un perfil y selecciona el PDF que quieres firmar.</p>
        </div>

        {/* Selector de perfil */}
        {presets.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-600">Perfil de firma</p>
            <div className="flex flex-wrap gap-2">
              {presets.map((p) => {
                const s = certStatus(p.certValidoHasta);
                return (
                  <button
                    key={p.id}
                    onClick={() => selectProfile(p)}
                    className={[
                      "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm font-medium transition-all",
                      selectedProfile?.id === p.id
                        ? "border-blue-400 bg-blue-50 text-blue-700"
                        : "border-slate-200 text-slate-600 hover:border-blue-300",
                    ].join(" ")}
                  >
                    <span>{p.nombre}</span>
                    <StatusBadge variant={s.variant} label={s.label} />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Drop zone */}
        <DropZone
          label="Arrastra un PDF o haz clic para seleccionarlo"
          accept={["pdf"]}
          value={quickDoc}
          onChange={setQuickDoc}
        />

        {/* Ruta de salida */}
        {selectedProfile && (
          <div className="flex items-center gap-1.5">
            <FolderOpen size={12} className="text-slate-400 flex-shrink-0" />
            <p className="text-xs text-slate-600 font-mono truncate">{outputFolder}</p>
          </div>
        )}

        {/* Estado del certificado */}
        {status && (status.dot === "bg-yellow-400" || status.dot === "bg-red-500") && (
          <div className={[
            "flex items-center gap-2 px-3 py-2 rounded-lg text-xs",
            status.dot === "bg-red-500" ? "bg-red-50 text-red-700 border border-red-200" : "bg-yellow-50 text-yellow-800 border border-yellow-200",
          ].join(" ")}>
            <div className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
            {status.text}
          </div>
        )}

        <button
          onClick={startSign}
          disabled={!selectedProfile}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all shadow-md"
        >
          {quickDoc ? "Continuar a firmar" : "Seleccionar documento y firmar"} <ArrowRight size={14} />
        </button>
      </div>

      {/* Perfiles compactos */}
      {presets.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Mis perfiles</p>
            <button
              onClick={() => navigate("/firmar", { state: { action: "new" } })}
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 transition-colors"
            >
              <Plus size={11} /> Nuevo perfil
            </button>
          </div>
          <div className="space-y-2">
            {presets.map((p) => (
              <ProfileCardCompact
                key={p.id}
                profile={p}
                onSelect={() => { selectProfile(p); navigate("/firmar", { state: { profileId: p.id } }); }}
                onEdit={() => navigate("/firmar", { state: { action: "edit", profileId: p.id } })}
                onDelete={() => deletePreset(p.id)}
                onDuplicate={() => savePreset({ ...p, nombre: `${p.nombre} (copia)`, id: undefined } as any)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Actividad reciente */}
      {entries.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
            <Clock size={11} /> Actividad reciente
          </h2>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
            {entries.slice(0, 5).map((e, i) => (
              <motion.div key={e.ruta} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-3 px-4 py-3">
                <FileText size={14} className="text-slate-300 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{e.nombre}</p>
                  <p className="text-xs text-slate-400">{e.fecha} · {e.firmante}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setViewingRuta(e.ruta)}
                    className="px-2 py-1 text-xs text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                  >
                    Ver
                  </button>
                  <button
                    onClick={async () => {
                      const r = await openWithDefaultApp(e.ruta);
                      if (!r.ok) toast(errorMessage(r.errorType!), "error");
                    }}
                    className="px-2 py-1 text-xs text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                  >
                    Abrir
                  </button>
                  <button
                    onClick={async () => {
                      const r = await revealInFolder(e.ruta);
                      if (!r.ok) toast("No se pudo abrir la carpeta.", "error");
                    }}
                    aria-label={`Mostrar carpeta de ${e.nombre}`}
                    title="Mostrar carpeta"
                    className="px-2 py-1 text-xs text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all hidden sm:block"
                  >
                    <FolderOpen size={12} />
                  </button>
                  <button
                    onClick={() => navigator.clipboard.writeText(e.ruta)}
                    aria-label={`Copiar ruta de ${e.nombre}`}
                    title="Copiar ruta"
                    className="p-1.5 text-xs text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all hidden sm:flex"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
