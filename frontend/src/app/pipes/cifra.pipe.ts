import { Pipe, PipeTransform } from '@angular/core';
import { formatoCifra } from '../utils/cifra';

/** Uso en plantillas: {{ total | cifra }} o {{ porcentaje | cifra: 1 }}. */
@Pipe({ name: 'cifra' })
export class CifraPipe implements PipeTransform {
  transform(valor: number | null | undefined, decimales = 0): string {
    return valor === null || valor === undefined ? '—' : formatoCifra(valor, decimales);
  }
}
