import { Injectable, signal } from '@angular/core';

export type TipoNotificacion = 'exito' | 'error' | 'info' | 'alerta';

export interface Notificacion {
  id: number;
  tipo: TipoNotificacion;
  mensaje: string;
}

/** Mensajes breves (toasts) que se muestran en la esquina de la pantalla. */
@Injectable({ providedIn: 'root' })
export class NotificacionesService {
  private siguienteId = 1;
  readonly lista = signal<Notificacion[]>([]);

  exito(mensaje: string): void {
    this.mostrar('exito', mensaje);
  }

  error(mensaje: string): void {
    this.mostrar('error', mensaje, 7000);
  }

  info(mensaje: string): void {
    this.mostrar('info', mensaje);
  }

  alerta(mensaje: string): void {
    this.mostrar('alerta', mensaje, 7000);
  }

  cerrar(id: number): void {
    this.lista.update((l) => l.filter((n) => n.id !== id));
  }

  private mostrar(tipo: TipoNotificacion, mensaje: string, duracion = 4000): void {
    const id = this.siguienteId++;
    this.lista.update((l) => [...l, { id, tipo, mensaje }]);
    setTimeout(() => this.cerrar(id), duracion);
  }
}
