// Configuración de desarrollo (ng serve). Reemplaza a environment.ts según angular.json
// (fileReplacements). `ng serve` reenvía /api al backend local (ver proxy.conf.json).
export const environment = {
  production: false,
  apiUrl: '/api/v1',
};
