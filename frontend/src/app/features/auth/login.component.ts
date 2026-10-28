import { DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { interpretarError } from '../../core/errores';
import { TemaService } from '../../core/tema.service';
import { ErrorCampoComponent } from '../../shared/error-campo.component';
import { IconoComponent } from '../../shared/icono.component';
import { NombreIcono } from '../../shared/iconos.generados';

/** Cuentas que crea DemoDataSeeder (perfil demo). Solo para la demostración académica. */
const CUENTAS_DEMO: {
  rol: string;
  descripcion: string;
  icono: NombreIcono;
  email: string;
  password: string;
}[] = [
  {
    rol: 'Administrador',
    descripcion: 'Cuentas y gestión global',
    icono: 'key-round',
    email: 'admin@legaldeadline.local',
    password: 'AdminDemo123!',
  },
  {
    rol: 'Supervisor',
    descripcion: 'Asigna, aprueba y equilibra',
    icono: 'shield-check',
    email: 'supervisor@legaldeadline.local',
    password: 'SupervisorDemo123!',
  },
  {
    rol: 'Responsable',
    descripcion: 'Ejecuta sus expedientes',
    icono: 'briefcase',
    email: 'responsable@legaldeadline.local',
    password: 'ResponsableDemo123!',
  },
  {
    rol: 'Auditor',
    descripcion: 'Consulta sin modificar',
    icono: 'scroll-text',
    email: 'auditor@legaldeadline.local',
    password: 'AuditorDemo123!',
  },
];

const BENEFICIOS: { icono: NombreIcono; titulo: string; texto: string }[] = [
  {
    icono: 'calendar-clock',
    titulo: 'Plazos con riesgo automático',
    texto:
      'Cada vencimiento se clasifica como crítico, alto, medio o bajo según días y tareas pendientes.',
  },
  {
    icono: 'scale',
    titulo: 'Carga equilibrada',
    texto: 'Detecta sobrecargas y sugiere reasignaciones con reglas transparentes.',
  },
  {
    icono: 'history',
    titulo: 'Trazabilidad completa',
    texto: 'Altas, cambios de estado y anulaciones quedan registrados con su autor.',
  },
];

/** RF01 / RF20: inicio de sesión con JWT. */
@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, ErrorCampoComponent, IconoComponent, DecimalPipe],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly tema = inject(TemaService);
  protected readonly cuentasDemo = CUENTAS_DEMO;
  protected readonly beneficios = BENEFICIOS;
  protected readonly enviando = signal(false);
  protected readonly verClave = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly sesionExpirada =
    inject(ActivatedRoute).snapshot.queryParamMap.get('motivo') === 'expirada';

  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
    password: ['', [Validators.required, Validators.maxLength(72)]],
  });

  protected usarCuenta(email: string, password: string): void {
    this.form.setValue({ email, password });
    this.error.set(null);
  }

  protected ingresar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { email, password } = this.form.getRawValue();
    this.enviando.set(true);
    this.error.set(null);
    this.auth.login(email.trim().toLowerCase(), password).subscribe({
      next: () => void this.router.navigate(['/tablero']),
      error: (e) => {
        this.error.set(interpretarError(e).mensaje);
        this.enviando.set(false);
      },
    });
  }
}
