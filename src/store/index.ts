import { create } from "zustand";
import { persist } from "zustand/middleware";
import { addDays, startOfWeek, subWeeks } from "date-fns";

export type Categoria = "Fruta" | "Snack" | "Barra";

export interface ProductoProveedor {
  id: string;
  nombre: string;
  precio: number;
  precioIncluyeIva: boolean;
  unidades: number;
  categoria: Categoria;
}

export interface Proveedor {
  id: string;
  nombre: string;
  productos: ProductoProveedor[];
  despachoBase: number; // neto
  despachoKilosBase: number;
  despachoPorKiloExtra: number;
}

export type ModoCobro = "unitario" | "paquete";

export interface Cliente {
  id: string;
  nombre: string;
  config: {
    frutas: number;
    snacks: number;
    barras: number;
  };
  diasEntrega: number; // por semana
  precios: {
    fruta: number;
    snack: number;
    barra: number;
  };
  modoCobro: ModoCobro;
  paquete: {
    unidades: number;
    montoNeto: number;
    ivaIncluido: boolean;
  };
}

export interface Stock {
  fruta: number;
  snack: number;
  barra: number;
}

export interface Transaccion {
  id: string;
  tipo: "compra" | "venta" | "ajuste_stock";
  fecha: string;
  montoNeto: number;
  iva: number;
  montoTotal: number;
  detalles: string;
  stockDelta?: Partial<Stock>;
  clienteId?: string;
}

export interface AppState {
  ivaPorcentaje: number;
  proveedores: Proveedor[];
  clientes: Cliente[];
  stock: Stock;
  historial: Transaccion[];
  
  // Actions
  setIva: (iva: number) => void;
  
  // Proveedores
  updateProveedor: (id: string, data: Partial<Proveedor>) => void;
  addProveedor: (proveedor: Proveedor) => void;
  removeProveedor: (id: string) => void;
  
  // Productos Proveedor
  updateProductoProveedor: (proveedorId: string, productoId: string, data: Partial<ProductoProveedor>) => void;
  addProductoProveedor: (proveedorId: string, producto: ProductoProveedor) => void;
  removeProductoProveedor: (proveedorId: string, productoId: string) => void;
  
  // Clientes
  updateCliente: (id: string, data: Partial<Cliente>) => void;
  addCliente: (cliente: Cliente) => void;
  removeCliente: (id: string) => void;
  
  // Stock
  updateStock: (categoria: keyof Stock, cantidad: number) => void;
  addStock: (categoria: keyof Stock, cantidad: number) => void;
  
  // Transacciones
  registrarCompra: (montoNeto: number, iva: number, montoTotal: number, detalles: string, itemsStock: Partial<Stock>) => void;
  registrarVenta: (clienteId: string) => void;
  registrarVentaPersonalizada: (clienteId: string, unidades: { fruta: number; snack: number; barra: number }) => void;
  updateTransaccion: (id: string, data: Partial<Pick<Transaccion, "montoTotal" | "detalles" | "fecha">>) => void;
  removeTransaccion: (id: string) => void;
  
  // Reset
  resetToDefaults: () => void;
}

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
    ]
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
    ]
  }
];

const DEFAULT_CLIENTES: Cliente[] = [
  {
    id: "c1",
    nombre: "Cliente Demo",
    diasEntrega: 4,
    config: {
      frutas: 30,
      snacks: 10,
      barras: 10,
    },
    precios: {
      fruta: 400,
      snack: 700,
      barra: 500,
    },
    modoCobro: "paquete",
    paquete: {
      unidades: 50,
      montoNeto: 24000,
      ivaIncluido: false,
    }
  }
];

