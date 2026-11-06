# AutoCheck-CO Frontend

Cliente Angular 21 (sin zone.js, con signals) de AutoCheck-CO: un **garaje personal con diagnóstico de testigos del tablero con IA**. Registras tus carros y motos, fotografías un testigo encendido (o lo describes o lo eliges de una lista) y la app te explica qué es, qué tan urgente es, qué puedes revisar tú con seguridad y cuándo ir al mecánico. Funciona contra el backend [autocheck-backend](https://github.com/Pipemora1324/autocheck-backend).

- Producción: <https://autocheck-frontend-phi.vercel.app>
- Contrato de la API: `docs/API.md` del backend

## Qué es real, qué es IA y qué queda como trabajo futuro

| Parte | Estado |
| --- | --- |
| Registro con autorización de tratamiento de datos, login, sesión con refresh rotativo, recuperación de contraseña | **Real** |
| Confirmación de correo (`/verify-email`), aviso y botón "Reenviar correo" | **Real**. El envío depende del **proveedor de correo** del backend (Brevo) |
| Mi garaje: lista, alta manual, detalle, edición y borrado de vehículos, con kilometraje opcional | **Real**, guardado en Postgres |
| Elegir el testigo de la lista (`GET /telltales`) y ver su explicación | **Real**, sin IA y sin enviar nada a terceros. Sale del catálogo del backend, que aún debe revisar una persona con conocimiento mecánico. Funciona aunque la IA esté apagada |
| Semáforo y banner de "Detente" | **Real**: los decide el servidor, no el modelo. El airbag es rojo, pero no ordena detenerse: dice "Revísalo hoy" |
| Diagnóstico con foto o descripción | **IA (Google Gemini, desde el backend):** lee varios testigos y redacta la explicación de cada uno. Si está apagada u ocupada, la app lo explica y ofrece la lista. Con fotos pequeñas o borrosas el resultado varía: ver el README del backend |
| Chat sobre el diagnóstico | **IA (Google Gemini, desde el backend).** La conversación se guarda y se vuelve a mostrar al reabrir el diagnóstico |
| Alta con foto de la tarjeta de propiedad | **IA, opcional** (Google Gemini o Anthropic, según el backend). Si está apagada u ocupada, la app lo explica y deja seguir a mano |
| Historial por vehículo: fecha, testigos, semáforo, detalle, conversación y borrado | **Real**, sin la imagen. La explicación guardada se pide con `GET /garage/:plate/diagnoses/:id`: no crea otra entrada, no llama a la IA ni cuenta para los límites |
| Eliminar mi cuenta (con contraseña) y página de privacidad | **Real** |

**Es orientación general:** no lee los códigos de falla del vehículo ni reemplaza a un mecánico, y cada resultado lo dice.

**Trabajo futuro:**

- Consulta al RUNT con un proveedor autorizado. Se retiró de la app porque esa información es confidencial y de pago.
- Medir la precisión del reconocimiento con fotos reales de tableros.

## Pantallas

| Ruta | Descripción |
| --- | --- |
| `/inicio` | Portada pública (quien entra a `/` sin sesión llega aquí) |
| `/` | Mi garaje (pantalla principal con sesión) |
| `/garaje/nuevo` | Agregar vehículo: formulario manual o, como opción, foto de la tarjeta (cámara en móvil o archivo) |
| `/garaje/:placa` | Pantalla principal del vehículo: diagnosticar un testigo, historial, datos, editar y eliminar |
| `/cuenta` | Mi cuenta y "Eliminar mi cuenta" |
| `/privacidad` | Política de tratamiento de datos (pública) |
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

### Diagnóstico de un testigo

- **Con foto o descripción:** en móvil, "Tomar foto" abre la cámara (`capture="environment"`); también se puede subir un archivo. El cliente valida JPEG, PNG o WEBP de máximo 5 MB y muestra una vista previa. El backend vuelve a validar la firma real.
- **Antes de enviar** se muestra `diagnosis.notice` de `GET /config/public` y el usuario debe confirmar que leyó el aviso y que es su propio tablero. Sin esa casilla no se envía nada.
- **Con la lista:** búsqueda por nombre y alias, agrupada por severidad. Si se elige de la lista, una foto ya seleccionada no se envía.
- **Parpadeo:** la casilla "¿El testigo parpadea?" solo se envía si se marca, porque una foto no lo demuestra.
- **Resultado:** urgencia general arriba y una tarjeta por testigo, con semáforo en color, forma y texto (Detente, Revísalo hoy, Revísalo pronto, No es una falla). Si el servidor ordena detenerse, aparece un banner para hacerlo en un lugar seguro y llamar a un taller o grúa. Si la IA duda de un símbolo, la tarjeta lo dice.
- **Chat:** debajo del resultado y al reabrir un diagnóstico del historial, con preguntas sugeridas, máximo 500 caracteres y estado "escribiendo". Si falla, conserva lo escrito.
- **`needs_better_input` y `not_recognized`:** muestra la pista del servidor y ofrece repetir la foto o elegir de la lista, sin inventar un resultado.

| Respuesta del backend | Qué muestra la app |
| --- | --- |
| `503 DIAGNOSIS_PROVIDER_BUSY` (el 429 de Gemini, por su plan gratuito) | Cupo gratuito de la IA ocupado; sugiere intentar en un minuto o elegir de la lista |
| `503 DIAGNOSIS_UNAVAILABLE` (`provider_error`) | Falló el servicio, no la foto: no pide repetirla y ofrece la lista |
| `503 AI_NOT_CONFIGURED` | La IA no está disponible y la elección manual sigue funcionando |
| `503 CHAT_PROVIDER_BUSY`, `503 CHAT_UNAVAILABLE`, `429 CHAT_LIMIT_REACHED` | El chat lo explica en español. Al llegar al máximo, deja leer pero no escribir |
| `429 RATE_LIMITED` (nuestro límite por hora: 15 con IA y 60 de la lista) | El mensaje del límite. Sugiere la lista solo con `limite: "ia"`, porque tiene otro contador |
| `403 EMAIL_NOT_VERIFIED` | Pide confirmar el correo, con el aviso "Reenviar correo" |
| Sin respuesta, 502, 503 o 504 sin código | "Conectando con el servidor, puede tardar un minuto" |

### Lectura de la tarjeta de propiedad

- Es opcional: el alta manual siempre está disponible.
- Antes de subir se muestra el aviso del proveedor activo (`cardScan.notice`).
- La respuesta precarga un formulario editable. Los campos con confianza menor a 0,8 se resaltan, y los que no se leyeron se piden a mano. Nada se guarda hasta que el usuario confirma.

## Despliegue en Vercel

`vercel.json` define el build, el rewrite `/api/*` → `https://autocheck-backend-d2k2.onrender.com/*` y el fallback a `index.html`. Las cookies detrás del rewrite se explican en [docs/COOKIES.md](docs/COOKIES.md).

## Secretos

El repositorio no contiene claves. El hook `pre-push` (`scripts/check-secrets.sh`) bloquea los pushes con archivos `.env` o patrones de claves; instálalo como se indica al inicio del script.
