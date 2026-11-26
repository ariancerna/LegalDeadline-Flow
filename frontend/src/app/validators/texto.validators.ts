import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Rechaza textos formados solo por espacios (el backend aplica @NotBlank). */
export function noSoloEspacios(control: AbstractControl): ValidationErrors | null {
  const valor = control.value;
  return typeof valor === 'string' && valor.length > 0 && valor.trim().length === 0
    ? { espacios: true }
    : null;
}

/** Largo de un texto como lo cuenta el backend: sin espacios al borde ni espacios repetidos. */
export function largoNormalizado(texto: string | null | undefined): number {
  return (texto ?? '').trim().replace(/\s+/g, ' ').length;
}

/**
 * Exige entre `min` y `max` caracteres contando el texto normalizado, para que «   a   » no pase
 * por un motivo de 10 caracteres. Devuelve { largo: { min, max, actual } }.
 */
export function largoEntre(min: number, max: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const actual = largoNormalizado(control.value);
    return actual >= min && actual <= max ? null : { largo: { min, max, actual } };
  };
}

/** Motivo de anulación de un plazo: entre 10 y 250 caracteres (AnulacionPlazoRequest). */
export const MOTIVO_ANULACION = { min: 10, max: 250 } as const;
export const motivoAnulacion = largoEntre(MOTIVO_ANULACION.min, MOTIVO_ANULACION.max);
