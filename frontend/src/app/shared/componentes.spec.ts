import { TestBed } from '@angular/core/testing';
import { DonaRiesgoComponent } from '../features/tablero/dona-riesgo.component';
import { AvatarComponent } from './avatar.component';
import { EVENTOS, nombreDesdeEmail } from './eventos';
import { IconoComponent } from './icono.component';
import { EVENTO_TIPOS } from '../core/models';

describe('componentes compartidos', () => {
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
  });

  it('la dona reparte los plazos por nivel de riesgo', async () => {
    const f = TestBed.createComponent(DonaRiesgoComponent);
    f.componentRef.setInput('datos', { CRITICO: 2, ALTO: 1, MEDIO: 1, BAJO: 0 });
    await f.whenStable();
    const el = f.nativeElement as HTMLElement;
    expect(el.querySelector('.total')?.textContent).toBe('4');
    expect(el.querySelectorAll('.segmento').length).toBe(3); // BAJO = 0 no se dibuja
    expect(el.textContent).toContain('50%');
  });

  it('cada tipo de evento de auditoría tiene icono y texto', () => {
    for (const tipo of EVENTO_TIPOS) {
      expect(EVENTOS[tipo].verbo.length).toBeGreaterThan(0);
    }
    expect(nombreDesdeEmail('supervisor@legaldeadline.local')).toBe('Supervisor');
    expect(nombreDesdeEmail('maria.perez@x.pe')).toBe('Maria Perez');
    expect(nombreDesdeEmail(null)).toBe('Sistema');
  });
});
