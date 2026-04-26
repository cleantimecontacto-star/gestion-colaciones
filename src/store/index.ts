import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Categoria = string;

export interface ProductoProveedor {
  id: string;
  nombre: string;
  precio: number;
  precioIncluyeIva: boolean;
  unidades: number;
  categoria: Categoria;
  agotado?: boolean;
}

export interface Proveedor {
  id: string;
  nombre: string;
  productos: ProductoProveedor[];
  despachoBase: number;
  despachoKilosBase: number;
  despachoPorKiloExtra: number;
}

export type ModoCobro = "unitario" | "paquete";

export interface Cliente {
  id: string;
  nombre: string;
  rut?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  laboral?: string;
  config: Record<string, number>;
  /** Días cubiertos por semana (lun-jue = 4) */
  diasEntrega: number;
  /** Cantidad de entregas a la semana (lun y mié = 2) */
  entregasPorSemana: number;
  precios: Record<string, number>;
  modoCobro: ModoCobro;
  paquete: {
    /** Productos POR DÍA del paquete */
    unidades: number;
    /** Monto neto POR DÍA del paquete */
    montoNeto: number;
    ivaIncluido: boolean;
  };
}

export type Stock = Record<string, number>;

export interface Transaccion {
  id: string;
  tipo: "compra" | "venta" | "ajuste_stock";
  fecha: string;
  montoNeto: number;
  iva: number;
  montoTotal: number;
  detalles: string;
  stockDelta?: Record<string, number>;
  clienteId?: string;
}

export type EstadoCotizacion = "borrador" | "enviada" | "aceptada" | "rechazada";

export interface ItemCotizacion {
  id: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
}

export interface Cotizacion {
  id: string;
  numero: string;
  fecha: string;
  vigencia: string;
  clienteId?: string;
  clienteNombre: string;
  clienteRut: string;
  clienteEmail: string;
  clienteDireccion: string;
  ot?: string;
  facturaCliente?: string;
  items: ItemCotizacion[];
  estado: EstadoCotizacion;
  notas: string;
  ivaPorcentaje: number;
}

export interface EmpresaConfig {
  nombre: string;
  rut: string;
  giro: string;
  telefono: string;
  email?: string;
  direccion?: string;
  /** Data URL (PNG/JPEG) del logo personalizado para el PDF. Si null, usa el logo por defecto. */
  logoDataUrl: string | null;
}

export interface AppState {
  ivaPorcentaje: number;
  categorias: string[];
  proveedores: Proveedor[];
  clientes: Cliente[];
  stock: Stock;
  historial: Transaccion[];
  cotizaciones: Cotizacion[];
  empresa: EmpresaConfig;

  setIva: (iva: number) => void;
  setEmpresa: (data: Partial<EmpresaConfig>) => void;
  resetEmpresaLogo: () => void;

  // Categorías
  addCategoria: (nombre: string) => void;
  renameCategoria: (oldNombre: string, nuevoNombre: string) => void;
  removeCategoria: (nombre: string) => void;

  // Proveedores
  updateProveedor: (id: string, data: Partial<Proveedor>) => void;
  addProveedor: (proveedor: Proveedor) => void;
  removeProveedor: (id: string) => void;

  // Productos
  updateProductoProveedor: (proveedorId: string, productoId: string, data: Partial<ProductoProveedor>) => void;
  addProductoProveedor: (proveedorId: string, producto: ProductoProveedor) => void;
  removeProductoProveedor: (proveedorId: string, productoId: string) => void;

  // Clientes
  updateCliente: (id: string, data: Partial<Cliente>) => void;
  addCliente: (cliente: Cliente) => void;
  removeCliente: (id: string) => void;

  // Stock
  updateStock: (categoria: string, cantidad: number) => void;
  addStock: (categoria: string, cantidad: number) => void;

  // Transacciones
  registrarCompra: (montoNeto: number, iva: number, montoTotal: number, detalles: string, itemsStock: Record<string, number>) => void;
  registrarVenta: (clienteId: string) => void;
  registrarVentaPersonalizada: (clienteId: string, unidades: Record<string, number>) => void;
  updateTransaccion: (id: string, data: Partial<Pick<Transaccion, "montoTotal" | "detalles" | "fecha">>) => void;
  removeTransaccion: (id: string) => void;

