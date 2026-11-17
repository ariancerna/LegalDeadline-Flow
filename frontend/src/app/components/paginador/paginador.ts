import { Component, computed, input, output } from '@angular/core';
import { IconoComponent } from '../icono/icono';

/** Controles de paginación para respuestas Page de Spring Data. */
@Component({
  selector: 'app-paginador',
  imports: [IconoComponent],
  templateUrl: './paginador.html',
  styleUrl: './paginador.scss',
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
