import { useState } from "react";
import { useStore, type Transaccion } from "@/store";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatCLP, parseCLP } from "@/lib/format";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowDownRight, ArrowUpRight, Download, Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Historial() {
  const { historial, updateTransaccion, removeTransaccion } = useStore();
  const [editing, setEditing] = useState<Transaccion | null>(null);
  const [deleting, setDeleting] = useState<Transaccion | null>(null);
  const [montoInput, setMontoInput] = useState("");
  const [detallesInput, setDetallesInput] = useState("");

  const openEdit = (tx: Transaccion) => {
    setEditing(tx);
    setMontoInput(formatCLP(tx.montoTotal));
    setDetallesInput(tx.detalles);
  };

  const saveEdit = () => {
    if (!editing) return;
    const monto = parseCLP(montoInput);
    updateTransaccion(editing.id, {
      montoTotal: monto,
      detalles: detallesInput,
    });
    setEditing(null);
  };

  const confirmDelete = () => {
    if (!deleting) return;
    removeTransaccion(deleting.id);
    setDeleting(null);
  };

  const exportarCSV = () => {
    if (historial.length === 0) return;
    const sep = ";";
    const headers = ["Fecha", "Tipo", "Detalle", "Neto", "IVA", "Total"];
    const rows = historial.map((tx) => [
      format(new Date(tx.fecha), "dd-MM-yyyy HH:mm"),
      tx.tipo,
      `"${tx.detalles.replace(/"/g, '""')}"`,
      Math.round(tx.montoNeto).toString(),
      Math.round(tx.iva).toString(),
      Math.round(tx.montoTotal).toString(),
    ]);
    const csv = [headers.join(sep), ...rows.map((r) => r.join(sep))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `historial-colaciones-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between px-1 gap-2">
        <h2 className="text-xl font-bold tracking-tight">Historial</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {historial.length} {historial.length === 1 ? "registro" : "registros"}
          </span>
          <Button
            size="sm"
            variant="outline"
            className="h-8"
            onClick={exportarCSV}
            disabled={historial.length === 0}
            data-testid="button-export-csv"
          >
            <Download className="h-3.5 w-3.5 mr-1" />
            CSV
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 -mx-2 px-2">
        <div className="space-y-3 pb-6">
          {historial.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-10">
              No hay transacciones registradas aún.
            </div>
          ) : (
            historial.map((tx) => (
              <Card key={tx.id} className="shadow-sm">
                <CardContent className="p-3 flex items-center gap-3">
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                      tx.tipo === "venta"
                        ? "bg-primary/10 text-primary"
                        : "bg-orange-500/10 text-orange-500"
                    }`}
                  >
                    {tx.tipo === "venta" ? (
                      <ArrowUpRight className="h-5 w-5" />
                    ) : (
                      <ArrowDownRight className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {tx.detalles}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(tx.fecha), "d MMM yyyy, HH:mm", {
                        locale: es,
                      })}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div
                      className={`font-bold text-sm ${
                        tx.tipo === "venta" ? "text-primary" : "text-foreground"
                      }`}
                    >
                      {tx.tipo === "venta" ? "+" : "-"}
                      {formatCLP(tx.montoTotal)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      IVA: {formatCLP(tx.iva)}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0 ml-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => openEdit(tx)}
                      aria-label="Editar"
                      data-testid={`button-edit-${tx.id}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => setDeleting(tx)}
                      aria-label="Eliminar"
                      data-testid={`button-delete-${tx.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Editar {editing?.tipo === "venta" ? "venta" : "compra"}
            </DialogTitle>
            <DialogDescription>
              Cambia el monto o el detalle. El IVA se recalcula automáticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="monto">Monto total (con IVA)</Label>
              <Input
                id="monto"
                value={montoInput}
                onChange={(e) => setMontoInput(e.target.value)}
                onBlur={() =>
                  setMontoInput(formatCLP(parseCLP(montoInput)))
                }
                data-testid="input-edit-monto"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="detalles">Detalle</Label>
              <Input
                id="detalles"
                value={detallesInput}
                onChange={(e) => setDetallesInput(e.target.value)}
                data-testid="input-edit-detalles"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button onClick={saveEdit} data-testid="button-save-edit">
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta transacción?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.tipo === "venta"
                ? "Se devolverán las unidades vendidas al stock."
                : "Se descontarán las unidades compradas del stock."}{" "}
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
