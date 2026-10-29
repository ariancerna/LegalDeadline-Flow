import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertasStore } from '../../core/alertas.store';
import { FiltrosPlazo, PlazosService } from '../../core/api/plazos.service';
import { AuthService } from '../../core/auth/auth.service';
import { interpretarError } from '../../core/errores';
import { PLAZO_ESTADOS, Plazo } from '../../core/models';
import { DialogoComponent } from '../../shared/dialogo.component';
import { EsqueletoComponent } from '../../shared/esqueleto.component';
import { EtiquetaPipe } from '../../shared/etiqueta.pipe';
import { hoyLima, sumarDias } from '../../shared/fechas';
import { IconoComponent } from '../../shared/icono.component';
import { PaginadorComponent } from '../../shared/paginador.component';
import { VacioComponent } from '../../shared/vacio.component';
import { PlazoFormComponent } from './plazo-form.component';
import { PlazosCalendarioComponent } from './plazos-calendario.component';
import { PlazosTablaComponent } from './plazos-tabla.component';

type Filtros = Required<Pick<FiltrosPlazo, 'estado' | 'desde' | 'hasta'>>;
type Vista = 'lista' | 'calendario';
const CLAVE_VISTA = 'ldf.vista-plazos';

/** RF12 / RF15: consulta de plazos con su nivel de riesgo, en lista o calendario. */
@Component({
  selector: 'app-plazos-lista',
  imports: [
    FormsModule,
    EtiquetaPipe,
    PaginadorComponent,
    DialogoComponent,
    PlazoFormComponent,
    PlazosTablaComponent,
    PlazosCalendarioComponent,
    IconoComponent,
    EsqueletoComponent,
    VacioComponent,
  ],
  templateUrl: './plazos-lista.component.html',
})
export class PlazosListaComponent implements OnInit {
  private readonly servicio = inject(PlazosService);
  private readonly router = inject(Router);
  private readonly alertas = inject(AlertasStore);
  protected readonly auth = inject(AuthService);
  protected readonly estados = PLAZO_ESTADOS;

  protected readonly vista = signal<Vista>(leerVista());
  // Por defecto, los plazos activos por vencer: lo que hay que atender, del más cercano al más lejano.
  protected readonly filtros = signal<Filtros>(filtrosDe('porVencer'));
  protected readonly rapido = signal<Rapido>('porVencer');
  protected readonly pagina = signal(0);
  protected readonly tamano = 12;
  protected readonly datos = signal<Plazo[]>([]);
  protected readonly total = signal(0);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly creando = signal(false);
  protected readonly versionCalendario = signal(0);

  protected readonly hayFiltros = computed(
    () => this.rapido() === 'todos' && Object.values(this.filtros()).some((v) => v !== ''),
  );

  constructor() {
    const parametros = inject(ActivatedRoute).snapshot.queryParamMap;
    if (parametros.get('nuevo') && this.auth.puedeEscribir()) this.creando.set(true);
    // Desde el tablero: /plazos?ver=vencidos abre directamente ese atajo.
    if (parametros.get('vista') === 'calendario') this.vista.set('calendario');
    const ver = parametros.get('ver');
    if (ver === 'vencidos' || ver === 'proximos') {
      this.rapido.set(ver);
      this.filtros.set(filtrosDe(ver));
    }
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
    if (v === 'lista') this.cargar();
  }

  protected filtrar(clave: keyof Filtros, valor: string | null): void {
    this.filtros.update((f) => ({ ...f, [clave]: valor ?? '' }));
    this.rapido.set('todos');
    this.pagina.set(0);
    this.cargar();
  }

  protected atajo(tipo: Rapido): void {
    this.rapido.set(tipo);
    this.filtros.set(filtrosDe(tipo));
    this.pagina.set(0);
    this.cargar();
  }

  protected cerrarCreacion(): void {
    this.creando.set(false);
    void this.router.navigate([], { queryParams: {}, replaceUrl: true });
  }

  protected actualizado(): void {
    this.cargar();
    this.alertas.recargar();
    this.versionCalendario.update((v) => v + 1);
  }

  protected creado(): void {
    this.cerrarCreacion();
    this.actualizado();
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

type Rapido = 'porVencer' | 'proximos' | 'vencidos' | 'todos';

function filtrosDe(tipo: Rapido): Filtros {
  const hoy = hoyLima();
  switch (tipo) {
    case 'porVencer':
      return { estado: 'ACTIVO', desde: hoy, hasta: '' };
    case 'proximos':
      return { estado: 'ACTIVO', desde: hoy, hasta: sumarDias(hoy, 10) };
    case 'vencidos':
      return { estado: 'ACTIVO', desde: '', hasta: sumarDias(hoy, -1) };
    default:
      return { estado: '', desde: '', hasta: '' };
  }
}

function leerVista(): Vista {
  try {
    return localStorage.getItem(CLAVE_VISTA) === 'calendario' ? 'calendario' : 'lista';
  } catch {
    return 'lista';
  }
}
