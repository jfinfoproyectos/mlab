# Stack Tecnológico: ScreenHub

ScreenHub utiliza un ecosistema de vanguardia diseñado para aplicaciones de alta disponibilidad, con un enfoque en UI/UX premium y seguridad robusta.

---

## 🚀 Core Framework & Lenguaje

- **[Next.js 16.2 (Turbopack)](https://nextjs.org/)**: Framework de React con soporte para **App Router**, Server Components y Server Actions. Optimizamos el tiempo de compilación utilizando el nuevo motor Turbopack.
- **[React 19](https://react.dev/)**: Última versión de React con mejoras en la gestión de estados y hooks.
- **[TypeScript](https://www.typescriptlang.org/)**: Tipado estático estricto para garantizar la integridad de los datos en toda la aplicación.

## 🎨 Diseño y Sistema Visual (Aesthetics)

- **[Tailwind CSS 4](https://tailwindcss.com/)**: Motor de estilos de última generación que permite el uso nativo de variables CSS y colores **OKLCH**.
- **[Shadcn UI (Custom Presets)](https://ui.shadcn.com/)**: Componentes profesionales con presets personalizados que incluyen:
  - **Tipografía**: *Space Grotesk* para encabezados y *Geist Mono* para datos técnicos.
  - **Colores OKLCH**: Paletas armoniosas y modernas que garantizan accesibilidad y estética premium.
- **[Lucide React](https://lucide.dev/)**: Iconografía consistente para una navegación intuitiva.

## 🔐 Autenticación y Seguridad Centralizada

- **[Better Auth](https://www.better-auth.com/)**: Framework de autenticación agnóstico.
  - Implementación de **Proxy Central (`src/proxy.ts`)** para el manejo de sesiones en Server Components sin duplicar lógica.
  - Gestión de Roles: Admin, Publisher y Auditor.
- **[Next.js Middleware/Proxy]**: Capa de seguridad que intercepta peticiones para asegurar que cada usuario solo acceda a su espacio de trabajo asignado.

## 💾 Persistencia de Datos

- **[PostgreSQL](https://www.postgresql.org/)**: Base de datos relacional robusta (recomendado Neon.tech para despliegue).
- **[Prisma 7+](https://www.prisma.io/)**: ORM que proporciona un cliente tipado para interactuar con la base de datos de forma segura.

## 🛠 Herramientas y UX

- **[Mode Toggle]**: Sistema nativo de alternancia entre modo claro/oscuro integrado en los layouts de rol.
- **[Fixed Header Layout]**: Estructura de UI con encabezados fijos (`sticky`) y efectos de desenfoque (`backdrop-blur`) para una experiencia de usuario fluida.

---

## 💡 Mejores Prácticas en el Stack

1.  **Variables OKLCH**: En lugar de usar `bg-white`, utiliza variables semánticas como `bg-background` o `bg-card` para asegurar que el tema oscuro se aplique automáticamente.
2.  **Server Actions**: Prioriza el uso de Server Actions para mutaciones de datos, manteniendo la lógica en el servidor y reduciendo el JS enviado al cliente.
3.  **Proxy Patterns**: Utiliza siempre el cliente de sesión centralizado (`getSession()` desde `@/proxy`) para validar accesos en cualquier página.
