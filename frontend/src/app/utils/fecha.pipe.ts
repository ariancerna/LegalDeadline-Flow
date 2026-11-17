import { Pipe, PipeTransform } from '@angular/core';
import { formatoFecha, formatoInstante, mesCorto } from './fechas';

/** `{{ '2026-10-28' | fecha }}` → 28/10/2026; `{{ instante | fecha:'hora' }}` → fecha y hora de Lima. */
@Pipe({ name: 'fecha' })
export class FechaPipe implements PipeTransform {
  transform(valor: string | null | undefined, modo: 'dia' | 'hora' | 'mes' = 'dia'): string {
    if (modo === 'mes') return mesCorto(valor);
    return modo === 'hora' ? formatoInstante(valor) : formatoFecha(valor);
  }
}
