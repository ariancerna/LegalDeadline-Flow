import { diasHasta, formatoFecha, hoyLima, localLimaAIso, sumarDias, textoDias } from './fechas';

describe('fechas en America/Lima', () => {
  it('a las 02:00 UTC todavía es el día anterior en Lima (UTC-5)', () => {
    expect(hoyLima(new Date('2026-10-28T02:00:00Z'))).toBe('2026-10-27');
    expect(hoyLima(new Date('2026-10-28T06:00:00Z'))).toBe('2026-10-28');
  });

  it('suma días y cruza meses', () => {
    expect(sumarDias('2026-10-30', 3)).toBe('2026-11-02');
    expect(sumarDias('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('calcula días restantes', () => {
    expect(diasHasta('2026-10-30', '2026-10-28')).toBe(2);
    expect(diasHasta('2026-10-27', '2026-10-28')).toBe(-1);
  });

  it('convierte datetime-local de Lima a instante UTC', () => {
    expect(localLimaAIso('2026-10-28T09:30')).toBe('2026-10-28T14:30:00.000Z');
    expect(localLimaAIso('')).toBe('');
  });

  it('formatea y redacta los días en singular y plural', () => {
    expect(formatoFecha('2026-10-28')).toBe('28/10/2026');
    expect(textoDias(0)).toBe('vence hoy');
    expect(textoDias(1)).toBe('falta 1 día');
    expect(textoDias(4)).toBe('faltan 4 días');
    expect(textoDias(-1)).toBe('venció hace 1 día');
    expect(textoDias(-3)).toBe('venció hace 3 días');
  });
});
