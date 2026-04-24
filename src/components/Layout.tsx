import { ReactNode, useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  LayoutDashboard, ShoppingCart, Users, Package,
  History, Settings, Wifi, WifiOff, FileText, Download, CheckCircle2,
} from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}

const TABS = [
  { href: "/", icon: LayoutDashboard, label: "Panel" },
  { href: "/compras", icon: ShoppingCart, label: "Compras" },
  { href: "/ventas", icon: Users, label: "Ventas" },
  { href: "/cotizaciones", icon: FileText, label: "Cotizaciones" },
  { href: "/stock", icon: Package, label: "Stock" },
  { href: "/historial", icon: History, label: "Historial" },
  { href: "/config", icon: Settings, label: "Config" },
];

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const [installed, setInstalled] = useState(false);
  const deferredPrompt = useRef<any>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Escuchar evento de instalación PWA
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e;
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // Detectar si ya está instalada
    const handleAppInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
      deferredPrompt.current = null;
    };
    window.addEventListener("appinstalled", handleAppInstalled);

    // También detectar si ya corre como PWA standalone
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt.current) return;
    deferredPrompt.current.prompt();
    const { outcome } = await deferredPrompt.current.userChoice;
    if (outcome === "accepted") {
      setInstalled(true);
      setInstallPrompt(null);
      deferredPrompt.current = null;
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] w-full overflow-hidden bg-background text-foreground">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card">
        <div className="p-4 flex items-center justify-between border-b border-border">
          <div className="flex flex-col">
            <h1 className="font-bold text-xl text-primary flex items-center gap-2">
              <Package className="h-6 w-6" />
              Serendipia
            </h1>
            <div className="text-[10px] text-muted-foreground leading-tight mt-0.5 ml-8">
              <div>Comercializadora SerendipiaVK SpA</div>
              <div>RUT 77.875.974-8</div>
            </div>
          </div>
          {isOnline ? (
            <div className="h-2 w-2 rounded-full bg-green-500 shrink-0" title="Online" />
          ) : (
            <div className="h-2 w-2 rounded-full bg-red-500 shrink-0" title="Offline" />
          )}
        </div>

        <nav className="flex-1 p-2 space-y-1">
          {TABS.map((tab) => {
            const isActive = location === tab.href;
            return (
              <Link key={tab.href} href={tab.href}>
                <span
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors relative cursor-pointer ${
                    isActive ? "text-primary-foreground font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="desktop-active-tab"
                      className="absolute inset-0 bg-primary rounded-md -z-10"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <tab.icon className="h-5 w-5 z-10" />
                  <span className="z-10">{tab.label}</span>
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Botón instalar PWA — desktop */}
        <div className="p-3 border-t border-border">
          {installed ? (
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-green-600 font-medium">
              <CheckCircle2 className="h-4 w-4" />
              App instalada
            </div>
          ) : installPrompt ? (
            <button
              onClick={handleInstall}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Download className="h-4 w-4" />
              Instalar en PC
            </button>
          ) : null}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-3 border-b border-border bg-card shrink-0">
          <div className="flex flex-col">
            <h1 className="font-bold text-lg text-primary flex items-center gap-2">
              <Package className="h-5 w-5" />
              Serendipia
            </h1>
            <div className="text-[9px] text-muted-foreground ml-7 leading-tight">
              RUT 77.875.974-8
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Botón instalar PWA — móvil */}
            {!installed && installPrompt && (
              <button
                onClick={handleInstall}
                className="flex items-center gap-1 px-2 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                Instalar
              </button>
            )}
            {installed && (
              <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Instalada
              </div>
            )}
            {isOnline ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
          </div>
        </header>

        {/* Scrollable content area - internal scroll only */}
        <div className="flex-1 overflow-hidden bg-background">
          <div className="h-full overflow-y-auto p-2 md:p-4 pb-24 md:pb-4">
            {children}
          </div>
        </div>
      </main>

      {/* Mobile Bottom Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border flex justify-around items-center px-1 pb-safe z-50">
        {TABS.map((tab) => {
          const isActive = location === tab.href;
          return (
            <Link key={tab.href} href={tab.href}>
              <span className="relative flex flex-col items-center justify-center w-full h-full cursor-pointer px-1">
                <div
                  className={`flex flex-col items-center justify-center w-10 h-10 rounded-xl transition-colors relative z-10 ${
                    isActive ? "text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="mobile-active-tab"
                      className="absolute inset-0 bg-primary rounded-xl -z-10"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <tab.icon className="h-5 w-5" />
                </div>
                <span className={`text-[10px] mt-0.5 ${isActive ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                  {tab.label}
                </span>
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
