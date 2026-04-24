import { useState } from "react";
import { useStore, type Cliente } from "@/store";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EditableNumber } from "@/components/EditableNumber";
import { EditableText } from "@/components/EditableText";
import { formatCLP } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Plus, CheckCircle2, SlidersHorizontal, Package, Hash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Ventas() {
  const { clientes, ivaPorcentaje, updateCliente, addCliente, registrarVenta, registrarVentaPersonalizada } = useStore();
  const { toast } = useToast();

  const [customCliente, setCustomCliente] = useState<Cliente | null>(null);
  const [customFruta, setCustomFruta] = useState(0);
  const [customSnack, setCustomSnack] = useState(0);
  const [customBarra, setCustomBarra] = useState(0);

  const handleNewCliente = () => {
    addCliente({
      id: `c${Date.now()}`,
      nombre: "Nuevo Cliente",
      diasEntrega: 4,
      config: { frutas: 30, snacks: 10, barras: 10 },
      precios: { fruta: 400, snack: 700, barra: 500 },
      modoCobro: "unitario",
      paquete: { unidades: 50, montoNeto: 24000, ivaIncluido: false },
    });
  };

  const handleEntrega = (clienteId: string, nombre: string) => {
    registrarVenta(clienteId);
    toast({
      title: "Entrega registrada",
      description: `Se han descontado las unidades del stock para ${nombre}.`,
    });
  };

  const openCustomDialog = (cliente: Cliente) => {
    const diasPorEntrega = Math.max(1, cliente.diasEntrega / 2);
    setCustomCliente(cliente);
    setCustomFruta(cliente.config.frutas * diasPorEntrega);
    setCustomSnack(cliente.config.snacks * diasPorEntrega);
    setCustomBarra(cliente.config.barras * diasPorEntrega);
  };

  const handleCustomSave = () => {
    if (!customCliente) return;
    if (customFruta + customSnack + customBarra <= 0) {
      toast({
        title: "Sin unidades",
        description: "Agrega al menos una unidad para registrar la entrega.",
        variant: "destructive",
      });
      return;
    }
    registrarVentaPersonalizada(customCliente.id, {
      fruta: customFruta,
      snack: customSnack,
      barra: customBarra,
    });
    toast({
      title: "Entrega personalizada registrada",
      description: `${customFruta} frutas, ${customSnack} snacks, ${customBarra} barras para ${customCliente.nombre}.`,
    });
    setCustomCliente(null);
  };

  const setOnlyOne = (cat: "fruta" | "snack" | "barra") => {
    if (!customCliente) return;
    const diasPorEntrega = Math.max(1, customCliente.diasEntrega / 2);
    setCustomFruta(cat === "fruta" ? customCliente.config.frutas * diasPorEntrega : 0);
    setCustomSnack(cat === "snack" ? customCliente.config.snacks * diasPorEntrega : 0);
    setCustomBarra(cat === "barra" ? customCliente.config.barras * diasPorEntrega : 0);
  };

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xl font-bold tracking-tight">Clientes y Ventas</h2>
        <Button size="sm" onClick={handleNewCliente} className="h-8" data-testid="button-nuevo-cliente">
          <Plus className="h-4 w-4 mr-1" />
          Nuevo
        </Button>
      </div>

      <ScrollArea className="flex-1 -mx-2 px-2">
        <div className="space-y-4 pb-6">
          {clientes.map(cliente => {
            const esPaquete = cliente.modoCobro === "paquete";

            const ingresoUnitarioSemanal =
              (cliente.config.frutas * cliente.precios.fruta +
                cliente.config.snacks * cliente.precios.snack +
                cliente.config.barras * cliente.precios.barra) *
              cliente.diasEntrega;

            const entregasPorSemana = Math.max(1, cliente.diasEntrega / 2);
            const paqueteBruto = cliente.paquete.ivaIncluido
              ? cliente.paquete.montoNeto
              : cliente.paquete.montoNeto * (1 + ivaPorcentaje / 100);
            const ingresoPaqueteSemanal = paqueteBruto * entregasPorSemana;

            const totalSemanalBruto = esPaquete ? ingresoPaqueteSemanal : ingresoUnitarioSemanal;

            return (
              <Card key={cliente.id} className="shadow-sm">
                <CardHeader className="p-3 border-b border-border/50 flex flex-row items-center justify-between">
                  <CardTitle className="text-base font-bold">
                    <EditableText
                      value={cliente.nombre}
                      onChange={(v) => updateCliente(cliente.id, { nombre: v })}
                    />
                  </CardTitle>
                  <div className="text-xs text-muted-foreground text-right leading-tight">
                    <div>Entregas / sem: <EditableNumber value={cliente.diasEntrega} onChange={(v) => updateCliente(cliente.id, { diasEntrega: v })} /></div>
                  </div>
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

                  {esPaquete ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-muted/30 rounded p-2 text-center">
                          <div className="text-xs text-muted-foreground mb-1">Productos / entrega</div>
                          <div className="font-bold">
                            <EditableNumber
                              value={cliente.paquete.unidades}
                              onChange={(v) => updateCliente(cliente.id, { paquete: { ...cliente.paquete, unidades: v } })}
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
                              onChange={(v) => updateCliente(cliente.id, { paquete: { ...cliente.paquete, montoNeto: v } })}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Cobro por entrega</span>
                        <button
                          type="button"
                          onClick={() => updateCliente(cliente.id, { paquete: { ...cliente.paquete, ivaIncluido: !cliente.paquete.ivaIncluido } })}
                          className="px-2 py-0.5 rounded bg-muted hover:bg-muted/70 text-[11px]"
                          data-testid={`toggle-iva-${cliente.id}`}
                        >
                          {cliente.paquete.ivaIncluido ? "IVA incluido" : `+ IVA (${ivaPorcentaje}%)`}
                        </button>
                      </div>
                      <div className="text-[11px] text-muted-foreground bg-muted/20 rounded p-2 leading-relaxed">
                        Bruto por entrega: <span className="font-semibold text-foreground">{formatCLP(paqueteBruto)}</span>
                        {!cliente.paquete.ivaIncluido && (
                          <> · IVA: {formatCLP(paqueteBruto - cliente.paquete.montoNeto)}</>
                        )}
                      </div>
                    </div>
                  ) : null}

                  <div>
                    <div className="text-[11px] text-muted-foreground mb-1 px-0.5">
                      {esPaquete ? "Composición del paquete (para descontar stock)" : "Unidades y precio por día"}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-muted/30 rounded p-2">
                        <div className="text-xs text-muted-foreground mb-1">Frutas/día</div>
                        <div className="font-bold"><EditableNumber value={cliente.config.frutas} onChange={(v) => updateCliente(cliente.id, { config: { ...cliente.config, frutas: v } })} /></div>
                        {!esPaquete && (
                          <div className="text-xs text-primary mt-1"><EditableNumber value={cliente.precios.fruta} isCurrency onChange={(v) => updateCliente(cliente.id, { precios: { ...cliente.precios, fruta: v } })} /></div>
                        )}
                      </div>
                      <div className="bg-muted/30 rounded p-2">
                        <div className="text-xs text-muted-foreground mb-1">Snacks/día</div>
                        <div className="font-bold"><EditableNumber value={cliente.config.snacks} onChange={(v) => updateCliente(cliente.id, { config: { ...cliente.config, snacks: v } })} /></div>
                        {!esPaquete && (
                          <div className="text-xs text-primary mt-1"><EditableNumber value={cliente.precios.snack} isCurrency onChange={(v) => updateCliente(cliente.id, { precios: { ...cliente.precios, snack: v } })} /></div>
                        )}
                      </div>
                      <div className="bg-muted/30 rounded p-2">
                        <div className="text-xs text-muted-foreground mb-1">Barras/día</div>
                        <div className="font-bold"><EditableNumber value={cliente.config.barras} onChange={(v) => updateCliente(cliente.id, { config: { ...cliente.config, barras: v } })} /></div>
                        {!esPaquete && (
                          <div className="text-xs text-primary mt-1"><EditableNumber value={cliente.precios.barra} isCurrency onChange={(v) => updateCliente(cliente.id, { precios: { ...cliente.precios, barra: v } })} /></div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center bg-primary/5 rounded p-2 border border-primary/10">
                    <div className="text-xs font-medium text-muted-foreground">Ingreso Semanal Bruto</div>
                    <div className="font-bold text-base text-primary">{formatCLP(totalSemanalBruto)}</div>
                  </div>
                </CardContent>
                <CardFooter className="p-3 pt-0 flex gap-2">
                  <Button
                    className="flex-1 h-9"
                    onClick={() => handleEntrega(cliente.id, cliente.nombre)}
                    data-testid={`button-entrega-${cliente.id}`}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Entrega Estándar
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9"
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

      <Dialog open={!!customCliente} onOpenChange={(open) => !open && setCustomCliente(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Entrega personalizada</DialogTitle>
            <DialogDescription>
              {customCliente?.modoCobro === "paquete"
                ? `Ajusta la mezcla del paquete para ${customCliente?.nombre}. El cobro es el monto fijo del paquete.`
                : `Ingresa las unidades exactas de esta entrega para ${customCliente?.nombre}.`}
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2 -mt-1">
            <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => setOnlyOne("fruta")}>
              Solo frutas
            </Button>
            <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => setOnlyOne("snack")}>
              Solo snacks
            </Button>
            <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => setOnlyOne("barra")}>
              Solo barras
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="custom-fruta" className="text-xs">Frutas</Label>
              <Input
                id="custom-fruta"
                type="number"
                min={0}
                value={customFruta}
                onChange={(e) => setCustomFruta(Number(e.target.value) || 0)}
                data-testid="input-custom-fruta"
              />
              {customCliente?.modoCobro === "unitario" && (
                <div className="text-[10px] text-muted-foreground">
                  {formatCLP(customFruta * customCliente.precios.fruta)}
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="custom-snack" className="text-xs">Snacks</Label>
              <Input
                id="custom-snack"
                type="number"
                min={0}
                value={customSnack}
                onChange={(e) => setCustomSnack(Number(e.target.value) || 0)}
                data-testid="input-custom-snack"
              />
              {customCliente?.modoCobro === "unitario" && (
                <div className="text-[10px] text-muted-foreground">
                  {formatCLP(customSnack * customCliente.precios.snack)}
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="custom-barra" className="text-xs">Barras</Label>
              <Input
                id="custom-barra"
                type="number"
                min={0}
                value={customBarra}
                onChange={(e) => setCustomBarra(Number(e.target.value) || 0)}
                data-testid="input-custom-barra"
              />
              {customCliente?.modoCobro === "unitario" && (
                <div className="text-[10px] text-muted-foreground">
                  {formatCLP(customBarra * customCliente.precios.barra)}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center bg-primary/5 rounded p-2 border border-primary/10">
            <div className="text-xs font-medium text-muted-foreground">
              {customCliente?.modoCobro === "paquete" ? "Cobro fijo del paquete" : "Total entrega"}
            </div>
            <div className="font-bold text-base text-primary">
              {customCliente
                ? customCliente.modoCobro === "paquete"
                  ? formatCLP(
                      customCliente.paquete.ivaIncluido
                        ? customCliente.paquete.montoNeto
                        : customCliente.paquete.montoNeto * (1 + ivaPorcentaje / 100)
                    )
                  : formatCLP(
                      customFruta * customCliente.precios.fruta +
                        customSnack * customCliente.precios.snack +
                        customBarra * customCliente.precios.barra
                    )
                : ""}
            </div>
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
    </div>
  );
}
