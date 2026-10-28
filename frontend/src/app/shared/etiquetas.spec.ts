import { claseRiesgo, etiqueta, tono } from './etiquetas';

describe('etiquetas', () => {
  it('traduce enums del backend a texto legible', () => {
    expect(etiqueta('EN_PROGRESO')).toBe('En progreso');
    expect(etiqueta('CRITICO')).toBe('Crítico');
    expect(etiqueta('TAREA_ESTADO_CAMBIADO')).toBe('Tarea estado cambiado');
    expect(etiqueta(null)).toBe('—');
    expect(etiqueta('AUDIENCIA_SANEAMIENTO')).toBe('Audiencia de saneamiento');
    expect(etiqueta('APELACION')).toBe('Apelación');
  });

  it('asigna clases de color', () => {
    expect(tono('EN_PROGRESO')).toBe('e-info');
    expect(tono('CERRADA')).toBe('e-exito');
    expect(claseRiesgo('CRITICO')).toBe('riesgo-CRITICO');
    expect(claseRiesgo(null)).toBe('');
  });
});

describe('descomponerAsunto', () => {
  it('separa materia, partes y órgano', async () => {
    const { descomponerAsunto } = await import('./asunto');
    expect(
      descomponerAsunto('Alimentos · Torres Huamán c. Salinas Ruiz · 4.º Juzgado de Paz Letrado'),
    ).toEqual({
      materia: 'Alimentos',
      titulo: 'Torres Huamán c. Salinas Ruiz',
      organo: '4.º Juzgado de Paz Letrado',
    });
  });

  it('usa todo el texto como título si no sigue la convención', async () => {
    const { descomponerAsunto } = await import('./asunto');
    expect(descomponerAsunto('Asunto libre')).toEqual({
      titulo: 'Asunto libre',
      materia: null,
      organo: null,
    });
  });
});
