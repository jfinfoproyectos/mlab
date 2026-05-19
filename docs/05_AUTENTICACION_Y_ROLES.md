# Autenticación y Gestión de Roles: ScreenHub

ScreenHub implementa un sistema de identidad robusto basado en **Better Auth**, diseñado para soportar flujos de trabajo corporativos complejos mediante una arquitectura de roles jerárquica.

---

## 🔐 Better Auth + Prisma

Utilizamos **Better Auth** con el adaptador de Prisma para centralizar la persistencia de usuarios, sesiones y cuentas sociales (GitHub/Google).

### Modelo de Usuario Extendido
El esquema (`prisma/schema.prisma`) incluye campos específicos para la operación de ScreenHub:
- **`role`**: Define el acceso a los espacios de trabajo (`admin`, `publisher`, `auditor`).
- **`banned`**: Soporte nativo para el bloqueo de acceso desde el panel administrativo.
- **`image`**: Avatar del usuario, sincronizado automáticamente con proveedores OAuth.

## 👥 Roles y Espacios de Trabajo

ScreenHub no utiliza un dashboard único, sino **espacios de trabajo independientes** protegidos por el Proxy central:

| Rol | Dashboard | Responsabilidades Clave |
| :--- | :--- | :--- |
| **Administrador** | `/admin` | Gestión de usuarios, configuración del sistema, monitoreo global. |
| **Publicador** | `/publisher` | Gestión de pantallas, carga de multimedia, programación de contenidos. |
| **Auditor** | `/auditor` | Revisión de logs, reportes de cumplimiento, auditoría de seguridad. |

## 🛡 Seguridad Basada en Proxy (`src/proxy.ts`)

La protección de rutas se gestiona de forma centralizada para evitar la duplicación de código en cada página:

1.  **Validación Server-Side**: La función `getSession()` en `@/proxy` es el único punto de verdad para obtener la sesión del usuario en Server Components.
2.  **Protección de Rutas**: Si un usuario intenta acceder a `/admin` sin el rol correspondiente, el Proxy lo redirige automáticamente a su zona permitida o al login.
3.  **Redirección de Raíz**: El acceso a la raíz (`/`) detecta automáticamente la sesión y envía al usuario a su dashboard específico:
    - Admin → `/admin`
    - Publisher → `/publisher`
    - Auditor → `/auditor`

## 🎨 UI Dinámica por Rol

La barra lateral (`AppSidebar`) adapta su contenido automáticamente:
- **Navegación Personalizada**: Solo se muestran los enlaces relevantes para el rol del usuario.
- **Etiquetas en Español**: La interfaz traduce internamente los roles técnicos a etiquetas legibles (**Administrador**, **Publicador**, **Auditor**).
- **Perfil de Usuario**: El componente `NavUser` muestra el rol activo debajo del nombre del usuario, reforzando la claridad contextual.

---

## 💡 Mejores Prácticas de Seguridad

1.  **Validación Doble**: La UI oculta elementos según el rol, pero las **Server Actions** siempre deben re-validar el permiso en el servidor antes de ejecutar cualquier mutación.
2.  **Token Refresh**: Better Auth gestiona automáticamente la renovación de tokens y la persistencia de la sesión.
3.  **Audit Logs**: Todas las acciones críticas realizadas por un Auditor o Admin deben quedar registradas en la base de datos (ver esquema de logs en Prisma).
