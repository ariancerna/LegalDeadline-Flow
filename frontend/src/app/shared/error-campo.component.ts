import { Component, input } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { IconoComponent } from './icono.component';

/** Muestra el primer error de validación de un control (cliente) o el que devolvió el servidor. */
@Component({
  selector: 'app-error-campo',
  imports: [IconoComponent],
  template: `
    @if (mensaje(); as texto) {
      <span class="error-campo" role="alert"
        ><app-icono nombre="circle-alert" [tamano]="13" />{{ texto }}</span
      >
    }
  `,
})
export class ErrorCampoComponent {
  readonly control = input.required<AbstractControl>();
  readonly servidor = input<string | undefined>(undefined);

  protected mensaje(): string | null {
    const c = this.control();
    if (c.invalid && (c.touched || c.dirty)) {
      const e = c.errors ?? {};
      if (e['required']) return 'Este campo es obligatorio.';
      if (e['email']) return 'Ingresa un correo válido.';
      if (e['minlength']) return `Debe tener al menos ${e['minlength'].requiredLength} caracteres.`;
      if (e['maxlength']) return `Admite como máximo ${e['maxlength'].requiredLength} caracteres.`;
      if (e['min']) return `El valor mínimo es ${e['min'].min}.`;
      if (e['espacios']) return 'No puede contener solo espacios.';
      return 'Valor inválido.';
    }
    return this.servidor() ?? null;
  }
}
