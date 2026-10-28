import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const TONOS = [
  ['#e0e7ff', '#3730a3'],
  ['#fce7f3', '#9d174d'],
  ['#dcfce7', '#166534'],
  ['#fef3c7', '#92400e'],
  ['#e0f2fe', '#075985'],
  ['#ede9fe', '#5b21b6'],
  ['#ffe4e6', '#9f1239'],
  ['#ccfbf1', '#115e59'],
];

/** Iniciales con un color estable derivado del nombre. */
@Component({
  selector: 'app-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span
    class="avatar"
    [style.width.px]="tamano()"
    [style.height.px]="tamano()"
    [style.font-size.px]="tamano() * 0.4"
    [style.background]="tono()[0]"
    [style.color]="tono()[1]"
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
      border-radius: 50%;
      font-weight: 700;
      letter-spacing: 0.02em;
      box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.04);
    }
  `,
})
export class AvatarComponent {
  readonly nombre = input<string>('');
  readonly tamano = input(28);

  protected readonly iniciales = computed(() => {
    const partes = this.nombre().trim().split(/\s+/).filter(Boolean);
    if (partes.length === 0) return '?';
    return (
      (partes[0][0] ?? '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')
    ).toUpperCase();
  });

  protected readonly tono = computed(() => {
    let h = 0;
    for (const c of this.nombre()) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return TONOS[h % TONOS.length];
  });
}
