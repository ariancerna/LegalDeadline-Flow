import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, map } from 'rxjs';
import { TareasService } from '../../core/api/tareas.service';
import { AuthService } from '../../core/auth/auth.service';
import { interpretarError } from '../../core/errores';
import { ExpedientesCache } from '../../core/expedientes.cache';
import { CargaResponsable, Tarea } from '../../core/models';
import { NotificacionesService } from '../../core/notificaciones.service';
import { ResponsablesStore } from '../../core/responsables.store';
import { AvatarComponent } from '../../shared/avatar.component';
import { EtiquetaPipe } from '../../shared/etiqueta.pipe';
import { FechaPipe } from '../../shared/fecha.pipe';
import { IconoComponent } from '../../shared/icono.component';
import { VacioComponent } from '../../shared/vacio.component';
import { Sugerencia, recomendarReasignaciones } from './recomendacion';

/** RF16: carga activa por responsable, sobrecargas y recomendación de reasignación. */
@Component({
  selector: 'app-carga',
  imports: [RouterLink, EtiquetaPipe, FechaPipe, IconoComponent, AvatarComponent, VacioComponent],
  templateUrl: './carga.component.html',
  styleUrl: './carga.component.scss',
})
export class CargaComponent implements OnInit {
  private readonly tareasServicio = inject(TareasService);
  private readonly avisos = inject(NotificacionesService);
  protected readonly auth = inject(AuthService);
  protected readonly responsables = inject(ResponsablesStore);
  protected readonly expedientes = inject(ExpedientesCache);

  protected readonly error = signal<string | null>(null);
  protected readonly tareasSobrecargados = signal<ReadonlyMap<number, Tarea[]>>(new Map());
  protected readonly aplicando = signal<number | null>(null);

  protected readonly lista = computed(() =>
    [...this.responsables.lista()].sort((a, b) => b.tareasActivas - a.tareasActivas),
  );
  protected readonly umbral = computed(() => this.lista()[0]?.umbral ?? 5);
  protected readonly escala = computed(() =>
    Math.max(this.umbral() + 2, ...this.lista().map((r) => r.tareasActivas)),
  );
  protected readonly sobrecargados = computed(() => this.lista().filter((r) => r.sobrecargado));
  /** Con un equipo grande la lista es larga: se muestran las primeras y el resto a pedido. */
  protected readonly verTodas = signal(false);
  protected readonly sugerenciasVisibles = computed(() =>
    this.verTodas() ? this.sugerencias() : this.sugerencias().slice(0, 6),
  );
  protected readonly sugerencias = computed<Sugerencia[]>(() =>
    recomendarReasignaciones(this.lista(), this.tareasSobrecargados()),
  );

  ngOnInit(): void {
    this.recargar();
  }

  protected readonly totalActivas = computed(() =>
    this.lista().reduce((s, r) => s + r.tareasActivas, 0),
  );
  protected readonly capacidadLibre = computed(() =>
    this.lista().reduce((s, r) => s + Math.max(0, r.umbral - r.tareasActivas), 0),
  );

  /** Un bloque por tarea hasta la escala común; los que exceden el umbral se marcan. */
  protected bloques(tareas: number): { lleno: boolean; exceso: boolean; umbral: boolean }[] {
    const umbral = this.umbral();
    return Array.from({ length: this.escala() }, (_, i) => ({
      lleno: i < tareas,
      exceso: i < tareas && i >= umbral,
      umbral: i === umbral - 1,
    }));
  }

  protected recargar(): void {
    this.error.set(null);
    this.responsables.recargar().subscribe({
      next: (lista) => {
        if (this.auth.lecturaGlobal()) this.cargarTareas(lista.filter((r) => r.sobrecargado));
      },
      error: (e) => this.error.set(interpretarError(e).mensaje),
    });
  }

  protected aplicar(s: Sugerencia): void {
    const t = s.tarea;
    this.aplicando.set(t.id);
    this.tareasServicio
      .actualizar(
        t.id,
        {
          titulo: t.titulo,
          tipo: t.tipo,
          responsableId: s.hacia.responsableId,
          prioridad: t.prioridad,
          fechaLimite: t.fechaLimite,
        },
        t.version,
      )
      .subscribe({
        next: () => {
          this.avisos.exito(`Tarea reasignada a ${s.hacia.nombre}.`);
          this.aplicando.set(null);
          this.recargar();
        },
        error: (e) => {
          this.avisos.error(interpretarError(e).mensaje);
          this.aplicando.set(null);
          this.recargar();
        },
      });
  }

  /** Tareas activas (PENDIENTE y EN_PROGRESO) de cada responsable sobrecargado. */
  private cargarTareas(sobrecargados: CargaResponsable[]): void {
    if (sobrecargados.length === 0) {
      this.tareasSobrecargados.set(new Map());
      return;
    }
    const consultas = sobrecargados.map((r) =>
      forkJoin([
        this.tareasServicio.listar({
          responsableId: r.responsableId,
          estado: 'PENDIENTE',
          size: 100,
        }),
        this.tareasServicio.listar({
          responsableId: r.responsableId,
          estado: 'EN_PROGRESO',
          size: 100,
        }),
      ]).pipe(map(([a, b]): [number, Tarea[]] => [r.responsableId, [...a.content, ...b.content]])),
    );
    forkJoin(consultas).subscribe({
      next: (pares) => {
        this.tareasSobrecargados.set(new Map(pares));
        this.expedientes.cargar(pares.flatMap(([, tareas]) => tareas.map((t) => t.expedienteId)));
      },
      error: (e) => this.error.set(interpretarError(e).mensaje),
    });
  }
}
