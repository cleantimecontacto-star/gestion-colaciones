import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  /**
   * Estado completo de la app, guardado como JSON.
   * Único registro con id "default" (singleton).
   * Se reemplaza en cada cambio (last-write-wins por timestamp).
   */
  appState: defineTable({
    docId: v.string(),
    data: v.any(),
    ts: v.number(),
  }).index("by_doc", ["docId"]),

  // Tablas reservadas para futura migración granular (no usadas todavía)
  empresa: defineTable({
    nombre: v.string(),
    rut: v.string(),
    giro: v.string(),
    telefono: v.string(),
    email: v.optional(v.string()),
    direccion: v.optional(v.string()),
    logoDataUrl: v.optional(v.string()),
  }),
  settings: defineTable({
    key: v.string(),
    value: v.any(),
  }).index("by_key", ["key"]),
  categorias: defineTable({
    nombre: v.string(),
  }).index("by_nombre", ["nombre"]),
  stock: defineTable({
    categoria: v.string(),
    cantidad: v.number(),
  }).index("by_categoria", ["categoria"]),
  proveedores: defineTable({
    nombre: v.string(),
    despachoBase: v.number(),
    despachoKilosBase: v.number(),
    despachoPorKiloExtra: v.number(),
    productos: v.array(
      v.object({
        id: v.string(),
        nombre: v.string(),
        precio: v.number(),
        precioIncluyeIva: v.boolean(),
        unidades: v.number(),
        categoria: v.string(),
        agotado: v.optional(v.boolean()),
      })
    ),
  }),
  clientes: defineTable({
    nombre: v.string(),
    rut: v.optional(v.string()),
    email: v.optional(v.string()),
    telefono: v.optional(v.string()),
    direccion: v.optional(v.string()),
    laboral: v.optional(v.string()),
    config: v.any(),
    diasEntrega: v.number(),
    entregasPorSemana: v.number(),
    precios: v.any(),
    modoCobro: v.union(v.literal("unitario"), v.literal("paquete")),
    paquete: v.object({
      unidades: v.number(),
      montoNeto: v.number(),
      ivaIncluido: v.boolean(),
    }),
  }),
  historial: defineTable({
    tipo: v.union(
      v.literal("compra"),
      v.literal("venta"),
      v.literal("ajuste_stock")
    ),
    fecha: v.string(),
    montoNeto: v.number(),
    iva: v.number(),
    montoTotal: v.number(),
    detalles: v.string(),
    stockDelta: v.optional(v.any()),
    clienteId: v.optional(v.string()),
  }).index("by_fecha", ["fecha"]),
  cotizaciones: defineTable({
    numero: v.string(),
    fecha: v.string(),
    vigencia: v.string(),
    clienteId: v.optional(v.string()),
    clienteNombre: v.string(),
    clienteRut: v.string(),
    clienteEmail: v.string(),
    clienteDireccion: v.string(),
    ot: v.optional(v.string()),
    facturaCliente: v.optional(v.string()),
    items: v.array(
      v.object({
        id: v.string(),
        descripcion: v.string(),
        cantidad: v.number(),
        precioUnitario: v.number(),
      })
    ),
    estado: v.union(
      v.literal("borrador"),
      v.literal("enviada"),
      v.literal("aceptada"),
      v.literal("rechazada")
    ),
    notas: v.string(),
    ivaPorcentaje: v.number(),
  }).index("by_numero", ["numero"]),
});