const generateInitialState = () => ({
  ivaPorcentaje: 19,
  proveedores: DEFAULT_PROVEEDORES,
  clientes: DEFAULT_CLIENTES,
  stock: { fruta: 0, snack: 0, barra: 0 },
  historial: []
});

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...generateInitialState(),
      
      setIva: (iva) => set({ ivaPorcentaje: iva }),
      
      updateProveedor: (id, data) => set((state) => ({
        proveedores: state.proveedores.map(p => p.id === id ? { ...p, ...data } : p)
      })),
      addProveedor: (proveedor) => set((state) => ({ proveedores: [...state.proveedores, proveedor] })),
      removeProveedor: (id) => set((state) => ({ proveedores: state.proveedores.filter(p => p.id !== id) })),
      
      updateProductoProveedor: (proveedorId, productoId, data) => set((state) => ({
        proveedores: state.proveedores.map(p => p.id === proveedorId ? {
          ...p,
          productos: p.productos.map(prod => prod.id === productoId ? { ...prod, ...data } : prod)
        } : p)
      })),
      addProductoProveedor: (proveedorId, producto) => set((state) => ({
        proveedores: state.proveedores.map(p => p.id === proveedorId ? {
          ...p,
          productos: [...p.productos, producto]
        } : p)
      })),
      removeProductoProveedor: (proveedorId, productoId) => set((state) => ({
        proveedores: state.proveedores.map(p => p.id === proveedorId ? {
          ...p,
          productos: p.productos.filter(prod => prod.id !== productoId)
        } : p)
      })),
      
      updateCliente: (id, data) => set((state) => ({
        clientes: state.clientes.map(c => c.id === id ? { ...c, ...data } : c)
      })),
      addCliente: (cliente) => set((state) => ({ clientes: [...state.clientes, cliente] })),
      removeCliente: (id) => set((state) => ({ clientes: state.clientes.filter(c => c.id !== id) })),
      
      updateStock: (categoria, cantidad) => set((state) => ({
        stock: { ...state.stock, [categoria]: cantidad }
      })),
      addStock: (categoria, cantidad) => set((state) => ({
        stock: { ...state.stock, [categoria]: state.stock[categoria] + cantidad }
      })),
      
      registrarCompra: (montoNeto, iva, montoTotal, detalles, itemsStock) => set((state) => ({
        historial: [{
          id: Date.now().toString(),
          tipo: "compra",
          fecha: new Date().toISOString(),
          montoNeto,
          iva,
          montoTotal,
          detalles,
          stockDelta: {
            fruta: itemsStock.fruta || 0,
            snack: itemsStock.snack || 0,
            barra: itemsStock.barra || 0,
          }
        }, ...state.historial],
        stock: {
          fruta: state.stock.fruta + (itemsStock.fruta || 0),
          snack: state.stock.snack + (itemsStock.snack || 0),
          barra: state.stock.barra + (itemsStock.barra || 0),
        }
      })),
      
      registrarVenta: (clienteId) => set((state) => {
        const cliente = state.clientes.find(c => c.id === clienteId);
        if (!cliente) return state;

        const diasPorEntrega = Math.max(1, cliente.diasEntrega / 2);
        const uFruta = cliente.config.frutas * diasPorEntrega;
        const uSnack = cliente.config.snacks * diasPorEntrega;
        const uBarra = cliente.config.barras * diasPorEntrega;

        const ivaPorcentaje = state.ivaPorcentaje;
        let totalBruto: number;
        let neto: number;
        let iva: number;

        if (cliente.modoCobro === "paquete") {
          if (cliente.paquete.ivaIncluido) {
            totalBruto = cliente.paquete.montoNeto;
            neto = totalBruto / (1 + ivaPorcentaje / 100);
            iva = totalBruto - neto;
          } else {
            neto = cliente.paquete.montoNeto;
            iva = neto * (ivaPorcentaje / 100);
            totalBruto = neto + iva;
          }
        } else {
          const ingresoFruta = uFruta * cliente.precios.fruta;
          const ingresoSnack = uSnack * cliente.precios.snack;
          const ingresoBarra = uBarra * cliente.precios.barra;
          totalBruto = ingresoFruta + ingresoSnack + ingresoBarra;
          neto = totalBruto / (1 + ivaPorcentaje / 100);
          iva = totalBruto - neto;
        }

        return {
          historial: [{
            id: Date.now().toString(),
            tipo: "venta",
            fecha: new Date().toISOString(),
            montoNeto: neto,
            iva: iva,
            montoTotal: totalBruto,
            detalles: `Entrega a ${cliente.nombre} (${uFruta} Frutas, ${uSnack} Snacks, ${uBarra} Barras)`,
            clienteId: cliente.id,
            stockDelta: {
              fruta: -uFruta,
              snack: -uSnack,
              barra: -uBarra,
            }
          }, ...state.historial],
          stock: {
            fruta: Math.max(0, state.stock.fruta - uFruta),
            snack: Math.max(0, state.stock.snack - uSnack),
            barra: Math.max(0, state.stock.barra - uBarra),
          }
        };
      }),

      registrarVentaPersonalizada: (clienteId, unidades) => set((state) => {
        const cliente = state.clientes.find(c => c.id === clienteId);
        if (!cliente) return state;

        const uFruta = Math.max(0, Math.floor(unidades.fruta));
        const uSnack = Math.max(0, Math.floor(unidades.snack));
        const uBarra = Math.max(0, Math.floor(unidades.barra));

        const ivaPorcentaje = state.ivaPorcentaje;
        let totalBruto: number;
        let neto: number;
        let iva: number;

        if (cliente.modoCobro === "paquete") {
          if (cliente.paquete.ivaIncluido) {
            totalBruto = cliente.paquete.montoNeto;
            neto = totalBruto / (1 + ivaPorcentaje / 100);
            iva = totalBruto - neto;
          } else {
            neto = cliente.paquete.montoNeto;
            iva = neto * (ivaPorcentaje / 100);
            totalBruto = neto + iva;
          }
        } else {
          totalBruto =
            uFruta * cliente.precios.fruta +
            uSnack * cliente.precios.snack +
            uBarra * cliente.precios.barra;
          neto = totalBruto / (1 + ivaPorcentaje / 100);
          iva = totalBruto - neto;
        }

        const partes: string[] = [];
        if (uFruta > 0) partes.push(`${uFruta} Frutas`);
        if (uSnack > 0) partes.push(`${uSnack} Snacks`);
        if (uBarra > 0) partes.push(`${uBarra} Barras`);
        const detalle = partes.length > 0
          ? `Entrega a ${cliente.nombre} (${partes.join(", ")})`
          : `Entrega a ${cliente.nombre} (sin unidades)`;

        return {
          historial: [{
            id: Date.now().toString(),
            tipo: "venta",
            fecha: new Date().toISOString(),
            montoNeto: neto,
            iva,
            montoTotal: totalBruto,
            detalles: detalle,
            clienteId: cliente.id,
            stockDelta: {
              fruta: -uFruta,
              snack: -uSnack,
              barra: -uBarra,
            }
          }, ...state.historial],
          stock: {
            fruta: Math.max(0, state.stock.fruta - uFruta),
            snack: Math.max(0, state.stock.snack - uSnack),
            barra: Math.max(0, state.stock.barra - uBarra),
          }
        };
      }),

      updateTransaccion: (id, data) => set((state) => ({
        historial: state.historial.map((tx) => {
          if (tx.id !== id) return tx;
          const updated: Transaccion = { ...tx, ...data };
          if (data.montoTotal !== undefined) {
            const ivaPorcentaje = state.ivaPorcentaje;
            const neto = data.montoTotal / (1 + ivaPorcentaje / 100);
            updated.montoTotal = data.montoTotal;
            updated.montoNeto = neto;
            updated.iva = data.montoTotal - neto;
          }
          return updated;
        }),
      })),

      removeTransaccion: (id) => set((state) => {
        const tx = state.historial.find((t) => t.id === id);
        if (!tx) return state;
        const delta = tx.stockDelta || {};
        return {
          historial: state.historial.filter((t) => t.id !== id),
          stock: {
            fruta: Math.max(0, state.stock.fruta - (delta.fruta || 0)),
            snack: Math.max(0, state.stock.snack - (delta.snack || 0)),
            barra: Math.max(0, state.stock.barra - (delta.barra || 0)),
          },
        };
      }),
      
      resetToDefaults: () => set(generateInitialState()),
    }),
    {
      name: "gestion-colaciones-storage",
      version: 2,
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as Partial<AppState> | undefined;
        if (!state) return persistedState as unknown as AppState;
        if (version < 2 && Array.isArray(state.clientes)) {
          state.clientes = state.clientes.map((c) => {
            const cliente = c as Cliente & Partial<Pick<Cliente, "modoCobro" | "paquete">>;
            return {
              ...cliente,
              modoCobro: cliente.modoCobro ?? "unitario",
              paquete: cliente.paquete ?? {
                unidades: 50,
                montoNeto: 24000,
                ivaIncluido: false,
              },
            } as Cliente;
          });
        }
        return state as AppState;
      },
    }
  )
);
