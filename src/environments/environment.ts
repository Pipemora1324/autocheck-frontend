// Desarrollo: la API corre en localhost:3000. Mismo sitio que localhost:4200, así que la cookie de refresh (SameSite=Lax) viaja.
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
  wsUrl: 'http://localhost:3000',
};
