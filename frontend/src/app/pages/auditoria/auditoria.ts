import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConsultasService } from '../../services/api/consultas.service';
import { UsuariosService } from '../../services/api/usuarios.service';
import { AuthService } from '../../services/auth/auth.service';
import { ResponsablesStore } from '../../services/responsables.store';
import { interpretarError } from '../../services/errores';
import { EVENTO_TIPOS } from '../../data/catalogos.data';
import { Evento, EventoTipo } from '../../models/evento';
import { Usuario } from '../../models/usuario';
import { EsqueletoComponent } from '../../components/esqueleto/esqueleto';
import { EtiquetaPipe } from '../../utils/etiqueta.pipe';
import { EVENTOS, detalleLegible } from '../../utils/eventos';
import { fechaLarga, haceCuanto, hoyLima, localLimaAIso, sumarDias } from '../../utils/fechas';
import { IconoComponent } from '../../components/icono/icono';
import { PaginadorComponent } from '../../components/paginador/paginador';
import { VacioComponent } from '../../components/vacio/vacio';

interface FiltrosVista {
  tipo: EventoTipo | '';
  usuarioId: number | null;
  desde: string;
  hasta: string;
}

const LIMA = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Lima',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const HORA = new Intl.DateTimeFormat('es-PE', {
  timeZone: 'America/Lima',
  hour: '2-digit',
  minute: '2-digit',
});

/** RF18: bitácora de operaciones críticas (solo lectura), agrupada por día. */
@Component({
  selector: 'app-auditoria',
  imports: [
    FormsModule,
    EtiquetaPipe,
    PaginadorComponent,
    IconoComponent,
    EsqueletoComponent,
    VacioComponent,
  ],
  templateUrl: './auditoria.html',
  styleUrl: './auditoria.scss',
})
export class AuditoriaComponent implements OnInit {
  private readonly consultas = inject(ConsultasService);
  private readonly usuariosServicio = inject(UsuariosService);
  private readonly auth = inject(AuthService);
  protected readonly responsables = inject(ResponsablesStore);
  protected readonly tipos = EVENTO_TIPOS;
  protected readonly info = EVENTOS;
  protected readonly detalleLegible = detalleLegible;
  protected readonly haceCuanto = haceCuanto;

  protected readonly filtros = signal<FiltrosVista>({
    tipo: '',
    usuarioId: null,
    desde: '',
    hasta: '',
  });
  protected readonly usuarios = signal<Usuario[]>([]);
  protected readonly pagina = signal(0);
  protected readonly tamano = 20;
  protected readonly datos = signal<Evento[]>([]);
  protected readonly total = signal(0);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly hayFiltros = computed(() => {
    const f = this.filtros();
    return f.tipo !== '' || f.usuarioId !== null || f.desde !== '' || f.hasta !== '';
  });

  /** Eventos agrupados por día (hora de Lima). */
  protected readonly dias = computed(() => {
    const hoy = hoyLima();
    const ayer = sumarDias(hoy, -1);
    const grupos = new Map<string, Evento[]>();
    for (const e of this.datos()) {
      const dia = LIMA.format(new Date(e.fecha));
      if (!grupos.has(dia)) grupos.set(dia, []);
      grupos.get(dia)!.push(e);
    }
    return [...grupos.entries()].map(([dia, eventos]) => ({
      dia,
      titulo: dia === hoy ? 'Hoy' : dia === ayer ? 'Ayer' : fechaLarga(dia),
      eventos,
    }));
  });

  ngOnInit(): void {
    // Solo el administrador puede listar usuarios; los demás filtran por tipo y fecha.
    if (this.auth.esAdmin()) {
      this.usuariosServicio
        .listar()
        .subscribe({ next: (u) => this.usuarios.set(u), error: () => undefined });
    }
    this.cargar();
  }

  protected hora(instante: string): string {
    return HORA.format(new Date(instante));
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
