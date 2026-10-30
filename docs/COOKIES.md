# Cookie de refresh entre Vercel y Render

## El problema

El refresh token viaja en la cookie httpOnly `autocheck_refresh`, que emite el backend. En producción:

- el frontend está en `https://<proyecto>.vercel.app`
- el backend está en `https://autocheck-backend.onrender.com`

`vercel.app` y `onrender.com` están en la *Public Suffix List*, así que el navegador los trata como **sitios distintos**. Para el navegador, una cookie emitida por Render dentro de una página de Vercel es una **cookie de terceros**, aunque lleve `SameSite=None; Secure`, como la configura hoy el backend.

| Navegador | Cookie de terceros (llamada directa a onrender.com) |
| --- | --- |
| Safari (macOS/iOS) | **Bloqueada** por defecto (ITP). El refresh falla: se pierde la sesión al recargar y a los 15 min. |
| Brave, Chrome en modo incógnito | **Bloqueada** por defecto. |
| Firefox | Se aísla por sitio (Total Cookie Protection). Suele funcionar, pero depende de la configuración del usuario. |
| Chrome / Edge normal | Permitida hoy, pero el usuario puede bloquearla y la política de Chrome ha cambiado varias veces. |

Una parte importante de los usuarios móviles en Colombia usa iPhone, así que depender de cookies de terceros no es viable.

## Recomendación: rewrite `/api/*` en Vercel (mismo origen)

`vercel.json` ya incluye:

```json
{ "source": "/api/:path*", "destination": "https://autocheck-backend.onrender.com/:path*" }
```

y `environment.prod.ts` usa `apiUrl: '/api'`. Así el navegador solo habla con `https://<proyecto>.vercel.app`: Vercel reenvía la petición a Render y devuelve la respuesta, incluido el `Set-Cookie`. La cookie queda como **de primera parte**, y ningún bloqueo de terceros la afecta.

En desarrollo no cambia nada: `localhost:4200` y `localhost:3000` son el mismo sitio, y la cookie actual (`SameSite=Lax`, `path=/auth`) funciona.

### Cambios que necesita el backend (no aplicados; se hacen en `autocheck-backend`)

1. **Ruta de la cookie (obligatorio).** Hoy la cookie se emite con `path: '/auth'`. Detrás del rewrite, el navegador ve la URL `/api/auth/refresh`, que no empieza por `/auth`, así que **la cookie no se enviaría y el refresh fallaría siempre**.
   - Cambio: hacer configurable la ruta, por ejemplo con una variable `COOKIE_PATH` (por defecto `/auth`), y en Render usar `COOKIE_PATH=/api/auth`.
   - Archivo: `src/controllers/authController.ts` (`cookieOptions.path`, que también usa `clearCookie`).
2. **SameSite (recomendado).** Con mismo origen ya no hace falta `SameSite=None`. Usar `SameSite=Strict` (o `Lax`) con `Secure` en producción, porque reduce la superficie de CSRF.
   - Cambio: en `authController.ts`, `sameSite: options.secureCookies ? 'none' : 'lax'` pasa a `'strict'` (o `'lax'`) también en producción.
3. **CORS (sin cambio funcional).** Las peticiones del navegador pasan a ser de mismo origen, así que CORS deja de intervenir. `CORS_ORIGIN` sigue siendo obligatoria en producción: déjala con la URL de Vercel. No hace falta agregar `onrender.com`.
4. **IP real del cliente para el rate limit (verificar).** La cadena pasa a ser *navegador → Vercel → proxy de Render → Express*. Con `app.set('trust proxy', 1)`, Express podría tomar como cliente la IP de Vercel, y entonces todos los usuarios compartirían el mismo cupo de intentos de login.
   - Verifica en staging qué llega en `X-Forwarded-For` (por ejemplo, registrando `req.ips`).
   - Probablemente haya que pasar a `trust proxy` = 2, o leer la cabecera `x-vercel-forwarded-for`.
   - Ojo: con un valor de confianza mayor, alguien que llame directo a `onrender.com` podría falsificar la cabecera.
5. **`APP_URL`** sigue siendo la URL de Vercel. No cambia.

**Orden de despliegue:** primero el backend con `COOKIE_PATH=/api/auth`, después el frontend. Si se despliega el frontend antes, el login funciona pero la sesión no se puede renovar ni restaurar al recargar.

### Puntos a validar del rewrite

- **Arranque en frío de Render (plan gratuito):** la primera petición puede tardar entre 30 y 60 s. Revisa el límite de tiempo que Vercel aplica a los rewrites externos en tu plan. Si corta antes, el indicador mostrará "API sin conexión" hasta que Render despierte.
- **URL del backend:** `vercel.json` asume `https://autocheck-backend.onrender.com`. Si Render asignó otra URL (por ejemplo, con un sufijo), cámbiala ahí.

## Alternativas

- **Dominio propio:** `app.tu-dominio.co` (Vercel) y `api.tu-dominio.co` (Render) son el mismo sitio, así que la cookie con `SameSite=Lax` es de primera parte sin necesidad de proxy. Es la opción más robusta a largo plazo, pero exige comprar y configurar un dominio. También requiere cambiar `CORS_ORIGIN`/`APP_URL` y usar `SameSite=Lax` en el backend.
- **Llamar directo a Render** (`apiUrl: 'https://autocheck-backend.onrender.com'` en `environment.prod.ts`, sin cambios en el backend): funciona en Chrome/Edge, pero falla en Safari, Brave e incógnito. Solo sirve como solución temporal.
- **Guardar el refresh token en `localStorage`:** descartado. Cualquier XSS podría robarlo.
