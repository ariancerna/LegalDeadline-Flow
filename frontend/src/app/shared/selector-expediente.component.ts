import { Component, DestroyRef, ElementRef, forwardRef, inject, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Subject, catchError, debounceTime, of, switchMap } from 'rxjs';
import { ExpedientesService } from '../core/api/expedientes.service';
import { Expediente } from '../core/models';
import { descomponerAsunto } from './asunto';
import { IconoComponent } from './icono.component';

/**
 * Elige un expediente abierto buscándolo por número, partes, materia u órgano (GET /expedientes?q).
 * Reemplaza a un desplegable: con miles de expedientes no caben en una lista.
 * Funciona con formularios reactivos (formControlName) y su valor es el id del expediente.
 */
@Component({
  selector: 'app-selector-expediente',
  imports: [IconoComponent],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectorExpedienteComponent),
      multi: true,
    },
  ],
  host: { '(document:click)': 'fuera($event)' },
  template: `
    <div class="selector">
      <app-icono nombre="search" [tamano]="15" class="lupa" />
      <input
        type="text"
        role="combobox"
        autocomplete="off"
        [id]="idCampo()"
        [value]="texto()"
        [disabled]="deshabilitado()"
        [attr.aria-expanded]="abierto()"
        [attr.aria-controls]="idCampo() + '-opciones'"
        [attr.aria-activedescendant]="abierto() && activo() >= 0 ? idCampo() + '-op-' + activo() : null"
        placeholder="Busca por número, partes o juzgado…"
        (input)="escribir($any($event.target).value)"
        (focus)="abrir()"
        (keydown)="tecla($event)"
        (blur)="tocado()"
      />
      @if (texto() && !deshabilitado()) {
        <button type="button" class="limpiar" aria-label="Quitar expediente" (click)="limpiar()">
          <app-icono nombre="x" [tamano]="14" />
        </button>
      }
      @if (abierto()) {
        <ul
          class="opciones"
          role="listbox"
          [id]="idCampo() + '-opciones'"
          [class.esperando]="buscando()"
          [attr.aria-busy]="buscando()"
        >
          @for (e of opciones(); track e.id; let i = $index) {
            <li
              role="option"
              [id]="idCampo() + '-op-' + i"
              [class.activa]="i === activo()"
              [attr.aria-selected]="e.id === valor()"
              (mousedown)="$event.preventDefault()"
              (click)="elegir(e)"
              (mouseenter)="activo.set(i)"
            >
              <span class="mono codigo">{{ e.codigo }}</span>
              <span class="titulo">{{ partes(e) }}</span>
              <span class="materia">{{ materia(e) }}</span>
            </li>
          } @empty {
            <li class="vacio">{{ buscando() ? 'Buscando…' : 'Ningún expediente abierto coincide.' }}</li>
          }
          @if (total() > opciones().length) {
            <li class="pie">
              {{ opciones().length }} de {{ total() }} · escribe más para acotar
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .selector {
      position: relative;
    }
    .lupa {
      position: absolute;
      left: 11px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--texto-3);
      pointer-events: none;
    }
    input {
      padding-left: 34px !important;
      padding-right: 34px !important;
    }
    .limpiar {
      position: absolute;
      right: 6px;
      top: 50%;
      transform: translateY(-50%);
      display: grid;
      place-items: center;
      width: 26px;
      height: 26px;
      border: 0;
      border-radius: var(--radio-s);
      background: transparent;
      color: var(--texto-3);
      cursor: pointer;
    }
    .limpiar:hover {
      background: var(--superficie-hover);
      color: var(--texto);
    }
    .opciones {
      position: absolute;
      z-index: 30;
      top: calc(100% + 4px);
      left: 0;
      right: 0;
      max-height: 300px;
      overflow-y: auto;
      margin: 0;
      padding: 4px;
      list-style: none;
      background: var(--superficie);
      border: 1px solid var(--borde-fuerte);
      border-radius: var(--radio);
      box-shadow: var(--sombra-3);
    }
    .opciones.esperando li[role='option'] {
      opacity: 0.55;
    }
    li[role='option'] {
      display: grid;
      grid-template-columns: auto 1fr;
      column-gap: 10px;
      padding: 7px 9px;
      border-radius: var(--radio-s);
      cursor: pointer;
    }
    li.activa {
      background: var(--superficie-hover);
    }
    .codigo {
      font-size: 0.78rem;
      color: var(--texto-2);
      grid-row: span 2;
      padding-top: 1px;
    }
    .titulo {
      font-size: 0.86rem;
      font-weight: 600;
      color: var(--texto);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .materia {
      font-size: 0.78rem;
      color: var(--texto-3);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .vacio,
    .pie {
      padding: 8px 9px;
      font-size: 0.8rem;
      color: var(--texto-3);
    }
    .pie {
      border-top: 1px solid var(--borde);
      margin-top: 4px;
    }
  `,
})
export class SelectorExpedienteComponent implements ControlValueAccessor {
  private readonly servicio = inject(ExpedientesService);
  private readonly elemento = inject(ElementRef<HTMLElement>);
  private readonly consultas = new Subject<string>();

