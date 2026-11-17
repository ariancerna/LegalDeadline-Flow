import { HttpParams } from '@angular/common/http';

export type Filtros = Record<string, string | number | boolean | null | undefined>;

/** Convierte un objeto de filtros en HttpParams, omitiendo valores vacíos. */
export function aParams(filtros: Filtros): HttpParams {
  let params = new HttpParams();
  for (const [clave, valor] of Object.entries(filtros)) {
    if (valor !== null && valor !== undefined && valor !== '') {
      params = params.set(clave, String(valor));
    }
  }
  return params;
}
