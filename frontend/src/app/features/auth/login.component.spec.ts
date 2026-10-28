import { registerLocaleData } from '@angular/common';
import localeEsPe from '@angular/common/locales/es-PE';
import { provideHttpClient } from '@angular/common/http';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  it('muestra los beneficios numerados y las cuatro cuentas demo con la configuración regional de Perú', async () => {
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
    expect(el.querySelectorAll('.beneficios li').length).toBe(3);
    expect(el.querySelector('.beneficios .numero')?.textContent?.trim()).toBe('01');
    expect(el.querySelectorAll('.cuenta').length).toBe(4);
  });
});
