import { useState } from "react";
import { useStore, type Cliente, type ModoCobro } from "@/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit2, Mail, Phone, MapPin, Briefcase, Hash, FileText } from "lucide-react";
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

interface ClienteForm {
  nombre: string;
  rut: string;
  email: string;
  telefono: string;
  direccion: string;
  laboral: string;
  diasEntrega: number;
  entregasPorSemana: number;
  modoCobro: ModoCobro;
  paqueteUnidades: number;
  paqueteMonto: number;
  paqueteIvaIncluido: boolean;
}

const emptyForm = (): ClienteForm => ({
  nombre: "",
  rut: "",
  email: "",
  telefono: "",
  direccion: "",
  laboral: "",
  diasEntrega: 4,
  entregasPorSemana: 2,
  modoCobro: "paquete",
  paqueteUnidades: 50,
  paqueteMonto: 24000,
  paqueteIvaIncluido: false,
});

export default function Clientes() {
  const { clientes, categorias, addCliente, updateCliente, removeCliente, cotizaciones } = useStore();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ClienteForm>(emptyForm);
  const [busqueda, setBusqueda] = useState("");

  const clientesFiltrados = busqueda.trim()
    ? clientes.filter((c) =>
        c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        (c.rut || "").toLowerCase().includes(busqueda.toLowerCase()) ||
        (c.email || "").toLowerCase().includes(busqueda.toLowerCase())
      )
    : clientes;

  function abrirNuevo() {
    setEditingId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  }

  function abrirEditar(c: Cliente) {
    setEditingId(c.id);
    setForm({
      nombre: c.nombre,
      rut: c.rut || "",
      email: c.email || "",
      telefono: c.telefono || "",
      direccion: c.direccion || "",
      laboral: c.laboral || "",
      diasEntrega: c.diasEntrega,
      entregasPorSemana: c.entregasPorSemana,
      modoCobro: c.modoCobro,
      paqueteUnidades: c.paquete.unidades,
      paqueteMonto: c.paquete.montoNeto,
      paqueteIvaIncluido: c.paquete.ivaIncluido,
    });
    setDialogOpen(true);
  }

  function guardar() {
    const nombreLimpio = form.nombre.trim();
    if (!nombreLimpio) {
      toast({ title: "Falta el nombre del cliente", variant: "destructive" });
      return;
    }

    const config: Record<string, number> = {};
    const precios: Record<string, number> = {};
    categorias.forEach((cat) => {
      config[cat] = 0;
      precios[cat] = 0;
    });

    if (editingId) {
      const clienteActual = clientes.find((c) => c.id === editingId);
      updateCliente(editingId, {
        nombre: nombreLimpio,
        rut: form.rut.trim() || undefined,
        email: form.email.trim() || undefined,
        telefono: form.telefono.trim() || undefined,
        direccion: form.direccion.trim() || undefined,
        laboral: form.laboral.trim() || undefined,
        diasEntrega: Math.max(1, form.diasEntrega),
        entregasPorSemana: Math.max(1, form.entregasPorSemana),
        modoCobro: form.modoCobro,
        paquete: {
          unidades: Math.max(0, form.paqueteUnidades),
          montoNeto: Math.max(0, form.paqueteMonto),
          ivaIncluido: form.paqueteIvaIncluido,
        },
        config: clienteActual?.config || config,
        precios: clienteActual?.precios || precios,
      });
      toast({ title: "Cliente actualizado" });
    } else {
      addCliente({
        id: `c${Date.now()}`,
        nombre: nombreLimpio,
        rut: form.rut.trim() || undefined,
        email: form.email.trim() || undefined,
        telefono: form.telefono.trim() || undefined,
        direccion: form.direccion.trim() || undefined,
        laboral: form.laboral.trim() || undefined,
        diasEntrega: Math.max(1, form.diasEntrega),
        entregasPorSemana: Math.max(1, form.entregasPorSemana),
        config,
        precios,
        modoCobro: form.modoCobro,
        paquete: {
          unidades: Math.max(0, form.paqueteUnidades),
          montoNeto: Math.max(0, form.paqueteMonto),
          ivaIncluido: form.paqueteIvaIncluido,
        },
      });
      toast({ title: `Cliente "${nombreLimpio}" creado` });
    }
    setDialogOpen(false);
  }

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center justify-between px-1 shrink-0">
        <h2 className="text-xl font-bold tracking-tight">Clientes</h2>
        <Button size="sm" className="h-8" onClick={abrirNuevo}>
          <Plus className="h-4 w-4 mr-1" />
          Nuevo
        </Button>
      </div>

      <div className="px-1 shrink-0">
        <Input
          placeholder="Buscar por nombre, RUT o email…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="h-8 text-sm"
        />
      </div>

      <ScrollArea className="flex-1 min-w-0">
        <div className="space-y-2 pb-4">
          {clientesFiltrados.length === 0 && (
            <Card className="shadow-sm">
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                {busqueda ? "Sin resultados para esa búsqueda." : 'No hay clientes aún. Crea uno con el botón "Nuevo".'}
              </CardContent>
            </Card>
          )}

          {clientesFiltrados.map((c) => {
            const cotizCount = cotizaciones.filter((cot) => cot.clienteId === c.id).length;
            return (
              <Card key={c.id} className="shadow-sm">
                <CardContent className="p-3 flex items-start gap-3">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm leading-tight">{c.nombre}</span>
                      {c.rut && (
                        <span className="text-xs text-muted-foreground font-mono">{c.rut}</span>
                      )}
                      {cotizCount > 0 && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 gap-1">
                          <FileText className="h-2.5 w-2.5" />
                          {cotizCount} {cotizCount === 1 ? "cotiz." : "cotiz."}
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                      {c.email && (
                        <div className="flex items-center gap-1 min-w-0">
                          <Mail className="h-3 w-3 shrink-0" />
                          <span className="truncate">{c.email}</span>
                        </div>
                      )}
                      {c.telefono && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3 shrink-0" />
                          <span>{c.telefono}</span>
                        </div>
                      )}
                      {c.direccion && (
                        <div className="flex items-center gap-1 min-w-0 sm:col-span-2">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{c.direccion}</span>
                        </div>
                      )}
                      {c.laboral && (
                        <div className="flex items-center gap-1 min-w-0 sm:col-span-2">
                          <Briefcase className="h-3 w-3 shrink-0" />
                          <span className="truncate">{c.laboral}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => abrirEditar(c)}
                      title="Editar"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Eliminar cliente</AlertDialogTitle>
                          <AlertDialogDescription>
                            Vas a eliminar a "{c.nombre}". El historial de ventas y cotizaciones no se borra.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => {
                              removeCliente(c.id);
                              toast({ title: "Cliente eliminado" });
                            }}
                            className="bg-destructive text-destructive-foreground"
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md w-[95vw] rounded-xl max-h-[90dvh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>{editingId ? "Editar cliente" : "Nuevo cliente"}</DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0">
            <div className="space-y-3 pr-1 pb-2">
              <div>
                <Label className="text-xs mb-1 block">Nombre / Razón Social *</Label>
                <Input
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Empresa o persona"
                  className="h-8 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs mb-1 block">RUT</Label>
                  <Input
                    value={form.rut}
                    onChange={(e) => setForm({ ...form, rut: e.target.value })}
                    placeholder="76.XXX.XXX-X"
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Teléfono</Label>
                  <Input
                    value={form.telefono}
                    onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                    placeholder="+56 9 XXXX XXXX"
                    className="h-8 text-sm"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs mb-1 block">Email</Label>
                <Input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="contacto@empresa.cl"
                  className="h-8 text-sm"
                />
              </div>

              <div>
                <Label className="text-xs mb-1 block">Dirección</Label>
                <Input
                  value={form.direccion}
                  onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                  placeholder="Calle 123, Ciudad"
                  className="h-8 text-sm"
                />
              </div>

              <div>
                <Label className="text-xs mb-1 block">Laboral</Label>
                <Input
                  value={form.laboral}
                  onChange={(e) => setForm({ ...form, laboral: e.target.value })}
                  placeholder="Empresa, rubro, contexto laboral…"
                  className="h-8 text-sm"
                />
              </div>

              <div className="border-t border-border/50 pt-3">
                <div className="text-xs font-medium text-muted-foreground mb-2">Configuración de entrega</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs mb-1 block">Días / semana</Label>
                    <Input
                      type="number"
                      min={1}
                      max={7}
                      value={form.diasEntrega}
                      onChange={(e) => setForm({ ...form, diasEntrega: parseInt(e.target.value) || 1 })}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Entregas / semana</Label>
                    <Input
                      type="number"
                      min={1}
                      max={7}
                      value={form.entregasPorSemana}
                      onChange={(e) => setForm({ ...form, entregasPorSemana: parseInt(e.target.value) || 1 })}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>

          <div className="shrink-0 pt-2 border-t border-border/50 flex gap-2">
            <Button variant="outline" className="flex-1 h-8" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button className="flex-1 h-8" onClick={guardar}>
              {editingId ? "Guardar cambios" : "Crear cliente"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
