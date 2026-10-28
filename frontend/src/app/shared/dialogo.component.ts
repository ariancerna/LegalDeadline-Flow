import { Component, ElementRef, afterNextRender, inject, input, output } from '@angular/core';
import { IconoComponent } from './icono.component';
import { NombreIcono } from './iconos.generados';

/**
 * Ventana modal. Con `lateral` se muestra como panel deslizante a la derecha (formularios).
 * Se cierra con Escape, con el botón ✕ o al hacer clic en el fondo.
 */
@Component({
  selector: 'app-dialogo',
  imports: [IconoComponent],
  host: { '(document:keydown.escape)': 'cerrar.emit()' },
  template: `
    <div class="velo" (click)="cerrar.emit()"></div>
    <section
      class="ventana"
      [class.lateral]="lateral()"
      [class.ancho]="ancho()"
      role="dialog"
      aria-modal="true"
      [attr.aria-label]="titulo()"
      tabindex="-1"
    >
      <header>
        <div class="titulos">
          <h2>{{ titulo() }}</h2>
          @if (descripcion()) {
            <p>{{ descripcion() }}</p>
          }
        </div>
        <button
          type="button"
          class="btn btn-fantasma btn-icono btn-chico"
          aria-label="Cerrar ventana"
          (click)="cerrar.emit()"
        >
          <app-icono nombre="x" [tamano]="18" />
        </button>
      </header>
      <div class="cuerpo"><ng-content /></div>
    </section>
  `,
  styleUrl: './dialogo.component.scss',
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
