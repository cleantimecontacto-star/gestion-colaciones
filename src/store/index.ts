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

export type PapeleraTipo =
  | "cliente"
  | "proveedor"
  | "producto"
  | "transaccion"
  | "cotizacion";

export interface PapeleraItem {
  pid: string;
  tipo: PapeleraTipo;
  fecha: string;
  resumen: string;
  data: any;
  /** Para productos: id del proveedor al que pertenecía */
  parentId?: string;
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
  papelera: PapeleraItem[];

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
  registrarVentaPersonalizada: (clienteId: string, unidades: Record<string, number>, montoNetoOverride?: number, nota?: string) => void;
  updateTransaccion: (id: string, data: Partial<Pick<Transaccion, "montoTotal" | "detalles" | "fecha">>) => void;
  removeTransaccion: (id: string) => void;

  // Cotizaciones
  addCotizacion: (c: Cotizacion) => void;
  updateCotizacion: (id: string, data: Partial<Cotizacion>) => void;
  removeCotizacion: (id: string) => void;

  // Papelera
  restorePapelera: (pid: string) => void;
  removeFromPapelera: (pid: string) => void;
  vaciarPapelera: () => void;

  resetToDefaults: () => void;
}

const DEFAULT_CATEGORIAS = ["Dulces", "Salados"];

const DEFAULT_PROVEEDORES: Proveedor[] = [
  {
    id: "sra-loyda",
    nombre: "Sra Loyda",
    despachoBase: 0,
    despachoKilosBase: 0,
    despachoPorKiloExtra: 0,
    productos: [
      { id: "sl-01", nombre: "Cachitos",                       precio: 200, precioIncluyeIva: false, unidades: 1, categoria: "Dulces" },
      { id: "sl-02", nombre: "Berlines fritos",                precio: 200, precioIncluyeIva: false, unidades: 1, categoria: "Dulces" },
      { id: "sl-03", nombre: "Berlines horno",                 precio: 250, precioIncluyeIva: false, unidades: 1, categoria: "Dulces" },
      { id: "sl-04", nombre: "Profiteroles",                   precio: 200, precioIncluyeIva: false, unidades: 1, categoria: "Dulces" },
      { id: "sl-05", nombre: "Éclair",                         precio: 300, precioIncluyeIva: false, unidades: 1, categoria: "Dulces" },
      { id: "sl-06", nombre: "Mini brazo reina",               precio: 300, precioIncluyeIva: false, unidades: 1, categoria: "Dulces" },
      { id: "sl-07", nombre: "Donas bañadas",                  precio: 200, precioIncluyeIva: false, unidades: 1, categoria: "Dulces" },
      { id: "sl-08", nombre: "Donas mil hojas",                precio: 200, precioIncluyeIva: false, unidades: 1, categoria: "Dulces" },
      { id: "sl-09", nombre: "Pañuelitos",                     precio: 300, precioIncluyeIva: false, unidades: 1, categoria: "Dulces" },
      { id: "sl-10", nombre: "Mini alfajor chocolate",         precio: 250, precioIncluyeIva: false, unidades: 1, categoria: "Dulces" },
      { id: "sl-11", nombre: "Mini alfajor maizena",           precio: 200, precioIncluyeIva: false, unidades: 1, categoria: "Dulces" },
      { id: "sl-12", nombre: "Mantecados",                     precio: 150, precioIncluyeIva: false, unidades: 1, categoria: "Dulces" },
      { id: "sl-13", nombre: "Mini chilenitos",                precio: 250, precioIncluyeIva: false, unidades: 1, categoria: "Dulces" },
      { id: "sl-14", nombre: "Mini chilenitos mil hojas",      precio: 250, precioIncluyeIva: false, unidades: 1, categoria: "Dulces" },
      { id: "sl-15", nombre: "Empanadas mil hojas",            precio: 400, precioIncluyeIva: false, unidades: 1, categoria: "Dulces" },
      { id: "sl-16", nombre: "Mini empolvado",                 precio: 300, precioIncluyeIva: false, unidades: 1, categoria: "Dulces" },
      { id: "sl-17", nombre: "Mini kuguen",                    precio: 400, precioIncluyeIva: false, unidades: 1, categoria: "Dulces" },
      { id: "sl-18", nombre: "Mini tartaleta",                 precio: 400, precioIncluyeIva: false, unidades: 1, categoria: "Dulces" },
      { id: "sl-19", nombre: "Mini pie limón",                 precio: 400, precioIncluyeIva: false, unidades: 1, categoria: "Dulces" },
      { id: "sl-20", nombre: "Keipop",                         precio: 250, precioIncluyeIva: false, unidades: 1, categoria: "Dulces" },
      { id: "sl-21", nombre: "Capquei",                        precio: 250, precioIncluyeIva: false, unidades: 1, categoria: "Dulces" },
      { id: "sl-22", nombre: "Mini torta yogurt",              precio: 300, precioIncluyeIva: false, unidades: 1, categoria: "Dulces" },
    ],
  },
  {
    id: "produccion-propia",
    nombre: "Producción propia",
    despachoBase: 0,
    despachoKilosBase: 0,
    despachoPorKiloExtra: 0,
    productos: [
      { id: "pp-01", nombre: "Brownie banana cacao",                precio: 0, precioIncluyeIva: false, unidades: 1, categoria: "Dulces" },
      { id: "pp-02", nombre: "Brownie normal",                      precio: 0, precioIncluyeIva: false, unidades: 1, categoria: "Dulces" },
      { id: "pp-03", nombre: "Tapadito ave mayo ciboulette",        precio: 0, precioIncluyeIva: false, unidades: 1, categoria: "Salados" },
      { id: "pp-04", nombre: "Tapadito huevo mayo palmito",         precio: 0, precioIncluyeIva: false, unidades: 1, categoria: "Salados" },
      { id: "pp-05", nombre: "Tapadito huevo mayo palta",           precio: 0, precioIncluyeIva: false, unidades: 1, categoria: "Salados" },
      { id: "pp-06", nombre: "Tapadito carne queso",                precio: 0, precioIncluyeIva: false, unidades: 1, categoria: "Salados" },
      { id: "pp-07", nombre: "Tapadito lechuga tomate carne",       precio: 0, precioIncluyeIva: false, unidades: 1, categoria: "Salados" },
      { id: "pp-08", nombre: "Tapadito tomate queso albahaca",      precio: 0, precioIncluyeIva: false, unidades: 1, categoria: "Salados" },
      { id: "pp-09", nombre: "Tapadito queso crema aceituna salame",precio: 0, precioIncluyeIva: false, unidades: 1, categoria: "Salados" },
      { id: "pp-10", nombre: "Tapadito choclo palmito mayo",        precio: 0, precioIncluyeIva: false, unidades: 1, categoria: "Salados" },
      { id: "pp-11", nombre: "Mini pizza base",                     precio: 0, precioIncluyeIva: false, unidades: 1, categoria: "Salados" },
    ],
  },
];

