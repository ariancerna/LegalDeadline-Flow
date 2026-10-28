import { Pipe, PipeTransform } from '@angular/core';
import { etiqueta, etiquetaCorta } from './etiquetas';

@Pipe({ name: 'etiqueta' })
export class EtiquetaPipe implements PipeTransform {
  transform(valor: string | null | undefined, version: 'larga' | 'corta' = 'larga'): string {
    return version === 'corta' ? etiquetaCorta(valor) : etiqueta(valor);
  }
}
