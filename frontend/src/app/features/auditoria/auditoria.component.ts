import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConsultasService } from '../../core/api/consultas.service';
import { UsuariosService } from '../../core/api/usuarios.service';
import { AuthService } from '../../core/auth/auth.service';
import { interpretarError } from '../../core/errores';
import { EVENTO_TIPOS, Evento, EventoTipo, Usuario } from '../../core/models';
import { EtiquetaPipe } from '../../shared/etiqueta.pipe';
import { FechaPipe } from '../../shared/fecha.pipe';
import { localLimaAIso } from '../../shared/fechas';
import { PaginadorComponent } from '../../shared/paginador.component';

interface FiltrosVista {
  tipo: EventoTipo | '';
  usuarioId: number | null;
  desde: string;
  hasta: string;
}

/** RF18: bitácora de operaciones críticas (solo lectura). */
@Component({
  selector: 'app-auditoria',
  imports: [FormsModule, EtiquetaPipe, FechaPipe, PaginadorComponent],
  template: `
    <div class="pagina-encabezado">
      <div>
        <h1>Auditoría</h1>
        <p>
          Eventos inmutables de las operaciones críticas: altas, cambios de estado, reasignaciones y
          anulaciones.
        </p>
      </div>
    </div>

    <div class="filtros" role="search">
      <div class="campo">
        <label for="f-tipo">Tipo de evento</label>
        <select id="f-tipo" [ngModel]="filtros().tipo" (ngModelChange)="filtrar('tipo', $event)">
          <option value="">Todos</option>
          @for (t of tipos; track t) {
            <option [value]="t">{{ t | etiqueta }}</option>
          }
        </select>
      </div>
      @if (usuarios().length > 0) {
        <div class="campo">
          <label for="f-usuario">Usuario</label>
          <select
            id="f-usuario"
            [ngModel]="filtros().usuarioId"
            (ngModelChange)="filtrar('usuarioId', $event)"
          >
            <option [ngValue]="null">Todos</option>
            @for (u of usuarios(); track u.id) {
              <option [ngValue]="u.id">{{ u.nombre }}</option>
            }
          </select>
        </div>
      }
      <div class="campo">
        <label for="f-desde">Desde</label>
        <input
          id="f-desde"
          type="datetime-local"
          [ngModel]="filtros().desde"
          (ngModelChange)="filtrar('desde', $event)"
        />
      </div>
      <div class="campo">
        <label for="f-hasta">Hasta</label>
        <input
          id="f-hasta"
          type="datetime-local"
          [ngModel]="filtros().hasta"
          (ngModelChange)="filtrar('hasta', $event)"
        />
      </div>
      <div>
        <button type="button" class="btn btn-secundario" (click)="limpiar()">Limpiar</button>
      </div>
    </div>

    @if (error(); as mensaje) {
      <div class="aviso aviso-error" role="alert">{{ mensaje }}</div>
    }

    <div class="tabla-contenedor">
      <table class="tabla">
        <thead>
          <tr>
            <th>Fecha (Lima)</th>
            <th>Evento</th>
            <th>Recurso</th>
            <th>Detalle</th>
            <th>Autor</th>
          </tr>
        </thead>
        <tbody>
          @for (e of datos(); track e.id) {
            <tr>
              <td class="texto-chico">{{ e.fecha | fecha: 'hora' }}</td>
              <td>
                <span class="badge">{{ e.tipo | etiqueta }}</span>
              </td>
              <td class="mono texto-chico">{{ e.recurso }} #{{ e.recursoId }}</td>
              <td>{{ e.detalle }}</td>
              <td class="texto-chico">{{ e.usuarioEmail ?? 'Sistema' }}</td>
            </tr>
          } @empty {
            <tr>
              <td colspan="5" class="vacia">
                {{ cargando() ? 'Cargando…' : 'No hay eventos para los filtros elegidos.' }}
              </td>
            </tr>
          }
        </tbody>
      </table>
      <app-paginador
        [pagina]="pagina()"
        [tamano]="tamano"
        [total]="total()"
        (cambiar)="pagina.set($event); cargar()"
      />
    </div>
  `,
})
export class AuditoriaComponent implements OnInit {
  private readonly consultas = inject(ConsultasService);
  private readonly usuariosServicio = inject(UsuariosService);
  private readonly auth = inject(AuthService);
  protected readonly tipos = EVENTO_TIPOS;

  protected readonly filtros = signal<FiltrosVista>({
    tipo: '',
    usuarioId: null,
    desde: '',
    hasta: '',
  });
  protected readonly usuarios = signal<Usuario[]>([]);
  protected readonly pagina = signal(0);
  protected readonly tamano = 15;
  protected readonly datos = signal<Evento[]>([]);
  protected readonly total = signal(0);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    // Solo el administrador puede listar usuarios; los demás filtran por tipo y fecha.
    if (this.auth.esAdmin()) {
      this.usuariosServicio
        .listar()
        .subscribe({ next: (u) => this.usuarios.set(u), error: () => undefined });
    }
    this.cargar();
  }

  protected filtrar<K extends keyof FiltrosVista>(clave: K, valor: FiltrosVista[K]): void {
    this.filtros.update((f) => ({ ...f, [clave]: valor ?? '' }));
    this.pagina.set(0);
    this.cargar();
  }

  protected limpiar(): void {
    this.filtros.set({ tipo: '', usuarioId: null, desde: '', hasta: '' });
    this.pagina.set(0);
    this.cargar();
  }

  protected cargar(): void {
    const f = this.filtros();
    this.cargando.set(true);
    this.error.set(null);
    this.consultas
      .eventos({
        page: this.pagina(),
        size: this.tamano,
        tipo: f.tipo,
        usuarioId: f.usuarioId,
        desde: localLimaAIso(f.desde),
        hasta: localLimaAIso(f.hasta),
      })
      .subscribe({
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
