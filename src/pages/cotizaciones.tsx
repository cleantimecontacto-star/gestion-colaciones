import { useState } from "react";
import { useStore, type Cotizacion, type ItemCotizacion, type EstadoCotizacion, type EmpresaConfig } from "@/store";
import { Label } from "@/components/ui/label";
import { formatCLP } from "@/lib/format";
import { format, addDays } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Download, Edit2, FileText, FileSpreadsheet, Eye } from "lucide-react";
import * as XLSX from "xlsx";
import logoSerendipia from "@/assets/logo-serendipia.png";
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

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 32 32" fill="currentColor" className={className} aria-hidden="true">
    <path d="M19.11 17.205c-.372 0-1.088 1.39-1.518 1.39a.63.63 0 0 1-.315-.1c-.802-.45-1.504-.901-2.156-1.504-.151-.15-.301-.301-.45-.451-.521-.521-.971-1.04-1.391-1.695-.15-.211-.301-.421-.301-.661 0-.301.211-.451.421-.601.21-.15.451-.301.601-.451.15-.15.21-.301.301-.451.06-.151.06-.301.06-.451 0-.15-.06-.301-.121-.451-.06-.15-.601-1.45-.871-2.155-.18-.451-.421-.601-.601-.601-.18 0-.421-.06-.661-.06-.21 0-.541.06-.871.421-.301.301-1.181 1.18-1.181 2.853 0 1.66.871 3.286 1.181 3.557.301.301 3.586 5.738 8.766 7.494 1.21.451 2.156.661 2.881.871.961.301 1.831.241 2.521.121.781-.121 2.402-.961 2.732-1.901.301-.961.301-1.781.211-1.96-.061-.121-.301-.181-.601-.301-.301-.12-1.781-.871-2.062-.961-.301-.121-.481-.181-.661.181-.18.301-.781.961-.961 1.18-.18.211-.301.241-.601.121zM26.811 5.244C24.142 2.566 20.589 1.076 16.836 1.076c-7.726 0-14.012 6.286-14.012 14.012 0 2.521.66 4.943 1.93 7.104L1.5 30.555l8.555-2.521c2.062 1.121 4.434 1.781 6.781 1.781 7.726 0 14.012-6.287 14.012-14.012 0-3.752-1.49-7.305-4.038-10.014zM16.836 26.799c-2.121 0-4.183-.541-6.013-1.601l-.421-.241-4.434 1.181 1.181-4.314-.301-.45c-1.181-1.902-1.781-4.073-1.781-6.336 0-6.488 5.342-11.83 11.83-11.83 3.135 0 6.094 1.211 8.314 3.434 2.221 2.222 3.434 5.18 3.434 8.314-.061 6.547-5.402 11.844-11.809 11.844z"/>
  </svg>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  clienteId: undefined,
  clienteNombre: "",
  clienteRut: "",
  clienteEmail: "",
  clienteDireccion: "",
  ot: "",
  facturaCliente: "",
  items: [{ id: Date.now().toString(), descripcion: "", cantidad: 1, precioUnitario: 0 }],
  estado: "borrador",
  notas: "",
  ivaPorcentaje,
});

// ─── PDF ──────────────────────────────────────────────────────────────────────

let _defaultLogoDataUrl: string | null = null;
async function getDefaultLogoDataUrl(): Promise<string | null> {
  if (_defaultLogoDataUrl) return _defaultLogoDataUrl;
  try {
    const res = await fetch(logoSerendipia);
    const blob = await res.blob();
    _defaultLogoDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    return _defaultLogoDataUrl;
  } catch {
    return null;
  }
}

async function getLogoDataUrl(empresa: EmpresaConfig): Promise<string | null> {
  if (empresa.logoDataUrl) return empresa.logoDataUrl;
  return getDefaultLogoDataUrl();
}

