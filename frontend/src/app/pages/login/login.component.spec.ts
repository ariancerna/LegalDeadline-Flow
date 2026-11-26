import { registerLocaleData } from '@angular/common';
import localeEsPe from '@angular/common/locales/es-PE';
import { provideHttpClient } from '@angular/common/http';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  it('muestra las cuatro cuentas demo y llena el formulario al elegir una', async () => {
    registerLocaleData(localeEsPe);
    TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        { provide: LOCALE_ID, useValue: 'es-PE' },
      ],
    });
    const f = TestBed.createComponent(LoginComponent);
    await f.whenStable();
    const el = f.nativeElement as HTMLElement;
    const cuentas = el.querySelectorAll<HTMLButtonElement>('.cuenta');
    expect(cuentas.length).toBe(4);
    cuentas[1].click();
    await f.whenStable();
    expect((el.querySelector('#email') as HTMLInputElement).value).toBe(
      'supervisor@legaldeadline.local',
    );
    expect(el.querySelector('.cuenta.elegida strong')?.textContent).toBe('Supervisor');
    // El sello de la carátula muestra una fecha como «30 OCT».
    expect(el.querySelector('.sello strong')?.textContent?.trim()).toMatch(
      /^\d{1,2} [A-ZÁÉÍÓÚ]{3}$/,
    );
  });
});
