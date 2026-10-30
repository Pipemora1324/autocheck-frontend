// Producción: Vercel reenvía /api/* al backend en Render (ver vercel.json y docs/COOKIES.md),
// así el navegador ve un solo origen y la cookie de refresh es de primera parte.
export const environment = {
  production: true,
  apiUrl: '/api'
};
