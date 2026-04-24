import { useStore } from "@/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EditableNumber } from "@/components/EditableNumber";
import { formatCLP } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

export default function Compras() {
  const { proveedores, ivaPorcentaje, updateProductoProveedor } = useStore();

  const categorias = ["Fruta", "Snack", "Barra"] as const;

  return (
    <div className="flex flex-col h-full gap-4">
      <h2 className="text-xl font-bold tracking-tight px-1">Optimizador de Compras</h2>

      <ScrollArea className="flex-1 -mx-2 px-2">
        <div className="space-y-6 pb-6">
          {categorias.map(cat => {
            const allProducts = proveedores.flatMap(p =>
              p.productos.filter(prod => prod.categoria === cat).map(prod => {
                const neto = prod.precioIncluyeIva
                  ? prod.precio / (1 + ivaPorcentaje / 100)
                  : prod.precio;
                const bruto = prod.precioIncluyeIva
                  ? prod.precio
                  : prod.precio * (1 + ivaPorcentaje / 100);
                const costoUnitario = bruto / prod.unidades;
                return {
                  ...prod,
                  proveedorId: p.id,
                  proveedorNombre: p.nombre,
                  neto,
                  bruto,
                  costoUnitario,
                };
              })
            ).sort((a, b) => a.costoUnitario - b.costoUnitario);

            if (allProducts.length === 0) return null;

            return (
              <Card key={cat} className="shadow-sm">
                <CardHeader className="p-3 bg-muted/30 border-b border-border/50">
                  <CardTitle className="text-base flex items-center gap-2">
                    {cat}s
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border/50">
                    {allProducts.map((prod, idx) => (
                      <div key={prod.id} className={`p-3 flex items-start justify-between text-sm ${idx === 0 ? 'bg-primary/5' : ''}`}>
                        <div className="flex-1">
                          <div className="font-medium flex items-center gap-2">
                            {prod.nombre}
                            {idx === 0 && <Badge variant="default" className="text-[10px] h-4 px-1 py-0">Mejor opción</Badge>}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {prod.proveedorNombre} • Rinde {prod.unidades} un.
                          </div>
                        </div>
                        <div className="text-right ml-3">
                          <div className="font-bold text-primary">
                            {formatCLP(prod.costoUnitario)} <span className="text-[10px] font-normal text-muted-foreground">/un</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                            <div className="flex items-center justify-end gap-1">
                              <span>Neto caja:</span>
                              <EditableNumber
                                value={Math.round(prod.neto)}
                                onChange={v => {
                                  const nuevoPrecio = prod.precioIncluyeIva
                                    ? Math.round(v * (1 + ivaPorcentaje / 100))
                                    : Math.round(v);
                                  updateProductoProveedor(prod.proveedorId, prod.id, { precio: nuevoPrecio });
                                }}
                                isCurrency
                              />
                            </div>
                            <div className="flex items-center justify-end gap-1">
                              <span>C/IVA caja:</span>
                              <EditableNumber
                                value={Math.round(prod.bruto)}
                                onChange={v => {
                                  const nuevoPrecio = prod.precioIncluyeIva
                                    ? Math.round(v)
                                    : Math.round(v / (1 + ivaPorcentaje / 100));
                                  updateProductoProveedor(prod.proveedorId, prod.id, { precio: nuevoPrecio });
                                }}
                                isCurrency
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
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
