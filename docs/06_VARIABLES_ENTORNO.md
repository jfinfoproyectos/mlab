# Variables de Entorno (`.env`)

El proyecto utiliza variables de entorno para gestionar credenciales sensibles y configuraciones específicas del entorno (desarrollo, pruebas, producción).

## Configuración Requerida

Crea un archivo `.env` en la raíz del proyecto (basado en el archivo `.env.example` si existe) con los siguientes valores:

### Base de Datos
- **`DATABASE_URL`**: URL de conexión a tu base de datos PostgreSQL.
  - *Ejemplo*: `postgres://usuario:password@localhost:5432/nombre_db`

### Better Auth
- **`BETTER_AUTH_SECRET`**: Una cadena aleatoria larga utilizada para firmar cookies y tokens. Puedes generar una con `openssl rand -hex 32`.
- **`BETTER_AUTH_URL`**: La URL base de tu aplicación. 
  - *Desarrollo*: `http://localhost:3000`
  - *Producción*: `https://tu-dominio.com`

### Proveedores Sociales (OAuth)
Para habilitar el inicio de sesión con Google y GitHub, debes crear aplicaciones en sus respectivos paneles de desarrollador y obtener las credenciales.

#### Google
- **`GOOGLE_CLIENT_ID`**: ID de cliente de Google Cloud Console.
- **`GOOGLE_CLIENT_SECRET`**: Secreto de cliente de Google Cloud Console.
- *Redirect URI*: `http://localhost:3000/api/auth/callback/google`

#### GitHub
- **`GITHUB_CLIENT_ID`**: Client ID de GitHub Developer Settings.
- **`GITHUB_CLIENT_SECRET`**: Client Secret de GitHub Developer Settings.
- *Redirect URI*: `http://localhost:3000/api/auth/callback/github`

## Seguridad

> [!CAUTION]
> **NUNCA** subas el archivo `.env` al control de versiones (Git). Este archivo está incluido en `.gitignore` por defecto para proteger tus credenciales.

## Validación
Se recomienda que en producción todas estas variables estén definidas. Si falta alguna variable crítica (como `DATABASE_URL`), el proyecto podría fallar al intentar conectar con la base de datos o al realizar procesos de autenticación.

---

## 🔑 Ejemplo Práctico: Uso Seguro de Variables

Las variables definidas en `.env` solo están disponibles en el **Servidor** por defecto.

```ts
// ✅ Correcto (En una Server Action o API)
const apiKey = process.env.GOOGLE_CLIENT_ID; 

// ❌ Incorrecto (En un componente de Cliente/Frontend)
// process.env.GOOGLE_CLIENT_ID será 'undefined' en el navegador.
```

Si necesitas exponer una variable al navegador (ej. una clave de mapas pública), debes anteponer `NEXT_PUBLIC_`:
- **Variable**: `NEXT_PUBLIC_ANALYTICS_ID=UA-12345`
- **Uso**: `const id = process.env.NEXT_PUBLIC_ANALYTICS_ID;` (Funciona en cliente y servidor).
