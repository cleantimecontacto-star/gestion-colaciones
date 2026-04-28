import { useRegisterSW } from "virtual:pwa-register/react";

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      console.log("SW registration error", error);
    },
  });

  if (!needRefresh) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 z-[100] w-[92%] max-w-md -translate-x-1/2 rounded-xl border border-emerald-200 bg-white px-4 py-3 shadow-lg"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-emerald-900">
            ✨ Nueva versión disponible
          </span>
          <span className="text-xs text-slate-600">
            Actualizá para cargar la última versión.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => updateServiceWorker(true)}
            className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-emerald-800"
          >
            Actualizar
          </button>
          <button
            type="button"
            onClick={() => setNeedRefresh(false)}
            aria-label="Cerrar"
            className="rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