  // Cotizaciones
  addCotizacion: (c: Cotizacion) => void;
  updateCotizacion: (id: string, data: Partial<Cotizacion>) => void;
  removeCotizacion: (id: string) => void;

  resetToDefaults: () => void;
}

const DEFAULT_CATEGORIAS = ["Fruta", "Snack", "Barra"];

const DEFAULT_PROVEEDORES: Proveedor[] = [
  {
    id: "p1",
    nombre: "Proveedor Frutas y Snacks",
    despachoBase: 3000,
    despachoKilosBase: 24,
    despachoPorKiloExtra: 200,
    productos: [
      { id: "prod1", nombre: "Fruta Mix 6 Kg", precio: 11990, precioIncluyeIva: false, unidades: 35, categoria: "Fruta" },
      { id: "prod2", nombre: "Fruta Mix 8 Kg", precio: 14990, precioIncluyeIva: false, unidades: 45, categoria: "Fruta" },
      { id: "prod3", nombre: "Fruta Mix 10 Kg", precio: 18990, precioIncluyeIva: false, unidades: 55, categoria: "Fruta" },
      { id: "prod4", nombre: "Fruta Mix 12 Kg", precio: 21990, precioIncluyeIva: false, unidades: 65, categoria: "Fruta" },
      { id: "prod5", nombre: "Snacks Mix 40 un", precio: 26990, precioIncluyeIva: false, unidades: 40, categoria: "Snack" },
      { id: "prod6", nombre: "Snacks Mix 60 un", precio: 37990, precioIncluyeIva: false, unidades: 60, categoria: "Snack" },
    ],
  },
  {
    id: "p2",
    nombre: "Tribú Mayorista",
    despachoBase: 0,
    despachoKilosBase: 0,
    despachoPorKiloExtra: 0,
    productos: [
      { id: "prod7", nombre: "Barra Cereal 20g caja 150 un", precio: 28500, precioIncluyeIva: true, unidades: 150, categoria: "Barra" },
      { id: "prod8", nombre: "Mix Snack 30g caja 128 un", precio: 42208, precioIncluyeIva: true, unidades: 128, categoria: "Snack" },
    ],
  },
];

const DEFAULT_CLIENTES: Cliente[] = [
  {
    id: "c1",
    nombre: "Cliente Demo",
    diasEntrega: 4,
    entregasPorSemana: 2,
    config: { Fruta: 30, Snack: 10, Barra: 10 },
    precios: { Fruta: 400, Snack: 700, Barra: 500 },
    modoCobro: "paquete",
    paquete: {
      unidades: 50,
      montoNeto: 24000,
      ivaIncluido: false,
    },
  },
];

export const DEFAULT_EMPRESA: EmpresaConfig = {
  nombre: "Comercializadora SerendipiaVK SpA",
  rut: "77.875.974-8",
  giro: "Comercialización de colaciones y alimentación laboral",
  telefono: "+56 9 5239 6823",
  email: "",
  direccion: "",
  logoDataUrl: null,
};

const generateInitialState = () => ({
  ivaPorcentaje: 19,
  categorias: [...DEFAULT_CATEGORIAS],
  proveedores: DEFAULT_PROVEEDORES,
  clientes: DEFAULT_CLIENTES,
  stock: { Fruta: 0, Snack: 0, Barra: 0 } as Stock,
  historial: [] as Transaccion[],
  cotizaciones: [] as Cotizacion[],
  empresa: { ...DEFAULT_EMPRESA },
});

// Helpers para mantener stock/clientes sincronizados con la lista de categorías
function ensureCategoriaInStock(stock: Stock, cat: string): Stock {
  if (stock[cat] === undefined) return { ...stock, [cat]: 0 };
  return stock;
}

function ensureCategoriaInClientes(clientes: Cliente[], cat: string): Cliente[] {
  let mutated = false;
  const next = clientes.map((c) => {
    let cliente = c;
    if (cliente.config[cat] === undefined) {
      cliente = { ...cliente, config: { ...cliente.config, [cat]: 0 } };
      mutated = true;
    }
    if (cliente.precios[cat] === undefined) {
      cliente = { ...cliente, precios: { ...cliente.precios, [cat]: 0 } };
      mutated = true;
    }
    return cliente;
  });
  return mutated ? next : clientes;
}

