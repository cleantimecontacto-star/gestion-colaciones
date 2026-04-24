# Gestión Colaciones

PWA en español (es-CL) para gestionar la operación de colaciones saludables: compras, ventas, stock, historial y configuración de proveedores y productos.

## Stack

- React 19 + Vite 7 + TypeScript
- Tailwind 4 + shadcn/ui
- Zustand (con persistencia en `localStorage`)
- wouter (router)
- Recharts, Framer Motion, date-fns (es)
- vite-plugin-pwa (instalable en móvil/PC, soporta offline)

## Desarrollo local

```bash
npm install
npm run dev      # http://localhost:5173
```

## Build de producción

```bash
npm run build    # genera ./dist
npm run serve    # vista previa local del build
```

## Despliegue en Vercel

El proyecto incluye `vercel.json` ya configurado:

- **Framework**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`
- Reescrituras SPA para que todas las rutas sirvan `index.html`
- Cabeceras correctas para el Service Worker y el manifest PWA

Importa el repositorio en Vercel y deja la configuración por defecto: detecta automáticamente todo desde `vercel.json`.

## Estructura

```
src/
  components/   # UI (shadcn/ui) y componentes propios
  hooks/        # hooks compartidos
  lib/          # utilidades
  pages/        # panel, compras, ventas, stock, historial, config
  store/        # store Zustand con persistencia v2
  App.tsx
  main.tsx
public/
  favicon.svg
  opengraph.jpg
```

## Datos

Toda la información se guarda en `localStorage` bajo la clave `gestion-colaciones-storage` (versión 2). No requiere backend.
