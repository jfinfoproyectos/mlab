# Documentación del Proyecto: ScreenHub

Bienvenido a la documentación técnica de **ScreenHub**, un sistema centralizado de gestión de contenidos y monitoreo para pantallas digitales. Este proyecto está construido con **Next.js 16**, **PrismaJS**, **Better Auth** y **Tailwind CSS 4**.

## Guías de Documentación

Haz clic en los enlaces para explorar los detalles técnicos:

0.  [**Stack Tecnológico**](./00_STACK_TECNOLOGICO.md): Tecnologías Core y Sistema de Temas (OKLCH).
1.  [**Estructura del Proyecto**](./02_ESTRUCTURA_PROYECTO.md): Organización por roles (`/admin`, `/publisher`, `/auditor`).
2.  [**Arquitectura y Seguridad (Proxy)**](./03_ARQUITECTURA.md): Patrón Proxy para protección de rutas y Layouts fijos.
3.  [**Patrones de Diseño**](./04_PATRONES_DISEÑO.md): Principios de modularidad y UI/UX premium.
4.  [**Autenticación y Roles**](./05_AUTENTICACION_Y_ROLES.md): Configuración de Better Auth y permisos por rol.
5.  [**Variables de Entorno**](./06_VARIABLES_ENTORNO.md): Configuración del `.env` y secretos.
6.  [**Integración de Shadcn UI**](./07_SHADCN_UI.md): Uso de presets modernos y tipografía Space Grotesk.

## Resumen del Estado Actual

El proyecto ha evolucionado a una plataforma profesional denominada **ScreenHub**:
- **Dashboards Independientes**: Migración completa de `/dashboard` a espacios de trabajo dedicados por rol.
- **Seguridad Centralizada**: Implementación de un Proxy central para la gestión de sesiones y redirecciones.
- **UI de Alta Gama**: Integración de presets de Shadcn UI con soporte nativo para modo oscuro y colores OKLCH.
- **Layout App-Like**: Barra lateral dinámica con logo, roles en español y encabezados fijos con efecto backdrop-blur.
- **Base de Datos**: Esquema de Prisma configurado para soportar roles y sesiones extendidas.

## Configuración y Desarrollo

### Variables de Entorno (`.env`)
El proyecto requiere variables para la base de datos (PostgreSQL/Neon) y credenciales de Auth (GitHub, Google). Consulta la [guía de variables](./06_VARIABLES_ENTORNO.md).

### Ejecución Local
```bash
npm install
npx prisma generate
npm run dev
```

---
*ScreenHub: Solución profesional para la gestión de cartelería digital y monitoreo ambiental.*
