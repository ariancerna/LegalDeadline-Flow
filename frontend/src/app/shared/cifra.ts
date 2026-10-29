import { Pipe, PipeTransform } from '@angular/core';

/**
 * Cifras como en el diseño: coma decimal y espacio fino como separador de miles solo desde
 * 5 cifras (4187 · 14 732 · 97,9).
 */
export function formatoCifra(valor: number, decimales = 0): string {
  const signo = valor < 0 ? '−' : '';
  const [entero, fraccion] = Math.abs(valor).toFixed(decimales).split('.');
  const conMiles = entero.length > 4 ? entero.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : entero;
  return signo + conMiles + (fraccion ? ',' + fraccion : '');
}

@Pipe({ name: 'cifra' })
export class CifraPipe implements PipeTransform {
  transform(valor: number | null | undefined, decimales = 0): string {
    return valor === null || valor === undefined ? '—' : formatoCifra(valor, decimales);
  }
}
