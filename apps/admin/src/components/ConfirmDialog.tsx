import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

interface ConfirmOptions {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

interface State extends ConfirmOptions {
  resolve: (v: boolean) => void;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State | null>(null);
  const stateRef = useRef<State | null>(null);
  stateRef.current = state;

  const confirm = useCallback<ConfirmFn>((opts) => {
    return new Promise<boolean>((resolve) => {
      setState({ ...opts, resolve });
    });
  }, []);

  const close = useCallback((result: boolean) => {
    setState((s) => {
      s?.resolve(result);
      return null;
    });
  }, []);

  useEffect(() => {
    if (!state) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, close]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => close(false)}
        >
          <div className="card p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-2">{state.title}</h3>
            {state.message && <div className="text-sm text-gray-600 mb-4">{state.message}</div>}
            <div className="flex gap-2 justify-end mt-2">
              <button type="button" className="btn-secondary" onClick={() => close(false)}>
                Cancelar
              </button>
              <button
                type="button"
                className={state.danger ? "btn-danger" : "btn-primary"}
                onClick={() => close(true)}
                autoFocus
              >
                {state.confirmLabel ?? "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm debe usarse dentro de <ConfirmProvider>");
  return ctx;
}
