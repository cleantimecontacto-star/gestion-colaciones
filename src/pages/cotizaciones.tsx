import { useState } from "react";
import { useStore, type Cotizacion, type ItemCotizacion, type EstadoCotizacion } from "@/store";
import { formatCLP } from "@/lib/format";
import { format, addDays } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Download, Edit2, FileText } from "lucide-react";
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EMPRESA = {
  nombre: "Comercializadora SerendipiaVK SpA",
  rut: "77.875.974-8",
  giro: "Comercialización de colaciones y alimentación laboral",
};

const ESTADO_CONFIG: Record<EstadoCotizacion, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  borrador:   { label: "Borrador",  variant: "secondary" },
  enviada:    { label: "Enviada",   variant: "default" },
  aceptada:   { label: "Aceptada", variant: "default" },
  rechazada:  { label: "Rechazada",variant: "destructive" },
};

function generarNumero(cotizaciones: Cotizacion[]): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const prefix = `COT-${year}${month}-`;
  const nums = cotizaciones
    .filter((c) => c.numero.startsWith(prefix))
    .map((c) => parseInt(c.numero.replace(prefix, "")) || 0);
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `${prefix}${String(next).padStart(3, "0")}`;
}

function calcularTotales(items: ItemCotizacion[], ivaPct: number) {
  const neto = items.reduce((acc, i) => acc + i.cantidad * i.precioUnitario, 0);
  const iva = neto * (ivaPct / 100);
  const total = neto + iva;
  return { neto, iva, total };
}

const emptyForm = (ivaPorcentaje: number, cotizaciones: Cotizacion[]): Omit<Cotizacion, "id"> => ({
  numero: generarNumero(cotizaciones),
  fecha: new Date().toISOString().split("T")[0],
  vigencia: addDays(new Date(), 30).toISOString().split("T")[0],
  clienteNombre: "",
  clienteRut: "",
  clienteEmail: "",
  clienteDireccion: "",
  items: [{ id: Date.now().toString(), descripcion: "", cantidad: 1, precioUnitario: 0 }],
  estado: "borrador",
  notas: "",
  ivaPorcentaje,
});

// ─── PDF ──────────────────────────────────────────────────────────────────────

