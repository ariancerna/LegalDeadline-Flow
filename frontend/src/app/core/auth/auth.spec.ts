import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { LoginRespuesta } from '../models';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';
import { autenticadoGuard, rolGuard } from './guards';

const RESPUESTA: LoginRespuesta = {
  accessToken: 'jwt-de-prueba',
  tokenType: 'Bearer',
  expiresIn: 3600,
  usuario: {
    id: 2,
    nombre: 'Supervisor Demo',
    email: 'supervisor@x.pe',
    rol: 'SUPERVISOR',
    activo: true,
    version: 0,
  },
};

describe('autenticación JWT', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let auth: AuthService;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => backend.verify());

  function iniciarSesion(): void {
    auth.login('supervisor@x.pe', 'clave').subscribe();
    const req = backend.expectOne('/api/v1/auth/login');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush(RESPUESTA);
  }

  it('guarda la sesión y expone el rol', () => {
    iniciarSesion();
    expect(auth.autenticado()).toBe(true);
    expect(auth.esGestor()).toBe(true);
    expect(auth.token()).toBe('jwt-de-prueba');
  });

  it('envía Authorization: Bearer en las llamadas a la API', () => {
    iniciarSesion();
    http.get('/api/v1/expedientes').subscribe();
    const req = backend.expectOne('/api/v1/expedientes');
    expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-de-prueba');
    req.flush({});
  });

  it('no envía el token a otros dominios', () => {
    iniciarSesion();
    http.get('https://otro.sitio/datos').subscribe();
    const req = backend.expectOne('https://otro.sitio/datos');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('cierra la sesión cuando el backend responde 401', () => {
    iniciarSesion();
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    http.get('/api/v1/indicadores').subscribe({ error: () => undefined });
    backend.expectOne('/api/v1/indicadores').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(auth.autenticado()).toBe(false);
    expect(navegar).toHaveBeenCalledWith(['/login'], { queryParams: { motivo: 'expirada' } });
  });

  it('descarta un token vencido', () => {
    iniciarSesion();
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 3601_000);
    expect(auth.token()).toBeNull();
    vi.useRealTimers();
  });

  it('los guards exigen sesión y rol', () => {
    const ejecutar = (guard: typeof rolGuard, roles?: string[]) =>
      TestBed.runInInjectionContext(() =>
        guard({ data: { roles } } as unknown as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
      );
    expect(ejecutar(autenticadoGuard)).toBeInstanceOf(UrlTree);
    iniciarSesion();
    expect(ejecutar(autenticadoGuard)).toBe(true);
    expect(ejecutar(rolGuard, ['ADMINISTRADOR', 'SUPERVISOR', 'AUDITOR'])).toBe(true);
    const denegado = ejecutar(rolGuard, ['ADMINISTRADOR']) as UrlTree;
    expect(denegado.toString()).toBe('/sin-permiso');
  });
});
