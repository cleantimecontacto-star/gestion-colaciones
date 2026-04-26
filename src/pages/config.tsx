import { useState } from "react";
import { useStore, type ProductoProveedor } from "@/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EditableNumber } from "@/components/EditableNumber";
import { EditableText } from "@/components/EditableText";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Truck, Tag, Copy, Building2, Image as ImageIcon, Upload, RotateCcw } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { formatCLP } from "@/lib/format";
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

export default function Config() {
  const {
    ivaPorcentaje,
    setIva,
    categorias,
    addCategoria,
    renameCategoria,
    removeCategoria,
    proveedores,
    addProveedor,
    updateProveedor,
    removeProveedor,
    addProductoProveedor,
    updateProductoProveedor,
    removeProductoProveedor,
    resetToDefaults,
    empresa,
    setEmpresa,
    resetEmpresaLogo,
  } = useStore();
  const { toast } = useToast();
  const [nuevaCategoria, setNuevaCategoria] = useState("");

  const handleLogoUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Archivo inválido",
        description: "Selecciona una imagen (PNG, JPG o WebP).",
        variant: "destructive",
      });
      return;
    }
    if (file.size > 1.5 * 1024 * 1024) {
      toast({
        title: "Imagen muy pesada",
        description: "El logo debe pesar menos de 1.5 MB.",
        variant: "destructive",
      });
      return;
    }
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = () => reject(r.error);
        r.readAsDataURL(file);
      });
      setEmpresa({ logoDataUrl: dataUrl });
      toast({
        title: "Logo actualizado",
        description: "Se aplicará en los próximos PDFs que generes.",
      });
    } catch {
      toast({
        title: "Error al cargar el logo",
        description: "No se pudo procesar la imagen.",
        variant: "destructive",
      });
    }
  };

  const handleAddCategoria = () => {
    const limpio = nuevaCategoria.trim();
    if (!limpio) return;
    if (categorias.includes(limpio)) {
      toast({
        title: "Categoría existente",
        description: `Ya existe la categoría "${limpio}".`,
        variant: "destructive",
      });
      return;
    }
    addCategoria(limpio);
    toast({ title: "Categoría agregada", description: `"${limpio}" lista para usar.` });
    setNuevaCategoria("");
  };

  const handleCategoriaChange = (proveedorId: string, prod: ProductoProveedor, value: string) => {
    if (value === "__nueva__") {
      const nombre = window.prompt("Nombre de la nueva categoría (ej: Galletones)");
      const limpio = (nombre || "").trim();
      if (!limpio) return;
      if (!categorias.includes(limpio)) addCategoria(limpio);
      updateProductoProveedor(proveedorId, prod.id, { categoria: limpio });
    } else {
      updateProductoProveedor(proveedorId, prod.id, { categoria: value });
    }
  };

  const handleReset = () => {
    if (
      confirm(
        "¿Estás seguro de borrar todos los datos y restaurar la configuración inicial? Esta acción no se puede deshacer."
      )
    ) {
      resetToDefaults();
      toast({
        title: "Datos restaurados",
        description: "Se ha vuelto a la configuración inicial de fábrica.",
      });
    }
  };

  const handleAddProveedor = () => {
    addProveedor({
      id: `p${Date.now()}`,
      nombre: "Nuevo Proveedor",
      despachoBase: 0,
      despachoKilosBase: 0,
      despachoPorKiloExtra: 0,
      productos: [],
    });
    toast({
      title: "Proveedor agregado",
      description: 'Se creó "Nuevo Proveedor". Tocá su nombre para editarlo.',
    });
  };

  const handleAddProducto = (proveedorId: string) => {
    const prov = proveedores.find((p) => p.id === proveedorId);
    addProductoProveedor(proveedorId, {
      id: `prod${Date.now()}`,
      nombre: "Nuevo Producto",
      precio: 0,
      precioIncluyeIva: false,
      unidades: 1,
      categoria: categorias[0] || "Sin categoría",
    });
    toast({
      title: "Producto agregado",
      description: prov
        ? `Se creó "Nuevo Producto" en ${prov.nombre}. Editá nombre y precio.`
        : 'Se creó "Nuevo Producto". Editá nombre y precio.',
    });
  };

  const handleDuplicarProducto = (proveedorId: string, prod: ProductoProveedor) => {
    addProductoProveedor(proveedorId, {
      ...prod,
      id: `prod${Date.now()}`,
      nombre: `${prod.nombre} (copia)`,
    });
    toast({
      title: "Producto duplicado",
      description: `Se creó "${prod.nombre} (copia)" con el mismo precio y unidades.`,
    });
  };

  const handleEditNeto = (
    proveedorId: string,
    prod: ProductoProveedor,
    nuevoNeto: number
  ) => {
    const nuevoPrecio = prod.precioIncluyeIva
      ? Math.round(nuevoNeto * (1 + ivaPorcentaje / 100))
      : Math.round(nuevoNeto);
    updateProductoProveedor(proveedorId, prod.id, { precio: nuevoPrecio });
  };

  const handleEditBruto = (
    proveedorId: string,
    prod: ProductoProveedor,
    nuevoBruto: number
  ) => {
    const nuevoPrecio = prod.precioIncluyeIva
      ? Math.round(nuevoBruto)
      : Math.round(nuevoBruto / (1 + ivaPorcentaje / 100));
    updateProductoProveedor(proveedorId, prod.id, { precio: nuevoPrecio });
  };

  return (
    <div className="flex flex-col h-full gap-4">
      <h2 className="text-xl font-bold tracking-tight px-1">Configuración</h2>

      <ScrollArea className="flex-1 min-w-0 max-w-full">
        <div className="space-y-4 pb-6">
          <Card className="shadow-sm">
            <CardHeader className="p-3 border-b border-border/50">
              <CardTitle className="text-base">Impuestos y General</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4 text-sm">
              <div className="flex justify-between items-center">
                <span>Porcentaje IVA (%)</span>
                <span className="font-bold bg-muted px-2 py-1 rounded">
                  <EditableNumber value={ivaPorcentaje} onChange={setIva} />
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm" data-testid="card-empresa">
            <CardHeader className="p-3 border-b border-border/50">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" /> Datos de empresa
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Estos datos aparecen automáticamente en cada PDF de cotización y en los mensajes de WhatsApp.
              </p>
            </CardHeader>
            <CardContent className="p-4 space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Razón social</label>
                  <Input
                    value={empresa.nombre}
                    onChange={(e) => setEmpresa({ nombre: e.target.value })}
                    placeholder="Comercializadora SerendipiaVK SpA"
                    data-testid="input-empresa-nombre"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">RUT</label>
                  <Input
                    value={empresa.rut}
                    onChange={(e) => setEmpresa({ rut: e.target.value })}
                    placeholder="77.875.974-8"
                    data-testid="input-empresa-rut"
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-medium text-muted-foreground">Giro</label>
                  <Input
                    value={empresa.giro}
                    onChange={(e) => setEmpresa({ giro: e.target.value })}
                    placeholder="Comercialización de colaciones y alimentación laboral"
                    data-testid="input-empresa-giro"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Teléfono</label>
                  <Input
                    value={empresa.telefono}
                    onChange={(e) => setEmpresa({ telefono: e.target.value })}
                    placeholder="+56 9 5239 6823"
                    data-testid="input-empresa-telefono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Email</label>
                  <Input
                    type="email"
                    value={empresa.email ?? ""}
                    onChange={(e) => setEmpresa({ email: e.target.value })}
                    placeholder="contacto@serendipia.cl"
                    data-testid="input-empresa-email"
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-medium text-muted-foreground">Dirección</label>
                  <Input
                    value={empresa.direccion ?? ""}
                    onChange={(e) => setEmpresa({ direccion: e.target.value })}
                    placeholder="Calle, número, comuna, ciudad"
                    data-testid="input-empresa-direccion"
                  />
                </div>
              </div>

              <div className="border-t border-border/50 pt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Logo para el PDF</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Si no subes nada, se usa el logo por defecto de Serendipia. Para mejor calidad, sube un PNG con fondo transparente o blanco. Tamaño máximo: 1.5 MB.
                </p>
                <div className="flex items-start gap-4 flex-wrap">
                  <div className="w-32 h-32 rounded-md border border-border bg-muted/30 flex items-center justify-center overflow-hidden shrink-0">
                    {empresa.logoDataUrl ? (
                      <img
                        src={empresa.logoDataUrl}
                        alt="Logo personalizado"
                        className="max-w-full max-h-full object-contain"
                        data-testid="img-empresa-logo"
                      />
                    ) : (
                      <div className="text-center text-[10px] text-muted-foreground px-2">
                        Sin logo personalizado
                        <div className="mt-1 text-muted-foreground/70">(se usa el de Serendipia)</div>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <label>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleLogoUpload(f);
                          e.target.value = "";
                        }}
                        data-testid="input-empresa-logo-file"
                      />
                      <Button asChild variant="default" size="sm" className="cursor-pointer">
                        <span><Upload className="h-3.5 w-3.5 mr-1.5" /> {empresa.logoDataUrl ? "Cambiar logo" : "Subir logo"}</span>
                      </Button>
                    </label>
                    {empresa.logoDataUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          resetEmpresaLogo();
                          toast({ title: "Logo restaurado", description: "Se volvió al logo por defecto." });
                        }}
                        data-testid="button-empresa-logo-reset"
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Restaurar por defecto
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="p-3 border-b border-border/50">
              <CardTitle className="text-base flex items-center gap-2">
                <Tag className="h-4 w-4" /> Categorías de productos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2 text-sm">
              <p className="text-xs text-muted-foreground">
                Crea nuevas categorías como "Galletones" o "Bebidas". Se aplican automáticamente al
                stock, clientes y compras. También puedes crear una categoría asignándosela a un
                producto desde el selector de cada producto.
              </p>
              <div className="flex gap-2">
                <Input
                  value={nuevaCategoria}
                  onChange={(e) => setNuevaCategoria(e.target.value)}
                  placeholder="Ej: Galletones"
                  className="h-8 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCategoria();
                    }
                  }}
                  data-testid="input-nueva-categoria"
                />
                <Button
                  size="sm"
                  onClick={handleAddCategoria}
                  className="h-8 shrink-0"
                  data-testid="button-add-categoria"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Agregar
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {categorias.map((cat) => (
                  <div
                    key={cat}
                    className="flex items-center gap-1 bg-muted/40 rounded-md pl-2 pr-1 py-0.5 text-xs"
                    data-testid={`categoria-${cat}`}
                  >
                    <EditableText
                      value={cat}
                      onChange={(v) => {
                        const limpio = v.trim();
                        if (!limpio || limpio === cat) return;
                        if (categorias.includes(limpio)) {
                          toast({
                            title: "Categoría existente",
                            description: `Ya existe "${limpio}".`,
                            variant: "destructive",
                          });
                          return;
                        }
                        renameCategoria(cat, limpio);
                      }}
                    />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 text-destructive"
                          data-testid={`button-remove-categoria-${cat}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Eliminar categoría</AlertDialogTitle>
                          <AlertDialogDescription>
                            Vas a eliminar "{cat}". Los productos con esta categoría quedarán como
                            "Sin categoría", y se borrarán las unidades de stock asociadas.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => removeCategoria(cat)}
                            className="bg-destructive text-destructive-foreground"
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
                {categorias.length === 0 && (
                  <span className="text-xs text-muted-foreground">Sin categorías aún.</span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="p-3 border-b border-border/50 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="h-4 w-4" /> Proveedores y Productos
              </CardTitle>
              <Button
                size="sm"
                onClick={handleAddProveedor}
                className="h-7"
                data-testid="button-add-proveedor"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Proveedor
              </Button>
            </CardHeader>
            <CardContent className="p-3 space-y-3 text-sm">
              {proveedores.length === 0 && (
                <div className="text-xs text-muted-foreground text-center py-6">
                  Sin proveedores. Agrega uno con el botón de arriba.
                </div>
              )}

              {proveedores.map((prov) => (
                <div
                  key={prov.id}
                  className="border border-border/60 rounded-lg overflow-hidden"
                >
                  <div className="bg-muted/40 p-2.5 flex items-center justify-between gap-2">
                    <div className="font-semibold text-sm flex-1 min-w-0">
                      <EditableText
                        value={prov.nombre}
                        onChange={(v) => updateProveedor(prov.id, { nombre: v })}
                      />
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          data-testid={`button-remove-proveedor-${prov.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Eliminar proveedor</AlertDialogTitle>
                          <AlertDialogDescription>
                            Vas a eliminar "{prov.nombre}" y todos sus productos.
                            Esta acción no se puede deshacer.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => removeProveedor(prov.id)}
                            className="bg-destructive text-destructive-foreground"
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>

                  <div className="p-2.5 grid grid-cols-3 gap-2 text-xs bg-background border-b border-border/40">
                    <div>
                      <div className="text-muted-foreground mb-0.5">Despacho base</div>
                      <EditableNumber
                        value={prov.despachoBase}
                        isCurrency
                        onChange={(v) => updateProveedor(prov.id, { despachoBase: v })}
                      />
                    </div>
                    <div>
                      <div className="text-muted-foreground mb-0.5">Kg incluidos</div>
                      <EditableNumber
                        value={prov.despachoKilosBase}
                        onChange={(v) => updateProveedor(prov.id, { despachoKilosBase: v })}
                      />
                    </div>
                    <div>
                      <div className="text-muted-foreground mb-0.5">$/kg extra</div>
                      <EditableNumber
                        value={prov.despachoPorKiloExtra}
                        isCurrency
                        onChange={(v) => updateProveedor(prov.id, { despachoPorKiloExtra: v })}
                      />
                    </div>
                  </div>

                  <div className="divide-y divide-border/40">
                    {prov.productos.map((prod) => {
                      const neto = prod.precioIncluyeIva
                        ? prod.precio / (1 + ivaPorcentaje / 100)
                        : prod.precio;
                      const bruto = prod.precioIncluyeIva
                        ? prod.precio
                        : prod.precio * (1 + ivaPorcentaje / 100);
                      const costoUnit = prod.unidades > 0 ? bruto / prod.unidades : 0;

                      return (
                        <div key={prod.id} className="p-2.5 space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 min-w-0 font-medium text-sm">
                              <EditableText
                                value={prod.nombre}
                                onChange={(v) =>
                                  updateProductoProveedor(prov.id, prod.id, { nombre: v })
                                }
                              />
                            </div>
                            <select
                              value={categorias.includes(prod.categoria) ? prod.categoria : ""}
                              onChange={(e) => handleCategoriaChange(prov.id, prod, e.target.value)}
                              className="text-xs h-7 rounded border border-input bg-background px-1.5 max-w-[120px]"
                              data-testid={`select-categoria-${prod.id}`}
                            >
                              {!categorias.includes(prod.categoria) && (
                                <option value="">{prod.categoria || "Sin categoría"}</option>
                              )}
                              {categorias.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                              <option value="__nueva__">+ Nueva…</option>
                            </select>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleDuplicarProducto(prov.id, prod)}
                              data-testid={`button-duplicar-producto-${prod.id}`}
                              title="Duplicar producto"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive"
                                  data-testid={`button-remove-producto-${prod.id}`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Eliminar producto</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Vas a eliminar "{prod.nombre}" del proveedor "
                                    {prov.nombre}".
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() =>
                                      removeProductoProveedor(prov.id, prod.id)
                                    }
                                    className="bg-destructive text-destructive-foreground"
                                  >
                                    Eliminar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>

                          <div className="grid grid-cols-4 gap-2 text-xs">
                            <div>
                              <div className="text-muted-foreground mb-0.5">Un. caja</div>
                              <EditableNumber
                                value={prod.unidades}
                                onChange={(v) =>
                                  updateProductoProveedor(prov.id, prod.id, { unidades: v })
                                }
                              />
                            </div>
                            <div>
                              <div className="text-muted-foreground mb-0.5">Neto caja</div>
                              <EditableNumber
                                value={Math.round(neto)}
                                isCurrency
                                onChange={(v) => handleEditNeto(prov.id, prod, v)}
                              />
                            </div>
                            <div>
                              <div className="text-muted-foreground mb-0.5">
                                C/IVA caja
                              </div>
                              <EditableNumber
                                value={Math.round(bruto)}
                                isCurrency
                                onChange={(v) => handleEditBruto(prov.id, prod, v)}
                              />
                            </div>
                            <div>
                              <div className="text-muted-foreground mb-0.5">$/un</div>
                              <div className="font-bold text-primary">
                                {formatCLP(costoUnit)}
                              </div>
                            </div>
                          </div>

                          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                            <Checkbox
                              checked={prod.precioIncluyeIva}
                              onCheckedChange={(v) =>
                                updateProductoProveedor(prov.id, prod.id, {
                                  precioIncluyeIva: v === true,
                                })
                              }
                              data-testid={`checkbox-iva-${prod.id}`}
                            />
                            El precio guardado ya incluye IVA
                          </label>
                          <label className="flex items-center gap-2 text-xs cursor-pointer">
                            <Checkbox
                              checked={!!prod.agotado}
                              onCheckedChange={(v) =>
                                updateProductoProveedor(prov.id, prod.id, {
                                  agotado: v === true,
                                })
                              }
                              data-testid={`checkbox-agotado-${prod.id}`}
                            />
                            <span className={prod.agotado ? "text-amber-700 dark:text-amber-400 font-medium" : "text-muted-foreground"}>
                              {prod.agotado ? "Agotado (oculto en Compras)" : "Marcar como agotado"}
                            </span>
                          </label>
                        </div>
                      );
                    })}

                    <div className="p-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full h-7 text-xs"
                        onClick={() => handleAddProducto(prov.id)}
                        data-testid={`button-add-producto-${prov.id}`}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Agregar producto
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-sm border-destructive/30">
            <CardHeader className="p-3 border-b border-border/50">
              <CardTitle className="text-base text-destructive">Zona de Peligro</CardTitle>
            </CardHeader>
            <CardContent className="p-4 text-sm">
              <p className="text-muted-foreground mb-4">
                Borrar todos los datos locales (clientes, historial, stock) y restaurar a los
                valores por defecto.
              </p>
              <Button variant="destructive" className="w-full" onClick={handleReset}>
                <Trash2 className="h-4 w-4 mr-2" />
                Restaurar Fábrica
              </Button>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
