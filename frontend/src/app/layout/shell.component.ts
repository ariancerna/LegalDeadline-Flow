import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AlertasStore } from '../core/alertas.store';
import { AuthService } from '../core/auth/auth.service';
import { ExpedientesCache } from '../core/expedientes.cache';
import { PaletaService } from '../core/paleta.service';
import { ResponsablesStore } from '../core/responsables.store';
import { ModoTema, TemaService } from '../core/tema.service';
import { AvatarComponent } from '../shared/avatar.component';
import { EtiquetaPipe } from '../shared/etiqueta.pipe';
import { FechaPipe } from '../shared/fecha.pipe';
import { IconoComponent } from '../shared/icono.component';
import { EnlaceNav, enlacesPara } from './navegacion';
import { NotificacionesComponent } from './notificaciones.component';
import { PaletaComandosComponent } from './paleta-comandos.component';

/** Estructura principal: barra superior con la navegación del rol y el contenido. */
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

  protected readonly menuMovil = signal(false);
  protected readonly abierto = signal<'alertas' | 'usuario' | null>(null);
  protected readonly esMac = /Mac|iPhone|iPad/.test(navigator.platform ?? '');

  protected readonly enlaces = computed(() => enlacesPara(this.auth.rol()));

  protected readonly sobrecargados = computed(
    () => this.responsables.lista().filter((r) => r.sobrecargado).length,
  );

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

  protected primerNombre(nombre: string): string {
    return nombre.split(' ')[0];
  }

  protected abs(n: number): number {
    return Math.abs(n);
  }

  protected cerrarMenus(): void {
    this.abierto.set(null);
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
