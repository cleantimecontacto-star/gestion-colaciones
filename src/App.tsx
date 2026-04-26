import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/Layout";
import NotFound from "@/pages/not-found";

import Dashboard from "@/pages/dashboard";
import Compras from "@/pages/compras";
import Ventas from "@/pages/ventas";
import Clientes from "@/pages/clientes";
import Stock from "@/pages/stock";
import Historial from "@/pages/historial";
import Config from "@/pages/config";
import Cotizaciones from "@/pages/cotizaciones";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/compras" component={Compras} />
        <Route path="/ventas" component={Ventas} />
        <Route path="/clientes" component={Clientes} />
        <Route path="/cotizaciones" component={Cotizaciones} />
        <Route path="/stock" component={Stock} />
        <Route path="/historial" component={Historial} />
        <Route path="/config" component={Config} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
