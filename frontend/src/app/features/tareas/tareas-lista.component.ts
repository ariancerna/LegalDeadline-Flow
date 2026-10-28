import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FiltrosTarea, TareasService } from '../../core/api/tareas.service';
import { AuthService } from '../../core/auth/auth.service';
import { interpretarError } from '../../core/errores';
import { PRIORIDADES, TAREA_ESTADOS, Tarea } from '../../core/models';
import { ResponsablesStore } from '../../core/responsables.store';
import { DialogoComponent } from '../../shared/dialogo.component';
import { EtiquetaPipe } from '../../shared/etiqueta.pipe';
import { PaginadorComponent } from '../../shared/paginador.component';
import { TareaFormComponent } from './tarea-form.component';
import { TareasTablaComponent } from './tareas-tabla.component';

/** RF11 / RF21: consulta y filtrado de tareas. */
@Component({
  selector: 'app-tareas-lista',
  imports: [
    FormsModule,
    EtiquetaPipe,
    PaginadorComponent,
    DialogoComponent,
    TareaFormComponent,
    TareasTablaComponent,
  ],
  template: `
    <div class="pagina-encabezado">
      <div>
        <h1>Tareas</h1>
        <p>
          Actividades de los expedientes{{ auth.lecturaGlobal() ? '' : ' que tienes asignados' }}.
        </p>
      </div>
      @if (auth.puedeEscribir()) {
        <button type="button" class="btn btn-primario" (click)="creando.set(true)">
          + Nueva tarea
        </button>
      }
    </div>

    <div class="filtros" role="search">
      <div class="campo">
        <label for="f-estado">Estado</label>
        <select
          id="f-estado"
          [ngModel]="filtros().estado"
          (ngModelChange)="filtrar('estado', $event)"
        >
          <option value="">Todos</option>
          @for (e of estados; track e) {
            <option [value]="e">{{ e | etiqueta }}</option>
          }
        </select>
      </div>
      <div class="campo">
        <label for="f-prioridad">Prioridad</label>
        <select
          id="f-prioridad"
          [ngModel]="filtros().prioridad"
          (ngModelChange)="filtrar('prioridad', $event)"
        >
          <option value="">Todas</option>
          @for (p of prioridades; track p) {
            <option [value]="p">{{ p | etiqueta }}</option>
          }
        </select>
      </div>
      @if (auth.lecturaGlobal()) {
        <div class="campo">
          <label for="f-resp">Responsable</label>
          <select
            id="f-resp"
            [ngModel]="filtros().responsableId"
            (ngModelChange)="filtrar('responsableId', $event)"
          >
            <option [ngValue]="null">Todos</option>
            @for (r of responsables.lista(); track r.responsableId) {
              <option [ngValue]="r.responsableId">{{ r.nombre }}</option>
            }
          </select>
        </div>
      }
      <div class="campo">
        <label for="f-desde">Vence desde</label>
        <input
          id="f-desde"
          type="date"
          [ngModel]="filtros().desde"
          (ngModelChange)="filtrar('desde', $event)"
        />
      </div>
      <div class="campo">
        <label for="f-hasta">Vence hasta</label>
        <input
          id="f-hasta"
          type="date"
          [ngModel]="filtros().hasta"
          (ngModelChange)="filtrar('hasta', $event)"
        />
      </div>
      <div>
        <button type="button" class="btn btn-secundario" (click)="limpiar()">
          Limpiar filtros
        </button>
      </div>
    </div>

    @if (error(); as mensaje) {
      <div class="aviso aviso-error" role="alert">{{ mensaje }}</div>
    }

    <app-tareas-tabla [tareas]="datos()" [cargando]="cargando()" (cambio)="cargar()">
      <app-paginador
        [pagina]="pagina()"
        [tamano]="tamano"
        [total]="total()"
        (cambiar)="pagina.set($event); cargar()"
      />
    </app-tareas-tabla>

    @if (creando()) {
      <app-dialogo titulo="Nueva tarea" (cerrar)="creando.set(false)">
        <app-tarea-form (guardado)="creando.set(false); cargar()" (cancelar)="creando.set(false)" />
      </app-dialogo>
    }
  `,
})
export class TareasListaComponent implements OnInit {
  private readonly servicio = inject(TareasService);
  protected readonly auth = inject(AuthService);
  protected readonly responsables = inject(ResponsablesStore);
  protected readonly estados = TAREA_ESTADOS;
  protected readonly prioridades = PRIORIDADES;

  protected readonly filtros =
    signal<Required<Omit<FiltrosTarea, 'page' | 'size' | 'expedienteId'>>>(vacios());
  protected readonly pagina = signal(0);
  protected readonly tamano = 10;
  protected readonly datos = signal<Tarea[]>([]);
  protected readonly total = signal(0);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly creando = signal(false);

  ngOnInit(): void {
    this.cargar();
  }

  protected filtrar(clave: keyof ReturnType<typeof vacios>, valor: unknown): void {
    this.filtros.update((f) => ({ ...f, [clave]: valor ?? '' }));
    this.pagina.set(0);
    this.cargar();
  }

  protected limpiar(): void {
    this.filtros.set(vacios());
    this.pagina.set(0);
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.servicio.listar({ ...this.filtros(), page: this.pagina(), size: this.tamano }).subscribe({
      next: (p) => {
        this.datos.set(p.content);
        this.total.set(p.totalElements);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(interpretarError(e).mensaje);
        this.cargando.set(false);
      },
    });
  }
}

function vacios(): Required<Omit<FiltrosTarea, 'page' | 'size' | 'expedienteId'>> {
  return { estado: '', prioridad: '', responsableId: null, desde: '', hasta: '' };
}
