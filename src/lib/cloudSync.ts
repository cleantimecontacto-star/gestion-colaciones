/**
 * Sincronización con Convex (last-write-wins).
 *
 * Estrategia:
 * - La app sigue usando zustand+persist (localStorage) como hasta ahora.
 * - Al arrancar: si hay nube y la nube es más nueva, baja datos y refresca el store.
 * - En cada cambio del store: sube datos a la nube (debounced 600ms).
 * - Si VITE_CONVEX_URL no está definida, no hace nada (modo offline puro).
 */

import { ConvexHttpClient } from "convex/browser";
import { useStore, type AppState } from "../store";
import { useSyncStatus } from "./syncStatus";

const CLOUD_TS_KEY = "gc_cloud_ts";
const PERSIST_KEY = "gestion-colaciones-storage";

// URL de Convex.
const CONVEX_URL =
  (import.meta.env.VITE_CONVEX_URL as string | undefined) ??
  "https://polite-ocelot-652.eu-west-1.convex.cloud";

type SyncableState = Pick<
  AppState,
  | "ivaPorcentaje"
  | "categorias"
  | "proveedores"
  | "clientes"
  | "stock"
  | "historial"
  | "cotizaciones"
  | "empresa"
>;

const SYNC_KEYS: (keyof SyncableState)[] = [
  "ivaPorcentaje",
  "categorias",
  "proveedores",
  "clientes",
  "stock",
  "historial",
  "cotizaciones",
  "empresa",
];

function pickSyncable(s: AppState): SyncableState {
  return {
    ivaPorcentaje: s.ivaPorcentaje,
    categorias: s.categorias,
    proveedores: s.proveedores,
    clientes: s.clientes,
    stock: s.stock,
    historial: s.historial,
    cotizaciones: s.cotizaciones,
    empresa: s.empresa,
  };
}

function localTs(): number {
  return parseInt(localStorage.getItem(CLOUD_TS_KEY) || "0", 10);
}

function setLocalTs(ts: number) {
  localStorage.setItem(CLOUD_TS_KEY, String(ts));
}

/**
 * Inicia la sincronización con la nube.
 * Si VITE_CONVEX_URL no está configurada, no hace nada.
 */
export function setupCloudSync(): { enabled: boolean } {
  const status = useSyncStatus.getState();

  if (!CONVEX_URL) {
    if (typeof window !== "undefined") {
      console.info("[cloudSync] VITE_CONVEX_URL no definida — sincronización deshabilitada");
    }
    status.setStatus("disabled");
    return { enabled: false };
  }

  const client = new ConvexHttpClient(CONVEX_URL);

  let suppressUpload = true;
  let initialPullDone = false;
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  let lastUploaded = "";
  let userChangedDuringSuppression = false;

  const setSyncing = () => useSyncStatus.getState().setStatus("syncing");
  const setIdle = () => useSyncStatus.getState().markSynced();
  const setError = (e: unknown) =>
    useSyncStatus.getState().setStatus("error", e instanceof Error ? e.message : String(e));

  const applyCloudData = (data: SyncableState) => {
    suppressUpload = true;
    try {
      useStore.setState((current) => ({
        ...current,
        ...SYNC_KEYS.reduce<Partial<AppState>>((acc, key) => {
          if (data[key] !== undefined) {
            (acc as any)[key] = data[key];
          }
          return acc;
        }, {}),
      }));
    } finally {
      // Usar un timeout pequeño para asegurar que el cambio de estado se procese antes de reactivar uploads
      setTimeout(() => { suppressUpload = false; }, 50);
    }
  };

  const initialPull = async () => {
    // Evitar múltiples pulls simultáneos si ya estamos sincronizando
    if (useSyncStatus.getState().status === "syncing" && initialPullDone) return;
    
    setSyncing();

    try {
      const resp = (await client.query("colaciones:getState" as any, {})) as {
        data: SyncableState | null;
        ts: number;
      };
      const cloudTs = Number(resp?.ts || 0);
      const myTs = localTs();

      if (userChangedDuringSuppression) {
        console.info("[cloudSync] Cambios locales detectados durante el pull — subiendo datos locales");
        suppressUpload = false;
        initialPullDone = true;
        userChangedDuringSuppression = false;
        await pushNow();
        return;
      }

      if (cloudTs > myTs && resp.data) {
        applyCloudData(resp.data);
        setLocalTs(cloudTs);
        lastUploaded = JSON.stringify(resp.data);
        setIdle();
        console.info("[cloudSync] Datos descargados de la nube");
      } else if (myTs > cloudTs || (myTs > 0 && cloudTs === 0)) {
        // Tenemos datos más nuevos o la nube está vacía pero nosotros no
        suppressUpload = false;
        initialPullDone = true;
        await pushNow();
        return;
      } else {
        setIdle();
      }
    } catch (e) {
      console.warn("[cloudSync] Error al descargar:", e);
      setError(e);
    } finally {
      suppressUpload = false;
      initialPullDone = true;
    }
  };

  const pushNow = async () => {
    if (suppressUpload) return;
    
    try {
      const data = pickSyncable(useStore.getState());
      const serialized = JSON.stringify(data);
      
      // No subir si no hay cambios reales
      if (serialized === lastUploaded) {
        setIdle();
        return;
      }
      
      setSyncing();
      const ts = Date.now();
      const result = (await client.mutation("colaciones:setState" as any, {
        data,
        ts,
      })) as { ok: boolean; ts: number };
      
      if (result?.ok) {
        setLocalTs(result.ts);
        lastUploaded = serialized;
        setIdle();
      } else if (result?.ts) {
        // Conflicto: la nube tiene datos más nuevos
        const fresh = (await client.query("colaciones:getState" as any, {})) as {
          data: SyncableState | null;
          ts: number;
        };
        if (fresh?.data) {
          applyCloudData(fresh.data);
          setLocalTs(fresh.ts);
          lastUploaded = JSON.stringify(fresh.data);
        }
        setIdle();
      } else {
        setIdle();
      }
    } catch (e) {
      console.warn("[cloudSync] Error al subir:", e);
      setError(e);
    }
  };

  const scheduleUpload = () => {
    if (suppressUpload || !initialPullDone) {
      userChangedDuringSuppression = true;
      return;
    }
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      void pushNow();
    }, 1000); // Aumentado a 1s para reducir carga
  };

  useStore.subscribe(() => {
    scheduleUpload();
  });

  const startInitial = () => {
    void initialPull();
  };
  
  if (
    typeof useStore.persist === "object" &&
    useStore.persist &&
    typeof useStore.persist.hasHydrated === "function"
  ) {
    if (useStore.persist.hasHydrated()) {
      startInitial();
    } else {
      const unsub = useStore.persist.onFinishHydration(() => {
        startInitial();
        unsub?.();
      });
    }
  } else {
    startInitial();
  }

  if (typeof window !== "undefined") {
    // Debounce de eventos de ventana para evitar pulls masivos
    let focusTimer: ReturnType<typeof setTimeout> | null = null;
    
    window.addEventListener("focus", () => {
      if (focusTimer) clearTimeout(focusTimer);
      focusTimer = setTimeout(() => {
        userChangedDuringSuppression = false;
        void initialPull();
      }, 500);
    });
    
    window.addEventListener("online", () => {
      userChangedDuringSuppression = false;
      void initialPull();
    });
    
    window.addEventListener("storage", (e) => {
      if (e.key === PERSIST_KEY) {
        scheduleUpload();
      }
    });
  }

  return { enabled: true };
}
