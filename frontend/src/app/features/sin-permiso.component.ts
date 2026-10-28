import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { VacioComponent } from '../shared/vacio.component';

@Component({
  selector: 'app-sin-permiso',
  imports: [RouterLink, VacioComponent],
  template: `
    <div class="tarjeta">
      <app-vacio
        icono="lock"
        titulo="Esta sección no está disponible para tu rol"
        texto="Si necesitas acceso, pídeselo al administrador del estudio."
      >
        <a routerLink="/tablero" class="btn btn-primario">Volver al tablero</a>
      </app-vacio>
    </div>
  `,
})
export class SinPermisoComponent {}
