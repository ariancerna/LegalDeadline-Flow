import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of, switchMap } from 'rxjs';
import { ConsultasService } from '../../core/api/consultas.service';
import { PlazosService } from '../../core/api/plazos.service';
import { AuthService } from '../../core/auth/auth.service';
import { interpretarError } from '../../core/errores';
import { ExpedientesCache } from '../../core/expedientes.cache';
import { Indicadores, NIVELES_RIESGO, Plazo, RiesgoPlazo } from '../../core/models';
import { ResponsablesStore } from '../../core/responsables.store';
import { EtiquetaPipe } from '../../shared/etiqueta.pipe';
import { claseRiesgo } from '../../shared/etiquetas';
import { FechaPipe } from '../../shared/fecha.pipe';
import { hoyLima, sumarDias, textoDias } from '../../shared/fechas';

interface Alerta {
  plazo: Plazo;
  riesgo: RiesgoPlazo;
}

/** RF17 / RF22: tablero con indicadores, riesgo, alertas de plazos y carga. */
@Component({
  selector: 'app-tablero',
  imports: [RouterLink, EtiquetaPipe, FechaPipe],
  templateUrl: './tablero.component.html',
  styleUrl: './tablero.component.scss',
})
export class TableroComponent implements OnInit {
  private readonly consultas = inject(ConsultasService);
  private readonly plazos = inject(PlazosService);
  protected readonly auth = inject(AuthService);
  protected readonly responsables = inject(ResponsablesStore);
  protected readonly expedientes = inject(ExpedientesCache);
  protected readonly niveles = NIVELES_RIESGO;
  protected readonly claseRiesgo = claseRiesgo;
  protected readonly textoDias = textoDias;

  protected readonly indicadores = signal<Indicadores | null>(null);
  protected readonly alertas = signal<Alerta[] | null>(null);
  protected readonly error = signal<string | null>(null);

  protected readonly totalRiesgo = computed(() => {
    const r = this.indicadores()?.riesgoPlazosActivos ?? {};
    return NIVELES_RIESGO.reduce((suma, n) => suma + (r[n] ?? 0), 0);
  });
  protected readonly sobrecargados = computed(() =>
    this.responsables.lista().filter((r) => r.sobrecargado),
  );

  ngOnInit(): void {
    this.consultas.indicadores().subscribe({
      next: (i) => this.indicadores.set(i),
      error: (e) => this.error.set(interpretarError(e).mensaje),
    });
    this.cargarAlertas();
  }

  protected cantidad(nivel: string): number {
    const r = this.indicadores()?.riesgoPlazosActivos ?? {};
    return r[nivel as keyof typeof r] ?? 0;
  }

  protected porcentaje(nivel: string): number {
    const total = this.totalRiesgo();
    return total === 0 ? 0 : (this.cantidad(nivel) / total) * 100;
  }

  /** Alertas de proximidad: plazos activos que vencen en los próximos 10 días (o ya vencieron) con riesgo crítico o alto. */
  private cargarAlertas(): void {
    this.plazos
      .listar({ estado: 'ACTIVO', hasta: sumarDias(hoyLima(), 10), size: 50 })
      .pipe(
        switchMap((pagina) =>
          pagina.content.length === 0
            ? of([] as Alerta[])
            : forkJoin(
                pagina.content.map((plazo) =>
                  this.plazos.riesgo(plazo.id).pipe(
                    catchError(() => of(null)),
                    // Une cada plazo con su riesgo calculado por el backend.
                    switchMap((riesgo) => of(riesgo ? { plazo, riesgo } : null)),
                  ),
                ),
              ).pipe(switchMap((lista) => of(lista.filter((a): a is Alerta => a !== null)))),
        ),
      )
      .subscribe({
        next: (lista) => {
          const urgentes = lista
            .filter((a) => a.riesgo.nivel === 'CRITICO' || a.riesgo.nivel === 'ALTO')
            .sort((a, b) => a.riesgo.diasRestantes - b.riesgo.diasRestantes);
          this.expedientes.cargar(urgentes.map((a) => a.plazo.expedienteId));
          this.alertas.set(urgentes);
        },
        error: () => this.alertas.set([]),
      });
  }
}
