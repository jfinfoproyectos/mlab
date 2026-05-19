# Patrones de Diseño del Proyecto

Este documento describe los patrones de diseño y principios arquitectónicos aplicados en este proyecto para garantizar un código limpio, escalable y mantenible.

---

## 1. Singleton Pattern (Instancia Única)

Se utiliza para asegurar que ciertos servicios pesados o globales solo tengan una instancia activa durante el ciclo de vida de la aplicación.

- **Prisma Client**: En `src/lib/prisma.ts`, se implementa el patrón Singleton para evitar agotar las conexiones a la base de datos durante el desarrollo (Hot Reloading).
- **Better Auth**: El objeto `auth` en `src/lib/auth.ts` actúa como una instancia única configurada que centraliza toda la lógica de sesión.

---

## 2. Feature-First Architecture (Arquitectura por Funcionalidades)

En lugar de organizar por capas técnicas (controllers, services), el proyecto se organiza por dominios de negocio en `src/features/`.

- **Encapsulamiento**: Cada feature (`auth`, `screens`, `monitoring`) contiene su propia lógica, componentes y tipos.
- **Barril de Exportación**: El uso de `index.ts` en cada feature actúa como una interfaz pública, ocultando los detalles de implementación interna.

---

## 3. Server Actions Pattern

Next.js utiliza este patrón para unificar la comunicación cliente-servidor sin necesidad de definir endpoints REST manuales.

- **Seguridad**: Las acciones son "POST-only" por diseño y se ejecutan exclusivamente en el servidor.
- **Tipado**: Ofrecen tipado de extremo a extremo (End-to-End Type Safety) automáticamente.

---

## 4. Proxy Pattern (Intercepción de Rutas)

Se aplica mediante el archivo `src/proxy.ts` para interceptar las peticiones antes de que lleguen a la lógica de renderizado.

- **Centralización**: Todas las reglas de acceso (`Role-Based Access Control`) están en un solo lugar.
- **Transparencia**: Las páginas no necesitan llamar a funciones de seguridad; el Proxy maneja los redireccionamientos de forma automática y transparente para el desarrollador.
- **Escalabilidad**: Añadir una nueva ruta protegida solo requiere una línea en el objeto de configuración del Proxy.

---

## ⚡ Ejemplo Práctico: Implementando una Server Action

Imagina que quieres crear una pantalla nueva. En lugar de crear un archivo en `/api/screens`, harías lo siguiente:

```ts
// src/features/screens/actions/create-screen.ts
"use server"

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function createScreen(data: { name: string, location: string }) {
  // Lógica de base de datos directamente aquí
  const screen = await prisma.screen.create({ data })
  
  // Actualiza la UI automáticamente
  revalidatePath("/admin/screens")
  
  return screen
}
```

**¿Por qué usar esto?**: No necesitas configurar rutas, fetch ni manejar el estado de carga manualmente si usas hooks como `useActionState` de React 19.