async function descargarPDF(cot: Cotizacion) {
  try {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF({ unit: "mm", format: "letter" });
    const W = doc.internal.pageSize.getWidth();
    let y = 18;

    // Encabezado empresa
    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");
    doc.text(EMPRESA.nombre, 14, y);
    y += 7;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`RUT: ${EMPRESA.rut}`, 14, y);
    y += 4;
    doc.text(EMPRESA.giro, 14, y);
    y += 9;

    // Título cotización
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(`COTIZACIÓN Nº ${cot.numero}`, 14, y);
    y += 6;

    // Fechas
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Fecha: ${format(new Date(cot.fecha), "dd/MM/yyyy")}`, 14, y);
    doc.text(`Válida hasta: ${format(new Date(cot.vigencia), "dd/MM/yyyy")}`, 90, y);
    doc.text(`Estado: ${ESTADO_CONFIG[cot.estado].label}`, W - 55, y);
    y += 9;

    // Línea
    doc.setDrawColor(180);
    doc.line(14, y, W - 14, y);
    y += 6;

    // Datos cliente
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("CLIENTE", 14, y);
    y += 5;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    if (cot.clienteNombre) { doc.text(`Razón Social: ${cot.clienteNombre}`, 14, y); y += 4; }
    if (cot.clienteRut)    { doc.text(`RUT: ${cot.clienteRut}`, 14, y); y += 4; }
    if (cot.clienteEmail)  { doc.text(`Email: ${cot.clienteEmail}`, 14, y); y += 4; }
    if (cot.clienteDireccion) { doc.text(`Dirección: ${cot.clienteDireccion}`, 14, y); y += 4; }
    y += 4;

    // Tabla de ítems
    const { neto, iva, total } = calcularTotales(cot.items, cot.ivaPorcentaje);

    autoTable(doc, {
      startY: y,
      head: [["#", "Descripción", "Cant.", "P. Unit. Neto", "Subtotal Neto"]],
      body: cot.items
        .filter((i) => i.descripcion.trim() !== "")
        .map((item, idx) => [
          String(idx + 1),
          item.descripcion,
          String(item.cantidad),
          formatCLP(item.precioUnitario),
          formatCLP(item.cantidad * item.precioUnitario),
        ]),
      theme: "striped",
      headStyles: { fillColor: [21, 128, 61], fontSize: 9, fontStyle: "bold" },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 10 },
        2: { halign: "center", cellWidth: 15 },
        3: { halign: "right", cellWidth: 35 },
        4: { halign: "right", cellWidth: 35 },
      },
      margin: { left: 14, right: 14 },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 6;

    // Totales
    const colRight = W - 14;
    const colLeft = W - 80;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Subtotal Neto:", colLeft, y);
    doc.text(formatCLP(neto), colRight, y, { align: "right" });
    y += 5;
    doc.text(`IVA (${cot.ivaPorcentaje}%):`, colLeft, y);
    doc.text(formatCLP(iva), colRight, y, { align: "right" });
    y += 5;
    doc.setDrawColor(100);
    doc.line(colLeft, y, colRight, y);
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("TOTAL:", colLeft, y);
    doc.text(formatCLP(total), colRight, y, { align: "right" });
    y += 10;

    // Notas
    if (cot.notas) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Notas:", 14, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(cot.notas, W - 28);
      doc.text(lines, 14, y);
      y += lines.length * 4 + 4;
    }

    // Pie de página
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(130);
    doc.text(
      `Esta cotización es válida hasta el ${format(new Date(cot.vigencia), "dd/MM/yyyy")}. Precios en pesos chilenos.`,
      14,
      pageHeight - 12
    );
    doc.text(`${EMPRESA.nombre} | RUT ${EMPRESA.rut}`, 14, pageHeight - 8);

    doc.save(`${cot.numero}.pdf`);
  } catch (err) {
    console.error("Error al generar PDF:", err);
    alert("No se pudo generar el PDF. Intenta de nuevo.");
  }
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function Cotizaciones() {
  const { cotizaciones, addCotizacion, updateCotizacion, removeCotizacion, ivaPorcentaje } = useStore();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<EstadoCotizacion | "todas">("todas");
  const [form, setForm] = useState<Omit<Cotizacion, "id">>(() => emptyForm(ivaPorcentaje, cotizaciones));

  const filtradas = filtro === "todas" ? cotizaciones : cotizaciones.filter((c) => c.estado === filtro);

  function abrirNueva() {
    setEditingId(null);
    setForm(emptyForm(ivaPorcentaje, cotizaciones));
    setDialogOpen(true);
  }

  function abrirEditar(cot: Cotizacion) {
    setEditingId(cot.id);
    const { id: _id, ...rest } = cot;
    setForm(rest);
    setDialogOpen(true);
  }

  function guardar() {
    if (!form.clienteNombre.trim()) {
      toast({ title: "Falta el nombre del cliente", variant: "destructive" });
      return;
    }
    if (editingId) {
      updateCotizacion(editingId, form);
      toast({ title: "Cotización actualizada" });
    } else {
      addCotizacion({ id: Date.now().toString(), ...form });
      toast({ title: `Cotización ${form.numero} creada` });
    }
    setDialogOpen(false);
  }

  function setItem(idx: number, field: keyof ItemCotizacion, value: string | number) {
    const items = [...form.items];
    (items[idx] as Record<string, unknown>)[field] = value;
    setForm({ ...form, items });
  }

  function agregarItem() {
    setForm({
      ...form,
      items: [...form.items, { id: Date.now().toString(), descripcion: "", cantidad: 1, precioUnitario: 0 }],
    });
  }

  function eliminarItem(idx: number) {
    setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
  }

  const { neto, iva, total } = calcularTotales(form.items, form.ivaPorcentaje);

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xl font-bold tracking-tight">Cotizaciones</h2>
        <Button size="sm" onClick={abrirNueva}>
          <Plus className="h-4 w-4 mr-1" />
          Nueva
        </Button>
      </div>

      {/* Filtros de estado */}
      <div className="flex gap-1.5 flex-wrap px-1">
        {(["todas", "borrador", "enviada", "aceptada", "rechazada"] as const).map((estado) => (
          <button
            key={estado}
            onClick={() => setFiltro(estado)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              filtro === estado
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:border-primary/50"
            }`}
          >
            {estado === "todas" ? "Todas" : ESTADO_CONFIG[estado].label}
            {" "}
            <span className="opacity-70">
              ({estado === "todas" ? cotizaciones.length : cotizaciones.filter((c) => c.estado === estado).length})
            </span>
          </button>
        ))}
      </div>

      {/* Lista */}
      <ScrollArea className="flex-1 -mx-2 px-2">
        <div className="space-y-2 pb-6">
          {filtradas.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <FileText className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm">Sin cotizaciones</p>
              <p className="text-xs mt-1 opacity-70">Haz clic en \"Nueva\" para crear una</p>
            </div>
          )}

          {filtradas.map((cot) => {
            const { total } = calcularTotales(cot.items, cot.ivaPorcentaje);
            const conf = ESTADO_CONFIG[cot.estado];
            return (
              <Card key={cot.id} className="shadow-sm border-border/60">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-bold">{cot.numero}</span>
                        <Badge
                          variant={conf.variant}
                          className={`text-[10px] px-1.5 py-0 h-4 ${
                            cot.estado === "aceptada" ? "bg-green-600 text-white" :
                            cot.estado === "enviada" ? "bg-blue-600 text-white" : ""
                          }`}
                        >
                          {conf.label}
                        </Badge>
                      </div>
                      <div className="text-sm font-medium mt-0.5 truncate">{cot.clienteNombre || <span className="text-muted-foreground italic">Sin cliente</span>}</div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>{format(new Date(cot.fecha), "dd/MM/yyyy")}</span>
                        {cot.clienteRut && <span>{cot.clienteRut}</span>}
                        <span className="font-semibold text-foreground">{formatCLP(total)}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => abrirEditar(cot)}
                        title="Editar"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-primary"
                        onClick={() => descargarPDF(cot)}
                        title="Descargar PDF"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Eliminar">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Eliminar cotización</AlertDialogTitle>
                            <AlertDialogDescription>
                              ¿Eliminar {cot.numero}? Esta acción no se puede deshacer.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground"
                              onClick={() => {
                                removeCotizacion(cot.id);
                                toast({ title: "Cotización eliminada" });
                              }}
                            >
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>

      {/* Dialog crear/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90dvh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-4 pt-4 pb-3 border-b border-border shrink-0">
            <DialogTitle className="text-base">
              {editingId ? `Editar ${form.numero}` : `Nueva Cotización — ${form.numero}`}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0">
            <div className="px-4 py-3 space-y-4">
              {/* Datos básicos */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Fecha</label>
                  <Input
                    type="date"
                    value={form.fecha}
                    onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                    className="h-8 text-sm mt-0.5"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Válida hasta</label>
                  <Input
                    type="date"
                    value={form.vigencia}
                    onChange={(e) => setForm({ ...form, vigencia: e.target.value })}
                    className="h-8 text-sm mt-0.5"
                  />
                </div>
              </div>

              {/* Cliente */}
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Cliente</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2">
                    <label className="text-xs text-muted-foreground">Nombre / Razón Social *</label>
                    <Input
                      value={form.clienteNombre}
                      onChange={(e) => setForm({ ...form, clienteNombre: e.target.value })}
                      placeholder="Empresa o persona"
                      className="h-8 text-sm mt-0.5"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">RUT</label>
                    <Input
                      value={form.clienteRut}
                      onChange={(e) => setForm({ ...form, clienteRut: e.target.value })}
                      placeholder="76.XXX.XXX-X"
                      className="h-8 text-sm mt-0.5"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Email</label>
                    <Input
                      value={form.clienteEmail}
                      onChange={(e) => setForm({ ...form, clienteEmail: e.target.value })}
                      placeholder="correo@empresa.cl"
                      className="h-8 text-sm mt-0.5"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-muted-foreground">Dirección</label>
                    <Input
                      value={form.clienteDireccion}
                      onChange={(e) => setForm({ ...form, clienteDireccion: e.target.value })}
                      placeholder="Calle 123, Ciudad"
                      className="h-8 text-sm mt-0.5"
                    />
                  </div>
                </div>
              </div>

              {/* Ítems */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ítems</div>
                  <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={agregarItem}>
                    <Plus className="h-3 w-3 mr-1" /> Agregar
                  </Button>
                </div>
                <div className="space-y-2">
                  {/* Headers */}
                  <div className="grid grid-cols-[1fr_60px_90px_32px] gap-1.5 text-[10px] text-muted-foreground px-1">
                    <span>Descripción</span>
                    <span className="text-center">Cant.</span>
                    <span className="text-right">P. Unit. Neto</span>
                    <span />
                  </div>
                  {form.items.map((item, idx) => (
                    <div key={item.id} className="grid grid-cols-[1fr_60px_90px_32px] gap-1.5 items-center">
                      <Input
                        value={item.descripcion}
                        onChange={(e) => setItem(idx, "descripcion", e.target.value)}
                        placeholder="Descripción del ítem"
                        className="h-8 text-sm"
                      />
                      <Input
                        type="number"
                        min={1}
                        value={item.cantidad}
                        onChange={(e) => setItem(idx, "cantidad", Math.max(1, Number(e.target.value)))}
                        className="h-8 text-sm text-center"
                      />
                      <Input
                        type="number"
                        min={0}
                        value={item.precioUnitario}
                        onChange={(e) => setItem(idx, "precioUnitario", Math.max(0, Number(e.target.value)))}
                        className="h-8 text-sm text-right"
                        placeholder="0"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => eliminarItem(idx)}
                        disabled={form.items.length === 1}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Totales */}
                <div className="mt-3 border border-border/60 rounded-md p-3 bg-muted/20 space-y-1.5 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal Neto</span>
                    <span>{formatCLP(neto)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground items-center gap-2">
                    <div className="flex items-center gap-1">
                      <span>IVA</span>
                      <Input
                        type="number"
                        value={form.ivaPorcentaje}
                        onChange={(e) => setForm({ ...form, ivaPorcentaje: Number(e.target.value) })}
                        className="h-6 w-14 text-xs text-center"
                      />
                      <span>%</span>
                    </div>
                    <span>{formatCLP(iva)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base border-t border-border pt-1.5 mt-1">
                    <span>TOTAL</span>
                    <span className="text-primary">{formatCLP(total)}</span>
                  </div>
                </div>
              </div>

              {/* Estado y notas */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Estado</label>
                  <select
                    value={form.estado}
                    onChange={(e) => setForm({ ...form, estado: e.target.value as EstadoCotizacion })}
                    className="mt-0.5 w-full h-8 rounded-md border border-input bg-background px-2 text-sm"
                  >
                    <option value="borrador">Borrador</option>
                    <option value="enviada">Enviada</option>
                    <option value="aceptada">Aceptada</option>
                    <option value="rechazada">Rechazada</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Notas (opcional)</label>
                <textarea
                  value={form.notas}
                  onChange={(e) => setForm({ ...form, notas: e.target.value })}
                  placeholder="Condiciones de pago, observaciones..."
                  rows={2}
                  className="mt-0.5 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-border flex justify-end gap-2 shrink-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={guardar}>
              {editingId ? "Guardar cambios" : "Crear cotización"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
