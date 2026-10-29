import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LineaVencimientosComponent } from '../features/tablero/linea-vencimientos.component';
import { AvatarComponent } from './avatar.component';
import { EVENTOS, detalleLegible, nombreDesdeEmail } from './eventos';
import { IconoComponent } from './icono.component';
import { EVENTO_TIPOS } from '../core/models';

describe('componentes compartidos', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));

  it('dibuja un icono de Lucide con elementos SVG nativos', async () => {
    const f = TestBed.createComponent(IconoComponent);
    f.componentRef.setInput('nombre', 'scale');
    await f.whenStable();
    const svg = (f.nativeElement as HTMLElement).querySelector('svg')!;
    expect(svg.querySelectorAll('path').length).toBeGreaterThan(0);
  });

  it('el avatar muestra las iniciales del nombre', async () => {
    const f = TestBed.createComponent(AvatarComponent);
    f.componentRef.setInput('nombre', 'Responsable Demo');
    await f.whenStable();
    expect((f.nativeElement as HTMLElement).textContent?.trim()).toBe('RD');
    f.componentRef.setInput('nombre', 'Jorge Mendoza Quispe');
    await f.whenStable();
    expect((f.nativeElement as HTMLElement).textContent?.trim()).toBe('JM');
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
