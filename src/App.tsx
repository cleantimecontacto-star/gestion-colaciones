import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/Layout";
import { UpdatePrompt } from "@/components/UpdatePrompt";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import NotFound from "@/pages/not-found";

import Dashboard from "@/pages/dashboard";
import Compras from "@/pages/compras";
import Ventas from "@/pages/ventas";
import Clientes from "@/pages/clientes";
import Stock from "@/pages/stock";
import Historial from "@/pages/historial";
import Config from "@/pages/config";
import Cotizaciones from "@/pages/cotizaciones";
import Papelera from "@/pages/papelera";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component, name }: { component: React.ComponentType; name: string }) {
  return (
    <ErrorBoundary name={name}>
      <Component />
    </ErrorBoundary>
  );
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/">
          <ProtectedRoute component={Dashboard} name="Dashboard" />
        </Route>
        <Route path="/compras">
          <ProtectedRoute component={Compras} name="Compras" />
        </Route>
        <Route path="/ventas">
          <ProtectedRoute component={Ventas} name="Ventas" />
        </Route>
        <Route path="/clientes">
          <ProtectedRoute component={Clientes} name="Clientes" />
        </Route>
        <Route path="/cotizaciones">
          <ProtectedRoute component={Cotizaciones} name="Cotizaciones" />
        </Route>
        <Route path="/stock">
          <ProtectedRoute component={Stock} name="Stock" />
        </Route>
        <Route path="/historial">
          <ProtectedRoute component={Historial} name="Historial" />
        </Route>
        <Route path="/papelera">
          <ProtectedRoute component={Papelera} name="Papelera" />
        </Route>
        <Route path="/config">
          <ProtectedRoute component={Config} name="Configuración" />
        </Route>
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
          <ErrorBoundary name="App Global">
            <Router />
          </ErrorBoundary>
        </WouterRouter>
        <UpdatePrompt />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
