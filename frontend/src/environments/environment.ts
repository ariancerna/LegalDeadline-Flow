// Ruta base de la API. En desarrollo, `ng serve` reenvía /api al backend
// (ver proxy.conf.json). En Docker, nginx hace lo mismo.
// Si el frontend y el backend se publican en dominios distintos, coloca aquí
// la URL completa, por ejemplo: 'https://mi-backend.onrender.com/api/v1'.
export const environment = {
  apiUrl: '/api/v1',
};
