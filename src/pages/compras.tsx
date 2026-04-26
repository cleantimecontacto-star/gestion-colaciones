import { useState } from "react";
import { useStore } from "@/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EditableNumber } from "@/components/EditableNumber";
import { formatCLP } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Sparkles, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Compras() {
  const { proveedores, ivaPorcentaje, categorias, clientes, stock, registrarCompra } = useStore();
  const { toast } = useToast();
  const [semanasCubrir, setSemanasCubrir] = useState(2);
  const [seleccionPorCat, setSeleccionPorCat] = useState<Record<string, string>>({});

  // Productos enriquecidos con costos (excluye agotados)
  const productosPorCat = (cat: string) =>
    proveedores
      .flatMap((p) =>
        p.productos
          .filter((prod) => prod.categoria === cat && !prod.agotado)
          .map((prod) => {
            const precioNeto = prod.precioIncluyeIva
              ? prod.precio / (1 + ivaPorcentaje / 100)
              : prod.precio;
            const precioTotal = prod.precioIncluyeIva
              ? prod.precio
              : prod.precio * (1 + ivaPorcentaje / 100);
            const costoUnitarioNeto = prod.unidades > 0 ? precioNeto / prod.unidades : Infinity;
            const costoUnitario = prod.unidades > 0 ? precioTotal / prod.unidades : Infinity;
            return {
              ...prod,
              proveedorId: p.id,
              proveedorNombre: p.nombre,
              precioNeto,
              precioTotal,
              costoUnitarioNeto,
              costoUnitario,
            };
          })
      )
      .sort((a, b) => a.costoUnitario - b.costoUnitario);

  // Demanda semanal por categoría
  const demandaSemanal = (cat: string) =>
    clientes.reduce((sum, c) => sum + (c.config[cat] || 0) * Math.max(0, c.diasEntrega), 0);

  // Sugerencias de compra: para cada categoría, calcular cuántas cajas comprar
  const sugerencias = categorias
    .map((cat) => {
      const demanda = demandaSemanal(cat);
      const requerido = demanda * semanasCubrir;
      const stockActual = stock[cat] ?? 0;
      const faltante = Math.max(0, requerido - stockActual);
      const productos = productosPorCat(cat);
      const mejor = productos[0];
      const elegidoId = seleccionPorCat[cat];
      const elegido =
        (elegidoId && productos.find((p) => p.id === elegidoId)) || mejor;

      if (demanda <= 0 || faltante <= 0 || !elegido || !isFinite(elegido.costoUnitario)) {
        return {
          cat,
          demanda,
          requerido,
          stockActual,
          faltante,
          productos,
          mejor: mejor || null,
          elegido: elegido || null,
          cajas: 0,
          unidadesCubiertas: 0,
          costoTotal: 0,
          costoNeto: 0,
        };
      }

      const cajas = Math.ceil(faltante / elegido.unidades);
      const unidadesCubiertas = cajas * elegido.unidades;
      const costoTotal = cajas * elegido.precioTotal;
      const costoNeto = cajas * elegido.precioNeto;

      return {
        cat,
        demanda,
        requerido,
        stockActual,
        faltante,
        productos,
        mejor,
        elegido,
        cajas,
        unidadesCubiertas,
        costoTotal,
        costoNeto,
      };
    })
    .filter((s) => s.demanda > 0);

  const totalSugerido = sugerencias.reduce((acc, s) => acc + s.costoTotal, 0);
  const totalSugeridoNeto = sugerencias.reduce((acc, s) => acc + s.costoNeto, 0);

  const registrarTodasSugerencias = () => {
    sugerencias.forEach((s) => {
      if (!s.elegido || s.cajas <= 0) return;
      const neto = s.costoNeto;
      const iva = s.costoTotal - s.costoNeto;
      const total = s.costoTotal;
      registrarCompra(
        neto,
        iva,
        total,
        `Compra: ${s.cajas}x ${s.elegido.nombre} (${s.elegido.proveedorNombre})`,
        { [s.cat]: s.unidadesCubiertas }
      );
    });
    toast({
      title: "Compras registradas",
      description: `Se registraron ${sugerencias.filter((s) => s.cajas > 0).length} compras.`,
    });
  };

  const registrarUnaSugerencia = (s: typeof sugerencias[number]) => {
    if (!s.elegido || s.cajas <= 0) return;
    const neto = s.costoNeto;
    const iva = s.costoTotal - s.costoNeto;
    registrarCompra(
      neto,
      iva,
      s.costoTotal,
      `Compra: ${s.cajas}x ${s.elegido.nombre} (${s.elegido.proveedorNombre})`,
      { [s.cat]: s.unidadesCubiertas }
    );
    toast({
      title: "Compra registrada",
      description: `${s.cajas} cajas de ${s.elegido.nombre} agregadas al stock.`,
    });
  };

  const sugerenciasConAccion = sugerencias.filter((s) => s.cajas > 0);

  return (
    <div className="flex flex-col h-full gap-4 min-w-0 max-w-full">
      <h2 className="text-xl font-bold tracking-tight px-1">Optimizador de Compras</h2>

      <ScrollArea className="flex-1 min-w-0 max-w-full">
        <div className="space-y-6 pb-6 min-w-0 max-w-full">
          {/* Sugerencia de compra */}
          <Card className="shadow-sm border-primary/30 bg-primary/5">
            <CardHeader className="p-3 pb-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Sugerencia de compra
                </CardTitle>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Cubrir</span>
                  <div className="flex bg-background rounded-md border border-border p-0.5">
                    {[1, 2, 4, 8].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setSemanasCubrir(n)}
                        className={`px-2 py-1 text-xs rounded transition-colors ${
                          semanasCubrir === n
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                        data-testid={`tab-semanas-${n}`}
                      >
                        {n} {n === 1 ? "sem" : "sems"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-1 space-y-2">
              {sugerencias.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-3">
                  Configura clientes con demanda para recibir sugerencias.
                </div>
              ) : (
                <>
                  {sugerencias.map((s) => (
                    <div
                      key={s.cat}
                      className="rounded-md bg-background border border-border/50 p-2.5 text-xs min-w-0"
                      data-testid={`sugerencia-${s.cat}`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                        <span className="font-semibold text-sm">{s.cat}</span>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          Stock <strong className="text-foreground">{s.stockActual}</strong>
                          {" · "}
                          Nec. <strong className="text-foreground">{Math.ceil(s.requerido)}</strong>
                        </span>
                      </div>
                      {s.faltante <= 0 ? (
                        <div className="flex items-center gap-1.5 text-green-700 dark:text-green-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Tienes suficiente para {semanasCubrir} {semanasCubrir === 1 ? "semana" : "semanas"}
                        </div>
                      ) : !s.elegido ? (
                        <div className="text-destructive">
                          Faltan {Math.ceil(s.faltante)} un. — sin proveedores con esta categoría.
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] text-muted-foreground shrink-0">Proveedor:</span>
                            <select
                              value={s.elegido.id}
                              onChange={(e) =>
                                setSeleccionPorCat((prev) => ({ ...prev, [s.cat]: e.target.value }))
                              }
                              className="text-xs h-7 rounded border border-input bg-background px-1.5 max-w-full flex-1 min-w-0"
                              data-testid={`select-proveedor-${s.cat}`}
                            >
                              {s.productos.map((p, i) => (
                                <option key={p.id} value={p.id}>
                                  {i === 0 ? "★ " : ""}
                                  {p.proveedorNombre} — {p.nombre} · {formatCLP(p.costoUnitario)}/un
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 min-w-0">
                            <div className="min-w-0 flex-1">
                              <div className="font-medium break-words">
                                {s.cajas}× {s.elegido.nombre}
                              </div>
                              <div className="text-[10px] text-muted-foreground break-words">
                                {s.elegido.proveedorNombre} • {s.unidadesCubiertas} un. (cubre faltante de {Math.ceil(s.faltante)})
                                {s.mejor && s.elegido.id !== s.mejor.id && (
                                  <span className="text-amber-700 dark:text-amber-400">
                                    {" "}
                                    · +{formatCLP(s.costoTotal - s.cajas * s.mejor.precioTotal)} vs mejor
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-2 min-w-0">
                              <div className="text-right min-w-0">
                                <div className="font-bold text-primary whitespace-nowrap">{formatCLP(s.costoTotal)}</div>
                                <div className="text-[10px] text-muted-foreground whitespace-nowrap">Neto: {formatCLP(s.costoNeto)}</div>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[11px] shrink-0"
                                onClick={() => registrarUnaSugerencia(s)}
                                data-testid={`button-comprar-${s.cat}`}
                              >
                                Comprar
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {sugerenciasConAccion.length > 0 && (
                    <div className="pt-2 border-t border-border/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="text-xs">
                        <div className="text-muted-foreground">Total sugerido</div>
                        <div className="font-bold text-base">
                          {formatCLP(totalSugerido)}{" "}
                          <span className="text-[10px] font-normal text-muted-foreground">
                            (Neto {formatCLP(totalSugeridoNeto)})
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={registrarTodasSugerencias}
                        className="w-full sm:w-auto"
                        data-testid="button-comprar-todo"
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Registrar todas
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Productos por categoría */}
          {categorias.map((cat) => {
            const allProducts = productosPorCat(cat);
            if (allProducts.length === 0) return null;

            return (
              <Card key={cat} className="shadow-sm">
                <CardHeader className="p-3 bg-muted/30 border-b border-border/50">
                  <CardTitle className="text-base flex items-center gap-2">{cat}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border/50">
                    {allProducts.map((prod, idx) => (
                      <div
                        key={prod.id}
                        className={`p-3 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 text-sm min-w-0 ${
                          idx === 0 ? "bg-primary/5" : ""
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium flex items-center gap-2 flex-wrap">
                            <span className="break-words">{prod.nombre}</span>
                            {idx === 0 && (
                              <Badge variant="default" className="text-[10px] h-4 px-1 py-0 shrink-0">
                                Mejor opción
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5 break-words">
                            {prod.proveedorNombre} • Rinde {prod.unidades} un.
                          </div>
                        </div>
                        <div className="text-left sm:text-right shrink-0 sm:ml-2 min-w-0 max-w-full">
                          <div className="font-bold text-primary break-words">
                            {formatCLP(prod.costoUnitario)}{" "}
                            <span className="text-[10px] font-normal text-muted-foreground">/un c/IVA</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground break-words">
                            Neto/un: {formatCLP(prod.costoUnitarioNeto)}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center sm:justify-end gap-1 mt-0.5 flex-wrap">
                            <span>Caja:</span>
                            <EditableNumber
                              value={prod.precio}
                              onChange={(val) =>
                                useStore.getState().updateProductoProveedor(prod.proveedorId, prod.id, {
                                  precio: val,
                                })
                              }
                              isCurrency
                            />
                            <span>{prod.precioIncluyeIva ? "(c/IVA)" : "(Neto)"}</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground break-words">
                            Neto: {formatCLP(prod.precioNeto)} · c/IVA: {formatCLP(prod.precioTotal)}
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
