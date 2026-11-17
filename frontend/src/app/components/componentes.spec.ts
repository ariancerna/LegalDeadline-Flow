import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LineaVencimientosComponent } from './linea-vencimientos/linea-vencimientos';
import { EVENTOS, detalleLegible, nombreDesdeEmail } from '../utils/eventos';
import { IconoComponent } from './icono/icono';
import { EVENTO_TIPOS } from '../data/catalogos.data';

describe('componentes compartidos', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));

  it('dibuja un icono de Lucide con elementos SVG nativos', async () => {
    const f = TestBed.createComponent(IconoComponent);
    f.componentRef.setInput('nombre', 'scale');
    await f.whenStable();
    const svg = (f.nativeElement as HTMLElement).querySelector('svg')!;
    expect(svg.querySelectorAll('path').length).toBeGreaterThan(0);
  });

  it('la línea de vencimientos ubica los plazos en su día y agrupa los vencidos', async () => {
    const f = TestBed.createComponent(LineaVencimientosComponent);
    const plazo = (id: number, fechaLimite: string) => ({
      plazo: {
        id,
        expedienteId: 1,
        tipo: 'APELACION',
        fechaLimite,
        estado: 'ACTIVO' as const,
        motivoAnulacion: null,
        creadoEn: '',
        anuladoEn: null,
        actualizadoEn: '',
        version: 0,
      },
      riesgo: {
        plazoId: id,
        estado: 'ACTIVO' as const,
        nivel: 'ALTO' as const,
        diasRestantes: 0,
        tareasPendientes: 1,
      },
    });
    f.componentRef.setInput('hoy', '2026-10-28');
    f.componentRef.setInput('alertas', [plazo(1, '2026-10-27'), plazo(2, '2026-10-30')]);
    await f.whenStable();
    const columnas = (f.nativeElement as HTMLElement).querySelectorAll('.columna');
    expect(columnas.length).toBe(15); // vencidos + hoy + 13 días, como en el diseño
    expect(columnas[0].classList).toContain('vencidos');
    expect(columnas[1].classList).toContain('hoy');
    expect(columnas[4].textContent).toContain('Inhábil'); // sábado 31/10 sin plazos
    expect(columnas[3].querySelectorAll('.marca').length).toBe(1); // 30/10
    expect(columnas[3].textContent).toContain('Apelación');
  });

  it('cada tipo de evento de auditoría tiene icono y texto', () => {
    for (const tipo of EVENTO_TIPOS) {
      expect(EVENTOS[tipo].verbo.length).toBeGreaterThan(0);
    }
    expect(nombreDesdeEmail('supervisor@legaldeadline.local')).toBe('Supervisor');
    expect(nombreDesdeEmail('maria.perez@x.pe')).toBe('Maria Perez');
    expect(nombreDesdeEmail(null)).toBe('Sistema');
    expect(nombreDesdeEmail('admin@legaldeadline.local')).toBe('Administración');
    expect(detalleLegible('Estado cambiado de PENDIENTE a EN_PROGRESO')).toBe(
      'Estado cambiado de pendiente a en progreso',
    );
    expect(detalleLegible('Plazo AUDIENCIA_SANEAMIENTO registrado')).toBe(
      'Plazo audiencia de saneamiento registrado',
    );
    expect(detalleLegible('Resolución N.º 4 de la CSJ')).toBe('Resolución N.º 4 de la CSJ');
  });
});
