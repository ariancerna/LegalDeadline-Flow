import { Component, ElementRef, afterNextRender, inject, input, output } from '@angular/core';
import { IconoComponent } from '../icono/icono';
import { NombreIcono } from '../icono/iconos.generados';

/**
 * Ventana modal. Con `lateral` se muestra como panel deslizante a la derecha (formularios).
 * Se cierra con Escape, con el botón ✕ o al hacer clic en el fondo.
 */
@Component({
  selector: 'app-dialogo',
  imports: [IconoComponent],
  host: { '(document:keydown.escape)': 'cerrar.emit()' },
  templateUrl: './dialogo.html',
  styleUrl: './dialogo.scss',
})
export class DialogoComponent {
  readonly titulo = input.required<string>();
  readonly descripcion = input<string>('');
  /** Se conserva por compatibilidad; el encabezado ya no muestra icono. */
  readonly icono = input<NombreIcono | null>(null);
  readonly tono = input<'normal' | 'peligro'>('normal');
  readonly lateral = input(false);
  readonly ancho = input(false);
  readonly cerrar = output<void>();

  constructor() {
    const host = inject(ElementRef<HTMLElement>);
    afterNextRender(() => {
      const primero = host.nativeElement.querySelector(
        '.cuerpo input:not([disabled]):not([type=checkbox]), .cuerpo select:not([disabled]), .cuerpo textarea',
      ) as HTMLElement | null;
      (primero ?? (host.nativeElement.querySelector('.ventana') as HTMLElement)).focus();
    });
  }
}
