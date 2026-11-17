import { Pipe, PipeTransform } from '@angular/core';
import { Asunto, descomponerAsunto } from './asunto';

/** `{{ e.asunto | asunto }}` → { titulo, materia, organo } */
@Pipe({ name: 'asunto' })
export class AsuntoPipe implements PipeTransform {
  transform(valor: string | null | undefined): Asunto {
    return descomponerAsunto(valor);
  }
}
