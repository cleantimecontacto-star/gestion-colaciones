import { Cloud, CloudOff, Loader2, AlertCircle } from "lucide-react";
import { useSyncStatus } from "@/lib/syncStatus";

interface Props {
  /** Si true, usa tamaños/textos compactos para el header móvil */
  compact?: boolean;
}

function formatHora(ts: number | null): string {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SyncIndicator({ compact = false }: Props) {
  const status = useSyncStatus((s) => s.status);
  const lastSyncAt = useSyncStatus((s) => s.lastSyncAt);
  const lastError = useSyncStatus((s) => s.lastError);

  let icon, label, color, title;

  switch (status) {
    case "syncing":
      icon = <Loader2 className={`${compact ? "h-3.5 w-3.5" : "h-3.5 w-3.5"} animate-spin`} />;
      label = "Sincronizando…";
      color = "text-blue-600 bg-blue-50 border-blue-200";
      title = "Subiendo cambios a la nube";
      break;
    case "idle":
      icon = <Cloud className={`${compact ? "h-3.5 w-3.5" : "h-3.5 w-3.5"}`} />;
      label = compact ? "Sync" : "Sincronizado";
      color = "text-green-700 bg-green-50 border-green-200";
      title = lastSyncAt
        ? `Sincronizado a las ${formatHora(lastSyncAt)} — datos respaldados en la nube`
        : "Datos respaldados en la nube";
      break;
    case "error":
      icon = <AlertCircle className={`${compact ? "h-3.5 w-3.5" : "h-3.5 w-3.5"}`} />;
      label = compact ? "Error" : "Sin sincronizar";
      color = "text-red-700 bg-red-50 border-red-200";
      title = lastError
        ? `Error al sincronizar: ${lastError}. Los cambios se guardan localmente y se reintentaran.`
        : "Error al sincronizar. Los cambios se guardan localmente.";
      break;
    case "disabled":
    default:
      icon = <CloudOff className={`${compact ? "h-3.5 w-3.5" : "h-3.5 w-3.5"}`} />;
      label = compact ? "Local" : "Solo local";
      color = "text-gray-600 bg-gray-50 border-gray-200";
      title = "La nube no esta configurada — los datos se guardan solo en este dispositivo";
      break;
  }

  return (
    <div
      title={title}
      className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium leading-none ${color}`}
    >
      {icon}
      {!compact && <span>{label}</span>}
    </div>
  );
}
