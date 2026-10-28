import { HttpErrorResponse } from '@angular/common/http';
import { ApiError } from './models';

export interface ErrorVista {
  mensaje: string;
  codigo?: string;
  status: number;
  campos: Record<string, string>;
}

const POR_ESTADO: Record<number, string> = {
  0: 'No se pudo conectar con el servidor. Verifica que el backend esté en ejecución.',
  400: 'La solicitud contiene datos inválidos.',
  401: 'Tu sesión expiró. Inicia sesión nuevamente.',
  403: 'No tienes permiso para realizar esta operación.',
  404: 'El recurso solicitado no existe.',
  409: 'La operación entra en conflicto con los datos actuales.',
  422: 'La operación no cumple las reglas del negocio.',
};

const POR_CODIGO: Record<string, string> = {
  VERSION_DESACTUALIZADA:
    'Otro usuario modificó este registro. Se recargaron los datos; revisa y vuelve a intentarlo.',
  TAREA_DUPLICADA:
    'Ya existe una tarea activa equivalente en este expediente (mismo título y tipo).',
  CREDENCIALES_INVALIDAS: 'Correo o contraseña incorrectos.',
};

/** Traduce un error HTTP del backend (ApiError) a un mensaje legible y errores por campo. */
export function interpretarError(error: unknown): ErrorVista {
  if (!(error instanceof HttpErrorResponse)) {
    return { mensaje: 'Ocurrió un error inesperado.', status: -1, campos: {} };
  }
  const cuerpo = (typeof error.error === 'object' ? error.error : null) as ApiError | null;
  const codigo = cuerpo?.code;
  const campos: Record<string, string> = {};
  for (const v of cuerpo?.violations ?? []) {
    campos[v.campo] = v.mensaje;
  }
  let mensaje =
    (codigo && POR_CODIGO[codigo]) ||
    (error.status === 403 ? POR_ESTADO[403] : undefined) ||
    cuerpo?.message ||
    POR_ESTADO[error.status] ||
    'Ocurrió un error inesperado.';
  if (error.status === 401 && !cuerpo?.message) mensaje = POR_ESTADO[401];
  return { mensaje, codigo, status: error.status, campos };
}
