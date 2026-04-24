export function formatCLP(value: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}

export function parseCLP(value: string): number {
  const clean = value.replace(/[^0-9-]/g, "");
  const parsed = parseInt(clean, 10);
  return isNaN(parsed) ? 0 : parsed;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-CL").format(value);
}
