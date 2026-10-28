import { Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';
import { ExpedientesService } from '../core/api/expedientes.service';
import { AuthService } from '../core/auth/auth.service';
import { Expediente } from '../core/models';
import { PaletaService } from '../core/paleta.service';
import { TemaService } from '../core/tema.service';
import { IconoComponent } from '../shared/icono.component';
import { NombreIcono } from '../shared/iconos.generados';
import { enlacesPara } from './navegacion';

interface Comando {
  id: string;
  grupo: string;
  icono: NombreIcono;
  texto: string;
  detalle?: string;
  ejecutar: () => void;
}

function normalizar(t: string): string {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Buscador global: navegar, crear registros y encontrar expedientes con el teclado. */
@Component({
  selector: 'app-paleta-comandos',
  imports: [IconoComponent],
  host: { '(document:keydown)': 'atajo($event)' },
  templateUrl: './paleta-comandos.component.html',
  styleUrl: './paleta-comandos.component.scss',
})
export class PaletaComandosComponent {
  protected readonly paleta = inject(PaletaService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly tema = inject(TemaService);
  private readonly expedientes = inject(ExpedientesService);
  private readonly entrada = viewChild<ElementRef<HTMLInputElement>>('entrada');

  protected readonly consulta = signal('');
  protected readonly indice = signal(0);
  protected readonly encontrados = signal<Expediente[]>([]);
  protected readonly buscando = signal(false);
  private readonly busqueda$ = new Subject<string>();

  private readonly fijos = computed<Comando[]>(() => {
    const ir = enlacesPara(this.auth.rol()).map<Comando>((e) => ({
      id: 'ir' + e.ruta,
      grupo: 'Ir a',
      icono: e.icono,
      texto: e.texto,
      ejecutar: () => this.navegar([e.ruta]),
    }));
    const acciones: Comando[] = [];
    if (this.auth.esGestor()) {
      acciones.push({
        id: 'nuevo-exp',
        grupo: 'Acciones',
        icono: 'folder',
        texto: 'Nuevo expediente',
        ejecutar: () => this.navegar(['/expedientes'], { nuevo: 1 }),
      });
    }
    if (this.auth.puedeEscribir()) {
      acciones.push(
        {
          id: 'nueva-tarea',
          grupo: 'Acciones',
          icono: 'list-checks',
          texto: 'Nueva tarea',
          ejecutar: () => this.navegar(['/tareas'], { nuevo: 1 }),
        },
        {
          id: 'nuevo-plazo',
          grupo: 'Acciones',
          icono: 'calendar-clock',
          texto: 'Nuevo plazo',
          ejecutar: () => this.navegar(['/plazos'], { nuevo: 1 }),
        },
      );
    }
    acciones.push({
      id: 'tema',
      grupo: 'Acciones',
      icono: this.tema.esOscuro() ? 'sun' : 'moon',
      texto: this.tema.esOscuro() ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro',
      ejecutar: () => this.tema.alternar(),
    });
    return [...ir, ...acciones];
  });

  protected readonly comandos = computed<Comando[]>(() => {
    const q = normalizar(this.consulta().trim());
    const fijos = q ? this.fijos().filter((c) => normalizar(c.texto).includes(q)) : this.fijos();
    const exps = this.encontrados().map<Comando>((e) => ({
      id: 'exp' + e.id,
      grupo: 'Expedientes',
      icono: 'folder-open',
      texto: e.codigo,
      detalle: e.asunto,
      ejecutar: () => this.navegar(['/expedientes', e.id]),
    }));
    return [...exps, ...fijos];
  });

  protected readonly grupos = computed(() => {
    const mapa = new Map<string, { c: Comando; i: number }[]>();
    this.comandos().forEach((c, i) => {
      if (!mapa.has(c.grupo)) mapa.set(c.grupo, []);
      mapa.get(c.grupo)!.push({ c, i });
    });
    return [...mapa.entries()];
  });

  constructor() {
    this.busqueda$
      .pipe(
        debounceTime(220),
        distinctUntilChanged(),
        switchMap((q) => {
          if (q.trim().length < 2) return of(null);
          this.buscando.set(true);
          return this.expedientes.listar({ q: q.trim(), size: 6 }).pipe(catchError(() => of(null)));
        }),
        takeUntilDestroyed(),
      )
      .subscribe((p) => {
        this.encontrados.set(p?.content ?? []);
        this.buscando.set(false);
        this.indice.set(0);
      });

    effect(() => {
      if (this.paleta.abierta()) queueMicrotask(() => this.entrada()?.nativeElement.focus());
    });
  }

  protected atajo(e: KeyboardEvent): void {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      if (!this.auth.autenticado()) return;
      e.preventDefault();
      this.paleta.abierta() ? this.cerrar() : this.paleta.abrir();
      return;
    }
    if (!this.paleta.abierta()) return;
    const total = this.comandos().length;
    if (e.key === 'Escape') {
      e.preventDefault();
      this.cerrar();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.indice.set(total ? (this.indice() + 1) % total : 0);
      this.desplazar();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.indice.set(total ? (this.indice() - 1 + total) % total : 0);
      this.desplazar();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      this.comandos()[this.indice()]?.ejecutar();
    }
  }

  protected escribir(valor: string): void {
    this.consulta.set(valor);
    this.indice.set(0);
    this.busqueda$.next(valor);
  }

  protected cerrar(): void {
    this.paleta.cerrar();
    this.consulta.set('');
    this.encontrados.set([]);
    this.indice.set(0);
  }

  private navegar(ruta: unknown[], queryParams?: Record<string, unknown>): void {
    this.cerrar();
    void this.router.navigate(ruta, { queryParams });
  }

  private desplazar(): void {
    queueMicrotask(() =>
      document.querySelector('.paleta .opcion.activa')?.scrollIntoView({ block: 'nearest' }),
    );
  }
}
