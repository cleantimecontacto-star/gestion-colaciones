/**
 * Sincronización con Convex (last-write-wins).
 *
 * Estrategia:
 *  - La app sigue usando zustand+persist (localStorage) como hasta ahora.
 *  - Al arrancar: si hay nube y la nube es más nueva, baja datos y refresca el store.
 *  - En cada cambio del store: sube datos a la nube (debounced 600ms).
 *  - Si VITE_CONVEX_URL no está definida, no hace nada (modo offline puro).
 */

import { ConvexHttpClient } from "convex/browser";
import { useStore, type AppState } from "../store";
import { useSyncStatus } from "./syncStatus";

const CLOUD_TS_KEY = "gc_cloud_ts";
const PERSIST_KEY = "gestion-colaciones-storage";

const CONVEX_URL = (import.meta.env.VITE_CONVEX_URL as string | undefined) ?? "";

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

  // suppressUpload bloquea uploads durante la bajada inicial e
  // inmediatamente después de aplicar datos de la nube al store local.
  // Esto evita que datos viejos del localStorage sobrescriban datos
  // más nuevos de la nube por una condición de carrera al arrancar.
  let suppressUpload = true;
  let initialPullDone = false;
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  let lastUploaded = "";

  const setSyncing = () => useSyncStatus.getState().setStatus("syncing");
  const setIdle = () => useSyncStatus.getState().markSynced();
  const setError = (e: unknown) =>
    useSyncStatus.getState().setStatus("error", e instanceof Error ? e.message : String(e));

  // Reemplaza el store con datos de la nube SIN disparar upload
  const applyCloudData = (data: SyncableState) => {
    suppressUpload = true;
    try {
      useStore.setState((current) => ({
        ...current,
        ...SYNC_KEYS.reduce<Partial<SyncableState>>((acc, key) => {
          if (data[key] !== undefined) {
            (acc as any)[key] = data[key];
          }
          return acc;
        }, {}),
      }));
    } finally {
      setTimeout(() => { suppressUpload = false; }, 0);
    }
  };

  // Bajada inicial
  const initialPull = async () => {
    setSyncing();
    try {
      const resp = (await client.query("state:getState" as any, {})) as {
        data: SyncableState | null;
        ts: number;
      };
      const cloudTs = Number(resp?.ts || 0);
      const myTs = localTs();
      if (cloudTs > myTs && resp.data) {
        applyCloudData(resp.data);
        setLocalTs(cloudTs);
        lastUploaded = JSON.stringify(resp.data);
        setIdle();
        console.info("[cloudSync] Datos descargados de la nube");
      } else if (myTs > 0 || cloudTs === 0) {
        // Subir lo nuestro como fuente o como semilla
        // (sólo después de habilitar uploads)
        suppressUpload = false;
        initialPullDone = true;
        await pushNow();
        return;
      }
    } catch (e) {
      console.warn("[cloudSync] Error al descargar:", e);
      setError(e);
    } finally {
      // Habilitar uploads de cambios del usuario sólo DESPUÉS
      // de que la bajada inicial haya terminado.
      suppressUpload = false;
      initialPullDone = true;
    }
  };

  const pushNow = async () => {
    try {
      const data = pickSyncable(useStore.getState());
      const serialized = JSON.stringify(data);
      if (serialized === lastUploaded) {
        setIdle();
        return;
      }
      setSyncing();
      const ts = Date.now();
      const result = (await client.mutation("state:setState" as any, {
        data,
        ts,
      })) as { ok: boolean; ts: number };
      if (result?.ok) {
        setLocalTs(result.ts);
        lastUploaded = serialized;
        setIdle();
      } else if (result?.ts) {
        const fresh = (await client.query("state:getState" as any, {})) as {
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
    if (suppressUpload || !initialPullDone) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      void pushNow();
    }, 600);
  };

  // Suscribirse a cambios del store
  useStore.subscribe(() => {
    scheduleUpload();
  });

  // Esperar hidratación de zustand+persist antes del initial pull
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

  // Resincroniza al volver a la pestaña / online
  if (typeof window !== "undefined") {
    window.addEventListener("focus", () => {
      void initialPull();
    });
    window.addEventListener("online", () => {
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
