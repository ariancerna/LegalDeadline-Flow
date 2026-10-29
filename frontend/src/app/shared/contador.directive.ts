import { formatoCifra } from './cifra';
import { DestroyRef, Directive, ElementRef, effect, inject, input } from '@angular/core';

const DURACION_MS = 700;

/**
 * Anima una cifra desde su valor anterior (0 la primera vez) hasta el nuevo, con desaceleración.
 * Escribe la cifra con coma decimal y espacio fino desde 5 cifras (4187 · 14 732 · 97,9).
 * Respeta «reducir movimiento».
 *
 * Uso: `<span [appContador]="indicadores.expedientesAbiertos"></span>`
 */
@Directive({ selector: '[appContador]' })
export class ContadorDirective {
  readonly appContador = input.required<number>();
  /** Decimales que se muestran (por ejemplo, 1 para un porcentaje). */
  readonly decimales = input(0);

  private readonly elemento = inject(ElementRef<HTMLElement>);
  private actual = 0;
  private cuadro = 0;

  constructor() {
    inject(DestroyRef).onDestroy(() => cancelAnimationFrame(this.cuadro));
    effect(() => this.animar(this.appContador(), this.decimales()));
  }

  private animar(destino: number, decimales: number): void {
    cancelAnimationFrame(this.cuadro);
    const escribir = (v: number) =>
      (this.elemento.nativeElement.textContent = formatoCifra(v, decimales));
    const quieto =
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (quieto || typeof requestAnimationFrame !== 'function') {
      this.actual = destino;
      escribir(destino);
      return;
    }
    const inicio = this.actual;
    const t0 = performance.now();
    // Se mide con performance.now(): el reloj que entrega requestAnimationFrame varía entre entornos.
    const paso = () => {
      const avance = Math.min(1, (performance.now() - t0) / DURACION_MS);
      const suave = 1 - Math.pow(1 - avance, 3);
      this.actual = inicio + (destino - inicio) * suave;
      escribir(avance < 1 ? this.actual : destino);
      if (avance < 1) this.cuadro = requestAnimationFrame(paso);
      else this.actual = destino;
    };
    this.cuadro = requestAnimationFrame(paso);
  }
}
