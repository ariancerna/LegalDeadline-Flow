import { NotificacionesService } from './notificaciones.service';

describe('NotificacionesService', () => {
  afterEach(() => vi.useRealTimers());

  it('oculta los mensajes después de unos segundos', () => {
    vi.useFakeTimers();
    const servicio = new NotificacionesService();
    servicio.exito('Guardado');
    servicio.error('Falló');
    expect(servicio.lista()).toHaveLength(2);
    vi.advanceTimersByTime(4000);
    expect(servicio.lista().map((n) => n.tipo)).toEqual(['error']); // los errores duran más
    vi.advanceTimersByTime(3000);
    expect(servicio.lista()).toEqual([]);
  });

  it('permite cerrar un mensaje manualmente', () => {
    const servicio = new NotificacionesService();
    servicio.info('Hola');
    servicio.cerrar(servicio.lista()[0].id);
    expect(servicio.lista()).toEqual([]);
  });
});
