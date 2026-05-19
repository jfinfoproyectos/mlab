# Estructura del Proyecto: ScreenHub

ScreenHub utiliza una estructura **Modular Basada en Roles** y una arquitectura **Feature-First** para maximizar la mantenibilidad y escalabilidad.

---

## 📂 Directorios Principales

### `/src/app` (Rutas y Layouts)
Utiliza el **App Router** de Next.js con una jerarquía estricta por roles:
- **`admin/`**: Dashboard para administradores totales. Incluye gestión de usuarios y configuraciones globales.
- **`auditor/`**: Espacio de trabajo para auditoría de cumplimiento y logs de seguridad.
- **`publisher/`**: Dashboard para creadores de contenido y gestores de pantallas.
- **`layout.tsx`**: El Root Layout que inyecta los proveedores de tema (`ThemeProvider`) y fuentes globales.
- **`page.tsx`**: Landing page principal optimizada para redirección inteligente basada en sesión.

### `/src/proxy.ts` (Capa de Seguridad Central)
Archivo crítico que reemplaza al middleware tradicional. Centraliza:
- La validación de sesiones mediante `Better Auth`.
- El control de acceso granular por rol.
- Redirecciones automáticas para usuarios autenticados hacia sus dashboards específicos.

### `/src/features` (Lógica de Negocio)
Módulos autocontenidos que encapsulan la lógica compleja:
- **`auth/`**: Formularios de Login/Registro, componentes de validación y lógica de sesión.
- **`screens/`**: Gestión de dispositivos de visualización.
- **`monitoring/`**: Sensores ambientales y estado del sistema.

### `/src/components` (UI Compartida)
- **`ui/`**: Componentes atómicos de Shadcn UI (Botones, Cards, Tabs, etc.).
- **`sidebar/`**: Componentes de navegación modular (`AppSidebar`, `NavUser`).
- **`theme/`**: Utilidades para el cambio de modo claro/oscuro (`ModeToggle`).

### `/src/lib` (Configuraciones)
- `auth.ts` / `auth-client.ts`: Configuración bi-direccional de Better Auth.
- `prisma.ts`: Cliente de base de datos singleton.
- `utils.ts`: Utilidades de Tailwind (`cn()`) y gestión de clases.

---

## 🛠 Flujo de Trabajo Recomendado

1.  **Crear una Ruta**: Si la página es para administradores, agrégala en `src/app/admin/mi-pagina/page.tsx`.
2.  **Lógica Completa**: Si la página requiere lógica compleja (ej. un selector de archivos), crea el componente en `src/features/media/components/FilePicker.tsx`.
3.  **Temas**: Usa siempre las variables de OKLCH (ej. `bg-background`, `text-foreground`). Evita colores fijos como `text-black`.

> [!IMPORTANT]
> **Nunca** crees rutas directamente en la raíz de `src/app/` si pertenecen a un rol específico. Mantén la separación en `/admin`, `/auditor` o `/publisher`.
