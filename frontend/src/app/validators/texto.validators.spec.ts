import { FormControl } from '@angular/forms';
import { largoEntre, largoNormalizado, motivoAnulacion, noSoloEspacios } from './texto.validators';

describe('validadores de texto', () => {
  it('noSoloEspacios rechaza un texto en blanco y acepta uno con contenido', () => {
    expect(noSoloEspacios(new FormControl('   '))).toEqual({ espacios: true });
    expect(noSoloEspacios(new FormControl(' Apelación '))).toBeNull();
    expect(noSoloEspacios(new FormControl(''))).toBeNull(); // de eso se encarga Validators.required
  });

  it('cuenta el largo como el backend: sin bordes ni espacios repetidos', () => {
    expect(largoNormalizado('  la   pericia  ')).toBe(10);
    expect(largoNormalizado(null)).toBe(0);
  });

  it('largoEntre informa el mínimo, el máximo y el largo actual', () => {
    expect(largoEntre(3, 5)(new FormControl('ab'))).toEqual({
      largo: { min: 3, max: 5, actual: 2 },
    });
    expect(largoEntre(3, 5)(new FormControl('abcd'))).toBeNull();
  });

  it('el motivo de anulación pide entre 10 y 250 caracteres reales', () => {
    expect(motivoAnulacion(new FormControl('a         b'))).not.toBeNull(); // «a b»: 3 caracteres
    expect(motivoAnulacion(new FormControl('La parte desistió de la pericia'))).toBeNull();
    expect(motivoAnulacion(new FormControl('x'.repeat(251)))).not.toBeNull();
  });
});
