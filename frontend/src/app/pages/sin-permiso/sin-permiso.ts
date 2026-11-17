import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { VacioComponent } from '../../components/vacio/vacio';

@Component({
  selector: 'app-sin-permiso',
  imports: [RouterLink, VacioComponent],
  templateUrl: './sin-permiso.html',
  styleUrl: './sin-permiso.scss',
})
export class SinPermisoComponent {}