const DEFAULT_CLIENTES: Cliente[] = [
  {
    id: "c1",
    nombre: "Cliente Demo",
    diasEntrega: 4,
    entregasPorSemana: 2,
    config: { Dulces: 50, Salados: 50 },
    precios: { Dulces: 700, Salados: 700 },
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
  stock: { Dulces: 0, Salados: 0 } as Stock,
  historial: [] as Transaccion[],
  cotizaciones: [] as Cotizacion[],
  empresa: { ...DEFAULT_EMPRESA },
  papelera: [] as PapeleraItem[],
});

function makePid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

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
      removeProveedor: (id) =>
        set((state) => {
          const prov = state.proveedores.find((p) => p.id === id);
          if (!prov) return state;
          const item: PapeleraItem = {
            pid: makePid(),
            tipo: "proveedor",
            fecha: new Date().toISOString(),
            resumen: prov.nombre || "Proveedor",
            data: prov,
          };
          return {
            proveedores: state.proveedores.filter((p) => p.id !== id),
            papelera: [item, ...(state.papelera || [])],
          };
        }),

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
        set((state) => {
          const prov = state.proveedores.find((p) => p.id === proveedorId);
          const prod = prov?.productos.find((x) => x.id === productoId);
          const proveedores = state.proveedores.map((p) =>
            p.id === proveedorId
              ? { ...p, productos: p.productos.filter((x) => x.id !== productoId) }
              : p
          );
          if (!prod) return { proveedores };
          const item: PapeleraItem = {
            pid: makePid(),
            tipo: "producto",
            fecha: new Date().toISOString(),
            resumen: `${prod.nombre}${prov ? ` (${prov.nombre})` : ""}`,
            data: prod,
            parentId: proveedorId,
          };
          return { proveedores, papelera: [item, ...(state.papelera || [])] };
        }),

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
      removeCliente: (id) =>
        set((state) => {
          const cli = state.clientes.find((c) => c.id === id);
          if (!cli) return state;
          const item: PapeleraItem = {
            pid: makePid(),
            tipo: "cliente",
            fecha: new Date().toISOString(),
            resumen: cli.nombre || "Cliente",
            data: cli,
          };
          return {
            clientes: state.clientes.filter((c) => c.id !== id),
            papelera: [item, ...(state.papelera || [])],
          };
        }),

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

      registrarVentaPersonalizada: (clienteId, unidades, montoNetoOverride, nota) =>
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
            if (montoNetoOverride !== undefined && montoNetoOverride >= 0) {
              // Usar el monto neto ingresado manualmente por el usuario
              neto = montoNetoOverride;
            } else {
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
            }
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
                detalles: (() => {
                  const base = partes.length > 0
                    ? `Entrega a ${cliente.nombre} (${partes.join(", ")})`
                    : `Entrega a ${cliente.nombre} (sin unidades)`;
                  return nota ? `${base} — ${nota}` : base;
                })(),
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
          const item: PapeleraItem = {
            pid: makePid(),
            tipo: "transaccion",
            fecha: new Date().toISOString(),
            resumen: `${tx.tipo === "compra" ? "Compra" : tx.tipo === "venta" ? "Venta" : "Ajuste"} — ${tx.detalles || ""}`.trim(),
            data: tx,
          };
          return {
            historial: state.historial.filter((t) => t.id !== id),
            stock: nuevoStock,
            papelera: [item, ...(state.papelera || [])],
          };
        }),

      addCotizacion: (c) => set((state) => ({ cotizaciones: [c, ...state.cotizaciones] })),
      updateCotizacion: (id, data) =>
        set((state) => ({
          cotizaciones: state.cotizaciones.map((c) => (c.id === id ? { ...c, ...data } : c)),
        })),
      removeCotizacion: (id) =>
        set((state) => {
          const cot = state.cotizaciones.find((c) => c.id === id);
          if (!cot) return state;
          const item: PapeleraItem = {
            pid: makePid(),
            tipo: "cotizacion",
            fecha: new Date().toISOString(),
            resumen: `Cotización ${cot.numero || ""} — ${cot.clienteNombre || ""}`.trim(),
            data: cot,
          };
          return {
            cotizaciones: state.cotizaciones.filter((c) => c.id !== id),
            papelera: [item, ...(state.papelera || [])],
          };
        }),

      restorePapelera: (pid) =>
        set((state) => {
          const item = (state.papelera || []).find((x) => x.pid === pid);
          if (!item) return state;
          const papelera = (state.papelera || []).filter((x) => x.pid !== pid);
          switch (item.tipo) {
            case "cliente": {
              const cli = item.data as Cliente;
              if (state.clientes.some((c) => c.id === cli.id)) return { papelera };
              return { papelera, clientes: [...state.clientes, cli] };
            }
            case "proveedor": {
              const prov = item.data as Proveedor;
              if (state.proveedores.some((p) => p.id === prov.id)) return { papelera };
              return { papelera, proveedores: [...state.proveedores, prov] };
            }
            case "producto": {
              const prod = item.data as ProductoProveedor;
              const parentId = item.parentId;
              const target = state.proveedores.find((p) => p.id === parentId);
              if (!target) return { papelera };
              if (target.productos.some((x) => x.id === prod.id)) return { papelera };
              const proveedores = state.proveedores.map((p) =>
                p.id === parentId ? { ...p, productos: [...p.productos, prod] } : p
              );
              return { papelera, proveedores };
            }
            case "transaccion": {
              const tx = item.data as Transaccion;
              if (state.historial.some((t) => t.id === tx.id)) return { papelera };
              const delta = tx.stockDelta || {};
              const nuevoStock: Stock = { ...state.stock };
              Object.entries(delta).forEach(([cat, val]) => {
                nuevoStock[cat] = Math.max(0, (nuevoStock[cat] || 0) + (val || 0));
              });
              return {
                papelera,
                historial: [tx, ...state.historial],
                stock: nuevoStock,
              };
            }
            case "cotizacion": {
              const cot = item.data as Cotizacion;
              if (state.cotizaciones.some((c) => c.id === cot.id)) return { papelera };
              return { papelera, cotizaciones: [cot, ...state.cotizaciones] };
            }
            default:
              return { papelera };
          }
        }),

      removeFromPapelera: (pid) =>
        set((state) => ({
          papelera: (state.papelera || []).filter((x) => x.pid !== pid),
        })),

      vaciarPapelera: () => set({ papelera: [] }),

      resetToDefaults: () => set(generateInitialState()),
    }),
    {
      name: "gestion-colaciones-storage",
      version: 9,
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
        if (version < 8) {
          (state as any).papelera = (state as any).papelera ?? [];
        }
        if (version < 9) {
          // Reemplaza proveedores con los datos reales de Sra Loyda + Producción propia.
          // Clientes, historial, cotizaciones y empresa se conservan intactos.
          state.proveedores = DEFAULT_PROVEEDORES;
          state.categorias = [...DEFAULT_CATEGORIAS];
          // Asegurar que stock tenga las categorías nuevas
          const st = (state.stock || {}) as Record<string, number>;
          if (st["Dulces"] === undefined) st["Dulces"] = 0;
          if (st["Salados"] === undefined) st["Salados"] = 0;
          state.stock = st;
          // Asegurar que los clientes existentes tengan las nuevas categorías
          if (Array.isArray(state.clientes)) {
            state.clientes = state.clientes.map((c: any) => ({
              ...c,
              config: { Dulces: c.config?.Dulces ?? 0, Salados: c.config?.Salados ?? 0 },
              precios: { Dulces: c.precios?.Dulces ?? 700, Salados: c.precios?.Salados ?? 700 },
            }));
          }
        }
        return state as AppState;
      },
    }
  )
);
