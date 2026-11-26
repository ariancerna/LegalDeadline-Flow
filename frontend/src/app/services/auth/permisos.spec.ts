import { esGestor, lecturaGlobal, puedeEscribir, puedeVerAuditoria } from './permisos';

describe('permisos por rol (espejo de AccesoService)', () => {
  it('solo administrador y supervisor son gestores', () => {
    expect(esGestor('ADMINISTRADOR')).toBe(true);
    expect(esGestor('SUPERVISOR')).toBe(true);
    expect(esGestor('RESPONSABLE')).toBe(false);
    expect(esGestor('AUDITOR')).toBe(false);
    expect(esGestor(null)).toBe(false);
  });

  it('el auditor lee todo pero no escribe (regla 42 del caso)', () => {
    expect(lecturaGlobal('AUDITOR')).toBe(true);
    expect(puedeEscribir('AUDITOR')).toBe(false);
    expect(puedeVerAuditoria('AUDITOR')).toBe(true);
  });

  it('el responsable escribe en lo asignado, sin lectura global ni auditoría', () => {
    expect(puedeEscribir('RESPONSABLE')).toBe(true);
    expect(lecturaGlobal('RESPONSABLE')).toBe(false);
    expect(puedeVerAuditoria('RESPONSABLE')).toBe(false);
  });
});
