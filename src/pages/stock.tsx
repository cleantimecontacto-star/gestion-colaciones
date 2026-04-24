import { useStore, diasPorEntregaCliente } from "@/store";
import { Card, CardContent } from "@/components/ui/card";
import { EditableNumber } from "@/components/EditableNumber";
import { formatCLP } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Plus, AlertTriangle, Package } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Stock() {
  const { stock, categorias, updateStock, registrarCompra, proveedores, ivaPorcentaje, clientes } = useStore();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const { toast } = useToast();

  const [compraData, setCompraData] = useState({
    proveedorId: "",
    productoId: "",
    cantidad: 1,
  });

  const handleAddStock = () => {
    if (!compraData.proveedorId || !compraData.productoId) return;

    const proveedor = proveedores.find((p) => p.id === compraData.proveedorId);
    const producto = proveedor?.productos.find((p) => p.id === compraData.productoId);
    if (!proveedor || !producto) return;

    const precioBase = producto.precio * compraData.cantidad;
    let neto = 0;
    let iva = 0;
    let total = 0;

    if (producto.precioIncluyeIva) {
      total = precioBase;
      neto = total / (1 + ivaPorcentaje / 100);
      iva = total - neto;
    } else {
      neto = precioBase;
      iva = neto * (ivaPorcentaje / 100);
      total = neto + iva;
    }

    const addedUnidades = producto.unidades * compraData.cantidad;
    const itemsStock: Record<string, number> = { [producto.categoria]: addedUnidades };

    registrarCompra(
      neto,
      iva,
      total,
      `Compra: ${compraData.cantidad}x ${producto.nombre} (${proveedor.nombre})`,
      itemsStock
    );

    toast({
      title: "Stock añadido",
      description: `Se agregaron ${addedUnidades} unidades de ${producto.categoria}.`,
    });

    setIsAddOpen(false);
    setCompraData({ proveedorId: "", productoId: "", cantidad: 1 });
  };

  const selectedProv = proveedores.find((p) => p.id === compraData.proveedorId);

  // Demanda por entrega para detectar stock bajo
  const demandaEntrega = (cat: string) =>
    clientes.reduce((sum, c) => {
      const dias = diasPorEntregaCliente(c);
      return sum + (c.config[cat] || 0) * dias;
    }, 0);

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xl font-bold tracking-tight">Inventario</h2>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8" data-testid="button-ingresar-stock">
              <Plus className="h-4 w-4 mr-1" />
              Ingresar
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] w-[95vw] rounded-xl">
            <DialogHeader>
              <DialogTitle>Ingresar Compra</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Proveedor</Label>
                <Select
                  value={compraData.proveedorId}
                  onValueChange={(v) => setCompraData({ ...compraData, proveedorId: v, productoId: "" })}
                >
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    {proveedores.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Producto</Label>
                <Select
                  value={compraData.productoId}
                  onValueChange={(v) => setCompraData({ ...compraData, productoId: v })}
                  disabled={!compraData.proveedorId}
                >
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    {selectedProv?.productos.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nombre} - {formatCLP(p.precio)} {p.precioIncluyeIva ? "(c/IVA)" : "(Neto)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Cantidad (Cajas/Packs)</Label>
                <Input
                  type="number"
                  min="1"
                  value={compraData.cantidad}
                  onChange={(e) => setCompraData({ ...compraData, cantidad: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>
            <Button onClick={handleAddStock} className="w-full">Registrar Compra</Button>
          </DialogContent>
        </Dialog>
      </div>

      <ScrollArea className="flex-1 min-w-0 max-w-full">
        <div className="grid gap-3 pb-6">
          {categorias.length === 0 && (
            <Card className="shadow-sm">
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                Sin categorías. Agrega productos a un proveedor para crearlas.
              </CardContent>
            </Card>
          )}
          {categorias.map((cat) => {
            const qty = stock[cat] ?? 0;
            const demanda = demandaEntrega(cat);
            const isVacio = demanda > 0 && qty <= 0;
            const isCritico = demanda > 0 && qty < demanda && qty > 0;
            const isBajo = !isVacio && !isCritico && demanda > 0 && qty < demanda * 2;
            const styleClass = isVacio || isCritico
              ? "border-destructive/40 bg-destructive/5"
              : isBajo
              ? "border-amber-300 bg-amber-50/40"
              : "";

            return (
              <Card key={cat} className={`shadow-sm ${styleClass}`}>
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-lg flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate">{cat}</span>
                      {(isVacio || isCritico) && (
                        <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {demanda > 0
                        ? `Próx. entrega requiere ${Math.ceil(demanda)} un.`
                        : "Sin demanda configurada"}
                    </div>
                  </div>
                  <div className="text-3xl font-bold shrink-0">
                    <EditableNumber
                      value={qty}
                      onChange={(v) => updateStock(cat, v)}
                      className={isVacio || isCritico ? "text-destructive" : ""}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
