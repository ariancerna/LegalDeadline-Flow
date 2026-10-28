import { Injectable, signal } from '@angular/core';

/** Abre y cierra la paleta de comandos (Ctrl/⌘ + K). */
@Injectable({ providedIn: 'root' })
export class PaletaService {
  readonly abierta = signal(false);
  abrir(): void {
    this.abierta.set(true);
  }
  cerrar(): void {
    this.abierta.set(false);
  }
}
