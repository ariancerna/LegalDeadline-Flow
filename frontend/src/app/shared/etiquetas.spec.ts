import { claseRiesgo, etiqueta, tono } from './etiquetas';

describe('etiquetas', () => {
  it('traduce enums del backend a texto legible', () => {
    expect(etiqueta('EN_PROGRESO')).toBe('En progreso');
    expect(etiqueta('CRITICO')).toBe('Crítico');
    expect(etiqueta('TAREA_ESTADO_CAMBIADO')).toBe('Tarea estado cambiado');
    expect(etiqueta(null)).toBe('—');
  });

  it('asigna clases de color', () => {
    expect(tono('EN_PROGRESO')).toBe('e-info');
    expect(tono('CERRADA')).toBe('e-exito');
    expect(claseRiesgo('CRITICO')).toBe('riesgo-CRITICO');
    expect(claseRiesgo(null)).toBe('');
  });
});