function syncCategoriasFromProductos(state: AppState): Partial<AppState> {
  const usadas = new Set<string>();
  state.proveedores.forEach((p) =>
    p.productos.forEach((prod) => {
      if (prod.categoria) usadas.add(prod.categoria);
    })
  );

  const categorias = [...state.categorias];
  let nuevoStock = state.stock;
  let nuevosClientes = state.clientes;

  usadas.forEach((cat) => {
    if (!categorias.includes(cat)) categorias.push(cat);
    nuevoStock = ensureCategoriaInStock(nuevoStock, cat);
    nuevosClientes = ensureCategoriaInClientes(nuevosClientes, cat);
  });

  return { categorias, stock: nuevoStock, clientes: nuevosClientes };
}

/** Días que cubre cada entrega (días/sem ÷ entregas/sem) */
export function diasPorEntregaCliente(c: Cliente): number {
  const entregas = Math.max(1, c.entregasPorSemana || 1);
  return Math.max(1, (c.diasEntrega || 1) / entregas);
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...generateInitialState(),

      setIva: (iva) => set({ ivaPorcentaje: iva }),

      setEmpresa: (data) =>
        set((state) => ({ empresa: { ...state.empresa, ...data } })),

      resetEmpresaLogo: () =>
        set((state) => ({ empresa: { ...state.empresa, logoDataUrl: null } })),

      addCategoria: (nombre) => {
        const limpio = nombre.trim();
        if (!limpio) return;
        set((state) => {
          if (state.categorias.includes(limpio)) return state;
          return {
            categorias: [...state.categorias, limpio],
            stock: ensureCategoriaInStock(state.stock, limpio),
            clientes: ensureCategoriaInClientes(state.clientes, limpio),
          };
        });
      },

      renameCategoria: (oldNombre, nuevoNombre) => {
        const limpio = nuevoNombre.trim();
        if (!limpio || oldNombre === limpio) return;
        set((state) => {
          if (!state.categorias.includes(oldNombre)) return state;
          const categorias = state.categorias.map((c) => (c === oldNombre ? limpio : c));
          const stock: Stock = { ...state.stock };
          if (stock[oldNombre] !== undefined) {
            stock[limpio] = (stock[limpio] || 0) + stock[oldNombre];
            delete stock[oldNombre];
          }
          const proveedores = state.proveedores.map((p) => ({
            ...p,
            productos: p.productos.map((prod) =>
              prod.categoria === oldNombre ? { ...prod, categoria: limpio } : prod
            ),
          }));
          const clientes = state.clientes.map((c) => {
            const config = { ...c.config };
            const precios = { ...c.precios };
            if (config[oldNombre] !== undefined) {
              config[limpio] = config[oldNombre];
              delete config[oldNombre];
            }
            if (precios[oldNombre] !== undefined) {
              precios[limpio] = precios[oldNombre];
              delete precios[oldNombre];
            }
            return { ...c, config, precios };
          });
          return { categorias, stock, proveedores, clientes };
        });
      },

      removeCategoria: (nombre) => {
        set((state) => {
          const categorias = state.categorias.filter((c) => c !== nombre);
          const stock: Stock = { ...state.stock };
          delete stock[nombre];
          const clientes = state.clientes.map((c) => {
            const config = { ...c.config };
            const precios = { ...c.precios };
            delete config[nombre];
            delete precios[nombre];
            return { ...c, config, precios };
          });
          // Productos de proveedores con esa categoría: marcar como "Sin categoría"
          const proveedores = state.proveedores.map((p) => ({
            ...p,
            productos: p.productos.map((prod) =>
              prod.categoria === nombre ? { ...prod, categoria: "Sin categoría" } : prod
            ),
          }));
          return { categorias, stock, clientes, proveedores };
        });
      },

      updateProveedor: (id, data) =>
        set((state) => ({
          proveedores: state.proveedores.map((p) => (p.id === id ? { ...p, ...data } : p)),
        })),
      addProveedor: (proveedor) => set((state) => ({ proveedores: [...state.proveedores, proveedor] })),
      removeProveedor: (id) => set((state) => ({ proveedores: state.proveedores.filter((p) => p.id !== id) })),

      updateProductoProveedor: (proveedorId, productoId, data) =>
        set((state) => {
          const proveedores = state.proveedores.map((p) =>
            p.id === proveedorId
              ? {
                  ...p,
                  productos: p.productos.map((prod) =>
                    prod.id === productoId ? { ...prod, ...data } : prod
                  ),
                }
              : p
          );
          // Si cambió la categoría a una nueva, registrarla
          if (data.categoria) {
            return { proveedores, ...syncCategoriasFromProductos({ ...state, proveedores } as AppState) };
          }
          return { proveedores };
        }),

      addProductoProveedor: (proveedorId, producto) =>
        set((state) => {
          const proveedores = state.proveedores.map((p) =>
            p.id === proveedorId ? { ...p, productos: [...p.productos, producto] } : p
          );
          return { proveedores, ...syncCategoriasFromProductos({ ...state, proveedores } as AppState) };
        }),

      removeProductoProveedor: (proveedorId, productoId) =>
        set((state) => ({
          proveedores: state.proveedores.map((p) =>
            p.id === proveedorId
              ? { ...p, productos: p.productos.filter((prod) => prod.id !== productoId) }
              : p
          ),
        })),

      updateCliente: (id, data) =>
        set((state) => ({
          clientes: state.clientes.map((c) => (c.id === id ? { ...c, ...data } : c)),
        })),
      addCliente: (cliente) =>
        set((state) => {
          // Asegurar que tenga todas las categorías actuales
          const config = { ...cliente.config };
          const precios = { ...cliente.precios };
          state.categorias.forEach((cat) => {
            if (config[cat] === undefined) config[cat] = 0;
            if (precios[cat] === undefined) precios[cat] = 0;
          });
          return {
            clientes: [
              ...state.clientes,
              {
                ...cliente,
                entregasPorSemana: Math.max(1, cliente.entregasPorSemana || 2),
                config,
                precios,
              },
            ],
          };
        }),
      removeCliente: (id) => set((state) => ({ clientes: state.clientes.filter((c) => c.id !== id) })),

      updateStock: (categoria, cantidad) =>
        set((state) => ({ stock: { ...state.stock, [categoria]: cantidad } })),
      addStock: (categoria, cantidad) =>
        set((state) => ({
          stock: { ...state.stock, [categoria]: (state.stock[categoria] || 0) + cantidad },
        })),

      registrarCompra: (montoNeto, iva, montoTotal, detalles, itemsStock) =>
        set((state) => {
          const nuevoStock: Stock = { ...state.stock };
          Object.entries(itemsStock).forEach(([cat, cant]) => {
            nuevoStock[cat] = (nuevoStock[cat] || 0) + (cant || 0);
          });
          return {
            historial: [
              {
                id: Date.now().toString(),
                tipo: "compra",
                fecha: new Date().toISOString(),
                montoNeto,
                iva,
                montoTotal,
                detalles,
                stockDelta: { ...itemsStock },
              },
              ...state.historial,
            ],
            stock: nuevoStock,
          };
        }),

      registrarVenta: (clienteId) =>
        set((state) => {
          const cliente = state.clientes.find((c) => c.id === clienteId);
          if (!cliente) return state;

          const diasPorEntrega = diasPorEntregaCliente(cliente);
          const unidadesPorCat: Record<string, number> = {};
          state.categorias.forEach((cat) => {
            unidadesPorCat[cat] = (cliente.config[cat] || 0) * diasPorEntrega;
          });

          const ivaPct = state.ivaPorcentaje;
          let totalBruto: number;
          let neto: number;
          let ivaMonto: number;

          if (cliente.modoCobro === "paquete") {
            // El monto del paquete está en formato POR DÍA → escalar a la entrega
            const netoEntrega = cliente.paquete.ivaIncluido
              ? (cliente.paquete.montoNeto / (1 + ivaPct / 100)) * diasPorEntrega
              : cliente.paquete.montoNeto * diasPorEntrega;
            neto = netoEntrega;
            ivaMonto = neto * (ivaPct / 100);
            totalBruto = neto + ivaMonto;
          } else {
            totalBruto = state.categorias.reduce(
              (sum, cat) => sum + unidadesPorCat[cat] * (cliente.precios[cat] || 0),
              0
            );
            neto = totalBruto / (1 + ivaPct / 100);
            ivaMonto = totalBruto - neto;
          }

          const partes: string[] = [];
          state.categorias.forEach((cat) => {
            if (unidadesPorCat[cat] > 0) partes.push(`${unidadesPorCat[cat]} ${cat}`);
          });

          const stockDelta: Record<string, number> = {};
          const nuevoStock: Stock = { ...state.stock };
          state.categorias.forEach((cat) => {
            const u = unidadesPorCat[cat];
            stockDelta[cat] = -u;
            nuevoStock[cat] = Math.max(0, (nuevoStock[cat] || 0) - u);
          });

          return {
            historial: [
              {
                id: Date.now().toString(),
                tipo: "venta",
                fecha: new Date().toISOString(),
                montoNeto: neto,
                iva: ivaMonto,
                montoTotal: totalBruto,
                detalles: `Entrega a ${cliente.nombre}${partes.length ? ` (${partes.join(", ")})` : ""}`,
                clienteId: cliente.id,
                stockDelta,
              },
              ...state.historial,
            ],
            stock: nuevoStock,
          };
        }),

      registrarVentaPersonalizada: (clienteId, unidades) =>
        set((state) => {
          const cliente = state.clientes.find((c) => c.id === clienteId);
          if (!cliente) return state;

          const ivaPct = state.ivaPorcentaje;
          const unidadesLimpias: Record<string, number> = {};
          Object.entries(unidades).forEach(([cat, val]) => {
            unidadesLimpias[cat] = Math.max(0, Math.floor(val));
          });

          let totalBruto: number;
          let neto: number;
          let ivaMonto: number;

          if (cliente.modoCobro === "paquete") {
            // Cobro proporcional al total de unidades respecto a la entrega estándar.
            const diasPorEntrega = diasPorEntregaCliente(cliente);
            const unidadesEstandarEntrega = (cliente.paquete.unidades || 0) * diasPorEntrega;
            const unidadesEntregadas = Object.values(unidadesLimpias).reduce(
              (a, b) => a + b,
              0
            );
            const factor =
              unidadesEstandarEntrega > 0
                ? unidadesEntregadas / unidadesEstandarEntrega
                : 1;

            const netoEstandarEntrega = cliente.paquete.ivaIncluido
              ? (cliente.paquete.montoNeto / (1 + ivaPct / 100)) * diasPorEntrega
              : cliente.paquete.montoNeto * diasPorEntrega;

            neto = netoEstandarEntrega * factor;
            ivaMonto = neto * (ivaPct / 100);
            totalBruto = neto + ivaMonto;
          } else {
            totalBruto = Object.entries(unidadesLimpias).reduce(
              (sum, [cat, u]) => sum + u * (cliente.precios[cat] || 0),
              0
            );
            neto = totalBruto / (1 + ivaPct / 100);
            ivaMonto = totalBruto - neto;
          }

          const partes: string[] = [];
          Object.entries(unidadesLimpias).forEach(([cat, u]) => {
            if (u > 0) partes.push(`${u} ${cat}`);
          });

          const stockDelta: Record<string, number> = {};
          const nuevoStock: Stock = { ...state.stock };
          Object.entries(unidadesLimpias).forEach(([cat, u]) => {
            stockDelta[cat] = -u;
            nuevoStock[cat] = Math.max(0, (nuevoStock[cat] || 0) - u);
          });

          return {
            historial: [
              {
                id: Date.now().toString(),
                tipo: "venta",
                fecha: new Date().toISOString(),
                montoNeto: neto,
                iva: ivaMonto,
                montoTotal: totalBruto,
                detalles:
                  partes.length > 0
                    ? `Entrega a ${cliente.nombre} (${partes.join(", ")})`
                    : `Entrega a ${cliente.nombre} (sin unidades)`,
                clienteId: cliente.id,
                stockDelta,
              },
              ...state.historial,
            ],
            stock: nuevoStock,
          };
        }),

      updateTransaccion: (id, data) =>
        set((state) => ({
          historial: state.historial.map((tx) => {
            if (tx.id !== id) return tx;
            const updated: Transaccion = { ...tx, ...data };
            if (data.montoTotal !== undefined) {
              const ivaPct = state.ivaPorcentaje;
              const neto = data.montoTotal / (1 + ivaPct / 100);
              updated.montoTotal = data.montoTotal;
              updated.montoNeto = neto;
              updated.iva = data.montoTotal - neto;
            }
            return updated;
          }),
        })),

      removeTransaccion: (id) =>
        set((state) => {
          const tx = state.historial.find((t) => t.id === id);
          if (!tx) return state;
          const delta = tx.stockDelta || {};
          const nuevoStock: Stock = { ...state.stock };
          Object.entries(delta).forEach(([cat, val]) => {
            nuevoStock[cat] = Math.max(0, (nuevoStock[cat] || 0) - (val || 0));
          });
          return {
            historial: state.historial.filter((t) => t.id !== id),
            stock: nuevoStock,
          };
        }),

      addCotizacion: (c) => set((state) => ({ cotizaciones: [c, ...state.cotizaciones] })),
      updateCotizacion: (id, data) =>
        set((state) => ({
          cotizaciones: state.cotizaciones.map((c) => (c.id === id ? { ...c, ...data } : c)),
        })),
      removeCotizacion: (id) =>
        set((state) => ({ cotizaciones: state.cotizaciones.filter((c) => c.id !== id) })),

      resetToDefaults: () => set(generateInitialState()),
    }),
    {
      name: "gestion-colaciones-storage",
      version: 7,
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as Partial<AppState> & {
          stock?: Record<string, number> | { fruta?: number; snack?: number; barra?: number };
          clientes?: any[];
          historial?: any[];
        };
        if (!state) return persistedState as unknown as AppState;

        if (version < 2 && Array.isArray(state.clientes)) {
          state.clientes = state.clientes.map((c: any) => ({
            ...c,
            modoCobro: c.modoCobro ?? "unitario",
            paquete: c.paquete ?? { unidades: 50, montoNeto: 24000, ivaIncluido: false },
          }));
        }
        if (version < 3) {
          state.cotizaciones = state.cotizaciones ?? [];
        }
        if (version < 4) {
          // Migrar stock fixed → dynamic
          const oldStock = (state.stock || {}) as { fruta?: number; snack?: number; barra?: number };
          state.stock = {
            Fruta: oldStock.fruta ?? 0,
            Snack: oldStock.snack ?? 0,
            Barra: oldStock.barra ?? 0,
          };
          // Migrar clientes
          if (Array.isArray(state.clientes)) {
            state.clientes = state.clientes.map((c: any) => {
              const oldConfig = c.config || {};
              const oldPrecios = c.precios || {};
              return {
                ...c,
                config: {
                  Fruta: oldConfig.frutas ?? oldConfig.Fruta ?? 0,
                  Snack: oldConfig.snacks ?? oldConfig.Snack ?? 0,
                  Barra: oldConfig.barras ?? oldConfig.Barra ?? 0,
                },
                precios: {
                  Fruta: oldPrecios.fruta ?? oldPrecios.Fruta ?? 0,
                  Snack: oldPrecios.snack ?? oldPrecios.Snack ?? 0,
                  Barra: oldPrecios.barra ?? oldPrecios.Barra ?? 0,
                },
              };
            });
          }
          // Migrar historial.stockDelta
          if (Array.isArray(state.historial)) {
            state.historial = state.historial.map((t: any) => {
              if (!t.stockDelta) return t;
              const old = t.stockDelta as { fruta?: number; snack?: number; barra?: number };
              const nueva: Record<string, number> = {};
              if (old.fruta !== undefined) nueva.Fruta = old.fruta;
              if (old.snack !== undefined) nueva.Snack = old.snack;
              if (old.barra !== undefined) nueva.Barra = old.barra;
              return { ...t, stockDelta: nueva };
            });
          }
          state.categorias = state.categorias ?? [...DEFAULT_CATEGORIAS];
        }
        if (version < 5 && Array.isArray(state.clientes)) {
          state.clientes = state.clientes.map((c: any) => ({
            ...c,
            entregasPorSemana: c.entregasPorSemana ?? 2,
          }));
        }
        // v6: optional fields rut/email/telefono/direccion/laboral on Cliente,
        //     optional ot/facturaCliente/clienteId on Cotizacion — no migration needed
        if (version < 7) {
          state.empresa = state.empresa ?? { ...DEFAULT_EMPRESA };
        }
        return state as AppState;
      },
    }
  )
);
