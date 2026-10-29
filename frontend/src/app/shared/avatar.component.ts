import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Iniciales en un círculo; en manila para la cuenta propia. */
@Component({
  selector: 'app-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span
    class="avatar"
    [style.width.px]="tamano()"
    [style.height.px]="tamano()"
    [class.propio]="propio()"
    [style.font-size.px]="tamano() * 0.4"
    [attr.title]="nombre()"
    >{{ iniciales() }}</span
  >`,
  styles: `
    :host {
      display: inline-flex;
      flex-shrink: 0;
    }
    .avatar {
      display: inline-grid;
      place-items: center;
      box-sizing: border-box;
      border-radius: 50%;
      font-weight: 700;
      letter-spacing: 0.02em;
      color: var(--texto-2);
      background: var(--superficie-2);
      border: 1px solid var(--borde);
    }
    // La persona que usa la sesión: iniciales en manila.
    .avatar.propio {
      background: var(--manila);
      border-color: var(--manila);
      color: var(--manila-tinta);
    }
  `,
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
