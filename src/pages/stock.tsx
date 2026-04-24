import { useStore } from "@/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EditableNumber } from "@/components/EditableNumber";
import { formatCLP } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Plus, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function Stock() {
  const { stock, updateStock, registrarCompra, proveedores, ivaPorcentaje } = useStore();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const { toast } = useToast();

  const [compraData, setCompraData] = useState({
    proveedorId: "",
    productoId: "",
    cantidad: 1
  });

  const handleAddStock = () => {
    if (!compraData.proveedorId || !compraData.productoId) return;

    const proveedor = proveedores.find(p => p.id === compraData.proveedorId);
    const producto = proveedor?.productos.find(p => p.id === compraData.productoId);

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
    
    const itemsStock = {
      fruta: producto.categoria === 'Fruta' ? addedUnidades : 0,
      snack: producto.categoria === 'Snack' ? addedUnidades : 0,
      barra: producto.categoria === 'Barra' ? addedUnidades : 0,
    };

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

  const selectedProv = proveedores.find(p => p.id === compraData.proveedorId);

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xl font-bold tracking-tight">Inventario</h2>
        
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8">
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
                    {proveedores.map(p => (
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
                    {selectedProv?.productos.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nombre} - {formatCLP(p.precio)} {p.precioIncluyeIva ? '(c/IVA)' : '(Neto)'}
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
      
      <div className="grid gap-4">
        {(['fruta', 'snack', 'barra'] as const).map((cat) => {
          const qty = stock[cat];
          const isLow = qty < 50; // Arbitrary threshold for demo
          
          return (
            <Card key={cat} className={`shadow-sm ${isLow ? 'border-destructive/30 bg-destructive/5' : ''}`}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium capitalize text-lg flex items-center gap-2">
                    {cat}s
                    {isLow && <AlertTriangle className="h-4 w-4 text-destructive" />}
                  </div>
                  <div className="text-sm text-muted-foreground">Unidades disponibles</div>
                </div>
                <div className="text-3xl font-bold">
                  <EditableNumber 
                    value={qty} 
                    onChange={(v) => updateStock(cat, v)} 
                    className={isLow ? 'text-destructive' : ''}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
