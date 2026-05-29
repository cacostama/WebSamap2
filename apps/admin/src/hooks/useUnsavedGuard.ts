import { useEffect } from "react";
import { useBlocker } from "react-router-dom";

const MESSAGE = "Tenés cambios sin guardar. ¿Salir igual?";

/**
 * Bloquea la navegación in-app y avisa al cerrar/recargar la pestaña
 * mientras `when` sea true (típicamente: el formulario está sucio).
 */
export function useUnsavedGuard(when: boolean) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      when && currentLocation.pathname !== nextLocation.pathname,
  );

  // Navegación interna (react-router data router)
  useEffect(() => {
    if (blocker.state !== "blocked") return;
    if (typeof window === "undefined") {
      blocker.proceed();
      return;
    }
    if (window.confirm(MESSAGE)) blocker.proceed();
    else blocker.reset();
  }, [blocker]);

  // Cierre/recarga de pestaña
  useEffect(() => {
    if (!when || typeof window === "undefined") return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [when]);
}
