# AutoCheck-CO Frontend

Cliente Angular 21 para consultar vehículos en Colombia y ver su informe de peritaje. Requiere iniciar sesión contra el backend [autocheck-backend](https://github.com/Pipemora1324/autocheck-backend).

> Los vehículos son datos ficticios de demostración (ABC-1234, DEF-5678, GHI-9012). La subida de imagen de placa todavía no hace reconocimiento: la consulta usa la placa escrita.

## Requisitos

- Node.js 24+
- npm 11+
- Backend corriendo en `http://localhost:3000` (ver su README)

## Puesta en marcha

```bash
npm install
npm start          # http://localhost:4200
```

La URL de la API se define en `src/environments/`:

| Archivo | `apiUrl` | Uso |
| --- | --- | --- |
| `environment.ts` | `http://localhost:3000` | Desarrollo (`npm start`) |
| `environment.prod.ts` | `/api` | Producción: Vercel reenvía `/api/*` al backend (ver `vercel.json`) |

## Scripts

| Comando         | Descripción                                       |
| --------------- | ------------------------------------------------- |
| `npm start`     | Servidor de desarrollo en `http://localhost:4200` |
| `npm run build` | Build de producción en `dist/frontend/browser`    |
| `npm run watch` | Build en modo watch (desarrollo)                  |
| `npm test`      | Pruebas unitarias (Vitest) en una sola pasada     |

## Autenticación

- **Pantallas:** `/login`, `/registro`, `/olvide-contrasena` y `/reset-password?token=...`. Esta última es la ruta del enlace que envía el backend por correo.
- **Access token:** vive solo en memoria (`AuthService`), nunca en `localStorage`. El refresh token es una cookie httpOnly que el frontend no puede leer.
- **Interceptor** (`src/app/core/auth/auth.interceptor.ts`):
  - Agrega `Authorization: Bearer` y `withCredentials` solo a peticiones de la API.
  - Ante un 401 hace un único `POST /auth/refresh`, compartido entre peticiones simultáneas, y reintenta una vez.
  - Si el refresh falla, cierra la sesión y lleva a `/login`.
- **Restauración:** al cargar la app se intenta recuperar la sesión con `/auth/refresh`. Los guards esperan ese resultado.
- **Roles:** las acciones de administrador (editar inspecciones) solo aparecen con rol `admin`. El backend también las protege.

## Despliegue en Vercel

`vercel.json` define el build, el rewrite `/api/*` → backend en Render y el fallback a `index.html` para el router.

Antes de desplegar, lee [docs/COOKIES.md](docs/COOKIES.md): el backend necesita un ajuste en la ruta de la cookie para funcionar detrás del rewrite.
