import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ContadorDirective } from './contador.directive';
import { GraficoColumnasComponent } from './grafico-columnas.component';

@Component({
  imports: [ContadorDirective],
  template: `<span [appContador]="valor()" [decimales]="decimales()"></span>`,
})
class PruebaContador {
  readonly valor = signal(5001);
  readonly decimales = signal(0);
}

describe('gráficos y cifras', () => {
  it('el gráfico dibuja una columna por serie y categoría, y ofrece la vista de tabla', async () => {
    const f = TestBed.createComponent(GraficoColumnasComponent);
    f.componentRef.setInput('categorias', ['ago', 'set', 'oct']);
    f.componentRef.setInput('detalles', [
      'agosto de 2026',
      'septiembre de 2026',
      'octubre de 2026',
    ]);
    f.componentRef.setInput('series', [
      { nombre: 'Ingresados', color: 'var(--serie-1)', valores: [10, 20, 0] },
      { nombre: 'Concluidos', color: 'var(--serie-2)', valores: [5, 15, 8] },
    ]);
    await f.whenStable();
    const el = f.nativeElement as HTMLElement;
    // Una columna por serie y categoría; la de valor 0 queda sin altura.
    const alturas = [...el.querySelectorAll<HTMLElement>('.barra')].map((b) => b.style.height);
    expect(alturas.length).toBe(6);
    expect(alturas.filter((h) => h !== '0%').length).toBe(5);
    // Leyenda con dos series y escala con números redondos.
    expect([...el.querySelectorAll('.leyenda li')].map((li) => li.textContent?.trim())).toEqual([
      'Ingresados',
      'Concluidos',
    ]);
    expect([...el.querySelectorAll('.eje-y span')].map((t) => t.textContent?.trim())).toContain(
      '20',
    );

    (el.querySelector('button.vista') as HTMLButtonElement).click();
    await f.whenStable();
    const filas = [...el.querySelectorAll('tbody tr')].map((tr) =>
      [...tr.querySelectorAll('td')].map((td) => td.textContent?.trim()),
    );
    expect(filas).toEqual([
      ['agosto de 2026', '10', '5'],
      ['septiembre de 2026', '20', '15'],
      ['octubre de 2026', '0', '8'],
    ]);
  });

  it('el contador termina en el valor exacto, con coma decimal', async () => {
    const f = TestBed.createComponent(PruebaContador);
    await f.whenStable();
    const el = f.nativeElement as HTMLElement;
    await new Promise((r) => setTimeout(r, 900));
    expect(el.textContent?.trim()).toBe('5001');
    f.componentInstance.valor.set(97.94);
    f.componentInstance.decimales.set(1);
    await f.whenStable();
    await new Promise((r) => setTimeout(r, 900));
    expect(el.textContent?.trim()).toBe('97,9');
  });
});

describe('formato de cifras', () => {
  it('usa espacio fino desde 5 cifras y coma decimal', async () => {
    const { formatoCifra } = await import('./cifra');
    expect(formatoCifra(4187)).toBe('4187');
    expect(formatoCifra(14732)).toBe('14 732');
    expect(formatoCifra(97.94, 1)).toBe('97,9');
    expect(formatoCifra(-6)).toBe('−6');
  });
});
