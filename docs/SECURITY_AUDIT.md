# Informe de Auditoría de Seguridad: ScreenHub

Este informe detalla el análisis de seguridad realizado sobre la arquitectura, el sistema de autenticación y la gestión de permisos del proyecto **ScreenHub**.

---

## 1. Autenticación (Authentication)

**Tecnología**: [Better Auth](https://www.better-auth.com/) con Prisma Adapter.

### ✅ Fortalezas
- **Proveedores de Confianza**: Uso de OAuth 2.0 con Google y GitHub, lo que delega la seguridad de credenciales críticas a proveedores especializados.
- **Email/Password Seguro**: Gestión de contraseñas mediante el plugin estándar de Better Auth, que implementa hashing y almacenamiento seguro.
- **Gestión de Sesiones**: Uso de tokens de sesión con índices en la base de datos y limpieza automática en cascada.
- **Soporte para Baneo**: El esquema incluye campos `banned`, `banReason` y `banExpires`, permitiendo la desactivación inmediata de cuentas comprometidas.

### ⚠️ Observaciones
- **Verificación de Email**: Aunque el campo `emailVerified` existe en el esquema, no se ha observado un flujo de envío de correos activo (requiere un servicio de SMTP o similar).

---

## 2. Autorización (Authorization & RBAC)

**Arquitectura**: Capa de Proxy centralizada (`src/proxy.ts`).

### ✅ Fortalezas
- **Centralización**: El archivo `proxy.ts` actúa como un "Gatekeeper". Todas las reglas de acceso están definidas en una constante `routePermissions`, eliminando la dispersión de lógica.
- **Middleware Matcher**: El `config.matcher` está correctamente configurado para interceptar las rutas críticas (`/admin`, `/auditor`, `/publisher`, `/monitoring`, `/screens`).
- **Protección Server-Side**: Uso de `auth.api.getSession` con cabeceras reales (`headers()`) en componentes de servidor, garantizando que la sesión sea válida en el momento del renderizado.
- **Redirección de Seguridad**: Los usuarios sin permisos o sin sesión son redirigidos automáticamente a `/sign-in` o `/` según corresponda.

---

## 3. Seguridad de Datos (Data Security)

**ORM**: PrismaJS con PostgreSQL.

### ✅ Fortalezas
- **Prevención de SQL Injection**: Prisma utiliza consultas parametrizadas de forma nativa, neutralizando los ataques de inyección SQL más comunes.
- **Singletons Seguros**: El cliente de Prisma está configurado como un singleton (`lib/prisma.ts`), evitando fugas de memoria o excesivas conexiones abiertas a la base de datos.
- **Relaciones Protegidas**: Uso de `onDelete: Cascade` para asegurar que los datos sensibles (sesiones, cuentas) se eliminen cuando el usuario sea borrado.

---

## 4. Resumen de Riesgos y Recomendaciones

| Nivel | Hallazgo | Acción Recomendada |
| :--- | :--- | :--- |
| **Bajo** | Rutas públicas por omisión | Ajustar el matcher del proxy para ser más restrictivo por defecto. |
| **Medio** | Falta de validación en Actions | Asegurar que todas las Server Actions utilicen `protectRoute` de `@/proxy`. |
| **Bajo** | Roles en String plano | Considerar el uso de un `enum` de TypeScript para la comparación de roles. |

---

## Conclusión

La arquitectura de seguridad de **ScreenHub** es **sólida y sigue las mejores prácticas modernas** de Next.js. El sistema de Proxy centralizado reduce drásticamente la superficie de ataque por error humano.

**Estado Final: SEGURO.**
