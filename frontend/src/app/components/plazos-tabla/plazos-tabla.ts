import { Component, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PlazosService } from '../../services/api/plazos.service';
import { AuthService } from '../../services/auth/auth.service';
import { interpretarError } from '../../services/errores';
import { ExpedientesCache } from '../../services/expedientes.cache';
import { Plazo, RiesgoPlazo, riesgoDe } from '../../models/plazo';
import { NotificacionesService } from '../../services/notificaciones.service';
import { DialogoComponent } from '../dialogo/dialogo';
import { EtiquetaPipe } from '../../utils/etiqueta.pipe';
import { tono } from '../../utils/etiquetas';
import { FechaPipe } from '../../utils/fecha.pipe';
import { textoDias } from '../../utils/fechas';
import { IconoComponent } from '../icono/icono';
import { PlazoFormComponent } from '../../pages/formulario-plazo/formulario-plazo';

/** Tabla de plazos con riesgo calculado por el backend (RF15), edición (RF13) y anulación (RF14). */
@Component({
  selector: 'app-plazos-tabla',
  imports: [
    FormsModule,
    RouterLink,
    EtiquetaPipe,
    FechaPipe,
    DialogoComponent,
    PlazoFormComponent,
    IconoComponent,
  ],
  templateUrl: './plazos-tabla.html',
  styleUrl: './plazos-tabla.scss',
})
export class PlazosTablaComponent {
  private readonly servicio = inject(PlazosService);
  private readonly avisos = inject(NotificacionesService);
  protected readonly auth = inject(AuthService);
  protected readonly expedientes = inject(ExpedientesCache);
  protected readonly tono = tono;
  protected readonly textoDias = textoDias;

  readonly plazos = input.required<Plazo[]>();
  readonly mostrarExpediente = input(true);
  readonly editable = input(true);
  readonly cambio = output<void>();

  protected readonly riesgos = signal<ReadonlyMap<number, RiesgoPlazo>>(new Map());
  protected readonly editando = signal<Plazo | null>(null);
  protected readonly anulando = signal<Plazo | null>(null);
  protected readonly motivo = signal('');
  protected readonly enviando = signal(false);
  protected readonly errorDialogo = signal<string | null>(null);

  constructor() {
    effect(() => {
      const lista = this.plazos();
      const conExpediente = this.mostrarExpediente();
      untracked(() => {
        if (conExpediente) this.expedientes.cargar(lista.map((p) => p.expedienteId));
        this.cargarRiesgos(lista);
      });
    });
  }

  protected largoMotivo(): number {
    return this.motivo().trim().replace(/\s+/g, ' ').length;
  }

  protected motivoValido(): boolean {
    const largo = this.largoMotivo();
    return largo >= 10 && largo <= 250;
  }

  protected puedeModificar(p: Plazo): boolean {
    return this.editable() && p.estado === 'ACTIVO' && this.auth.puedeEscribir();
  }

  protected abrirAnular(p: Plazo): void {
    this.anulando.set(p);
    this.motivo.set('');
    this.errorDialogo.set(null);
  }

  protected confirmarAnular(): void {
    const p = this.anulando();
    if (!p || !this.motivoValido()) return;
    this.enviando.set(true);
    this.errorDialogo.set(null);
    this.servicio.anular(p.id, this.motivo().trim(), p.version).subscribe({
      next: () => {
        this.avisos.exito('Plazo anulado. Queda registrado con su motivo.');
        this.enviando.set(false);
        this.anulando.set(null);
        this.cambio.emit();
      },
      error: (e) => {
        const err = interpretarError(e);
        this.errorDialogo.set(err.campos['motivo'] ?? err.mensaje);
        this.enviando.set(false);
        if (err.codigo === 'VERSION_DESACTUALIZADA') this.cambio.emit();
      },
    });
  }

  protected editado(): void {
    this.editando.set(null);
    this.cambio.emit();
  }

  /** El riesgo llega con cada plazo del listado (RN04). */
  private cargarRiesgos(lista: Plazo[]): void {
    this.riesgos.set(new Map(lista.map((p) => [p.id, riesgoDe(p)])));
  }
}
