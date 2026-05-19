# Arquitectura y Diseño de Sistemas: ScreenHub

ScreenHub se basa en una arquitectura de **Separación de Concernimientos** (Separation of Concerns) que combina el patrón **Feature-First** con una capa de **Seguridad Proxy** y un diseño de **Interfaz Basado en Slots**.

---

## 🏗 El Patrón Proxy (`src/proxy.ts`)

A diferencia de las arquitecturas tradicionales donde cada página valida la sesión, ScreenHub utiliza una capa centralizada:

1.  **Intercepción de Rutas**: El archivo `proxy.ts` actúa como el motor de decisiones. Valida si el usuario tiene una sesión activa y si su rol (Admin, Auditor, Publisher) coincide con el espacio de trabajo al que intenta acceder.
2.  **Redirección Inteligente**: Los usuarios autenticados que acceden a `/` son redirigidos automáticamente a su dashboard correspondiente, eliminando pantallas intermedias innecesarias.
3.  **Abstracción de Sesión**: Proporciona una función `getSession()` centralizada que garantiza que los Server Components obtengan datos de sesión validados y tipados de forma consistente.

## 🧱 Arquitectura Feature-First

Organizamos la lógica por **capacidades de negocio** dentro de `src/features/`. Cada módulo (ej. `screens`, `monitoring`) es autocontenido:

- **`actions/`**: Server Actions para mutaciones seguras.
- **`components/`**: UI específica del dominio.
- **`schemas/`**: Validaciones con Zod.
- **`index.ts`**: Punto de exportación público que oculta la complejidad interna.

## 📱 Layouts Dinámicos y App-Like

Hemos diseñado la UI para que se comporte como una aplicación nativa:

### Estructura de "Slots" en Layouts
Cada dashboard (`/admin`, `/publisher`, `/auditor`) utiliza una estructura de tres niveles:
1.  **SidebarProvider**: Gestiona el estado global de la navegación.
2.  **AppSidebar**: Navegación dinámica sensible al rol con logo y perfil.
3.  **SidebarInset**: El contenedor de contenido principal.

### El Desafío del Scroll Fijo
Para lograr una experiencia fluida, aplicamos una restricción de scroll:
- **Header Estático**: El encabezado se mantiene fijo mediante `sticky` y `backdrop-blur`.
- **Área de Trabajo (`Viewport`)**: El contenedor de los `children` tiene su propio `overflow-y-auto`. Esto evita que la barra de navegación lateral y superior se desplacen, manteniendo los controles siempre visibles.

## 🎨 Sistema de Diseño (Design System)

Implementamos un sistema de diseño basado en **Tokens Semánticos**:
- **Colores OKLCH**: Permiten variaciones de color matemáticamente precisas para el modo oscuro/claro.
- **Tipografía de Doble Propósito**:
  - *Heading*: **Space Grotesk** (Sans-serif geométrica) para una identidad de marca fuerte.
  - *UI/Mono*: **Geist Mono** para legibilidad en datos técnicos y métricas.

---

## ⚖ Reglas de Integridad

- **No Cross-Imports**: Las features no pueden importarse entre sí directamente. Si hay lógica compartida, debe vivir en `src/components` o `src/lib`.
- **Zero Inline Styles**: Todo el estilo debe basarse en variables del tema definidas en `globals.css`.
- **Type Safety**: Todos los retornos de las Server Actions deben estar tipados para manejar estados de éxito y error de forma determinista.
