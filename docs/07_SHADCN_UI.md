# Integración de Shadcn UI: ScreenHub

ScreenHub utiliza **Shadcn UI** sobre **Tailwind CSS 4** para construir una interfaz de usuario premium, altamente personalizable y accesible.

---

## 🎨 Sistema de Temas y Presets

A diferencia de las instalaciones estándar, hemos aplicado un sistema de temas avanzado:

- **Colores OKLCH**: El archivo `src/app/globals.css` utiliza el espacio de color OKLCH, que permite una percepción de color uniforme y transiciones suaves entre modo claro y oscuro.
- **Tipografía Dinámica**:
  - **Space Grotesk**: Nuestra fuente para encabezados, inyectada globalmente a través de la variable `--font-heading`.
  - **Geist Mono**: Utilizada para métricas, IDs de pantallas y logs técnicos.
- **Radios de Borde**: Configurados para un aspecto moderno y suave en toda la aplicación.

## 🛠 Gestión de Componentes

Los componentes se ubican en `src/components/ui/` y son el fundamento visual de ScreenHub:

- **Instalación**: `npx shadcn@latest add [nombre]`
- **Personalización**: Al ser código local, hemos adaptado componentes como `Sidebar`, `Card` y `Tabs` para soportar el diseño "App-Like" con scroll fijo y efectos de desenfoque.

## 🌗 Soporte para Modo Oscuro

El soporte para modo oscuro es nativo y se gestiona mediante:
1.  **ThemeProvider**: Envuelve la aplicación en `layout.tsx`.
2.  **ModeToggle**: Ubicado en `src/components/theme/mode-toggle.tsx`, permite un cambio instantáneo que actualiza todas las variables OKLCH del sistema.
3.  **Clases Semánticas**: Siempre usa clases como `bg-background`, `text-foreground`, `border-border` o `bg-card` para garantizar que la UI se adapte al tema sin intervención manual.

---

## 💡 Consejos para la Interfaz Premium de ScreenHub

1.  **Backdrop Blur**: Usa `bg-background/95 backdrop-blur` en encabezados y modales para dar una sensación de profundidad.
2.  **Animate-in**: Todas nuestras páginas nuevas (`/admin`, `/settings`) incluyen clases de `animate-in fade-in slide-in-from-bottom-4` para suavizar la carga de contenido.
3.  **Consistent Shadows**: Las tarjetas (`Card`) utilizan sombras suaves (`shadow-sm`) definidas en el tema para no sobrecargar visualmente el dashboard.

---
*ScreenHub UI: Diseñada para ser funcional, hermosa y accesible.*
