import { Pipe, PipeTransform } from '@angular/core';
import { etiqueta } from './etiquetas';

@Pipe({ name: 'etiqueta' })
export class EtiquetaPipe implements PipeTransform {
  transform(valor: string | null | undefined): string {
    return etiqueta(valor);
  }
}
