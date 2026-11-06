// Producción: Vercel reenvía /api/* al backend en Render (ver vercel.json y docs/COOKIES.md),
// así el navegador ve un solo origen y la cookie de refresh es de primera parte.
export const environment = {
  production: true,
  apiUrl: '/api',
  // Directo a Render: Vercel no reenvía WebSockets por su rewrite. Se autentica con el token, no con cookies.
  wsUrl: 'https://autocheck-backend-d2k2.onrender.com',
};
