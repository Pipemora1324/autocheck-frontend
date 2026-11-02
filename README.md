# AutoCheck-CO Frontend

Cliente Angular 21 (sin zone.js, con signals) de AutoCheck-CO: un **garaje personal** para registrar tus carros y motos, ver si el SOAT y la revisión técnico-mecánica están vigentes y obtener un concepto orientativo antes de comprar. Funciona contra el backend [autocheck-backend](https://github.com/Pipemora1324/autocheck-backend).

- Producción: <https://autocheck-frontend-phi.vercel.app>
- Contrato de la API: `docs/API.md` del backend

## Qué es real, qué es demostración y qué depende de un proveedor externo

| Parte | Estado |
| --- | --- |
| Registro con autorización de tratamiento de datos, login, sesión con refresh rotativo, recuperación de contraseña | **Real** |
| Confirmación de correo (`/verify-email`), aviso y botón "Reenviar correo" | **Real**. El envío depende del **proveedor de correo** del backend (Brevo) |
| Mi garaje: lista, alta manual, detalle, edición y borrado de vehículos | **Real**, guardado en Postgres |
| Vigencias de SOAT y RTM (Vigente / Por vencer / Vencido) y concepto de compra | **Real**, pero calculado **solo con los datos que registra el usuario**. No es una consulta oficial y la pantalla lo dice |
| Alta con foto de la tarjeta de propiedad | **Proveedor externo** (Google Gemini o Anthropic, según el backend). Si está apagado u ocupado, la app lo explica y deja seguir a mano |
| "Actualizar desde RUNT" | **Proveedor externo, todavía no disponible**: el backend responde 501/503 y la app muestra un mensaje y mantiene el flujo manual |
| Eliminar mi cuenta (con contraseña) y página de privacidad | **Real** |
| `/demo`: informe de peritaje de las placas ABC-1234, DEF-5678 y GHI-9012 | **Demostración**: datos ficticios del backend, rotulados como tales en la pantalla |

## Pantallas

| Ruta | Descripción |
| --- | --- |
| `/` | Mi garaje (pantalla principal tras el login) |
| `/garaje/nuevo` | Agregar vehículo: foto de la tarjeta (cámara en móvil o archivo) o formulario manual |
| `/garaje/:placa` | Detalle: datos, vigencias, concepto, editar, eliminar y "Actualizar desde RUNT" |
| `/cuenta` | Mi cuenta y "Eliminar mi cuenta" |
| `/privacidad` | Política de tratamiento de datos (pública) |
| `/demo` | Informe de peritaje de demostración |
| `/login`, `/registro`, `/olvide-contrasena` | Autenticación |
| `/verify-email?token=...`, `/reset-password?token=...` | Enlaces que envía el backend por correo; el token se borra de la URL al leerlo |

## Correrlo en local

Requisitos: Node.js 24+, npm 11+ y el backend corriendo en `http://localhost:3000` (ver su README: necesita una base Postgres).

```bash
# 1. Backend (en otra terminal)
git clone https://github.com/Pipemora1324/autocheck-backend.git
cd autocheck-backend
cp .env.example .env      # completa DATABASE_URL, JWT_SECRET y JWT_REFRESH_SECRET
npm install
npm run migrate
npm run dev               # http://localhost:3000

# 2. Frontend
git clone https://github.com/Pipemora1324/autocheck-frontend.git
cd autocheck-frontend
npm install
npm start                 # http://localhost:4200
```

En desarrollo el backend imprime en su consola el enlace de verificación de correo: ábrelo en el navegador para confirmar la cuenta y poder usar el garaje.

La URL de la API se define en `src/environments/`:

| Archivo | `apiUrl` | Uso |
| --- | --- | --- |
| `environment.ts` | `http://localhost:3000` | Desarrollo (`npm start`) |
| `environment.prod.ts` | `/api` | Producción: Vercel reenvía `/api/*` al backend en Render (`vercel.json`) |

## Scripts

| Comando | Descripción |
| --- | --- |
| `npm start` | Servidor de desarrollo en `http://localhost:4200` |
| `npm run build` | Build de producción en `dist/frontend/browser` |
| `npm run watch` | Build en modo watch (desarrollo) |
| `npm test` | Pruebas unitarias (Vitest) en una sola pasada |

## Cómo funciona

### Autenticación y correo sin confirmar

- **Access token:** vive solo en memoria (`AuthService`), nunca en `localStorage`. El refresh token es una cookie httpOnly que el frontend no puede leer.
- **`authInterceptor`:**
  - Agrega `Authorization: Bearer` y `withCredentials` solo a peticiones de la API.
  - Ante un 401 hace un único `POST /auth/refresh`, compartido entre peticiones simultáneas, y reintenta una vez. Si falla, cierra la sesión y lleva a `/login`.
  - Ante un `403 EMAIL_NOT_VERIFIED` marca al usuario como no verificado, y aparece el aviso con "Reenviar correo".
- **Registro:** exige la casilla de autorización (`acceptedTerms: true`) y muestra el texto que publica el backend en `GET /config/public`. La fecha y la versión de la política las guarda el backend.

### Servidor despertando (Render gratuito)

Render se duerme sin tráfico y tarda 30–60 s en despertar. `serverStatusInterceptor`:

- muestra "Conectando con el servidor, puede tardar un minuto" si una petición tarda más de 3 s o el servidor responde 0/502/503/504;
- reintenta los GET hasta 4 veces cada 5 s (las escrituras no se reintentan para no duplicarlas);
- pasados 2 minutos sin respuesta, avisa que el servidor no responde.

### Lectura de la tarjeta de propiedad

- En móvil, "Tomar foto" abre la cámara (`capture="environment"`); también se puede subir un archivo.
- El cliente valida JPEG, PNG o WEBP de máximo 5 MB antes de subir. El backend vuelve a validar la firma real.
- Antes de subir se muestra el aviso del proveedor activo (`cardScan.notice`).
- La respuesta precarga un formulario editable. Los campos con confianza menor a 0,8 se resaltan, y los que no se leyeron se piden a mano. Nada se guarda hasta que el usuario confirma.
- **El número de documento del propietario se descarta en el cliente:** no se guarda ni se envía a `POST /garage`.

### Actualizar desde RUNT

- Pide el documento del propietario y un consentimiento explícito en cada consulta.
- El documento solo vive en el formulario del diálogo y se borra al terminar.
- Si `GET /config/public` indica que la consulta está apagada, o el backend responde 501/503, la app dice que la función aún no está disponible y ofrece editar los datos a mano.

## Despliegue en Vercel

`vercel.json` define el build, el rewrite `/api/*` → `https://autocheck-backend-d2k2.onrender.com/*` y el fallback a `index.html`. Las cookies detrás del rewrite se explican en [docs/COOKIES.md](docs/COOKIES.md).

## Secretos

El repositorio no contiene claves. El hook `pre-push` (`scripts/check-secrets.sh`) bloquea los pushes con archivos `.env` o patrones de claves; instálalo como se indica al inicio del script.
