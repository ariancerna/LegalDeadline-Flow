import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject, signal } from '@angular/core';

export type ModoTema = 'claro' | 'oscuro' | 'sistema';
const CLAVE = 'ldf.tema';

/** Tema de color. "sistema" sigue la preferencia del sistema operativo. */
@Injectable({ providedIn: 'root' })
export class TemaService {
  private readonly documento = inject(DOCUMENT);
  readonly modo = signal<ModoTema>(leer());

  constructor() {
    effect(() => {
      const modo = this.modo();
      const raiz = this.documento.documentElement;
      if (modo === 'sistema') delete raiz.dataset['tema'];
      else raiz.dataset['tema'] = modo;
      try {
        localStorage.setItem(CLAVE, modo);
      } catch {
        /* almacenamiento no disponible */
      }
    });
  }

  /** Tema efectivo en este momento. */
  esOscuro(): boolean {
    const modo = this.modo();
    if (modo !== 'sistema') return modo === 'oscuro';
    return (
      this.documento.defaultView?.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
    );
  }

  alternar(): void {
    this.modo.set(this.esOscuro() ? 'claro' : 'oscuro');
  }
}

function leer(): ModoTema {
  try {
    const v = localStorage.getItem(CLAVE);
    return v === 'claro' || v === 'oscuro' || v === 'sistema' ? v : 'sistema';
  } catch {
    return 'sistema';
  }
}
