import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { LowerCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { FiltrosTarea, TareasService } from '../../core/api/tareas.service';
import { AuthService } from '../../core/auth/auth.service';
import { interpretarError } from '../../core/errores';
import { PRIORIDADES, TAREA_ESTADOS, Tarea, TareaEstado } from '../../core/models';
import { ResponsablesStore } from '../../core/responsables.store';
import { DialogoComponent } from '../../shared/dialogo.component';
import { EsqueletoComponent } from '../../shared/esqueleto.component';
import { EtiquetaPipe } from '../../shared/etiqueta.pipe';
import { IconoComponent } from '../../shared/icono.component';
import { PaginadorComponent } from '../../shared/paginador.component';
import { VacioComponent } from '../../shared/vacio.component';
import { TareaFormComponent } from './tarea-form.component';
import { TareasKanbanComponent } from './tareas-kanban.component';
import { TareasTablaComponent } from './tareas-tabla.component';

type Vista = 'lista' | 'tablero';
type Filtros = Required<Omit<FiltrosTarea, 'page' | 'size' | 'expedienteId'>>;
const CLAVE_VISTA = 'ldf.vista-tareas';

/** RF11 / RF21: consulta de tareas en lista o en tablero Kanban. */
@Component({
  selector: 'app-tareas-lista',
  imports: [
    FormsModule,
    LowerCasePipe,
    EtiquetaPipe,
    PaginadorComponent,
    DialogoComponent,
    TareaFormComponent,
    TareasTablaComponent,
    TareasKanbanComponent,
    IconoComponent,
    EsqueletoComponent,
    VacioComponent,
  ],
  templateUrl: './tareas-lista.component.html',
})
export class TareasListaComponent implements OnInit {
  private readonly servicio = inject(TareasService);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  protected readonly responsables = inject(ResponsablesStore);
  protected readonly estados = TAREA_ESTADOS;
  protected readonly prioridades = PRIORIDADES;

  protected readonly vista = signal<Vista>(leerVista());
  protected readonly filtros = signal<Filtros>(vacios());
  protected readonly pagina = signal(0);
  protected readonly tamano = 12;
  protected readonly datos = signal<Tarea[]>([]);
  protected readonly total = signal(0);
  protected readonly porEstado = signal<Record<TareaEstado, Tarea[]> | null>(null);
  protected readonly totalesEstado = signal<Record<TareaEstado, number> | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly creando = signal(false);

  protected readonly hayFiltros = computed(() =>
    Object.values(this.filtros()).some((v) => v !== '' && v !== null),
  );

  constructor() {
    if (inject(ActivatedRoute).snapshot.queryParamMap.get('nuevo') && this.auth.puedeEscribir())
      this.creando.set(true);
  }

  ngOnInit(): void {
    this.cargar();
  }

  protected cambiarVista(v: Vista): void {
    this.vista.set(v);
    try {
      localStorage.setItem(CLAVE_VISTA, v);
    } catch {
      /* sin almacenamiento */
    }
    this.cargar();
  }

  protected filtrar(clave: keyof Filtros, valor: unknown): void {
    this.filtros.update((f) => ({ ...f, [clave]: valor ?? '' }));
    this.pagina.set(0);
    this.cargar();
  }

  protected limpiar(): void {
    this.filtros.set(vacios());
    this.pagina.set(0);
    this.cargar();
  }

  protected cerrarCreacion(): void {
    this.creando.set(false);
    void this.router.navigate([], { queryParams: {}, replaceUrl: true });
  }

  protected creada(): void {
    this.cerrarCreacion();
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    const f = this.filtros();
    if (this.vista() === 'tablero') {
      // Una consulta por columna; el filtro de estado no aplica en el tablero.
      forkJoin(
        TAREA_ESTADOS.map((estado) => this.servicio.listar({ ...f, estado, size: 50 })),
      ).subscribe({
        next: (paginas) => {
          const columnas = {} as Record<TareaEstado, Tarea[]>;
          const totales = {} as Record<TareaEstado, number>;
          TAREA_ESTADOS.forEach((e, i) => {
            columnas[e] = paginas[i].content;
            totales[e] = paginas[i].totalElements;
          });
          this.porEstado.set(columnas);
          this.totalesEstado.set(totales);
          this.cargando.set(false);
        },
        error: (e) => this.fallo(e),
      });
      return;
    }
    this.servicio.listar({ ...f, page: this.pagina(), size: this.tamano }).subscribe({
      next: (p) => {
        this.datos.set(p.content);
        this.total.set(p.totalElements);
        this.cargando.set(false);
      },
      error: (e) => this.fallo(e),
    });
  }

  private fallo(e: unknown): void {
    this.error.set(interpretarError(e).mensaje);
    this.cargando.set(false);
  }
}

function vacios(): Filtros {
  return { estado: '', prioridad: '', responsableId: null, desde: '', hasta: '' };
}

function leerVista(): Vista {
  try {
    return localStorage.getItem(CLAVE_VISTA) === 'tablero' ? 'tablero' : 'lista';
  } catch {
    return 'lista';
  }
}
