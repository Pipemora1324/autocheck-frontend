import { HttpContext, HttpContextToken } from '@angular/common/http';

/** Peticiones de /auth/* que no deben disparar el refresh automático ante un 401. */
export const SKIP_AUTH_REFRESH = new HttpContextToken<boolean>(() => false);

export const skipAuthRefresh = () => new HttpContext().set(SKIP_AUTH_REFRESH, true);
