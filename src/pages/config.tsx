import { useStore } from "@/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EditableNumber } from "@/components/EditableNumber";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Trash2 } from "lucide-react";

export default function Config() {
  const { ivaPorcentaje, setIva, resetToDefaults } = useStore();
  const { toast } = useToast();

  const handleReset = () => {
    if (confirm("¿Estás seguro de borrar todos los datos y restaurar la configuración inicial? Esta acción no se puede deshacer.")) {
      resetToDefaults();
      toast({
        title: "Datos restaurados",
        description: "Se ha vuelto a la configuración inicial de fábrica.",
      });
    }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      <h2 className="text-xl font-bold tracking-tight px-1">Configuración</h2>
      
      <ScrollArea className="flex-1 -mx-2 px-2">
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

          <Card className="shadow-sm border-destructive/30">
            <CardHeader className="p-3 border-b border-border/50">
              <CardTitle className="text-base text-destructive">Zona de Peligro</CardTitle>
            </CardHeader>
            <CardContent className="p-4 text-sm">
              <p className="text-muted-foreground mb-4">
                Borrar todos los datos locales (clientes, historial, stock) y restaurar a los valores por defecto.
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
