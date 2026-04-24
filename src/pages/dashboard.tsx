import { useStore } from "@/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCLP } from "@/lib/format";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Percent } from "lucide-react";
import { subWeeks, isAfter } from "date-fns";

export default function Dashboard() {
  const { historial, clientes, ivaPorcentaje } = useStore();

  const now = new Date();
  const startOfThisWeek = subWeeks(now, 1);

  const ventasThisWeek = historial.filter(t => t.tipo === "venta" && isAfter(new Date(t.fecha), startOfThisWeek));
  const comprasThisWeek = historial.filter(t => t.tipo === "compra" && isAfter(new Date(t.fecha), startOfThisWeek));

  const totalVentas = ventasThisWeek.reduce((acc, t) => acc + t.montoNeto, 0);
  const totalCompras = comprasThisWeek.reduce((acc, t) => acc + t.montoNeto, 0);
  const totalVentasBruto = ventasThisWeek.reduce((acc, t) => acc + t.montoTotal, 0);
  const totalComprasBruto = comprasThisWeek.reduce((acc, t) => acc + t.montoTotal, 0);

  const ivaVentas = ventasThisWeek.reduce((acc, t) => acc + t.iva, 0);
  const ivaCompras = comprasThisWeek.reduce((acc, t) => acc + t.iva, 0);

  const profit = totalVentas - totalCompras;
  const margin = totalVentas > 0 ? (profit / totalVentas) * 100 : 0;

  const ivaNeto = ivaVentas - ivaCompras;

  const chartData = [
    { name: "Sem 1", profit: profit * 0.8 },
    { name: "Sem 2", profit: profit * 0.9 },
    { name: "Sem 3", profit: profit * 1.1 },
    { name: "Actual", profit: profit },
  ];

  return (
    <div className="flex flex-col h-full gap-4">
      <h2 className="text-xl font-bold tracking-tight px-1">Resumen Semanal</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="shadow-sm border-border/50">
          <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Ingresos</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <div className="text-lg font-bold">{formatCLP(totalVentasBruto)}</div>
            <div className="text-xs text-muted-foreground">Neto: {formatCLP(totalVentas)}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50">
          <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Costos</CardTitle>
            <ShoppingCart className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <div className="text-lg font-bold">{formatCLP(totalComprasBruto)}</div>
            <div className="text-xs text-muted-foreground">Neto: {formatCLP(totalCompras)}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50">
          <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Utilidad</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <div className={`text-lg font-bold ${profit >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {formatCLP(profit)}
            </div>
            <div className="text-xs text-muted-foreground">Neto vs Neto</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50">
          <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Margen</CardTitle>
            <Percent className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <div className="text-lg font-bold">{margin.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground">Sobre neto</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-[200px]">
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
            <CardTitle className="text-sm font-medium">Utilidad últimas 4 semanas</CardTitle>
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
