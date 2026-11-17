import { HttpErrorResponse } from '@angular/common/http';
import { interpretarError } from './errores';

function http(status: number, error: unknown): HttpErrorResponse {
  return new HttpErrorResponse({ status, error });
}

describe('interpretarError', () => {
  it('explica el duplicado de tareas (RF08)', () => {
    const e = interpretarError(
      http(409, { status: 409, code: 'TAREA_DUPLICADA', message: 'Ya existe…' }),
    );
    expect(e.codigo).toBe('TAREA_DUPLICADA');
    expect(e.mensaje).toContain('equivalente');
  });

  it('avisa de una versión desactualizada (RN11)', () => {
    const e = interpretarError(http(409, { status: 409, code: 'VERSION_DESACTUALIZADA' }));
    expect(e.mensaje).toContain('Otro usuario modificó');
  });

  it('usa el mensaje del backend y mapea las violaciones por campo', () => {
    const e = interpretarError(
      http(400, {
        status: 400,
        code: 'VALIDACION_FALLIDA',
        message: 'La solicitud contiene campos inválidos',
        violations: [
          { campo: 'motivo', mensaje: 'El motivo debe tener entre 10 y 250 caracteres' },
        ],
      }),
    );
    expect(e.mensaje).toBe('La solicitud contiene campos inválidos');
    expect(e.campos['motivo']).toContain('10 y 250');
  });

  it('da un mensaje claro para 403 y para el servidor caído', () => {
    expect(interpretarError(http(403, { status: 403, message: 'Forbidden' })).mensaje).toContain(
      'permiso',
    );
    expect(interpretarError(http(0, null)).mensaje).toContain('No se pudo conectar');
  });

  it('tolera errores que no son HTTP', () => {
    expect(interpretarError(new Error('x')).mensaje).toContain('inesperado');
  });
});
