import { Injectable, signal } from '@angular/core';

/** Texto de la última miga (por ejemplo, el código del expediente abierto). */
@Injectable({ providedIn: 'root' })
export class MigasService {
  readonly detalle = signal<string | null>(null);
}