/** Lee el aspect ratio de un data URL/PNG (devuelve width/height). */
function getImageAspect(dataUrl: string): Promise<number> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth / Math.max(1, img.naturalHeight));
    img.onerror = () => resolve(1800 / 700); // fallback al lockup por defecto
    img.src = dataUrl;
  });
}

async function construirPDF(cot: Cotizacion, empresa: EmpresaConfig) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ unit: "mm", format: "letter" });
    const W = doc.internal.pageSize.getWidth();
    let y = 18;

    // Logo empresa (preferentemente con nombre incluido)
    const logo = await getLogoDataUrl(empresa);
    const isCustomLogo = !!empresa.logoDataUrl;
    let logoBottom = y - 4;
    let logoRight = 14;
    if (logo) {
      try {
        const aspect = await getImageAspect(logo);
        // Si es cuadrado-ish lo tratamos como icono (más chico).
        // Si es panorámico lo tratamos como lockup (más ancho).
        const isWide = aspect > 1.4;
        const logoH = isWide ? 22 : 26;
        const logoW = logoH * aspect;
        doc.addImage(logo, "PNG", 14, y - 4, logoW, logoH);
        logoBottom = y - 4 + logoH;
        logoRight = 14 + logoW;
      } catch {
        // ignore image errors, fall back to text-only header
      }
    }

    // Si el logo es custom y posiblemente NO incluye el nombre, lo escribimos al lado.
    // Para el logo por defecto (lockup), evitamos duplicar.
    const textX = logo ? logoRight + 6 : 14;
    let infoY = y;
    if (isCustomLogo) {
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text(empresa.nombre, textX, infoY);
      infoY += 6;
    }
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    if (empresa.rut)       { doc.text(`RUT: ${empresa.rut}`, textX, infoY); infoY += 4; }
    if (empresa.giro)      { doc.text(empresa.giro, textX, infoY); infoY += 4; }
    if (empresa.telefono)  { doc.text(`Tel: ${empresa.telefono}`, textX, infoY); infoY += 4; }
    if (empresa.email)     { doc.text(empresa.email, textX, infoY); infoY += 4; }
    if (empresa.direccion) { doc.text(empresa.direccion, textX, infoY); infoY += 4; }

    y = Math.max(logoBottom, infoY) + 4;

    // Título cotización
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(`COTIZACIÓN Nº ${cot.numero}`, 14, y);
    y += 6;

    // Fechas + OT
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Fecha: ${format(new Date(cot.fecha), "dd/MM/yyyy")}`, 14, y);
    doc.text(`Válida hasta: ${format(new Date(cot.vigencia), "dd/MM/yyyy")}`, 90, y);
    doc.text(`Estado: ${ESTADO_CONFIG[cot.estado].label}`, W - 55, y);
    y += 5;
    if (cot.ot) {
      doc.setFont("helvetica", "bold");
      doc.text(`OT: ${cot.ot}`, 14, y);
      doc.setFont("helvetica", "normal");
      y += 4;
    }
    if (cot.facturaCliente) {
      doc.text(`Factura cliente: ${cot.facturaCliente}`, 14, y);
      y += 4;
    }
    y += 4;

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
    doc.text(`${empresa.nombre} | RUT ${empresa.rut} | Tel ${empresa.telefono}`, 14, pageHeight - 8);

  return doc;
}

async function descargarPDF(cot: Cotizacion, empresa: EmpresaConfig) {
  try {
    const doc = await construirPDF(cot, empresa);
    doc.save(`${cot.numero}.pdf`);
  } catch (err) {
    console.error("Error al generar PDF:", err);
    alert("No se pudo generar el PDF. Intenta de nuevo.");
  }
}

function buildWhatsAppMensaje(cot: Cotizacion, empresa: EmpresaConfig): string {
  const { total } = calcularTotales(cot.items, cot.ivaPorcentaje);
  const cliente = cot.clienteNombre || "estimado(a) cliente";
  return (
    `Hola ${cliente}, te comparto la cotización ${cot.numero} de ${empresa.nombre}.\n` +
    `Fecha: ${format(new Date(cot.fecha), "dd/MM/yyyy")}\n` +
    `Válida hasta: ${format(new Date(cot.vigencia), "dd/MM/yyyy")}\n` +
    `Total (IVA incl.): ${formatCLP(total)}\n\n` +
    `Adjunto el PDF con el detalle. Cualquier consulta, quedo atento.\n` +
    `${empresa.nombre} · Tel ${empresa.telefono}`
  );
}

async function compartirWhatsApp(cot: Cotizacion, empresa: EmpresaConfig, onInfo?: (msg: string) => void) {
  try {
    const doc = await construirPDF(cot, empresa);
    const blob = doc.output("blob");
    const filename = `${cot.numero}.pdf`;
    const file = new File([blob], filename, { type: "application/pdf" });
    const texto = buildWhatsAppMensaje(cot, empresa);

    const nav = navigator as Navigator & {
      canShare?: (data?: ShareData) => boolean;
      share?: (data: ShareData) => Promise<void>;
    };

    if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
      try {
        await nav.share({
          files: [file],
          title: `Cotización ${cot.numero}`,
          text: texto,
        });
        return;
      } catch (err) {
        if ((err as DOMException)?.name === "AbortError") return;
      }
    }

    doc.save(filename);
    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    onInfo?.("PDF descargado. Adjúntalo en el chat de WhatsApp que se abrió.");
  } catch (err) {
    console.error("Error al compartir por WhatsApp:", err);
    alert("No se pudo compartir la cotización. Intenta de nuevo.");
  }
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function Cotizaciones() {
  const { cotizaciones, addCotizacion, updateCotizacion, removeCotizacion, ivaPorcentaje, clientes, empresa } = useStore();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<EstadoCotizacion | "todas">("todas");
  const [form, setForm] = useState<Omit<Cotizacion, "id">>(() => emptyForm(ivaPorcentaje, cotizaciones));

  const filtradas = filtro === "todas" ? cotizaciones : cotizaciones.filter((c) => c.estado === filtro);
  const [verCot, setVerCot] = useState<Cotizacion | null>(null);

  function abrirNueva() {
    setEditingId(null);
    setForm(emptyForm(ivaPorcentaje, cotizaciones));
    setDialogOpen(true);
  }

  function exportarExcel() {
    if (cotizaciones.length === 0) return;

    const round = (n: number) => Math.round(n);
    const fechaFmt = (iso: string) => format(new Date(iso), "dd-MM-yyyy");

    const resumenRows = cotizaciones.map((c) => {
      const { neto, iva, total } = calcularTotales(c.items, c.ivaPorcentaje);
      return {
        Número: c.numero,
        Fecha: fechaFmt(c.fecha),
        "Válida hasta": fechaFmt(c.vigencia),
        Estado: ESTADO_CONFIG[c.estado].label,
        Cliente: c.clienteNombre,
        RUT: c.clienteRut,
        Email: c.clienteEmail,
        Dirección: c.clienteDireccion,
        OT: c.ot || "",
        "Factura Cliente": c.facturaCliente || "",
        "IVA %": c.ivaPorcentaje,
        Neto: round(neto),
        IVA: round(iva),
        Total: round(total),
        Notas: c.notas,
      };
    });

    const itemsRows: Record<string, string | number>[] = [];
    cotizaciones.forEach((c) => {
      c.items
        .filter((it) => it.descripcion.trim() !== "")
        .forEach((it, idx) => {
          itemsRows.push({
            Cotización: c.numero,
            Cliente: c.clienteNombre,
            Fecha: fechaFmt(c.fecha),
            Estado: ESTADO_CONFIG[c.estado].label,
            "#": idx + 1,
            Descripción: it.descripcion,
            Cantidad: it.cantidad,
            "P. Unit. Neto": round(it.precioUnitario),
            "Subtotal Neto": round(it.cantidad * it.precioUnitario),
          });
        });
    });

    const totalesPorEstado = (["borrador", "enviada", "aceptada", "rechazada"] as const).map((est) => {
      const lista = cotizaciones.filter((c) => c.estado === est);
      const sumaTotal = lista.reduce((a, c) => {
        const { total } = calcularTotales(c.items, c.ivaPorcentaje);
        return a + total;
      }, 0);
      return {
        Estado: ESTADO_CONFIG[est].label,
        Cantidad: lista.length,
        "Monto total (c/IVA)": round(sumaTotal),
      };
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumenRows), "Cotizaciones");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(itemsRows), "Ítems detallados");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(totalesPorEstado), "Totales por estado");

    XLSX.writeFile(wb, `cotizaciones-serendipia-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
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
    (items[idx] as unknown as Record<string, unknown>)[field] = value;
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
      <div className="flex items-center justify-between px-1 gap-2">
        <h2 className="text-xl font-bold tracking-tight">Cotizaciones</h2>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8"
            onClick={exportarExcel}
            disabled={cotizaciones.length === 0}
            title="Exportar todas las cotizaciones a Excel"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 sm:mr-1" />
            <span className="hidden sm:inline">Excel</span>
          </Button>
          <Button size="sm" onClick={abrirNueva}>
            <Plus className="h-4 w-4 mr-1" />
            Nueva
          </Button>
        </div>
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
      <ScrollArea className="flex-1 min-w-0 max-w-full">
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
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                        <span>{format(new Date(cot.fecha), "dd/MM/yyyy")}</span>
                        {cot.clienteRut && <span>{cot.clienteRut}</span>}
                        {cot.ot && <span className="font-mono bg-muted rounded px-1">OT: {cot.ot}</span>}
                        {cot.facturaCliente && <span className="font-mono bg-muted rounded px-1">Fctr: {cot.facturaCliente}</span>}
                        <span className="font-semibold text-foreground">{formatCLP(total)}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => setVerCot(cot)}
                        className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                        title="Ver cotización"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
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
                        onClick={() => descargarPDF(cot, empresa)}
                        title="Descargar PDF"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-[#25D366]"
                        onClick={() =>
                          compartirWhatsApp(cot, empresa, (msg) =>
                            toast({ title: "Compartir cotización", description: msg })
                          )
                        }
                        title="Compartir por WhatsApp"
                      >
                        <WhatsAppIcon className="h-4 w-4" />
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

      {/* Dialog preview */}
      <Dialog open={verCot !== null} onOpenChange={(o) => { if (!o) setVerCot(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{verCot?.numero}</span>
              {verCot && (
                <Badge
                  variant={ESTADO_CONFIG[verCot.estado].variant}
                  className={`text-[10px] px-1.5 py-0 h-4 ${
                    verCot.estado === "aceptada" ? "bg-green-600 text-white" :
                    verCot.estado === "enviada" ? "bg-blue-600 text-white" : ""
                  }`}
                >
                  {ESTADO_CONFIG[verCot.estado].label}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {verCot && (() => {
            const { neto, iva, total } = calcularTotales(verCot.items, verCot.ivaPorcentaje);
            return (
              <div className="space-y-3 text-sm">
                {/* Fechas */}
                <div className="flex gap-4 text-muted-foreground">
                  <span>📅 {format(new Date(verCot.fecha), 'dd/MM/yyyy')}</span>
                  <span>⏳ Válida hasta {format(new Date(verCot.vigencia), 'dd/MM/yyyy')}</span>
                </div>
                {/* Cliente */}
                <div className="rounded-lg bg-muted/40 p-3 space-y-1">
                  <p className="font-medium text-foreground">{verCot.clienteNombre || 'Sin cliente'}</p>
                  {verCot.clienteRut && <p className="text-muted-foreground">RUT: {verCot.clienteRut}</p>}
                  {verCot.clienteEmail && <p className="text-muted-foreground">{verCot.clienteEmail}</p>}
                  {verCot.clienteDireccion && <p className="text-muted-foreground">{verCot.clienteDireccion}</p>}
                  {verCot.ot && <p className="text-muted-foreground">OT: {verCot.ot}</p>}
                  {verCot.facturaCliente && <p className="text-muted-foreground">Factura: {verCot.facturaCliente}</p>}
                </div>
                {/* Ítems */}
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/60 text-muted-foreground">
                        <th className="text-left p-2 font-medium">Descripción</th>
                        <th className="text-center p-2 font-medium w-12">Cant.</th>
                        <th className="text-right p-2 font-medium w-24">P. Unit.</th>
                        <th className="text-right p-2 font-medium w-24">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {verCot.items.filter(i => i.descripcion.trim()).map((item, idx) => (
                        <tr key={idx} className="border-t border-border">
                          <td className="p-2 text-foreground">{item.descripcion}</td>
                          <td className="p-2 text-center text-muted-foreground">{item.cantidad}</td>
                          <td className="p-2 text-right text-muted-foreground">{formatCLP(item.precioUnitario)}</td>
                          <td className="p-2 text-right text-foreground">{formatCLP(item.cantidad * item.precioUnitario)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Totales */}
                <div className="space-y-1 border-t border-border pt-3">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal Neto</span><span>{formatCLP(neto)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>IVA ({verCot.ivaPorcentaje}%)</span><span>{formatCLP(iva)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-foreground">
                    <span>TOTAL</span><span>{formatCLP(total)}</span>
                  </div>
                </div>
                {/* Notas */}
                {verCot.notas && (
                  <p className="text-xs text-muted-foreground border-t border-border pt-2">{verCot.notas}</p>
                )}
                {/* Acciones */}
                <div className="flex gap-2 justify-end pt-2">
                  <Button size="sm" onClick={() => descargarPDF(verCot, empresa)}>
                    <Download className="h-3 w-3 mr-1" /> PDF
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setVerCot(null)}>
                    Cerrar
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

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
                  {clientes.length > 0 && (
                    <div className="col-span-2">
                      <label className="text-xs text-muted-foreground">Seleccionar cliente registrado</label>
                      <select
                        value={form.clienteId ?? ""}
                        onChange={(e) => {
                          const id = e.target.value;
                          if (!id) {
                            setForm({ ...form, clienteId: undefined });
                            return;
                          }
                          const c = clientes.find((cl) => cl.id === id);
                          if (c) {
                            setForm({
                              ...form,
                              clienteId: c.id,
                              clienteNombre: c.nombre,
                              clienteRut: c.rut || "",
                              clienteEmail: c.email || "",
                              clienteDireccion: c.direccion || "",
                            });
                          }
                        }}
                        className="mt-0.5 w-full h-8 rounded-md border border-input bg-background px-2 text-sm"
                      >
                        <option value="">— Ingreso manual —</option>
                        {clientes.map((c) => (
                          <option key={c.id} value={c.id}>{c.nombre}{c.rut ? ` (${c.rut})` : ""}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="col-span-2">
                    <label className="text-xs text-muted-foreground">Nombre / Razón Social *</label>
                    <Input
                      value={form.clienteNombre}
                      onChange={(e) => setForm({ ...form, clienteNombre: e.target.value, clienteId: undefined })}
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

              {/* OT y Factura */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">OT (Orden de Trabajo)</Label>
                  <Input
                    value={form.ot ?? ""}
                    onChange={(e) => setForm({ ...form, ot: e.target.value })}
                    placeholder="Ej: OT-2024-001"
                    className="h-8 text-sm mt-0.5"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Factura Cliente</Label>
                  <Input
                    value={form.facturaCliente ?? ""}
                    onChange={(e) => setForm({ ...form, facturaCliente: e.target.value })}
                    placeholder="Nº factura emitida por cliente"
                    className="h-8 text-sm mt-0.5"
                  />
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
