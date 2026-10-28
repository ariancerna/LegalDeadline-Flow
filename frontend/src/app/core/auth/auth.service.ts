import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginRespuesta, Rol, Usuario } from '../models';
import { esGestor, lecturaGlobal, puedeEscribir, puedeVerAuditoria } from './permisos';

const CLAVE_SESION = 'ldf.sesion';

interface Sesion {
  token: string;
  expiraEn: number; // milisegundos epoch
  usuario: Usuario;
}

/** Guarda el JWT y el usuario autenticado. Usa sessionStorage: la sesión termina al cerrar la pestaña. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly sesion = signal<Sesion | null>(leerSesion());

  readonly usuario = computed(() => this.sesion()?.usuario ?? null);
  readonly rol = computed<Rol | null>(() => this.usuario()?.rol ?? null);
  readonly autenticado = computed(() => this.sesion() !== null);
  readonly esGestor = computed(() => esGestor(this.rol()));
  readonly puedeEscribir = computed(() => puedeEscribir(this.rol()));
  readonly puedeVerAuditoria = computed(() => puedeVerAuditoria(this.rol()));
  readonly lecturaGlobal = computed(() => lecturaGlobal(this.rol()));
  readonly esAdmin = computed(() => this.rol() === 'ADMINISTRADOR');

  login(email: string, password: string): Observable<LoginRespuesta> {
    return this.http
      .post<LoginRespuesta>(`${environment.apiUrl}/auth/login`, { email, password })
      .pipe(
        tap((r) => {
          const sesion: Sesion = {
            token: r.accessToken,
            expiraEn: Date.now() + r.expiresIn * 1000,
            usuario: r.usuario,
          };
          guardarSesion(sesion);
          this.sesion.set(sesion);
        }),
      );
  }

  /** Token vigente o null si no hay sesión o ya expiró. */
  token(): string | null {
    const actual = this.sesion();
    if (!actual) return null;
    if (Date.now() >= actual.expiraEn) {
      this.limpiar();
      return null;
    }
    return actual.token;
  }

  tieneRol(...roles: Rol[]): boolean {
    const rol = this.rol();
    return rol !== null && roles.includes(rol);
  }

  logout(motivo?: 'expirada'): void {
    this.limpiar();
    void this.router.navigate(['/login'], motivo ? { queryParams: { motivo } } : {});
  }

  private limpiar(): void {
    try {
      sessionStorage.removeItem(CLAVE_SESION);
    } catch {
      /* almacenamiento no disponible */
    }
    this.sesion.set(null);
  }
}

function leerSesion(): Sesion | null {
  try {
    const crudo = sessionStorage.getItem(CLAVE_SESION);
    if (!crudo) return null;
    const sesion = JSON.parse(crudo) as Sesion;
    return sesion.expiraEn > Date.now() ? sesion : null;
  } catch {
    return null;
  }
}

function guardarSesion(sesion: Sesion): void {
  try {
    sessionStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
  } catch {
    /* almacenamiento no disponible: la sesión vive solo en memoria */
  }
}
