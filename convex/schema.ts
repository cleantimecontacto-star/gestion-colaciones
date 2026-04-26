import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Empresa - singleton (only 1 row at a time)
  empresa: defineTable({
    nombre: v.string(),
    rut: v.string(),
    giro: v.string(),
    telefono: v.string(),
    email: v.optional(v.string()),
    direccion: v.optional(v.string()),
    logoDataUrl: v.optional(v.string()),
  }),

  // Configuración global key/value (ej: ivaPorcentaje)
  settings: defineTable({
    key: v.string(),
    value: v.any(),
  }).index("by_key", ["key"]),

  // Categorías
  categorias: defineTable({
    nombre: v.string(),
  }).index("by_nombre", ["nombre"]),

  // Stock por categoría
  stock: defineTable({
    categoria: v.string(),
    cantidad: v.number(),
  }).index("by_categoria", ["categoria"]),

  // Proveedores con productos anidados
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

  // Clientes
  clientes: defineTable({
    nombre: v.string(),
    rut: v.optional(v.string()),
    email: v.optional(v.string()),
    telefono: v.optional(v.string()),
    direccion: v.optional(v.string()),
    laboral: v.optional(v.string()),
    config: v.any(), // Record<string, number>
    diasEntrega: v.number(),
    entregasPorSemana: v.number(),
    precios: v.any(), // Record<string, number>
    modoCobro: v.union(v.literal("unitario"), v.literal("paquete")),
    paquete: v.object({
      unidades: v.number(),
      montoNeto: v.number(),
      ivaIncluido: v.boolean(),
    }),
  }),

  // Historial de transacciones
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

  // Cotizaciones
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
