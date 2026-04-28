import { useStore, type PapeleraTipo } from "@/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { RotateCcw, Trash2, Inbox } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const TIPO_LABEL: Record<PapeleraTipo, string> = {
  cliente: "Cliente",
  proveedor: "Proveedor",
  producto: "Producto",
  transaccion: "Transacción",
  cotizacion: "Cotización",
};

const TIPO_COLOR: Record<PapeleraTipo, string> = {
  cliente: "bg-blue-100 text-blue-800",
  proveedor: "bg-purple-100 text-purple-800",
  producto: "bg-amber-100 text-amber-800",
  transaccion: "bg-green-100 text-green-800",
  cotizacion: "bg-rose-100 text-rose-800",
};

function formatFecha(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("es-CL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function Papelera() {
  const papelera = useStore((s) => s.papelera || []);
  const restorePapelera = useStore((s) => s.restorePapelera);
  const removeFromPapelera = useStore((s) => s.removeFromPapelera);
  const vaciarPapelera = useStore((s) => s.vaciarPapelera);
  const { toast } = useToast();

  const handleRestaurar = (pid: string, resumen: string) => {
    restorePapelera(pid);
    toast({ title: "Restaurado", description: resumen });
  };

  const handleEliminar = (pid: string) => {
    removeFromPapelera(pid);
    toast({ title: "Eliminado definitivamente" });
  };

  const handleVaciar = () => {
    vaciarPapelera();
    toast({ title: "Papelera vaciada" });
  };

  const items = [...papelera].sort((a, b) =>
    (b.fecha || "").localeCompare(a.fecha || "")
  );

  return (
    <div className="container mx-auto p-4 max-w-5xl space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trash2 className="h-6 w-6" />
            Papelera
          </h1>
          <p className="text-sm text-muted-foreground">
            Restaura elementos eliminados o bórralos definitivamente.
          </p>
        </div>
        {items.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-1" /> Vaciar papelera
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Vaciar papelera?</AlertDialogTitle>
                <AlertDialogDescription>
                  Se eliminarán definitivamente los {items.length}{" "}
                  elementos de la papelera. Esta acción no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleVaciar}>
                  Vaciar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 flex flex-col items-center justify-center text-center text-muted-foreground">
            <Inbox className="h-10 w-10 mb-3 opacity-50" />
            <p className="font-medium">La papelera está vacía</p>
            <p className="text-sm">
              Los elementos que elimines aparecerán aquí para que puedas
              restaurarlos.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ScrollArea className="max-h-[70vh]">
              <ul className="divide-y">
                {items.map((it) => (
                  <li
                    key={it.pid}
                    className="p-3 flex items-center gap-3 flex-wrap"
                  >
                    <Badge
                      variant="secondary"
                      className={TIPO_COLOR[it.tipo] || ""}
                    >
                      {TIPO_LABEL[it.tipo] || it.tipo}
                    </Badge>
                    <div className="flex-1 min-w-[180px]">
                      <p className="font-medium break-words">
                        {it.resumen || "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Eliminado el {formatFecha(it.fecha)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRestaurar(it.pid, it.resumen)}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Restaurar
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              ¿Eliminar definitivamente?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              {it.resumen} se eliminará para siempre. Esta
                              acción no se puede deshacer.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleEliminar(it.pid)}
                            >
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
