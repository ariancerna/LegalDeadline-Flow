import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { AlertasStore } from '../core/alertas.store';
import { AuthService } from '../core/auth/auth.service';
import { ExpedientesCache } from '../core/expedientes.cache';
import { MigasService } from '../core/migas.service';
import { PaletaService } from '../core/paleta.service';
import { ResponsablesStore } from '../core/responsables.store';
import { ModoTema, TemaService } from '../core/tema.service';
import { AvatarComponent } from '../shared/avatar.component';
import { EtiquetaPipe } from '../shared/etiqueta.pipe';
import { FechaPipe } from '../shared/fecha.pipe';
import { textoDias } from '../shared/fechas';
import { IconoComponent } from '../shared/icono.component';
import { NombreIcono } from '../shared/iconos.generados';
import { EnlaceNav, NAVEGACION, enlacesPara } from './navegacion';
import { NotificacionesComponent } from './notificaciones.component';
import { PaletaComandosComponent } from './paleta-comandos.component';

const CLAVE_COMPACTO = 'ldf.menu-compacto';

/** Estructura principal: menú lateral por rol, barra superior y contenido. */
@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    EtiquetaPipe,
    FechaPipe,
    IconoComponent,
    AvatarComponent,
    NotificacionesComponent,
    PaletaComandosComponent,
  ],
  host: { '(document:click)': 'cerrarMenus()' },
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  protected readonly auth = inject(AuthService);
  protected readonly tema = inject(TemaService);
  protected readonly paleta = inject(PaletaService);
  protected readonly alertas = inject(AlertasStore);
  protected readonly expedientes = inject(ExpedientesCache);
  private readonly responsables = inject(ResponsablesStore);
  private readonly migas = inject(MigasService);
  private readonly router = inject(Router);
  protected readonly textoDias = textoDias;

  protected readonly menuMovil = signal(false);
  protected readonly compacto = signal(leerCompacto());
  protected readonly abierto = signal<'alertas' | 'usuario' | null>(null);
  protected readonly esMac = /Mac|iPhone|iPad/.test(navigator.platform ?? '');

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  protected readonly grupos = computed(() => {
    const enlaces = enlacesPara(this.auth.rol());
    const orden: EnlaceNav['grupo'][] = ['General', 'Gestión', 'Control', 'Administración'];
    return orden
      .map((g) => ({ nombre: g, enlaces: enlaces.filter((e) => e.grupo === g) }))
      .filter((g) => g.enlaces.length > 0);
  });

  protected readonly sobrecargados = computed(
    () => this.responsables.lista().filter((r) => r.sobrecargado).length,
  );

  /** Migas: sección actual y, si corresponde, el registro abierto. */
  protected readonly migaActual = computed(() => {
    const ruta = this.url().split('?')[0];
    const [, seccion, id] = ruta.split('/');
    const enlace = NAVEGACION.find((e) => e.ruta === '/' + seccion);
    return {
      seccion: enlace?.texto ?? (seccion === 'sin-permiso' ? 'Sin permiso' : 'Inicio'),
      icono: (enlace?.icono ?? 'layout-dashboard') as NombreIcono,
      ruta: enlace?.ruta ?? '/tablero',
      detalle: id ? (this.migas.detalle() ?? '…') : null,
    };
  });

  constructor() {
    this.responsables.asegurar();
    this.alertas.recargar();
  }

  protected contador(e: EnlaceNav): number {
    if (e.contador === 'alertas') return this.alertas.criticas();
    if (e.contador === 'sobrecarga') return this.sobrecargados();
    return 0;
  }

  protected alternarMenu(cual: 'alertas' | 'usuario', ev: Event): void {
    ev.stopPropagation();
    this.abierto.set(this.abierto() === cual ? null : cual);
    if (cual === 'alertas' && this.abierto()) this.alertas.recargar();
  }

  protected cerrarMenus(): void {
    this.abierto.set(null);
  }

  protected alternarCompacto(): void {
    const valor = !this.compacto();
    this.compacto.set(valor);
    try {
      localStorage.setItem(CLAVE_COMPACTO, valor ? '1' : '0');
    } catch {
      /* sin almacenamiento */
    }
  }

  protected cambiarTema(modo: ModoTema): void {
    this.tema.modo.set(modo);
  }

  protected salir(): void {
    this.responsables.limpiar();
    this.alertas.limpiar();
    this.auth.logout();
  }
}

function leerCompacto(): boolean {
  try {
    return localStorage.getItem(CLAVE_COMPACTO) === '1';
  } catch {
    return false;
  }
}
