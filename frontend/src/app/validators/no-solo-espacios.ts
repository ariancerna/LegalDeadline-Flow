import { AbstractControl, ValidationErrors } from '@angular/forms';

/** Rechaza textos formados solo por espacios (el backend aplica @NotBlank). */
export function noSoloEspacios(control: AbstractControl): ValidationErrors | null {
  const valor = control.value;
  return typeof valor === 'string' && valor.length > 0 && valor.trim().length === 0
    ? { espacios: true }
    : null;
}
