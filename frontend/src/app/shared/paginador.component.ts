import { Component, computed, input, output } from '@angular/core';

/** Controles de paginación para respuestas Page de Spring Data. */
@Component({
  selector: 'app-paginador',
  template: `
    @if (total() > 0) {
      <nav class="paginador" aria-label="Paginación">
        <span class="texto-suave texto-chico"> {{ desde() }}–{{ hasta() }} de {{ total() }} </span>
        <div class="acciones">
          <button
            type="button"
            class="btn btn-secundario btn-chico"
            [disabled]="pagina() === 0"
            (click)="cambiar.emit(pagina() - 1)"
          >
            Anterior
          </button>
          <span class="texto-chico">Página {{ pagina() + 1 }} de {{ totalPaginas() }}</span>
          <button
            type="button"
            class="btn btn-secundario btn-chico"
            [disabled]="pagina() + 1 >= totalPaginas()"
            (click)="cambiar.emit(pagina() + 1)"
          >
            Siguiente
          </button>
        </div>
      </nav>
    }
  `,
  styles: `
    .paginador {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      justify-content: space-between;
      align-items: center;
      padding: 12px 14px;
    }
  `,
})
export class PaginadorComponent {
  readonly pagina = input.required<number>();
  readonly tamano = input.required<number>();
  readonly total = input.required<number>();
  readonly cambiar = output<number>();

  protected readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.tamano())),
  );
  protected readonly desde = computed(() => this.pagina() * this.tamano() + 1);
  protected readonly hasta = computed(() =>
    Math.min(this.total(), (this.pagina() + 1) * this.tamano()),
  );
}
