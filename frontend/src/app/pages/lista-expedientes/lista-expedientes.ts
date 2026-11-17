import { CifraPipe } from '../../utils/cifra';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, debounceTime } from 'rxjs';
import { ConsultasService } from '../../services/api/consultas.service';
import { ExpedientesService } from '../../services/api/expedientes.service';
import { AuthService } from '../../services/auth/auth.service';
import { interpretarError } from '../../services/errores';
import { Expediente, ExpedienteEstado } from '../../models/expediente';
import { Indicadores } from '../../models/indicadores';
import { ResponsablesStore } from '../../services/responsables.store';
import { AsuntoPipe } from '../../utils/asunto.pipe';
import { AvatarComponent } from '../../components/avatar/avatar';
import { DialogoComponent } from '../../components/dialogo/dialogo';
import { EsqueletoComponent } from '../../components/esqueleto/esqueleto';
import { EtiquetaPipe } from '../../utils/etiqueta.pipe';
import { tono } from '../../utils/etiquetas';
import { haceCuanto, textoDias } from '../../utils/fechas';
import { FechaPipe } from '../../utils/fecha.pipe';
import { IconoComponent } from '../../components/icono/icono';
import { PaginadorComponent } from '../../components/paginador/paginador';
import { VacioComponent } from '../../components/vacio/vacio';
import { ExpedienteFormComponent } from '../formulario-expediente/formulario-expediente';

type Pestana = ExpedienteEstado | '';

/** RF04 / RF21: búsqueda paginada de expedientes con filtros combinables. */
@Component({
  selector: 'app-expedientes-lista',
  imports: [
    CifraPipe,
    FormsModule,
    EtiquetaPipe,
    PaginadorComponent,
    DialogoComponent,
    ExpedienteFormComponent,
    IconoComponent,
    AvatarComponent,
    EsqueletoComponent,
    VacioComponent,
    AsuntoPipe,
    FechaPipe,
  ],
  templateUrl: './lista-expedientes.html',
  styleUrl: './lista-expedientes.scss',
})
export class ExpedientesListaComponent implements OnInit {
  private readonly servicio = inject(ExpedientesService);
  private readonly consultas = inject(ConsultasService);
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);
  protected readonly auth = inject(AuthService);
  protected readonly responsables = inject(ResponsablesStore);
  protected readonly tono = tono;
  protected readonly haceCuanto = haceCuanto;
  protected readonly textoDias = textoDias;

  protected readonly q = signal('');
  // Abiertos por defecto: es la cartera con la que se trabaja cada día.
  protected readonly estado = signal<Pestana>('ABIERTO');
  protected readonly responsableId = signal<number | null>(null);
  protected readonly pagina = signal(0);
  protected readonly tamano = 15;
  protected readonly datos = signal<Expediente[]>([]);
  protected readonly total = signal(0);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly creando = signal(false);
  protected readonly tiempoMs = signal<number | null>(null);
  protected readonly indicadores = signal<Indicadores | null>(null);

  protected readonly pestanas = computed(() => {
    const i = this.indicadores();
    return [
      {
        valor: '' as Pestana,
        texto: 'Todos',
        cuenta: i ? i.expedientesAbiertos + i.expedientesCerrados + i.expedientesArchivados : null,
      },
      { valor: 'ABIERTO' as Pestana, texto: 'Abiertos', cuenta: i?.expedientesAbiertos ?? null },
      { valor: 'CERRADO' as Pestana, texto: 'Cerrados', cuenta: i?.expedientesCerrados ?? null },
      {
        valor: 'ARCHIVADO' as Pestana,
        texto: 'Archivados',
        cuenta: i?.expedientesArchivados ?? null,
      },
    ];
  });
  protected readonly hayFiltros = computed(
    () => this.q().trim() !== '' || this.responsableId() !== null,
  );

  private readonly busqueda$ = new Subject<void>();

  constructor() {
    this.busqueda$.pipe(debounceTime(280), takeUntilDestroyed()).subscribe(() => {
      this.pagina.set(0);
      this.cargar();
    });
    if (this.ruta.snapshot.queryParamMap.get('nuevo') && this.auth.esGestor())
      this.creando.set(true);
  }

  ngOnInit(): void {
    this.cargar();
    this.consultas
      .indicadores()
      .subscribe({ next: (i) => this.indicadores.set(i), error: () => undefined });
  }

  protected buscar(valor: string): void {
    this.q.set(valor);
    this.busqueda$.next();
  }

  protected elegirEstado(valor: Pestana): void {
    this.estado.set(valor);
    this.pagina.set(0);
    this.cargar();
  }

  protected elegirResponsable(valor: number | null): void {
    this.responsableId.set(valor);
    this.pagina.set(0);
    this.cargar();
  }

  protected limpiar(): void {
    this.q.set('');
    this.responsableId.set(null);
    this.pagina.set(0);
    this.cargar();
  }

  protected irAPagina(p: number): void {
    this.pagina.set(p);
    this.cargar();
  }

  protected abrir(e: Expediente): void {
    void this.router.navigate(['/expedientes', e.id]);
  }

  protected cerrarCreacion(): void {
    this.creando.set(false);
    void this.router.navigate([], { queryParams: {}, replaceUrl: true });
  }

  protected creado(e: Expediente): void {
    this.creando.set(false);
    void this.router.navigate(['/expedientes', e.id]);
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    const inicio = performance.now();
    this.servicio
      .listar({
        page: this.pagina(),
        size: this.tamano,
        q: this.q().trim(),
        estado: this.estado(),
        responsableId: this.responsableId(),
      })
      .subscribe({
        next: (p) => {
          this.datos.set(p.content);
          this.total.set(p.totalElements);
          this.tiempoMs.set(Math.round(performance.now() - inicio));
          this.cargando.set(false);
        },
        error: (e) => {
          this.error.set(interpretarError(e).mensaje);
          this.cargando.set(false);
        },
      });
  }
}
