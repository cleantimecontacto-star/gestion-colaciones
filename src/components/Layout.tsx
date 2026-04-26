import { ReactNode, useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, ShoppingCart, Users, Package,
  History, Settings, Wifi, WifiOff, FileText, Download,
  CheckCircle2, X, Smartphone, Monitor, UserSquare2,
} from "lucide-react";
import logoSerendipia from "@/assets/logo-serendipia.png";

interface LayoutProps {
  children: ReactNode;
}

const TABS = [
  { href: "/", icon: LayoutDashboard, label: "Panel", short: "Panel" },
  { href: "/clientes", icon: UserSquare2, label: "Clientes", short: "Client." },
  { href: "/cotizaciones", icon: FileText, label: "Cotizaciones", short: "Cotiz." },
  { href: "/ventas", icon: Users, label: "Ventas", short: "Ventas" },
  { href: "/compras", icon: ShoppingCart, label: "Compras", short: "Compras" },
  { href: "/stock", icon: Package, label: "Stock", short: "Stock" },
  { href: "/historial", icon: History, label: "Historial", short: "Histor." },
  { href: "/config", icon: Settings, label: "Config", short: "Config" },
];

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const deferredPrompt = useRef<any>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Detectar plataforma
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true;

  useEffect(() => {
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e;
      setCanInstall(true);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      deferredPrompt.current = null;
    };
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt.current) {
      // Chrome/Edge — instalar directamente
      deferredPrompt.current.prompt();
      const { outcome } = await deferredPrompt.current.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
        setCanInstall(false);
        deferredPrompt.current = null;
      }
    } else {
      // Safari/iOS/otros — mostrar instrucciones
      setShowModal(true);
    }
  };

  const InstallButton = ({ mobile = false }: { mobile?: boolean }) => {
    if (isInstalled) {
      return (
        <div className={`flex items-center gap-1.5 text-green-600 font-medium ${mobile ? "text-xs" : "text-sm px-3 py-2"}`}>
          <CheckCircle2 className={mobile ? "h-3.5 w-3.5" : "h-4 w-4"} />
          {mobile ? "Instalada" : "App instalada"}
        </div>
      );
    }
    return (
      <button
        onClick={handleInstallClick}
        className={`flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors ${
          mobile ? "px-2 py-1.5 text-xs" : "w-full justify-center px-3 py-2 text-sm"
        }`}
      >
        <Download className={mobile ? "h-3.5 w-3.5" : "h-4 w-4"} />
        {mobile ? "Instalar" : "Instalar app"}
      </button>
    );
  };

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] w-full max-w-full overflow-x-hidden overflow-y-hidden bg-background text-foreground">
      {/* Banner sin conexión */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            transition={{ type: "tween", duration: 0.2 }}
            className="fixed top-0 left-0 right-0 z-[60] bg-amber-500 text-white text-[11px] sm:text-xs font-medium py-1.5 px-3 flex items-center justify-center gap-2 shadow-md pt-[calc(env(safe-area-inset-top)+0.375rem)]"
            role="status"
            aria-live="polite"
          >
            <WifiOff className="h-3.5 w-3.5 shrink-0" />
            <span>Sin conexión — los cambios se guardan en este dispositivo</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card">
        <div className="p-4 flex items-center justify-between border-b border-border">
          <div className="flex flex-col min-w-0">
            <img
              src={logoSerendipia}
              alt="Serendipia"
              className="h-10 w-auto object-contain self-start"
            />
            <div className="text-[10px] text-muted-foreground leading-tight mt-1">
              <div>Comercializadora SerendipiaVK SpA</div>
              <div>RUT 77.875.974-8</div>
            </div>
          </div>
          <div
            className={`h-2 w-2 rounded-full shrink-0 ${isOnline ? "bg-green-500" : "bg-red-500"}`}
            title={isOnline ? "Online" : "Offline"}
          />
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

        {/* Botón instalar — siempre visible en desktop */}
        <div className="p-3 border-t border-border">
          <InstallButton />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 max-w-full h-full overflow-hidden relative">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-3 border-b border-border bg-card shrink-0">
          <div className="flex flex-col min-w-0">
            <img
              src={logoSerendipia}
              alt="Serendipia"
              className="h-8 w-auto object-contain self-start"
            />
            <div className="text-[9px] text-muted-foreground leading-tight mt-0.5">
              RUT 77.875.974-8
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Botón instalar — siempre visible en móvil */}
            <InstallButton mobile />
            {isOnline ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
          </div>
        </header>

        <div className="flex-1 overflow-hidden bg-background min-w-0 max-w-full">
          <div className="h-full w-full max-w-full overflow-y-auto overflow-x-hidden p-2 md:p-4 pb-24 md:pb-4">
            {children}
          </div>
        </div>
      </main>

      {/* Mobile Bottom Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border flex items-stretch w-full pb-safe z-50">
        {TABS.map((tab) => {
          const isActive = location === tab.href;
          return (
            <Link key={tab.href} href={tab.href} className="flex-1 min-w-0 basis-0">
              <span className="relative flex flex-col items-center justify-center h-full w-full cursor-pointer py-1.5 px-0.5">
                <div
                  className={`flex items-center justify-center w-9 h-9 rounded-xl transition-colors relative z-10 ${
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
                  <tab.icon className="h-[18px] w-[18px]" />
                </div>
                <span
                  className={`text-[10px] leading-none mt-1 text-center w-full ${
                    isActive ? "text-primary font-semibold" : "text-muted-foreground"
                  }`}
                >
                  {tab.short}
                </span>
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Modal instrucciones instalación */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card rounded-2xl shadow-xl w-full max-w-sm p-6 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              Instalar Serendipia
            </h2>

            {isIOS || isSafari ? (
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-3">
                  <Smartphone className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground mb-1">iPhone / iPad (Safari)</p>
                    <ol className="space-y-1 list-decimal ml-4">
                      <li>Toca el botón <strong>Compartir</strong> (cuadrado con flecha ↑) en la barra inferior</li>
                      <li>Desplázate y toca <strong>"Agregar a pantalla de inicio"</strong></li>
                      <li>Toca <strong>Agregar</strong></li>
                    </ol>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-sm text-muted-foreground">
                <div className="flex items-start gap-3">
                  <Monitor className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground mb-1">PC (Chrome / Edge)</p>
                    <ol className="space-y-1 list-decimal ml-4">
                      <li>Haz clic en el ícono <strong>⊕</strong> en la barra de dirección (arriba a la derecha)</li>
                      <li>Haz clic en <strong>"Instalar"</strong></li>
                    </ol>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Smartphone className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground mb-1">Android (Chrome)</p>
                    <ol className="space-y-1 list-decimal ml-4">
                      <li>Toca el menú <strong>⋮</strong> (tres puntos arriba)</li>
                      <li>Toca <strong>"Agregar a pantalla de inicio"</strong></li>
                    </ol>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowModal(false)}
              className="mt-5 w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
