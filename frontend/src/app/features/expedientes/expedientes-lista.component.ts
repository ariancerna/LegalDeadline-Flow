import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject, debounceTime } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ExpedientesService, FiltrosExpediente } from '../../core/api/expedientes.service';
import { AuthService } from '../../core/auth/auth.service';
import { interpretarError } from '../../core/errores';
import { EXPEDIENTE_ESTADOS, Expediente, ExpedienteEstado } from '../../core/models';
import { ResponsablesStore } from '../../core/responsables.store';
import { DialogoComponent } from '../../shared/dialogo.component';
import { EtiquetaPipe } from '../../shared/etiqueta.pipe';
import { tono } from '../../shared/etiquetas';
import { FechaPipe } from '../../shared/fecha.pipe';
import { PaginadorComponent } from '../../shared/paginador.component';
import { ExpedienteFormComponent } from './expediente-form.component';

/** RF04 / RF21: búsqueda paginada de expedientes con filtros combinables. */
@Component({
  selector: 'app-expedientes-lista',
  imports: [
    FormsModule,
    RouterLink,
    EtiquetaPipe,
    FechaPipe,
    PaginadorComponent,
    DialogoComponent,
    ExpedienteFormComponent,
  ],
  templateUrl: './expedientes-lista.component.html',
})
export class ExpedientesListaComponent implements OnInit {
  private readonly servicio = inject(ExpedientesService);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  protected readonly responsables = inject(ResponsablesStore);
  protected readonly estados = EXPEDIENTE_ESTADOS;
  protected readonly tono = tono;

  protected readonly filtros = signal<
    Required<Pick<FiltrosExpediente, 'q' | 'estado'>> & { responsableId: number | null }
  >({
    q: '',
    estado: '',
    responsableId: null,
  });
  protected readonly pagina = signal(0);
  protected readonly tamano = 10;
  protected readonly datos = signal<Expediente[]>([]);
  protected readonly total = signal(0);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly creando = signal(false);
  protected readonly tiempoMs = signal<number | null>(null);

  private readonly busqueda$ = new Subject<void>();

  constructor() {
    this.busqueda$.pipe(debounceTime(300), takeUntilDestroyed()).subscribe(() => {
      this.pagina.set(0);
      this.cargar();
    });
  }

  ngOnInit(): void {
    this.cargar();
  }

  protected cambiarFiltro<K extends 'q' | 'estado' | 'responsableId'>(
    clave: K,
    valor: unknown,
  ): void {
    this.filtros.update((f) => ({ ...f, [clave]: valor }));
    this.busqueda$.next();
  }

  protected limpiar(): void {
    this.filtros.set({ q: '', estado: '', responsableId: null });
    this.pagina.set(0);
    this.cargar();
  }

  protected irAPagina(p: number): void {
    this.pagina.set(p);
    this.cargar();
  }

  protected creado(e: Expediente): void {
    this.creando.set(false);
    void this.router.navigate(['/expedientes', e.id]);
  }

  protected cargar(): void {
    const f = this.filtros();
    this.cargando.set(true);
    this.error.set(null);
    const inicio = performance.now();
    this.servicio
      .listar({
        page: this.pagina(),
        size: this.tamano,
        q: f.q.trim(),
        estado: f.estado as ExpedienteEstado | '',
        responsableId: f.responsableId,
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
