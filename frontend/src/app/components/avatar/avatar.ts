import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Iniciales en un círculo; en manila para la cuenta propia. */
@Component({
  selector: 'app-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './avatar.html',
  styleUrl: './avatar.scss',
})
export class AvatarComponent {
  readonly nombre = input<string>('');
  readonly tamano = input(28);
  /** Iniciales en manila: la cuenta que usa la sesión. */
  readonly propio = input(false);

  protected readonly iniciales = computed(() => {
    const partes = this.nombre().trim().split(/\s+/).filter(Boolean);
    if (partes.length === 0) return '?';
    // Nombre + primer apellido (en "Jorge Mendoza Quispe", JM).
    const segundo = partes.length >= 3 ? partes[partes.length - 2] : partes[partes.length - 1];
    return ((partes[0][0] ?? '') + (partes.length > 1 ? segundo[0] : '')).toUpperCase();
  });
}
