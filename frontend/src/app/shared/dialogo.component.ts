import { Component, ElementRef, afterNextRender, inject, input, output } from '@angular/core';

/** Ventana modal simple. Se cierra con Escape, con el botón × o al hacer clic fuera. */
@Component({
  selector: 'app-dialogo',
  host: { '(document:keydown.escape)': 'cerrar.emit()' },
  template: `
    <div class="fondo" (click)="cerrar.emit()"></div>
    <section
      class="dialogo"
      role="dialog"
      aria-modal="true"
      [attr.aria-label]="titulo()"
      [class.ancho]="ancho()"
      tabindex="-1"
    >
      <header>
        <h2>{{ titulo() }}</h2>
        <button
          type="button"
          class="btn-enlace"
          aria-label="Cerrar ventana"
          (click)="cerrar.emit()"
        >
          ✕
        </button>
      </header>
      <div class="cuerpo"><ng-content /></div>
    </section>
  `,
  styleUrl: './dialogo.component.scss',
})
export class DialogoComponent {
  readonly titulo = input.required<string>();
  readonly ancho = input(false);
  readonly cerrar = output<void>();

  constructor() {
    const host = inject(ElementRef<HTMLElement>);
    afterNextRender(() => {
      const primero = host.nativeElement.querySelector(
        '.cuerpo input:not([disabled]), .cuerpo select:not([disabled]), .cuerpo textarea',
      ) as HTMLElement | null;
      (primero ?? (host.nativeElement.querySelector('.dialogo') as HTMLElement)).focus();
    });
  }
}
