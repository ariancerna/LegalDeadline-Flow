// Configuración de producción (ng build). En Vercel, /api se reenvía al backend de Render
// (ver vercel.json); en Docker lo hace nginx. Si el frontend y el backend se publican en dominios
// distintos sin reenvío, coloca aquí la URL completa, por ejemplo:
// 'https://mi-backend.onrender.com/api/v1'.
export const environment = {
  production: true,
  apiUrl: '/api/v1',
};