  /** id del input, para enlazarlo con su <label for>. */
  readonly idCampo = input('selector-expediente');

  protected readonly texto = signal('');
  protected readonly valor = signal<number | null>(null);
  protected readonly opciones = signal<Expediente[]>([]);
  protected readonly total = signal(0);
  protected readonly abierto = signal(false);
  protected readonly buscando = signal(false);
  protected readonly activo = signal(-1);
  protected readonly deshabilitado = signal(false);

  private alCambiar: (id: number | null) => void = () => undefined;
  private alTocar: () => void = () => undefined;

  constructor() {
    const suscripcion = this.consultas
      .pipe(
        debounceTime(220),
        switchMap((q) => {
          return this.servicio
            .listar({ estado: 'ABIERTO', q: q.trim(), size: 8 })
            .pipe(catchError(() => of(null)));
        }),
      )
      .subscribe((pagina) => {
        this.buscando.set(false);
        this.opciones.set(pagina?.content ?? []);
        this.total.set(pagina?.totalElements ?? 0);
        this.activo.set(pagina && pagina.content.length > 0 ? 0 : -1);
      });
    inject(DestroyRef).onDestroy(() => suscripcion.unsubscribe());
  }

  protected partes(e: Expediente): string {
    return descomponerAsunto(e.asunto).titulo;
  }

  protected materia(e: Expediente): string {
    const a = descomponerAsunto(e.asunto);
    return [a.materia, a.organo].filter(Boolean).join(' · ');
  }

  protected abrir(): void {
    if (this.deshabilitado()) return;
    this.abierto.set(true);
    // Con un expediente ya elegido se busca desde cero; si no, se usa lo escrito.
    this.buscar(this.valor() === null ? this.texto() : '');
  }

  protected escribir(texto: string): void {
    this.texto.set(texto);
    if (this.valor() !== null) {
      this.valor.set(null);
      this.alCambiar(null);
    }
    this.abierto.set(true);
    this.buscar(texto);
  }

  /** Mientras llega la respuesta, Enter no elige: la lista visible es de la búsqueda anterior. */
  private buscar(texto: string): void {
    this.buscando.set(true);
    this.consultas.next(texto);
  }

  protected elegir(e: Expediente): void {
    this.valor.set(e.id);
    this.texto.set(`${e.codigo} — ${this.partes(e)}`);
    this.abierto.set(false);
    this.alCambiar(e.id);
    this.alTocar();
  }

  protected limpiar(): void {
    this.valor.set(null);
    this.texto.set('');
    this.alCambiar(null);
    this.abrir();
    this.elemento.nativeElement.querySelector('input')?.focus();
  }

  protected tecla(evento: KeyboardEvent): void {
    const total = this.opciones().length;
    if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
      evento.preventDefault();
      if (!this.abierto()) return this.abrir();
      if (total === 0 || this.buscando()) return;
      const paso = evento.key === 'ArrowDown' ? 1 : -1;
      this.activo.set((this.activo() + paso + total) % total);
    } else if (evento.key === 'Enter' && this.abierto()) {
      evento.preventDefault();
      if (this.buscando()) return;
      const e = this.opciones()[this.activo()];
      if (e) this.elegir(e);
    } else if (evento.key === 'Escape' && this.abierto()) {
      evento.stopPropagation();
      this.abierto.set(false);
    }
  }

  protected tocado(): void {
    this.alTocar();
  }

  protected fuera(evento: MouseEvent): void {
    if (!this.elemento.nativeElement.contains(evento.target as Node)) this.abierto.set(false);
  }

  writeValue(id: number | null): void {
    this.valor.set(id ?? null);
    if (id === null || id === undefined) {
      this.texto.set('');
      return;
    }
    this.servicio.obtener(id).subscribe({
      next: (e) => this.texto.set(`${e.codigo} — ${this.partes(e)}`),
      error: () => this.texto.set(`#${id}`),
    });
  }

  registerOnChange(fn: (id: number | null) => void): void {
    this.alCambiar = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.alTocar = fn;
  }

  setDisabledState(deshabilitado: boolean): void {
    this.deshabilitado.set(deshabilitado);
  }
}
