import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, finalize, shareReplay, tap } from 'rxjs';
import { ConsultasService } from './api/consultas.service';
import { CargaResponsable } from './models';
import { nombreDesdeEmail } from '../shared/eventos';

/**
 * Lista de responsables asignables (rol RESPONSABLE o SUPERVISOR, activos) con su carga.
 * Proviene de GET /responsables/carga, que todos los roles pueden consultar;
 * se usa para mostrar nombres y llenar los selectores de responsable.
 */
@Injectable({ providedIn: 'root' })
export class ResponsablesStore {
  private readonly consultas = inject(ConsultasService);
  private enCurso: Observable<CargaResponsable[]> | null = null;

  readonly lista = signal<CargaResponsable[]>([]);
  readonly porId = computed(() => new Map(this.lista().map((r) => [r.responsableId, r])));

  /** Carga la lista si aún no está disponible. */
  asegurar(): void {
    if (this.lista().length === 0) this.recargar().subscribe({ error: () => undefined });
  }

  recargar(): Observable<CargaResponsable[]> {
    if (!this.enCurso) {
      this.enCurso = this.consultas.carga().pipe(
        tap((lista) => this.lista.set(lista)),
        finalize(() => (this.enCurso = null)),
        shareReplay(1),
      );
    }
    return this.enCurso;
  }

  nombre(id: number | null | undefined): string {
    if (id === null || id === undefined) return '—';
    return this.porId().get(id)?.nombre ?? `Usuario #${id}`;
  }

  /** Nombre del autor de un evento: el registrado si es asignable; si no, derivado del correo. */
  autor(usuarioId: number | null, email: string | null): string {
    const r = usuarioId === null ? undefined : this.porId().get(usuarioId);
    return r?.nombre ?? nombreDesdeEmail(email);
  }

  limpiar(): void {
    this.lista.set([]);
  }
}
