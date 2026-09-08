import { useCallback, useEffect, useRef, useState } from "react";
import { check, type Update, type DownloadEvent } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { toast } from "../components/Toast";

export type UpdaterState = "idle" | "checking" | "available" | "downloading" | "error";

export function useAppUpdater() {
  const [state, setState] = useState<UpdaterState>("idle");
  const [update, setUpdate] = useState<Update | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const checkingRef = useRef(false);

  const checkForUpdates = useCallback(async (silent = false) => {
    if (checkingRef.current || !("__TAURI_INTERNALS__" in window)) return null;
    checkingRef.current = true;
    setState("checking");
    setError(null);
    try {
      const found = await check({ timeout: 15_000 });
      setUpdate(found);
      setState(found ? "available" : "idle");
      if (!found && !silent) toast("Penké ya está actualizado.");
      return found;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "No se pudo consultar el servidor de actualizaciones.";
      setError(message);
      setState("error");
      if (!silent) toast("No se pudo buscar actualizaciones.", "error");
      return null;
    } finally {
      checkingRef.current = false;
    }
  }, []);

  const installUpdate = useCallback(async () => {
    if (!update) return;
    setState("downloading");
    setProgress(0);
    setError(null);
    try {
      let total = 0;
      let downloaded = 0;
      const onEvent = (event: DownloadEvent) => {
        if (event.event === "Started") {
          total = event.data.contentLength ?? 0;
          setProgress(0);
        } else if (event.event === "Progress") {
          downloaded += event.data.chunkLength;
          if (total > 0) setProgress(Math.min(100, Math.round((downloaded / total) * 100)));
        } else if (event.event === "Finished") {
          setProgress(100);
        }
      };
      await update.downloadAndInstall(onEvent, { restartAfterInstall: true });
      await relaunch();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "No se pudo instalar la actualización.";
      setError(message);
      setState("error");
      toast("La actualización no pudo instalarse.", "error");
    }
  }, [update]);

  const dismissUpdate = useCallback(() => {
    if (state === "downloading") return;
    setUpdate(null);
    setError(null);
    setState("idle");
  }, [state]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void checkForUpdates(true); }, 5000);
    return () => window.clearTimeout(timer);
  }, [checkForUpdates]);

  return { state, update, progress, error, checkForUpdates, installUpdate, dismissUpdate };
}
