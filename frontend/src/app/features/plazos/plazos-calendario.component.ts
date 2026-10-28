import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, forkJoin, of, switchMap } from 'rxjs';
import { PlazosService } from '../../core/api/plazos.service';
import { ExpedientesCache } from '../../core/expedientes.cache';
import { NivelRiesgo, Plazo } from '../../core/models';
import { EtiquetaPipe } from '../../shared/etiqueta.pipe';
import { hoyLima, nombreMes, sumarDias } from '../../shared/fechas';
import { IconoComponent } from '../../shared/icono.component';

interface Celda {
  fecha: string;
  dia: number;
  delMes: boolean;
  plazos: Plazo[];
}

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

/** Calendario mensual de plazos coloreados por riesgo (RF12 / RF15). */
@Component({
  selector: 'app-plazos-calendario',
  imports: [EtiquetaPipe, IconoComponent],
  templateUrl: './plazos-calendario.component.html',
  styleUrl: './plazos-calendario.component.scss',
})
export class PlazosCalendarioComponent {
  private readonly servicio = inject(PlazosService);
  private readonly router = inject(Router);
  protected readonly expedientes = inject(ExpedientesCache);
  protected readonly dias = DIAS;
  protected readonly hoy = hoyLima();

  /** Se incrementa desde fuera para forzar una recarga. */
  readonly version = input(0);

  protected readonly anio = signal(Number(this.hoy.slice(0, 4)));
  protected readonly mes = signal(Number(this.hoy.slice(5, 7)) - 1);
  protected readonly plazos = signal<Plazo[]>([]);
  protected readonly niveles = signal<ReadonlyMap<number, NivelRiesgo>>(new Map());
  protected readonly cargando = signal(false);

  protected readonly titulo = computed(() => `${nombreMes(this.mes())} ${this.anio()}`);

  private readonly rango = computed(() => {
    const primero = `${this.anio()}-${String(this.mes() + 1).padStart(2, '0')}-01`;
    const diaSemana = (new Date(`${primero}T12:00:00Z`).getUTCDay() + 6) % 7; // lunes = 0
    const inicio = sumarDias(primero, -diaSemana);
    const finMes = sumarDias(
      `${this.mes() === 11 ? this.anio() + 1 : this.anio()}-${String(((this.mes() + 1) % 12) + 1).padStart(2, '0')}-01`,
      -1,
    );
    const diaSemanaFin = (new Date(`${finMes}T12:00:00Z`).getUTCDay() + 6) % 7;
    const fin = sumarDias(finMes, 6 - diaSemanaFin);
    return { inicio, fin };
  });

  protected readonly celdas = computed<Celda[]>(() => {
    const { inicio, fin } = this.rango();
    const mes = String(this.mes() + 1).padStart(2, '0');
    const porFecha = new Map<string, Plazo[]>();
    for (const p of this.plazos()) {
      if (!porFecha.has(p.fechaLimite)) porFecha.set(p.fechaLimite, []);
      porFecha.get(p.fechaLimite)!.push(p);
    }
    const celdas: Celda[] = [];
    for (let f = inicio; f <= fin; f = sumarDias(f, 1)) {
      celdas.push({
        fecha: f,
        dia: Number(f.slice(8, 10)),
        delMes: f.slice(5, 7) === mes,
        plazos: porFecha.get(f) ?? [],
      });
    }
    return celdas;
  });

  constructor() {
    // Recarga al cambiar de mes o cuando el padre incrementa `version`.
    effect(() => {
      const { inicio, fin } = this.rango();
      this.version();
      untracked(() => this.cargar(inicio, fin));
    });
  }

  protected mover(delta: number): void {
    let m = this.mes() + delta;
    let a = this.anio();
    if (m < 0) {
      m = 11;
      a--;
    } else if (m > 11) {
      m = 0;
      a++;
    }
    this.mes.set(m);
    this.anio.set(a);
  }

  protected irAHoy(): void {
    this.anio.set(Number(this.hoy.slice(0, 4)));
    this.mes.set(Number(this.hoy.slice(5, 7)) - 1);
  }

  protected abrir(p: Plazo): void {
    void this.router.navigate(['/expedientes', p.expedienteId]);
  }

  protected clase(p: Plazo): string {
    if (p.estado === 'ANULADO') return 'chip anulado';
    return 'chip r-' + (this.niveles().get(p.id) ?? 'X');
  }

  private cargar(desde: string, hasta: string): void {
    this.cargando.set(true);
    this.servicio
      .listar({ desde, hasta, size: 100 })
      .pipe(
        switchMap((pagina) => {
          this.plazos.set(pagina.content);
          this.expedientes.cargar(pagina.content.map((p) => p.expedienteId));
          const activos = pagina.content.filter((p) => p.estado === 'ACTIVO');
          return activos.length === 0
            ? of([])
            : forkJoin(
                activos.map((p) => this.servicio.riesgo(p.id).pipe(catchError(() => of(null)))),
              );
        }),
      )
      .subscribe({
        next: (riesgos) => {
          this.niveles.set(
            new Map(riesgos.filter((r) => r !== null).map((r) => [r!.plazoId, r!.nivel])),
          );
          this.cargando.set(false);
        },
        error: () => this.cargando.set(false),
      });
  }
}
