import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-sin-permiso',
  imports: [RouterLink],
  template: `
    <div class="tarjeta">
      <h1>Sin permiso</h1>
      <p class="texto-suave">Tu rol no tiene acceso a esta sección.</p>
      <a routerLink="/tablero" class="btn btn-primario">Volver al tablero</a>
    </div>
  `,
})
export class SinPermisoComponent {}
