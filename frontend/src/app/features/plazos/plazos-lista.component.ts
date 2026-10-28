import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FiltrosPlazo, PlazosService } from '../../core/api/plazos.service';
import { AuthService } from '../../core/auth/auth.service';
import { interpretarError } from '../../core/errores';
import { PLAZO_ESTADOS, Plazo } from '../../core/models';
import { DialogoComponent } from '../../shared/dialogo.component';
import { EtiquetaPipe } from '../../shared/etiqueta.pipe';
import { hoyLima, sumarDias } from '../../shared/fechas';
import { PaginadorComponent } from '../../shared/paginador.component';
import { PlazoFormComponent } from './plazo-form.component';
import { PlazosTablaComponent } from './plazos-tabla.component';

type FiltrosVista = Required<Pick<FiltrosPlazo, 'estado' | 'desde' | 'hasta'>>;

/** RF12 / RF15: consulta de plazos con su nivel de riesgo. */
@Component({
  selector: 'app-plazos-lista',
  imports: [
    FormsModule,
    EtiquetaPipe,
    PaginadorComponent,
    DialogoComponent,
    PlazoFormComponent,
    PlazosTablaComponent,
  ],
  template: `
    <div class="pagina-encabezado">
      <div>
        <h1>Plazos</h1>
        <p>Vencimientos con su riesgo calculado automáticamente.</p>
      </div>
      @if (auth.puedeEscribir()) {
        <button type="button" class="btn btn-primario" (click)="creando.set(true)">
          + Nuevo plazo
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
      <div class="acciones">
        <button type="button" class="btn btn-secundario" (click)="proximos()">
          Próximos 10 días
        </button>
        <button type="button" class="btn btn-secundario" (click)="limpiar()">Limpiar</button>
      </div>
    </div>

    @if (error(); as mensaje) {
      <div class="aviso aviso-error" role="alert">{{ mensaje }}</div>
    }

    <app-plazos-tabla [plazos]="datos()" [cargando]="cargando()" (cambio)="cargar()">
      <app-paginador
        [pagina]="pagina()"
        [tamano]="tamano"
        [total]="total()"
        (cambiar)="pagina.set($event); cargar()"
      />
    </app-plazos-tabla>

    @if (creando()) {
      <app-dialogo titulo="Nuevo plazo" (cerrar)="creando.set(false)">
        <app-plazo-form (guardado)="creando.set(false); cargar()" (cancelar)="creando.set(false)" />
      </app-dialogo>
    }
  `,
})
export class PlazosListaComponent implements OnInit {
  private readonly servicio = inject(PlazosService);
  protected readonly auth = inject(AuthService);
  protected readonly estados = PLAZO_ESTADOS;

  protected readonly filtros = signal<FiltrosVista>({ estado: '', desde: '', hasta: '' });
  protected readonly pagina = signal(0);
  protected readonly tamano = 10;
  protected readonly datos = signal<Plazo[]>([]);
  protected readonly total = signal(0);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly creando = signal(false);

  ngOnInit(): void {
    this.cargar();
  }

  protected filtrar(clave: keyof FiltrosVista, valor: string | null): void {
    this.filtros.update((f) => ({ ...f, [clave]: valor ?? '' }));
    this.pagina.set(0);
    this.cargar();
  }

  protected proximos(): void {
    this.filtros.set({ estado: 'ACTIVO', desde: '', hasta: sumarDias(hoyLima(), 10) });
    this.pagina.set(0);
    this.cargar();
  }

  protected limpiar(): void {
    this.filtros.set({ estado: '', desde: '', hasta: '' });
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
