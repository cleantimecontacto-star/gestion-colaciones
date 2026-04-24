import { useState } from "react";
import { useStore, type Cliente, type ModoCobro } from "@/store";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EditableNumber } from "@/components/EditableNumber";
import { EditableText } from "@/components/EditableText";
import { formatCLP } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Plus, CheckCircle2, SlidersHorizontal, Package, Hash, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface NuevoClienteForm {
  nombre: string;
  diasEntrega: number;
  modoCobro: ModoCobro;
  unidades: Record<string, number>;
  precios: Record<string, number>;
  paqueteUnidades: number;
  paqueteMonto: number;
  paqueteIvaIncluido: boolean;
}

const buildDefaultNuevo = (categorias: string[]): NuevoClienteForm => {
  const unidades: Record<string, number> = {};
  const precios: Record<string, number> = {};
  categorias.forEach((cat) => {
    unidades[cat] = 0;
    precios[cat] = 0;
  });
  return {
    nombre: "",
    diasEntrega: 4,
    modoCobro: "unitario",
    unidades,
    precios,
    paqueteUnidades: 50,
    paqueteMonto: 24000,
    paqueteIvaIncluido: false,
  };
};

export default function Ventas() {
  const {
    clientes,
    ivaPorcentaje,
    categorias,
    updateCliente,
    addCliente,
    removeCliente,
    registrarVenta,
    registrarVentaPersonalizada,
  } = useStore();
  const { toast } = useToast();

  const [customCliente, setCustomCliente] = useState<Cliente | null>(null);
  const [customUnidades, setCustomUnidades] = useState<Record<string, number>>({});

  const [nuevoOpen, setNuevoOpen] = useState(false);
  const [nuevo, setNuevo] = useState<NuevoClienteForm>(() => buildDefaultNuevo(categorias));

  const [confirmEntrega, setConfirmEntrega] = useState<Cliente | null>(null);

  const openNuevoCliente = () => {
    setNuevo(buildDefaultNuevo(categorias));
    setNuevoOpen(true);
  };

  const guardarNuevoCliente = () => {
    const nombreLimpio = nuevo.nombre.trim();
    if (!nombreLimpio) {
      toast({
        title: "Falta el nombre",
        description: "Ingresa un nombre para el cliente.",
        variant: "destructive",
      });
      return;
    }
    const config: Record<string, number> = {};
    const precios: Record<string, number> = {};
    categorias.forEach((cat) => {
      config[cat] = Math.max(0, nuevo.unidades[cat] || 0);
      precios[cat] = Math.max(0, nuevo.precios[cat] || 0);
    });
    addCliente({
      id: `c${Date.now()}`,
      nombre: nombreLimpio,
      diasEntrega: Math.max(1, nuevo.diasEntrega || 1),
      config,
      precios,
      modoCobro: nuevo.modoCobro,
      paquete: {
        unidades: Math.max(0, nuevo.paqueteUnidades),
        montoNeto: Math.max(0, nuevo.paqueteMonto),
        ivaIncluido: nuevo.paqueteIvaIncluido,
      },
    });
    toast({ title: "Cliente creado", description: `${nombreLimpio} agregado correctamente.` });
    setNuevoOpen(false);
  };

  const calcularEntregaPrevia = (cliente: Cliente) => {
    const diasPorEntrega = Math.max(1, cliente.diasEntrega / 2);
    const unidadesCat: Record<string, number> = {};
    categorias.forEach((cat) => {
      unidadesCat[cat] = (cliente.config[cat] || 0) * diasPorEntrega;
    });
    let totalBruto: number;
    let neto: number;
    if (cliente.modoCobro === "paquete") {
      if (cliente.paquete.ivaIncluido) {
        totalBruto = cliente.paquete.montoNeto;
        neto = totalBruto / (1 + ivaPorcentaje / 100);
      } else {
        neto = cliente.paquete.montoNeto;
        totalBruto = neto * (1 + ivaPorcentaje / 100);
      }
    } else {
      totalBruto = categorias.reduce(
        (sum, cat) => sum + unidadesCat[cat] * (cliente.precios[cat] || 0),
        0
      );
      neto = totalBruto / (1 + ivaPorcentaje / 100);
    }
    return { unidadesCat, neto, iva: totalBruto - neto, totalBruto };
  };

  const handleConfirmEntrega = () => {
    if (!confirmEntrega) return;
    registrarVenta(confirmEntrega.id);
    toast({
      title: "Entrega registrada",
      description: `Se han descontado las unidades del stock para ${confirmEntrega.nombre}.`,
    });
    setConfirmEntrega(null);
  };

  const openCustomDialog = (cliente: Cliente) => {
    const diasPorEntrega = Math.max(1, cliente.diasEntrega / 2);
    const inicial: Record<string, number> = {};
    categorias.forEach((cat) => {
      inicial[cat] = (cliente.config[cat] || 0) * diasPorEntrega;
    });
    setCustomCliente(cliente);
    setCustomUnidades(inicial);
  };

  const setCustomCat = (cat: string, val: number) =>
    setCustomUnidades((prev) => ({ ...prev, [cat]: Math.max(0, val) }));

  const setOnlyOne = (catSeleccionada: string) => {
    if (!customCliente) return;
    const diasPorEntrega = Math.max(1, customCliente.diasEntrega / 2);
    const nuevo: Record<string, number> = {};
    categorias.forEach((cat) => {
      nuevo[cat] = cat === catSeleccionada ? (customCliente.config[cat] || 0) * diasPorEntrega : 0;
    });
    setCustomUnidades(nuevo);
  };

  const handleCustomSave = () => {
    if (!customCliente) return;
    const total = Object.values(customUnidades).reduce((a, b) => a + b, 0);
    if (total <= 0) {
      toast({
        title: "Sin unidades",
        description: "Agrega al menos una unidad para registrar la entrega.",
        variant: "destructive",
      });
      return;
    }
    registrarVentaPersonalizada(customCliente.id, customUnidades);
    const detalle = Object.entries(customUnidades)
      .filter(([, v]) => v > 0)
      .map(([cat, v]) => `${v} ${cat}`)
      .join(", ");
    toast({
      title: "Entrega personalizada registrada",
      description: `${detalle || "Sin items"} para ${customCliente.nombre}.`,
    });
    setCustomCliente(null);
  };

  const customTotalBruto = customCliente
    ? customCliente.modoCobro === "paquete"
      ? customCliente.paquete.ivaIncluido
        ? customCliente.paquete.montoNeto
        : customCliente.paquete.montoNeto * (1 + ivaPorcentaje / 100)
      : Object.entries(customUnidades).reduce(
          (sum, [cat, u]) => sum + u * (customCliente.precios[cat] || 0),
          0
        )
    : 0;

  const colsCount = Math.min(categorias.length, 4);
  const gridColsClass =
    colsCount <= 1 ? "grid-cols-1" : colsCount === 2 ? "grid-cols-2" : colsCount === 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4";

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xl font-bold tracking-tight">Clientes y Ventas</h2>
        <Button size="sm" onClick={openNuevoCliente} className="h-8" data-testid="button-nuevo-cliente">
          <Plus className="h-4 w-4 mr-1" />
          Nuevo cliente
        </Button>
      </div>

      <ScrollArea className="flex-1 -mx-2 px-2">
        <div className="space-y-4 pb-6">
          {clientes.map((cliente) => {
            const esPaquete = cliente.modoCobro === "paquete";

            const ingresoUnitarioSemanal =
              categorias.reduce(
                (sum, cat) => sum + (cliente.config[cat] || 0) * (cliente.precios[cat] || 0),
                0
              ) * cliente.diasEntrega;

            const entregasPorSemana = Math.max(1, cliente.diasEntrega / 2);
            const paqueteBruto = cliente.paquete.ivaIncluido
              ? cliente.paquete.montoNeto
              : cliente.paquete.montoNeto * (1 + ivaPorcentaje / 100);
            const ingresoPaqueteSemanal = paqueteBruto * entregasPorSemana;
            const totalSemanalBruto = esPaquete ? ingresoPaqueteSemanal : ingresoUnitarioSemanal;
            const totalSemanalNeto = esPaquete
              ? (cliente.paquete.ivaIncluido
                  ? cliente.paquete.montoNeto / (1 + ivaPorcentaje / 100)
                  : cliente.paquete.montoNeto) * entregasPorSemana
              : ingresoUnitarioSemanal / (1 + ivaPorcentaje / 100);
            const ivaSemanal = totalSemanalBruto - totalSemanalNeto;

            return (
              <Card key={cliente.id} className="shadow-sm">
                <CardHeader className="p-3 border-b border-border/50 flex flex-row items-center justify-between gap-2">
                  <CardTitle className="text-base font-bold flex-1 min-w-0">
                    <EditableText
                      value={cliente.nombre}
                      onChange={(v) => updateCliente(cliente.id, { nombre: v })}
                    />
                  </CardTitle>
                  <div className="text-xs text-muted-foreground text-right leading-tight">
                    <div>
                      Entregas / sem:{" "}
                      <EditableNumber
                        value={cliente.diasEntrega}
                        onChange={(v) => updateCliente(cliente.id, { diasEntrega: v })}
                      />
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive shrink-0"
                        data-testid={`button-remove-cliente-${cliente.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Eliminar cliente</AlertDialogTitle>
                        <AlertDialogDescription>
                          Vas a eliminar a "{cliente.nombre}". El historial de ventas no se borra.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => removeCliente(cliente.id)}
                          className="bg-destructive text-destructive-foreground"
                        >
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardHeader>
                <CardContent className="p-3 text-sm space-y-3">
                  <div className="flex gap-1 bg-muted/30 rounded p-0.5">
                    <button
                      type="button"
                      onClick={() => updateCliente(cliente.id, { modoCobro: "unitario" })}
                      className={`flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded transition-colors ${
                        !esPaquete ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                      }`}
                      data-testid={`tab-modo-unitario-${cliente.id}`}
                    >
                      <Hash className="h-3 w-3" />
                      Por unidad
                    </button>
                    <button
                      type="button"
                      onClick={() => updateCliente(cliente.id, { modoCobro: "paquete" })}
                      className={`flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded transition-colors ${
                        esPaquete ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                      }`}
                      data-testid={`tab-modo-paquete-${cliente.id}`}
                    >
                      <Package className="h-3 w-3" />
                      Por paquete
                    </button>
                  </div>

                  {esPaquete && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-muted/30 rounded p-2 text-center">
                          <div className="text-xs text-muted-foreground mb-1">Productos / entrega</div>
                          <div className="font-bold">
                            <EditableNumber
                              value={cliente.paquete.unidades}
                              onChange={(v) =>
                                updateCliente(cliente.id, {
                                  paquete: { ...cliente.paquete, unidades: v },
                                })
                              }
                            />
                          </div>
                        </div>
                        <div className="bg-muted/30 rounded p-2 text-center">
                          <div className="text-xs text-muted-foreground mb-1">
                            Monto {cliente.paquete.ivaIncluido ? "(IVA incl.)" : "neto"}
                          </div>
                          <div className="font-bold text-primary">
                            <EditableNumber
                              value={cliente.paquete.montoNeto}
                              isCurrency
                              onChange={(v) =>
                                updateCliente(cliente.id, {
                                  paquete: { ...cliente.paquete, montoNeto: v },
                                })
                              }
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Cobro por entrega</span>
                        <button
                          type="button"
                          onClick={() =>
                            updateCliente(cliente.id, {
                              paquete: { ...cliente.paquete, ivaIncluido: !cliente.paquete.ivaIncluido },
                            })
                          }
                          className="px-2 py-0.5 rounded bg-muted hover:bg-muted/70 text-[11px]"
                          data-testid={`toggle-iva-${cliente.id}`}
                        >
                          {cliente.paquete.ivaIncluido ? "IVA incluido" : `+ IVA (${ivaPorcentaje}%)`}
                        </button>
                      </div>
                      <div className="text-[11px] text-muted-foreground bg-muted/20 rounded p-2 leading-relaxed">
                        Bruto por entrega:{" "}
                        <span className="font-semibold text-foreground">{formatCLP(paqueteBruto)}</span>
                        {!cliente.paquete.ivaIncluido && (
                          <> · IVA: {formatCLP(paqueteBruto - cliente.paquete.montoNeto)}</>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="text-[11px] text-muted-foreground mb-1 px-0.5">
                      {esPaquete ? "Composición del paquete (para descontar stock)" : "Unidades y precio por día"}
                    </div>
                    <div className={`grid ${gridColsClass} gap-2 text-center`}>
                      {categorias.map((cat) => (
                        <div key={cat} className="bg-muted/30 rounded p-2">
                          <div className="text-xs text-muted-foreground mb-1 truncate">{cat}/día</div>
                          <div className="font-bold">
                            <EditableNumber
                              value={cliente.config[cat] || 0}
                              onChange={(v) =>
                                updateCliente(cliente.id, {
                                  config: { ...cliente.config, [cat]: v },
                                })
                              }
                            />
                          </div>
                          {!esPaquete && (
                            <div className="text-xs text-primary mt-1">
                              <EditableNumber
                                value={cliente.precios[cat] || 0}
                                isCurrency
                                onChange={(v) =>
                                  updateCliente(cliente.id, {
                                    precios: { ...cliente.precios, [cat]: v },
                                  })
                                }
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-primary/5 rounded p-2 border border-primary/10 space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Neto / sem</span>
                      <span className="font-medium">{formatCLP(totalSemanalNeto)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">IVA / sem</span>
                      <span className="font-medium">{formatCLP(ivaSemanal)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-primary/10">
                      <div className="text-xs font-medium text-muted-foreground">Total c/IVA / sem</div>
                      <div className="font-bold text-base text-primary">{formatCLP(totalSemanalBruto)}</div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="p-3 pt-0 flex flex-col sm:flex-row gap-2">
                  <Button
                    className="flex-1 h-9 w-full"
                    onClick={() => setConfirmEntrega(cliente)}
                    data-testid={`button-entrega-${cliente.id}`}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Entrega Estándar
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9 w-full sm:w-auto"
                    onClick={() => openCustomDialog(cliente)}
                    data-testid={`button-entrega-custom-${cliente.id}`}
                  >
                    <SlidersHorizontal className="h-4 w-4 mr-2" />
                    Personalizada
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </ScrollArea>

      {/* Entrega personalizada */}
      <Dialog open={!!customCliente} onOpenChange={(open) => !open && setCustomCliente(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Entrega personalizada</DialogTitle>
            <DialogDescription>
              {customCliente?.modoCobro === "paquete"
                ? `Ajusta la mezcla del paquete para ${customCliente?.nombre}. El cobro es el monto fijo del paquete.`
                : `Ingresa las unidades exactas de esta entrega para ${customCliente?.nombre}.`}
            </DialogDescription>
          </DialogHeader>

          {categorias.length > 1 && (
            <div className="flex gap-2 -mt-1 flex-wrap">
              {categorias.map((cat) => (
                <Button
                  key={cat}
                  size="sm"
                  variant="outline"
                  className="flex-1 h-7 text-xs min-w-[80px]"
                  onClick={() => setOnlyOne(cat)}
                >
                  Solo {cat}
                </Button>
              ))}
            </div>
          )}

          <div className={`grid ${gridColsClass} gap-3 py-2`}>
            {categorias.map((cat) => (
              <div key={cat} className="space-y-1.5">
                <Label htmlFor={`custom-${cat}`} className="text-xs truncate">
                  {cat}
                </Label>
                <Input
                  id={`custom-${cat}`}
                  type="number"
                  min={0}
                  value={customUnidades[cat] ?? 0}
                  onChange={(e) => setCustomCat(cat, Number(e.target.value) || 0)}
                  data-testid={`input-custom-${cat}`}
                />
                {customCliente?.modoCobro === "unitario" && (
                  <div className="text-[10px] text-muted-foreground">
                    {formatCLP((customUnidades[cat] || 0) * (customCliente.precios[cat] || 0))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center bg-primary/5 rounded p-2 border border-primary/10">
            <div className="text-xs font-medium text-muted-foreground">
              {customCliente?.modoCobro === "paquete" ? "Cobro fijo del paquete" : "Total entrega"}
            </div>
            <div className="font-bold text-base text-primary">{formatCLP(customTotalBruto)}</div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCustomCliente(null)}>
              Cancelar
            </Button>
            <Button onClick={handleCustomSave} data-testid="button-confirm-custom">
              Registrar entrega
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmación entrega estándar */}
      <AlertDialog open={!!confirmEntrega} onOpenChange={(open) => !open && setConfirmEntrega(null)}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar entrega estándar?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                {confirmEntrega &&
                  (() => {
                    const r = calcularEntregaPrevia(confirmEntrega);
                    return (
                      <>
                        <div>
                          Se registrará una entrega para{" "}
                          <strong className="text-foreground">{confirmEntrega.nombre}</strong> y se
                          descontará del stock.
                        </div>
                        <div className="rounded-md border border-border bg-muted/30 p-2 space-y-1 text-xs">
                          {categorias.map((cat) => (
                            <div key={cat} className="flex justify-between">
                              <span>{cat} a descontar</span>
                              <span className="font-medium text-foreground">{r.unidadesCat[cat] || 0}</span>
                            </div>
                          ))}
                          <div className="border-t border-border my-1" />
                          <div className="flex justify-between">
                            <span>Neto</span>
                            <span className="font-medium text-foreground">{formatCLP(r.neto)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>IVA</span>
                            <span className="font-medium text-foreground">{formatCLP(r.iva)}</span>
                          </div>
                          <div className="flex justify-between pt-1 border-t border-border">
                            <span className="font-semibold text-foreground">Total c/IVA</span>
                            <span className="font-bold text-primary">{formatCLP(r.totalBruto)}</span>
                          </div>
                        </div>
                      </>
                    );
                  })()}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmEntrega} data-testid="button-confirm-entrega">
              Confirmar entrega
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Nuevo cliente */}
      <Dialog open={nuevoOpen} onOpenChange={setNuevoOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo cliente</DialogTitle>
            <DialogDescription>
              Completa los datos. Podrás editar todo después haciendo clic en el lápiz.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="nuevo-nombre">Nombre</Label>
              <Input
                id="nuevo-nombre"
                value={nuevo.nombre}
                onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
                placeholder="Ej: Empresa ABC"
                data-testid="input-nuevo-nombre"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="nuevo-dias">Entregas / semana</Label>
                <Input
                  id="nuevo-dias"
                  type="number"
                  min={1}
                  max={7}
                  value={nuevo.diasEntrega}
                  onChange={(e) => setNuevo({ ...nuevo, diasEntrega: Number(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Modo de cobro</Label>
                <div className="flex gap-1 bg-muted/40 rounded p-0.5 h-9">
                  <button
                    type="button"
                    onClick={() => setNuevo({ ...nuevo, modoCobro: "unitario" })}
                    className={`flex-1 text-xs rounded transition-colors ${
                      nuevo.modoCobro === "unitario"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    Unitario
                  </button>
                  <button
                    type="button"
                    onClick={() => setNuevo({ ...nuevo, modoCobro: "paquete" })}
                    className={`flex-1 text-xs rounded transition-colors ${
                      nuevo.modoCobro === "paquete"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    Paquete
                  </button>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Unidades por día</Label>
              <div className={`grid ${gridColsClass} gap-2 mt-1`}>
                {categorias.map((cat) => (
                  <div key={cat} className="space-y-1">
                    <Label htmlFor={`nuevo-u-${cat}`} className="text-[10px] text-muted-foreground truncate">
                      {cat}
                    </Label>
                    <Input
                      id={`nuevo-u-${cat}`}
                      type="number"
                      min={0}
                      value={nuevo.unidades[cat] ?? 0}
                      onChange={(e) =>
                        setNuevo({
                          ...nuevo,
                          unidades: { ...nuevo.unidades, [cat]: Number(e.target.value) || 0 },
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            </div>

            {nuevo.modoCobro === "unitario" ? (
              <div>
                <Label className="text-xs text-muted-foreground">Precio neto por unidad</Label>
                <div className={`grid ${gridColsClass} gap-2 mt-1`}>
                  {categorias.map((cat) => (
                    <div key={cat} className="space-y-1">
                      <Label htmlFor={`nuevo-p-${cat}`} className="text-[10px] text-muted-foreground truncate">
                        {cat}
                      </Label>
                      <Input
                        id={`nuevo-p-${cat}`}
                        type="number"
                        min={0}
                        value={nuevo.precios[cat] ?? 0}
                        onChange={(e) =>
                          setNuevo({
                            ...nuevo,
                            precios: { ...nuevo.precios, [cat]: Number(e.target.value) || 0 },
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <Label className="text-xs text-muted-foreground">Configuración del paquete</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div className="space-y-1">
                    <Label htmlFor="nuevo-pun" className="text-[10px] text-muted-foreground">
                      Unidades / paquete
                    </Label>
                    <Input
                      id="nuevo-pun"
                      type="number"
                      min={0}
                      value={nuevo.paqueteUnidades}
                      onChange={(e) => setNuevo({ ...nuevo, paqueteUnidades: Number(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="nuevo-pmo" className="text-[10px] text-muted-foreground">
                      Monto {nuevo.paqueteIvaIncluido ? "(c/IVA)" : "(neto)"}
                    </Label>
                    <Input
                      id="nuevo-pmo"
                      type="number"
                      min={0}
                      value={nuevo.paqueteMonto}
                      onChange={(e) => setNuevo({ ...nuevo, paqueteMonto: Number(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setNuevo({ ...nuevo, paqueteIvaIncluido: !nuevo.paqueteIvaIncluido })}
                  className="mt-2 px-2 py-1 rounded bg-muted hover:bg-muted/70 text-[11px]"
                >
                  {nuevo.paqueteIvaIncluido ? "IVA incluido" : `+ IVA (${ivaPorcentaje}%)`}
                </button>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setNuevoOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={guardarNuevoCliente} data-testid="button-guardar-cliente">
              Crear cliente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
