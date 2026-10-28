import { Component, computed, input, output } from '@angular/core';
import { IconoComponent } from './icono.component';

/** Controles de paginación para respuestas Page de Spring Data. */
@Component({
  selector: 'app-paginador',
  imports: [IconoComponent],
  template: `
    @if (total() > 0) {
      <nav class="paginador" aria-label="Paginación">
        <span class="texto-3 texto-chico num">
          Mostrando <strong>{{ desde() }}–{{ hasta() }}</strong> de <strong>{{ total() }}</strong>
        </span>
        <div class="acciones">
          <button
            type="button"
            class="btn btn-secundario btn-chico"
            aria-label="Página anterior"
            [disabled]="pagina() === 0"
            (click)="cambiar.emit(pagina() - 1)"
          >
            <app-icono nombre="chevron-left" [tamano]="15" /> Anterior
          </button>
          <span class="texto-chico num texto-2">{{ pagina() + 1 }} / {{ totalPaginas() }}</span>
          <button
            type="button"
            class="btn btn-secundario btn-chico"
            aria-label="Página siguiente"
            [disabled]="pagina() + 1 >= totalPaginas()"
            (click)="cambiar.emit(pagina() + 1)"
          >
            Siguiente <app-icono nombre="chevron-right" [tamano]="15" />
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
      padding: 12px 16px;
      border-top: 1px solid var(--borde);
    }
    strong {
      color: var(--texto);
      font-weight: 600;
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
