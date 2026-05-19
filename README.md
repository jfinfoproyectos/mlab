# ScreenHub - Sistema de Gestión de Contenidos

ScreenHub es una plataforma profesional de gestión de contenidos y monitoreo para pantallas digitales, construida con tecnologías de última generación para ofrecer una experiencia fluida, segura y altamente escalable.

## 🚀 Guía de Inicio Rápido

Sigue estos pasos para configurar el proyecto en tu entorno local.

### 1. Requisitos Previos

Asegúrate de tener instalado:
- [Node.js](https://nodejs.org/) (Versión 18 o superior)
- [PostgreSQL](https://www.postgresql.org/) (O acceso a una instancia como NeonDB)

### 2. Instalación

Clona el repositorio y ejecuta el comando para instalar las dependencias:

```bash
npm install
```

### 3. Configuración de Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto. Puedes consultar la guía detallada en [Variables de Entorno](./docs/06_VARIABLES_ENTORNO.md).

```bash
# Ejemplo básico
DATABASE_URL="postgresql://usuario:password@localhost:5432/screenhub"
BETTER_AUTH_SECRET="tu_secreto_aqui"
BETTER_AUTH_URL="http://localhost:3000"
```

### 4. Configuración de la Base de Datos

Ejecuta los siguientes comandos para generar el cliente de Prisma y sincronizar el esquema con tu base de datos:

```bash
# Generar el cliente de Prisma
npx prisma generate

# Sincronizar el esquema (o usar migrate dev para historial)
npx prisma db push
```

### 5. Ejecución en Desarrollo

Inicia el servidor de desarrollo:

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador para ver el resultado.

---

## 📚 Documentación Detallada

Para una comprensión más profunda del sistema, consulta los siguientes documentos:

- [**Stack Tecnológico**](./docs/00_STACK_TECNOLOGICO.md)
- [**Guía de Inicio**](./docs/01_README.md)
- [**Estructura del Proyecto**](./docs/02_ESTRUCTURA_PROYECTO.md)
- [**Arquitectura (Feature-First)**](./docs/03_ARQUITECTURA.md)
- [**Patrones de Diseño**](./docs/04_PATRONES_DISEÑO.md)
- [**Roles y Permisos**](./docs/05_AUTENTICACION_Y_ROLES.md)
- [**Variables de Entorno**](./docs/06_VARIABLES_ENTORNO.md)
- [**Interfaz (Shadcn UI)**](./docs/07_SHADCN_UI.md)
- [**Auditoría de Seguridad**](./docs/SECURITY_AUDIT.md)

---

## 🛠️ Scripts Disponibles

- `npm run dev`: Inicia el servidor de desarrollo.
- `npm run build`: Crea la versión de producción de la aplicación.
- `npm run start`: Inicia la aplicación en modo producción.
- `npm run lint`: Ejecuta el linter para encontrar y corregir problemas de código.

---

## 🔗 Enlaces de Interés
- [Carpeta de Recursos (Google Drive)](https://drive.google.com/drive/folders/161yYuL4h-loQzzHcT0OXP6wkLqXwtPyI?usp=sharing)
