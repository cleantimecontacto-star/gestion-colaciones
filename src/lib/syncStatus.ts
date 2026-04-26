import { create } from "zustand";

export type SyncStatus =
  | "disabled"   // no hay VITE_CONVEX_URL — solo local
  | "idle"       // sincronizado y al día
  | "syncing"    // subiendo o bajando ahora mismo
  | "error";     // último intento fallo

interface SyncState {
  status: SyncStatus;
  lastSyncAt: number | null; // timestamp del último sync exitoso
  lastError: string | null;
  setStatus: (s: SyncStatus, err?: string | null) => void;
  markSynced: () => void;
}

export const useSyncStatus = create<SyncState>((set) => ({
  status: "disabled",
  lastSyncAt: null,
  lastError: null,
  setStatus: (status, err = null) => set({ status, lastError: err }),
  markSynced: () =>
    set({ status: "idle", lastSyncAt: Date.now(), lastError: null }),
}));
