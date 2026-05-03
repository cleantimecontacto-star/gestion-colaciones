import { useEffect, useState } from "react";
import { useStore, diasPorEntregaCliente } from "@/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCLP } from "@/lib/format";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, DollarSign, ShoppingCart, Percent, AlertTriangle, Package, XCircle, ChevronUp, ChevronDown, FileCheck } from "lucide-react";

import { subWeeks, subMonths, subYears, isAfter, format, startOfWeek, startOfMonth, startOfYear } from "date-fns";
import { es } from "date-fns/locale";

const ALERTAS_MIN_KEY = "dashboard.alertasStockMinimizado";

type Periodo = "semana" | "mes" | "año";

const PERIODO_LABEL: Record<Periodo, string> = {
  semana: "Semana",
  mes: "Mes",
  año: "Año",
};

export default function Dashboard() {
  const { historial, stock, clientes, categorias, cotizaciones } = useStore();
  const [periodo, setPeriodo] = useState<Periodo>("semana");
  const [alertasMin, setAlertasMin] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(ALERTAS_MIN_KEY) === "1";
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(ALERTAS_MIN_KEY, alertasMin ? "1" : "0");
  }, [alertasMin]);

  const now = new Date();

  const inicioPeriodo = (() => {
    if (periodo === "semana") return subWeeks(now, 1);
    if (periodo === "mes") return subMonths(now, 1);
    return subYears(now, 1);
  })();

  const ventasPeriodo = historial.filter(t => t.tipo === "venta" && isAfter(new Date(t.fecha), inicioPeriodo));
  const comprasPeriodo = historial.filter(t => t.tipo === "compra" && isAfter(new Date(t.fecha), inicioPeriodo));

  const totalVentas = ventasPeriodo.reduce((acc, t) => acc + t.montoNeto, 0);
  const totalCompras = comprasPeriodo.reduce((acc, t) => acc + t.montoNeto, 0);

  const ivaVentas = ventasPeriodo.reduce((acc, t) => acc + t.iva, 0);
  const ivaCompras = comprasPeriodo.reduce((acc, t) => acc + t.iva, 0);

  const profit = totalVentas - totalCompras;
  const margin = totalVentas > 0 ? (profit / totalVentas) * 100 : 0;

  const ivaNeto = ivaVentas - ivaCompras;

  // Chart: últimas 4 unidades del período seleccionado
  const chartData = Array.from({ length: 4 }).map((_, i) => {
    const idx = 3 - i; // 0 = más antiguo, 3 = actual
    let inicio: Date;
    let fin: Date;
    let label: string;
    if (periodo === "semana") {
      const ref = subWeeks(now, idx);
      inicio = startOfWeek(ref, { weekStartsOn: 1 });
      fin = startOfWeek(subWeeks(now, idx - 1), { weekStartsOn: 1 });
      label = idx === 0 ? "Actual" : format(inicio, "dd MMM", { locale: es });
    } else if (periodo === "mes") {
      const ref = subMonths(now, idx);
      inicio = startOfMonth(ref);
      fin = startOfMonth(subMonths(now, idx - 1));
      label = idx === 0 ? "Actual" : format(inicio, "MMM", { locale: es });
    } else {
      const ref = subYears(now, idx);
      inicio = startOfYear(ref);
      fin = startOfYear(subYears(now, idx - 1));
      label = idx === 0 ? "Actual" : format(inicio, "yyyy");
    }

    const v = historial
      .filter(t => t.tipo === "venta" && new Date(t.fecha) >= inicio && new Date(t.fecha) < fin)
      .reduce((acc, t) => acc + t.montoNeto, 0);
    const c = historial
      .filter(t => t.tipo === "compra" && new Date(t.fecha) >= inicio && new Date(t.fecha) < fin)
      .reduce((acc, t) => acc + t.montoNeto, 0);
    return { name: label, profit: v - c };
  });

  const periodos: Periodo[] = ["semana", "mes", "año"];

  // ----- Alertas de quiebre de stock -----
  const demandaSemanalCat = (cat: string) =>
    clientes.reduce((sum, c) => sum + (c.config[cat] || 0) * Math.max(0, c.diasEntrega), 0);

  const demandaEntregaCat = (cat: string) =>
    clientes.reduce((sum, c) => sum + (c.config[cat] || 0) * diasPorEntregaCliente(c), 0);

  const niveles = categorias.map((cat) => {
    const actual = stock[cat] ?? 0;
    const demanda = demandaEntregaCat(cat);
    const semanal = demandaSemanalCat(cat);
    const entregas = demanda > 0 ? Math.floor(actual / demanda) : Infinity;
    const semanas = semanal > 0 ? actual / semanal : Infinity;
    let nivel: "ok" | "bajo" | "critico" | "vacio";
    if (demanda <= 0) nivel = "ok";
    else if (actual <= 0) nivel = "vacio";
    else if (actual < demanda) nivel = "critico";
    else if (semanas < 1) nivel = "bajo";
    else nivel = "ok";
    return { cat, actual, entregas, semanas, demanda, nivel };
  });

  const alertasActivas = niveles.filter((n) => n.nivel !== "ok");

  return (
    <div className="flex flex-col h-full gap-3 md:gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-1">
        <h2 className="text-xl font-bold tracking-tight">Resumen {PERIODO_LABEL[periodo]}</h2>
        <div className="flex gap-1 bg-muted/40 rounded-lg p-0.5 self-start sm:self-auto" role="tablist">
          {periodos.map((p) => (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={periodo === p}
              onClick={() => setPeriodo(p)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize ${
                periodo === p
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid={`tab-periodo-${p}`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
        <Card className="shadow-sm border-border/50">
          <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Ingresos</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent className="p-3 pt-1 space-y-0.5">
            <div className="text-base md:text-lg font-bold">{formatCLP(totalVentas + ivaVentas)}</div>
            <div className="text-[10px] text-muted-foreground leading-tight">
              Neto: {formatCLP(totalVentas)}
            </div>
            <div className="text-[10px] text-muted-foreground leading-tight">
              IVA: {formatCLP(ivaVentas)}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50">
          <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Costos</CardTitle>
            <ShoppingCart className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent className="p-3 pt-1 space-y-0.5">
            <div className="text-base md:text-lg font-bold">{formatCLP(totalCompras + ivaCompras)}</div>
            <div className="text-[10px] text-muted-foreground leading-tight">
              Neto: {formatCLP(totalCompras)}
            </div>
            <div className="text-[10px] text-muted-foreground leading-tight">
              IVA: {formatCLP(ivaCompras)}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50">
          <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Utilidad</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <div className={`text-base md:text-lg font-bold ${profit >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {formatCLP(profit)}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50">
          <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Margen</CardTitle>
            <Percent className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <div className="text-base md:text-lg font-bold">{margin.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Tarjeta: Cotizaciones Facturadas */}
      {(() => {
        const facturadas = cotizaciones.filter((c) => c.estado === "facturada");
        if (facturadas.length === 0) return null;
        const { formatCLP: fmt } = { formatCLP };
        const totalFacturadas = facturadas.reduce((acc, c) => {
          const neto = c.items.reduce((s, it) => s + it.cantidad * it.precioUnitario, 0);
          const total = neto * (1 + (c.ivaPorcentaje ?? 19) / 100);
          return acc + total;
        }, 0);
        return (
          <Card className="shadow-sm border-purple-300 bg-purple-50/60 dark:bg-purple-950/20">
            <CardHeader className="p-3 pb-1 flex flex-row items-center gap-2 space-y-0">
              <FileCheck className="h-4 w-4 text-purple-600" />
              <CardTitle className="text-sm font-medium text-purple-900 dark:text-purple-200">
                Cotizaciones Facturadas
              </CardTitle>
              <span className="ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-purple-200 text-purple-900">
                {facturadas.length}
              </span>
            </CardHeader>
            <CardContent className="p-3 pt-2">
              <div className="text-base md:text-lg font-bold text-purple-700 dark:text-purple-300">
                {fmt(Math.round(totalFacturadas))}
              </div>
              <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                Total c/IVA de cotizaciones facturadas
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {alertasActivas.length > 0 && (
        <Card className="shadow-sm border-amber-300 bg-amber-50/60 dark:bg-amber-950/20">
          <CardHeader className="p-3 pb-1 flex flex-row items-center gap-2 space-y-0">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <CardTitle className="text-sm font-medium text-amber-900 dark:text-amber-200">
              Alertas de stock
            </CardTitle>
            <span className="ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-900">
              {alertasActivas.length}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 -mr-1 text-amber-900 hover:bg-amber-200/60 dark:text-amber-200"
              onClick={() => setAlertasMin((v) => !v)}
              title={alertasMin ? "Mostrar alertas" : "Minimizar alertas"}
              aria-label={alertasMin ? "Mostrar alertas" : "Minimizar alertas"}
              data-testid="button-toggle-alertas"
            >
              {alertasMin ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
          </CardHeader>
          {!alertasMin && (
          <CardContent className="p-3 pt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
            {alertasActivas.map((n) => {
              const styles =
                n.nivel === "vacio"
                  ? "border-destructive/40 bg-destructive/10"
                  : n.nivel === "critico"
                  ? "border-destructive/30 bg-destructive/5"
                  : "border-amber-300 bg-amber-100/50";
              const icon =
                n.nivel === "vacio" ? (
                  <XCircle className="h-3.5 w-3.5 text-destructive" />
                ) : n.nivel === "critico" ? (
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                ) : (
                  <Package className="h-3.5 w-3.5 text-amber-600" />
                );
              const mensaje =
                n.nivel === "vacio"
                  ? "Sin stock"
                  : n.nivel === "critico"
                  ? "No alcanza para la próxima entrega"
                  : `Quedan ~${n.entregas} ${n.entregas === 1 ? "entrega" : "entregas"}`;
              return (
                <div
                  key={n.cat}
                  className={`rounded-md border p-2 ${styles}`}
                  data-testid={`alerta-${n.cat}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {icon}
                      <span className="text-xs font-semibold">{n.cat}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      Stock: <strong className="text-foreground">{n.actual}</strong>
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1 leading-tight">
                    {mensaje}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    Próx. entrega requiere {Math.ceil(n.demanda)} un.
                  </div>
                </div>
              );
            })}
          </CardContent>
          )}
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 flex-1 min-h-[200px]">
        <Card className="shadow-sm border-border/50 flex flex-col">
          <CardHeader className="p-3">
            <CardTitle className="text-sm font-medium">Situación IVA</CardTitle>
          </CardHeader>
          <CardContent className="p-3 flex-1 flex flex-col justify-center gap-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">IVA Débito (Ventas)</span>
              <span className="font-medium">{formatCLP(ivaVentas)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">IVA Crédito (Compras)</span>
              <span className="font-medium">{formatCLP(ivaCompras)}</span>
            </div>
            <div className="border-t border-border my-1" />
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold">IVA a Pagar</span>
              <span className={`font-bold ${ivaNeto > 0 ? 'text-destructive' : 'text-green-600'}`}>
                {formatCLP(ivaNeto > 0 ? ivaNeto : 0)}
              </span>
            </div>
            {ivaNeto < 0 && (
              <div className="text-xs text-green-600 text-right mt-1">
                Crédito a favor: {formatCLP(Math.abs(ivaNeto))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50 flex flex-col">
          <CardHeader className="p-3 pb-0">
            <CardTitle className="text-sm font-medium">
              Utilidad últimos 4 {periodo === "semana" ? "semanas" : periodo === "mes" ? "meses" : "años"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 flex-1 min-h-[120px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(value: number) => [formatCLP(value), "Utilidad"]}
                  contentStyle={{ fontSize: '12px', borderRadius: '8px' }}
                />
                <Bar dataKey="profit" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
